var httpProxy = require('http-proxy');
var http = require('http');

var proxy = httpProxy.createProxyServer({ 
    /*
    target: {
        //host: 'localhost',
        //host: '172.17.42.1',
        host: '172.17.0.5',
        port: 8080
    }, ws: true
    */
});

var proxyServer = http.createServer(function(req, res) {
    proxy.web(req, res, {target: 'http://172.17.0.4:8080'});
});

    proxyServer.on('error', function(e) {
          console.log("Got error: " + e.message);
    });
    proxy.on('error', function(e) {
          console.log("Got error: " + e.message);
    });

proxyServer.on('upgrade', function(req, socket, head) {
    console.log('upgrade received');
    proxy.ws(req, socket, head, {target: 'http://172.17.0.4:8080'});
});
proxyServer.on('connect', function() {
    console.log('connect received');
});

proxyServer.listen(2222);
