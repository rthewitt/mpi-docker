var config = {
    // [baseDir:] /some/path/to/base/ (ending-slash)
    port: 2222,
    repo: 'mpi'
};

var MEM_BASE = 134217728;

config.dockerOpts = {
    socketPath: false,
    hostname: '172.17.42.1',
    version: 'v1.10',
    port: 6969
}
config.dockerOpts.host = 'http://'+config.dockerOpts.hostname;

config.runners = [
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
        name: 'javascript',
        image: 'coderunner',
        cmd: ['/usr/bin/python', '/usr/local/bin/run'],
        memory: MEM_BASE,
        pool: {
            refreshIdle: false,
            max: 5,
            min: 2, 
            log: false
        },
        volumes: { }, // TODO MOVE THESE
        exposed: { },
        active: true
    }];

module.exports = config;
