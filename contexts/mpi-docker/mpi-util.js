var net = require('net');
    util = require('util'),
    config = require('./config')

module.exports = {

    getClientForContainer: function (job, isOutput, handlers) {

        var name = isOutput ? 'oClient' : 'client'; // for logs

        if(!handlers['data']) throw new Error('data handler not provided');

        var onData = handlers['data'];
        var onError = handlers['error'] || function(err) {
            job.report(util.format('%s socket error: %s', name, err));
        };
        var onRead = handlers['readable'] || function() { 
            job.report(util.format('%s socket received readable', name));
        };
        var onFinish = handlers['finish'] || function() {
            job.report(util.format('%s socket finished', name));
        };
        var onEnd = handlers['end'] || function() {
            job.instrument(util.format('%s socket ended', name));
        };

        var newClient = net.connect(config.dockerOpts.port, config.dockerOpts.hostname, function() {
            // only until we verify clojure under load
            // earlier release had problems with gc
            if(isOutput) job.oClient = newClient;
            else job.client = newClient;

            newClient.name = name;

            newClient.on('error', onError);
            newClient.on('readable', onRead);
            newClient.on('data', onData);
            newClient.on('finish', onFinish);
            newClient.on('end', onEnd);

            var sin, sout, serr;
            sin = isOutput ? '0' : '1';
            sout = serr = isOutput ? '1' : '0';

            newClient.write('POST /'+config.dockerOpts.version+'/containers/' + job.id + '/attach?stdin='+sin+'&stdout='+sout+'&stderr='+serr+'&stream=1 HTTP/1.1\r\n' +
                'Content-Type: application/vnd.docker.raw-stream\r\n\r\n');
        });

        return newClient;
    }
}
