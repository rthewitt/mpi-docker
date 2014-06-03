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

/*
    if(!port) {
        port = process.env.CODE_RUNNER_PORT || process.argv.indexOf('-p') > 0 ? 
            process.argv[process.argv.indexOf('-p')+1] : null; 
    }
    */



/*
    var proxyServer = http.createServer(function(req, res) {

       //console.log("Received a request");

       var urlParts = url.parse(req.url, true);
       // get from cookie, fallback to url TODO
       var userId = urlParts.query.userId;
       var kataId = urlParts.query.refId;

       var hostname = req.headers.host.split(':')[0];
       var locAction = hostname.split('.')[0];

       if(locAction === 'attempt') { 
           // moved to c9 // VERIFY 
       } else if(locAction === 'test') { // TODO make this an auth request
           proxy.web(req, res, { target: ('http://localhost:8887'+urlParts.pathname) });
       } else { // 3. Container in URL
           var workspaceId = locAction;

           if(!!urlParts.query.action) {
               console.log('received action: '+util.inspect(urlParts.query));
               var path = util.format('/%s?workspaceId=%s&userId=%s&refId=%s', urlParts.query.action, workspaceId, userId, kataId);
               // TODO change this to dynamic based on location
               path += '&url='+encodeURIComponent('git://github.com/creationix/conquest.git');
               var myReq = http.request({ host: myelinHost, method: req.method, path: path, port: myelinPort}, function(myRes) {
                   console.log('STATUS: ' + myRes.statusCode);
                   console.log('HEADERS: ' + JSON.stringify(myRes.headers));
               });
               myReq.on('error', function(e) {
                   console.log('error contacting myelin via subthalamus: '+e.message)
               });
               myReq.end();
           } else {
               // moved to c9 // VERIFY
           }
       }
    });
    //proxyServer.listen(port);
    */

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

    // setup runners
    var runners = {};
    var Basilisk = require('./lib/basilisk')(config);
    var runners = Basilisk.init(config.runners)

    var server = require('./config/express')(app, config);
    require('./config/routes')(app, runners);

    // we modify server directly, so no app.listen()
    server.listen(port); 

    exports = module.exports = app;
