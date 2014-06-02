var DockerIO = require('docker.io'),
    poolModule = require('generic-pool'),
    util = require('util'),
    moment = require('moment'),
    fs = require('fs'),
    net = require('net');
    runnerUtil = require('./runner-util');

var logDateFormat = 'YYYY-MM-DD HH:mm Z';
var MAX_USE = 1000;

var STDOUT=1, STDERR=2;
var states = [];
var NEW = 0,
    RETRY = 1,
    WAITING = 2,
    ACCUMULATE = 3,
    FINISHED = 4,
    RECOVERY = 5,
    FAIL = 6;
var stateNames = ['NEW', 'RETRY', 'WAITING', 'ACCUMULATE', 'FINISHED', 'RECOVERY', 'FAIL'];

module.exports = function(config) {

    var docker = DockerIO(config.dockerOpts);

    function defaultCB(err, job) {
        if(err) job.useLevel = MAX_USE;
        var result = {
            statusCode: job.statusCode,
            exitCode: job.exitCode,
            stdout: job.stdout,
            stderr: job.stderr 
        }
        job.report('Job '+job.id+' finished.  No callback provided');
        job.report('Result:\n', result);
    }


    function _makeRunner(runnerConfig) {

        var options = {
            Image: (config.repo+':'+runnerConfig.image),
            Memory: runnerConfig.memory,
            //ExposedPorts: runnerConfig.exposed, // TODO add back if necessary, placed into Dockerfile
            Volumes: runnerConfig.volumes,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            OpenStdin: true,
            StdinOnce: false,
            Tty: false,
            Env: ["RUNNER="+runnerConfig.name, "PORT=80"],
            Cmd: runnerConfig.cmd
        };

        var dr = function() {
            this.docker = docker;
        }

        dr.prototype = require('./runners/'+runnerConfig.name+'.js');
        dr.prototype.runOpts = options;

        for(var fun in 'hook', 'test') {
            if(!dr.prototype[fun] || typeof dr.prototype[fun] !== 'function') {
                dr.prototype[fun] = function(cb) {
                    var err = new Error(util.format("Runner [%s] not configured", fun));
                    cb(err);
                };
            }
        }

        dr.prototype.run = function(jobArgs, clientToken, finalCB) {
            console.log('dr run function');
            this.pool.acquire(function(err, job){
                if(err) throw err; 
                job.initialTime = Date.now();
                job.finalCB = finalCB;
                if(!!clientToken) job.report('Job passed with client token: ' + clientToken);
                if(!!job.hook.run) {
                    jobArgs.push(finalCB);
                    job.hook.run.apply(job, jobArgs);
                }
            });
        };

        // do not call this directly anymore if using pool
        dr.prototype.createJob = function() {


            var _instrument = function(optMessage) {
                var reportString = optMessage || '';
                if(!!this.initialTime) {
                    this.curTime = this.curTime || this.initialTime;
                    var now = Date.now();
                    var reportString = util.format('total=%d block=%d %s', 
                            (now-this.initialTime), (now-this.curTime), reportString);
                    this.curTime = now; 
                } 

                this.report(reportString);
            }

            var _report = function(optMessage) {
                var state = this.state >= WAITING && this.retryCount > 0 ? 
                    util.format('%s (RETRY #%d)', stateNames[this.state], this.retryCount) : stateNames[this.state];
                var id = !!this.id ? this.id.substring(0,13) : 'NONE';
                console.log('%s job %s: %s %s', moment().format(logDateFormat), id, state, optMessage);
            }
            
            var job = function(){

                // ==========
                // SOCKET FIX
                this.oClient = undefined;
                // change to iClient?
                this.Client = undefined;
                // ==========

                this.id = undefined;
                this.stdout = '';
                this.stderr = '';
                this.state = NEW;
                this.useLevel = 0;
                this.retryCount = 0;
                this.logBytes = 0;
                this.statusCode = 200;
                this.exitCode = undefined;
                this.duration = null;
                this.initialTime = undefined;
                this.curTime = undefined;
                this.finalCB = defaultCB;
                this.instrument = _instrument;
                this.report = _report;
            }
            job.prototype = this;
            
            return new job();
        }


        // SUCH UGLY, UGLY CALLBACK CODE FIXME
        var thisRunner = new dr();
        if(!!runnerConfig.active) {
            thisRunner.pool = poolModule.Pool({
                name: 'docker-' + thisRunner.image + '-pool',
                create: function(callback) {
                    var job = thisRunner.createJob();
                    thisRunner.docker.containers.create(thisRunner.runOpts, function(err, res) {
                        if(!err) {
                            if(!!res.Id) {
                                job.id = res.Id;
                                if(!!job.hook.create) {
                                    job.hook.create.call(job, function(cErr, startOpts) {
                                        if(cErr) console.log('Fatal error from create hook: '+cErr);
                                        else {
                                            thisRunner.docker.containers.start(job.id, startOpts, function(err, result) {
                                               if(err) throw err;
                                               if(!!job.hook.started) {
                                                   getInspectDetails(job, job.hook.started, callback);
                                               } else callback(job);
                                            });
                                        }
                                    });
                                }
                            } else callback(new Error('No ID returned from docker create'), null);
                        } else callback(err, null);
                    });

                },
                destroy: function(job) {
                    job.report('self destruct');

                    if(!!job.client) job.client.destroy();
                    if(!!job.oClient) job.oClient.destroy();

                    // TODO handle requests-in-progress
                    job.docker.containers.kill(job.id, function(err) {
                        if(!!err) {
                            job.report('Container could not be killed\n'+err);
                            // Remote API v0.10 allows forced removal
                            delete job;
                        } else {
                            job.docker.containers.remove(job.id, function(err) {
                                if(err) job.report('Container could not be removed\n'+err);
                                delete job;
                            });
                        }
                    });
                },
                idleTimeoutMillis: runnerConfig.pool.idleTimeoutMillis,
                refreshIdle: runnerConfig.pool.refreshIdle,
                max: runnerConfig.pool.max,
                min: runnerConfig.pool.min, 
                log: runnerConfig.pool.log // can also be a function
            });

            // TODO remove all containers from separate list?
            function gracefulExit() {
                thisRunner.pool.drain(function() {
                    thisRunner.pool.destroyAllNow();
                });
            }

            process.on('SIGINT', gracefulExit)
                .on('SIGTERM', gracefulExit);
        }
        return thisRunner;
    }

    function getInspectDetails(job, receiver, cb) {
        job.docker.containers.inspect(job.id, function(err, details) {
            if(err) {
                job.report('Inspect failed: '+err);
                cb(err);
            } else receiver.call(job, details, cb);
        });
    }


    function parseJSON(job, payload) {
        //job.report('Attempting to parse json:\n'+payload);
        var json = JSON.parse(payload);
        if(!!json.stdout) job.stdout = json.stdout;
        if(!!json.stderr) job.stderr = json.stderr;
        if(typeof json.exitCode !== 'undefined') job.exitCode = json.exitCode;
        return true;
    }

    // Has side effects!!
    function consumeHeader(job, data) {
        if(!job.partial) job.partial = {out: '', err: ''};
        var cur = {
            type: data.readUInt8(0),
            expected: data.readUInt32BE(4),
            size: 0
        }
        job.report('current type is : '+ cur.type);
        job.report('expected size is : '+ cur.expected);

        var prev = job.partial.cur;

        if(!!prev) {
            if(prev.type !== cur.type)
                job.report(util.format('Stream switching from %d to %d', prev.type, cur.type));

            // This was a problem during double recur
            if(cur.type > 2) {
                job.report('Header seems to have been consumed... ignoring "header"');
                return;
            }
        }
        job.partial.cur = cur;
        return data.slice(8, data.length); // remove header
    }


    // This will be reintroduced stdlistener for log/err
    function extractPayload(job, data) {
        var looksComplete = false;
        var cutoff; // multiplex may cutoff inside a TCP chunk

        if(!job.partial || !job.partial.cur)
            throw new Error('Partial not set');
        var cur = job.partial.cur;
        
        // if not recur cur.size should be 0
        var L = data.length + cur.size;
        if(cur.expected == L) looksComplete = true;

        var payload = cur.expected >= L ? data.toString('utf8') :
            data.slice(0, cutoff=(cur.expected - cur.size)).toString();

        //job.report('payload set to: '+payload);

        if(cur.type === STDOUT) job.partial.out += payload;
        else if(cur.type === STDERR) job.partial.err += payload;
        else throw new Error('Bad stream type');

        if(cur.expected > L) cur.size += data.length;

        if(cur.expected < L) {
            data = data.slice(cutoff, data.length);
            job.report('recurring due to early payload cutoff');
            job.report('new length is '+data.length);
            data = consumeHeader(job, data);
            looksComplete = extractPayload(job, data); // recur
        }

        return looksComplete;
    }

    // Logs would require a smart extraction + placeholder if ongoing
    function recoverLogs(job, data) {
        var detailStr = util.format("data=%d pointer=%d", data.length, job.logBytes);
        job.instrument("Attempting log recovery: "+detailStr);

        if(data.length < job.logBytes+8) extractPayload(job, data);
        else extractPayload(job, data.slice(job.logBytes));
    }

    return { 

        createRunner: _makeRunner,

        init: function(runnerConfigs) {
            var runners = {};
            for(var rc in runnerConfigs) {
                var runConfig = runnerConfigs[rc];
                var aRunner = _makeRunner(runConfig);
                runners[runConfig.name] = aRunner;
            }
            return runners;
        }
    }
};
