var path = require('path'),
  rootPath = path.normalize(__dirname + '/..');

var MEM_BASE = 134217728;
var PRIVATE_TOKEN = 'rmmswbw6sWEjP9Ty3xbK';

var storePort = process.env.STORE_PORT_80_TCP_PORT;
var storeHost = process.env.STORE_PORT_80_TCP_ADDR;

module.exports = {
    development: {
        root: rootPath,
        port: 2222,
        repo: 'mpi',
        domain: 'localhost.com',
        repoStore: {
            name: 'gitlab',
            host: storeHost,
            port: storePort,
            authToken: PRIVATE_TOKEN
        },
        dockerOpts: {
            socketPath: false,
            hostname: '172.17.42.1',
            host: 'http://172.17.42.1', // move out
            version: 'v1.10',
            port: 6969
        },
        runners: [
            {
                name: 'c9',
                image: 'cloud9',
                cmd: ["/cloud9/bin/cloud9.sh", "student", "-l", "0.0.0.0", "-w", "/workspace"],
                //cmd: ["/usr/local/bin/cheat.sh"],
                memory: MEM_BASE,
                volumes: { "/workspace": {} },
                exposed: { "80/tcp": {} },
                pool: {
                    //idleTimeoutMillis: 9000000,
                    refreshIdle: false,
                    max: 4,
                    min: 1, 
                    log: false
                },
                active: true
            },
            {
                name: 'code',
                image: 'coderunner',
                cmd: ['-c', '/usr/bin/python3 /usr/local/bin/run'],
                memory: MEM_BASE,
                pool: {
                    refreshIdle: false,
                    max: 5,
                    min: 1, 
                    log: false
                },
                volumes: { }, // TODO MOVE THESE
                exposed: { },
                active: true
            }]
    },
    test: {},
    production: {}
}
