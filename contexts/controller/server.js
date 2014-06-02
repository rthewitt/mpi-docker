var express = require('express'),
    util = require('util'),
    url = require('url'),
    streams = require('stream'),
    http = require('http'),
    httpProxy = require('http-proxy');
    streamBuffers = require('stream-buffers'),
    fs = require('fs'),
    redis = require('redis'),
    ProxyRouter = require('./lib/proxy-router'),
    env = process.env.NODE_ENV || 'development',
    config = require('./config/config')[env];

//var agent = require('webkit-devtools-agent');

    var host = config.dockerOpts.host || 'localhost';
    var hostname = config.dockerOpts.hostname;
    var port = config.port;
        internalPort = config.internalPort || 8887;
        
    var redisPort = process.env.DB_PORT_6379_TCP_PORT,
        redisHost = process.env.DB_PORT_6379_TCP_ADDR;

    var myelinPort = process.env.MYELIN_PORT_7777_TCP_PORT,
        myelinHost = process.env.MYELIN_PORT_7777_TCP_ADDR;

/*
    if(!port) {
        port = process.env.CODE_RUNNER_PORT || process.argv.indexOf('-p') > 0 ? 
            process.argv[process.argv.indexOf('-p')+1] : null; 
    }
    */
    if(!redisPort || !redisHost) console.log('FATAL: Redis bridge not found!');

    var proxyRouter = new ProxyRouter({
          backend: redis.createClient(redisPort, redisHost),
          cache_ttl: 5
       });

    var proxy = httpProxy.createProxyServer({target: { port: 80 }});

    /*
     if container is used, no good, error
     --check if container is free in pool, last ditch effort check all students for container use
     if container is free, mark as used in Redis, set user:container in Redis, then redirect user to container
    */
    var assignContainer = function(req, res, userId, refId) {
        var resJSON = '';
        var params = '';
        if(userId || !!refId) {
            params += '?'
            params += userId ? 'userId='+userId : ''; 
            params += !!refId ? 'refId='+refId : ''; 
        }
        console.log('trying: params='+params);
        var assReq = http.request({ host: 'localhost', path: '/assign'+params, port: internalPort }, function(wRes) {
            wRes.on('err', function(err) { console.log('error: '+err);} );
            wRes.on('data', function(chunk) {
                resJSON += chunk;
                try { 
                    var wObj = JSON.parse(resJSON);
                        proxyRouter.isContainerFree(wObj.workspace, function(isOk) {
                            if(isOk) {
                                proxyRouter.setSessionForContainer('SOMEBODY_SESSION', wObj.workspace);
                                proxyRouter.setRouteForContainer(wObj.workspace, wObj.ip, wObj.port);
                                var urlParts = url.parse(req.url);
                                var TEMP_location = 'http://'+wObj.workspace+'.localhost.com';
                                res.writeHead(302, { location: TEMP_location });
                                res.end();
                            } else throw new Error('CONTAINER IS NOT REALLY FREE, HANDLE ME!!'); // TODO
                        }) 
                } catch(ex) {
                    console.log('Error: '+ex);
                }
            });
        });
        assReq.end();
    };

    proxy.on('error', function(err) {
        console.log('Proxy error: '+err);
    });


    var proxyServer = http.createServer(function(req, res) {

       //console.log("Received a request");

       var urlParts = url.parse(req.url, true);
       // get from cookie, fallback to url TODO
       var userId = urlParts.query.userId;
       var kataId = urlParts.query.refId;

       var hostname = req.headers.host.split(':')[0];
       var locAction = hostname.split('.')[0];

       if(locAction === 'attempt') { 
           // TODO session id, cache
           if(kataId) assignContainer(req, res, userId, kataId);
           else throw new Error('Missing challenge/lesson ID');
             //     res.writeHead(500);
             //     res.end();
       } else if(locAction === 'test') {
           proxy.web(req, res, { target: ('http://localhost:8887') });
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
               proxyRouter.lookupRouteForContainer(workspaceId, function(route) {
                   if(route) { // redirect to container
                       proxy.web(req, res ,{
                           target: ('http://'+route.host+':'+route.port)
                       }); 
                   } else throw new Error('404 Workspace Not Found');
                 //     res.writeHead(404);
                 //     res.end();
               });
           }
       }
    });

    proxyServer.on('upgrade', function(req, socket, head) {
        console.log('upgrade received');
        var workspace = req.headers.host.split('.')[0];
        proxyRouter.lookupRouteForContainer(workspace, function(route) {
            proxy.ws(req, socket, head, { 
                target: ('http://'+route.host+':'+route.port)
            });
        });
    });

    proxyServer.on('error', function(err) {
        console.log('proxyServer error: '+err);
    });
    
    proxyServer.listen(port);


/*--------------------------------------------------------------------------------
    This is a test UI for code submission, and for direct container interaction
----------------------------------------------------------------------------------*/



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

    require('./config/express')(app, config);
    require('./config/routes')(app, runners);

    app.listen(internalPort);

    exports = module.exports = app;
