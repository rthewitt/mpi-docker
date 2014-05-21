var fs = require('fs'),
    config = require('../config'),
    runnerUtil = require('../mpi-util');

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
            _injectCodeOrMonitor.call(this, codeStream);
        },
        clean: function(cb) { cb(); }
    }
}
