var express = require('express'),
    util = require('util'),
    url = require('url'),
    streams = require('stream'),
    http = require('http'),
    httpProxy = require('http-proxy');
    streamBuffers = require('stream-buffers'),
    fs = require('fs'),
    ProxyRouter = require('./lib/proxy-router'),
    env = process.env.NODE_ENV || 'development',
    config = require('./config/config')[env];

//var agent = require('webkit-devtools-agent');

    var port = config.port;
        internalPort = config.internalPort || 8887;
        

    var myelinPort = process.env.MYELIN_PORT_7777_TCP_PORT,
        myelinHost = process.env.MYELIN_PORT_7777_TCP_ADDR;

    function errResponse(error) {
        error = error || new Error();
        var timeout = !!error.timeout;
        errString = error.message || "Internal Error";
        return {
            statusCode: 500,
            timeout: timeout,
            stdout: null,
            stderr: errString
        };
    }

    // response format.  Filter errors here.
    function result(finished, startTime) {
        var responseTime = !!startTime ? Date.now()-startTime : null;
        var timeout = (finished.exitCode == 124);
        return {
            statusCode: finished.statusCode,
            exitCode: finished.exitCode,
            timeout: timeout,
            stdout: finished.stdout,
            stderr: finished.stderr,
            solutionTime: finished.duration,
            responseTime: responseTime
        }
    }

    /* For code scripts, also inefficient
    this.createStreamForScript = function(script) {
        var readStrBuffer = new streamBuffers.ReadableStreamBuffer();
        var eof = '0ae290840a';
        var tmp = new Buffer(5);
        tmp.write(eof, 0, 5, 'hex');
        readStrBuffer.put(script, 'utf8');
        readStrBuffer.put(tmp, 'hex');
        codeStream = new streams.Readable().wrap(readStrBuffer);
        return codeStream;
    }
    */


    var app = express();

    // This will eventually grow to resemble Architect
    var Basilisk = require('./lib/basilisk')(config);
    var runners = Basilisk.init(config.runners)

    var server = require('./config/express')(app, config);
    require('./config/routes')(app, runners);

    // we modify server directly, so no app.listen()
    server.listen(port); 

    exports = module.exports = app;
