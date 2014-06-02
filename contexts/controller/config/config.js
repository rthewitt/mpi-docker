var path = require('path'),
  rootPath = path.normalize(__dirname + '/..');

var MEM_BASE = 134217728;

module.exports = {
    development: {
        root: rootPath,
        port: 2222,
        repo: 'mpi',
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
        /*
        ,
            {
                name: 'myelin',
                image: 'subthalamus',
                cmd: ['/usr/bin/python', '/opt/subthalamus/server'],
                memory: MEM_BASE,
                pool: {
                    refreshIdle: false,
                    max: 2, // TODO remove pool if pool not needed
                    min: 1, 
                    log: false
                },
                volumes: { "/user_data": {} },
                exposed: { },
                active: true
            }] */
    },
    test: {},
    production: {}
}
