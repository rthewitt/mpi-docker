var fs = require('fs'),
    runnerUtil = require('../runner-util');

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

function _injectCodeOrMonitor(codeStream) {
    var self = this;

    var onError = function(err) {
        self.finalCB(err, self);
    };

    var onData = function(data) {
            self.report('data received ' + data);
            switch(self.state) {
                case NEW: 
                    self.instrument('injecting code');
                    self.injectTime = Date.now();
                    codeStream.pipe(self.client);
                    break;
                default:
                    console.log('DELETE ME STATE MACHINE');
                    break;
            }
    };

    // code has been injected
    var onFinish = function() {
        self.instrument('client socket finished');
        self.state = WAITING;
        self.client.destroy();
        delete self.client;
        delete client;
    };

    var injectHandlers = {
        error: onError,
        data: onData,
        finish: onFinish
    };

    var injectClient = runnerUtil.getClientForContainer(self, false, injectHandlers);
}


            // ADDITIONAL logic from state based version
            
            // perform health check after timeout
            function performHealthCheck(job) {
                job.instrument('Job failed, inspecting container');

                job.docker.containers.inspect(job.id, function(err, details) {

                    if(err) job.report('Health check error', err);

                    if(err || !details.State.Running) {
                        errMsg = util.format('Health Check: %s', (err? err.message : 'container is not running/responding'));
                        job.report(errMsg);
                        job.useLevel = MAX_USE;
                    }

                    job.cleanup();
                });
            }

            var _cleanup = function(healthCheck) {
                var job = this;

                if(!!healthCheck) {
                    performHealthCheck(job);
                    return; // we will resume after inspect
                }

                if(job.useLevel < MAX_USE) {
                    job.report('releasing container...');
                    job.stdout = '';
                    job.stderr = '';
                    if(!!job.client) {
                        job.client.destroy();
                        delete job.client;
                    }

                    delete job.injectTime;
                    delete job.solutionTime;
                    delete job.finalCB;
                    delete job.duration;
                    delete job.responseTime;
                    delete job.exitCode;
                    delete job.partial;

                    job.statusCode = 200;
                    job.state = NEW;
                    job.retryCount = 0;
                    job.finalCB = job.defaultCB;

                    if(!!job.hook.clean)
                        job.hook.clean(function(err) {
                            job.pool.release(job);
                        });
                } else {
                    job.report('removing container at use='+job.useLevel);
                    job.pool.destroy(this);
                }
            };


module.exports = {
    test: function(finalCB) {
        var runnerThis = this;
        var testFilePath = 'test/'+this.language+'/test.'+this.extension;
        var codeStream = fs.createReadStream(testFilePath);
        fs.stat(testFilePath, function(err, stat) {
            if(err) throw err;
            codeStream.inputSize = stat.size; 
            runnerThis.run(codeStream, finalCB);
        });
    },
    hook: {
        create: function(job, cb) {
            if(!job) 
                cb(null, new Error("hook create: job missiong"));
            else cb(job);
        },
        run: function(codeStream) {
            // THIS IS NOT CORRECT, HOOK SHOULD NOT CALL FINALCB
            _injectCodeOrMonitor.call(this, codeStream);
        },
        clean: function(cb) { cb(); }
    }
}
