var httpProxy = require('http-proxy');
var http = require('http');

var proxy = httpProxy.createProxyServer({ 
    target: 'http://172.17.0.4:8080'
});

var proxyServer = http.createServer(function(req, res) {
    proxy.web(req, res);
});

    proxyServer.on('error', function(e) {
          console.log("Got error: " + e.message);
    });
    proxy.on('error', function(e) {
          console.log("Got error: " + e.message);
    });

proxyServer.on('upgrade', function(req, socket, head) {
    console.log('upgrade received');
    proxy.ws(req, socket, head);
});
proxyServer.on('connect', function() {
    console.log('connect received');
});

proxyServer.listen(2222);
