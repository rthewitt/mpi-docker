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

var IDLE_MINS = 5;
var IDLE_TIMEOUT_MS = IDLE_MINS * 60 * 1000;

/*
 * Too tired to think.
 * This code is all mixed, incomplete pastes
 * On hook:start, we need to set up the initial socket
 * This requires handlers that we won't yet have
 * Since those handlers must alert request
 *
 * Proposed Solution:
 *
 * Use [mostly] default handlers for logging
 * On run, we unsubscribe from existing
 * data/error handlers
 * Then we call wrapHandlers...(cb)
 * Hook up the new handlers
 * pipe in the request stream
 * (The request stream using "restify" should
 * implement stream, will not use multipart)
 */
function getSocketHandlers(job) {

    var onError = function(err) {
        job.handleTestResults(err, job, null);
    };

    // verify flush on python write from shim
    var onData = function (data) {

        job.report(util.format('%s data received - length: %d', 
                this.name, data.length));

        if(job.state === NEW) {
            job.report('ignoring data because we are NEW - VERIFY');
            return;
        }

        job.state = ACCUMULATE;

        var part = data.toString('utf8');
        job.partialResponse = !job.partialResponse ?  part :
            job.partialResponse += part;
        
        var goodJSON = false;
        console.log('VERIFY SOCKET: '+this.name+ + typeof this);
        try { 
            goodJSON = parseJSON(job, job.partialResponse);
        } 
        catch(ex) { job.report('parse failed: '+ex); }

        if(goodJSON) {
            job.state = FINISHED;
            job.handleTestResults(null, job, goodJSON);
            delete job.handleTestResults;
            job.handleTestResults = defaultResultHandler;
        }

    };

    return { data: onData, error: onError };
}

function defaultResultHandler(err, job, results) {
    if(err) job.report('Result error received without destination\n'+results);
    job.instrument('Received test results without destination:\n'+results);
}

module.exports = {
    test: function(finalCB) {
        // TODO
    },
    hook: {
        create: function(cb) {
            console.log('inside create hook for code');
            this.handleTestResults = defaultResultHandler;
            this.virgin = true;
            cb(null, {});
        },
        run: function(req, kataId, injectTime, cb) {
            console.log('code run hook');
            if(!this.virgin) this.virgin = false;
            // send data, receive results, send results
            delete this.handleTestResults;
            this.handleTestResults = cb;
            // We do not want to end the remote socket via pipe
            //req.pipe(this.codeSocket);
            var self = this;
            req.on('data', function(chunk) {
                self.report('type of chunk: '+ typeof chunk);
                // ensure this is binary data
                self.codeSocket.write(chunk);
            });
            req.on('end', function() {
                self.report('finished sending data to container');
            });
        },
        started: function(details, poolCB) {
            console.log('code start hook');
            this.commPort = '8888';
            this.ipAddr = null;
            try {
                // this.commPort = details.NetworkSettings.Ports['3131/tcp'][0].HostPort;
                this.ipAddr = details.NetworkSettings.IPAddress;
            } catch(cex) {
                console.log('Error: '+cex);
            }

            console.log(this.ipAddr+':'+this.commPort);

            var codeSocket = runnerUtil.getSocketGeneric(this, {ip: this.ipAddr, port: this.commPort}, getSocketHandlers(this));

            var self = this;
            codeSocket.setTimeout(IDLE_TIMEOUT_MS, function() {

                var ofType = (self.handleTestResults === defaultResultHandler) ? 
                    (self.virgin ? 'virgin' : 'unused') : 'used' ;

                var possess = !!self.partialResponse ? 
                ('has a partial result: '+self.partialResponse) : 'has no result data';
                job.report(util.format('%s job idle for %s minutes, and %s', ofType, IDLE_MINS, possess));
            });
            this.codeSocket = codeSocket;

            poolCB(this);
        },
        clean: function(cb) { cb(); } 
    }
}
