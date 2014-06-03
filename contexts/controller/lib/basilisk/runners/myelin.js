/*
 * Not currently using Myelin as a runner/Docker image
 * Has been consolidated into controller for the time being 
 */
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
        create: function(cb) { // TODO allow null, resorts to config!!!
            cb(null, { Binds: ["/user_data/:/user_data"] });
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
