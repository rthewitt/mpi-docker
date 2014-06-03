var express = require('express'),
    subdomain = require('express-subdomain-handler'),
    redis = require('redis'),
    util = require('util'),
    httpProxy = require('http-proxy'),
    streamBuffers = require('stream-buffers'),
    ProxyRouter = require('../lib/proxy-router');
//var session = require('cookie-session');

var env = process.env.NODE_ENV || 'development';

module.exports = function(app, config) {

    var host = config.dockerOpts.host || 'localhost';
    var hostname = config.dockerOpts.hostname;

    /*
     * We will add session also, 
     * for /attempt and professor/student/social features
     *
    app.use(express.session({
        secret: 'myelin-cloudspaces'
       }));
       */

    app.use(express.favicon());
    app.use(subdomain({ baseUrl: 'localhost.com', prefix: 'workspace', logger: true}));

    app.use(express.bodyParser());
    app.use(express.static(config.root + '/public'));

    var redisPort = process.env.DB_PORT_6379_TCP_PORT,
        redisHost = process.env.DB_PORT_6379_TCP_ADDR;

    // assert
    if(!redisPort || !redisHost) console.log('FATAL: Redis bridge not found!');

    app.proxyRouter = proxyRouter = new ProxyRouter({
          backend: redis.createClient(redisPort, redisHost),
          cache_ttl: 5
       });

    var proxyServer = require('http').createServer(app);
    app.proxy = proxy = httpProxy.createProxyServer({target: { port: 80 }});

    /*
     if container is used, no good, error
     --check if container is free in pool, last ditch effort check all users for container use
     if container is free, mark as used in Redis, set user:container in Redis, then redirect user to container
    */
    proxy.on('error', function(err) {
        console.log('Proxy error: '+err);
    });

    /*
    proxy.on('proxyRes', function (res) {
      console.log('RAW Response from the target', JSON.stringify(res.headers, true, 2));
    });
    */

    // TODO update this
    proxyServer.on('upgrade', function(req, socket, head) {
        var workspace = req.headers.host.split('.')[0];
        proxyRouter.lookupRouteForContainer(workspace, function(route) {
            proxy.ws(req, socket, head, { 
                target: ('http://'+route.host+':'+route.port)
            });
        });
    });

    proxyServer.on('error', function(err) {
        console.log('exposed server error: '+err);
    });

    return proxyServer;
}
