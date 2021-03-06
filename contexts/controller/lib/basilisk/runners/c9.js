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

module.exports = {
    test: function(finalCB) {
        // TODO
    },
    hook: {
        create: function(cb) {
            console.log('Inside c9 create hook');
            var workspace = this.id.substr(0, 12);
            try {
                fs.mkdirSync('/user_data/workspaces/'+workspace); 
                this.workspace = workspace;
            } catch(ex) {
                this.report('Error creating workspace: '+ex);
                cb(ex, null);
                return;
            }
            var startOpts = {
                Binds: ["/user_data/workspaces/"+workspace+":/workspace"]
                //PortBindings: { "3131/tcp": [{ HostPort: "3131", HostIp: "0.0.0.0" }] }
            }
            cb(null, startOpts);
        },
        started: function(details, poolCB) {
            this.commPort = '80';
            this.ipAddr = null;
            try {
                // this.commPort = details.NetworkSettings.Ports['3131/tcp'][0].HostPort;
                this.ipAddr = details.NetworkSettings.IPAddress;
            } catch(cex) {
                console.log('Error: '+cex);
            }
            poolCB(this);
        },
        run: function(userId, kataId, cb) {
            console.log('THIS IS WHEN WE HANDLE IDLE SETUP');
            cb(null, this);
        },
        clean: function(cb) { cb(); } // TODO delete workspace directory
    }
}
