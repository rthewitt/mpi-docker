var express = require('express'),
    util = require('util'),
    url = require('url'),
    streams = require('stream'),
    http = require('http'),
    httpProxy = require('http-proxy');
    streamBuffers = require('stream-buffers'),
    fs = require('fs'),
    redis = require('redis'),
    ProxyRouter = require('./proxy-router'),
    config = require('./config');

//var agent = require('webkit-devtools-agent');

(function(options) {

    var host = options.dockerOpts.host || 'localhost';
    var hostname = options.dockerOpts.hostname;
    var port = options.port;
        internalPort = options.internalPort || 8888;
        
    var redisPort = process.env.DB_PORT_6379_TCP_PORT,
        redisHost = process.env.DB_PORT_6379_TCP_ADDR;

    if(!port) {
        port = process.env.CODE_RUNNER_PORT || process.argv.indexOf('-p') > 0 ? 
            process.argv[process.argv.indexOf('-p')+1] : null; 
    }
    if(!redisPort || !redisHost) console.log('FATAL: Redis bridge not found!');

    var baseDir = options.baseDir || '';



    //var client = redis.createClient(redisPort, redisHost);
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
            params += '?';
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
           proxy.web(req, res, { target: ('http://localhost:8888') });
       } else { // 3. Container in URL
           proxyRouter.lookupRouteForContainer(locAction, function(route) {
               if(route) { // redirect to container
                   proxy.web(req, res ,{
                       target: ('http://'+route.host+':'+route.port)
                   }); 
               } else throw new Error('404 Workspace Not Found');
             //     res.writeHead(404);
             //     res.end();
           });
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

    var runners = {};
    var arrayOfRunners = [];

    var CodeRunner = require('./controller')(options);

    for(var rc in options.runners) {
        var runConfig = options.runners[rc];
        var aRunner = CodeRunner.createRunner(runConfig);
        runners[runConfig.name] = aRunner;
        arrayOfRunners.push(aRunner);
    }


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


    var app = express();
    app.use(express.static(__dirname + '/public'))
        .use(express.favicon())
        .use(express.bodyParser());

    // TODO separate routes into specific runners, or allow extensions
    app.get('/assign', function(req, res) {
        var userId = req.query.userId;
        var kataId = req.query.refId;
        try {
            runners['c9'].run([userId, kataId], kataId, function(err, job) {
                job.instrument(util
                    .format('received cloud9 workspace for user %s,  challenge %s', userId, kataId));
                res.send({ workspace: job.workspace, ip: job.ipAddr, port: job.commPort });
            });
        } catch(err) {
            if(err) console.log('ERR: '+err);
            console.log(util.format('Unable to get container for user %s, challenge %s', userId, kataId));
            res.writeHead(500);
            res.end();
        }
    });

    app.get('/shutdown', function(req, res) {

        var waitId;
        var shuttingDown = function() {
            var fin = arrayOfRunners.some(function(runner){ 
                return !runner.pool;
            });
            if(fin) {
                clearInterval(waitId);
                process.exit();
            } 
        };
        waitId = setInterval(shuttingDown, 400);

        arrayOfRunners.forEach(function(runner) {
            if(!runner.pool) return;
            runner.pool.drain(function() {
                console.log('Shutting down pool: '+runner.name);
                runner.pool.destroyAllNow();
                runner.pool = false;
            });
        });
    });

    app.get('/:runner/shutdown', function(req, res) {
        var name = req.params.runner;
        if(!!runners[name].pool) {
            runners[name].pool.drain(function() {
                console.log('Shutting down pool: '+name);
                runners[name].pool.destroyAllNow();
            });
        }
    });

    app.get('/:runner/test', function(req, res) {
        var startTime = Date.now();
        runners[req.params.runner].test(function(err, job) {
            if(!!err) res.send(errResponse(err));
            else if(!job) res.send(errResponse());
            else res.send(result(job, startTime));
            
            if(!!job) job.cleanup(!!err);
        });
    });

    app.post('/:runner/run', function(req, res) {
        var startTime = Date.now();
        var cStream = createStreamForScript(req.body.code);

        if(!cStream) {
            res.send(getError('Problem streaming from POST')); 
            return;
        }

        var kataId = req.query.refId;

        var cb = function(err, job) {
            if(!!err) res.send(errResponse(err));
            else if(!job) res.send(errResponse());
            else res.send(result(job, startTime));
            
            if(!!job) job.cleanup(!!err);
        };

        runners[req.params.runner].run([cStream], kataId, cb);
    });
    app.listen(internalPort);
})(config);
