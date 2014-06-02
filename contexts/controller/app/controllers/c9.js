var util = require('util');

module.exports = function(runner) {
    var routes = {};

    routes.assign = function(req, res) {
        var userId = req.query.userId;
        var kataId = req.query.refId;
        try {
            runner.run([userId, kataId], kataId, function(err, job) {
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
    };

    return routes;
}
