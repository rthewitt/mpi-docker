var util = require('util');

module.exports = function(runner, proxy, proxyRouter) {
    var routes = {};

    routes.proxy = function(req, res) {
        var workspace = req.params.workspace;
        req.workspace = workspace;
        var undoRegxp = util.format('/workspace/%s', workspace);
        req.url = req.url.replace(undoRegxp, '');
       proxyRouter.lookupRouteForContainer(req.params.workspace, function(route) {
           if(route) { // redirect to container
               proxy.web(req, res ,{
                   target: ('http://'+route.host+':'+route.port)
               }); 
           } else res.send(404, '404 Workspace Not Found');
       });
    };

    routes.assign = function(req, res) {
        var userId = req.query.userId;
        var kataId = req.params.refId;
        try {
            runner.run([userId, kataId], kataId, function(err, job) {
                job.instrument(util
                    .format('received cloud9 workspace for user %s,  challenge %s', userId, kataId));

                proxyRouter.isContainerFree(job.workspace, function(isOk) {
                    if(isOk) {
                        proxyRouter.setSessionForContainer('SOMEBODY_SESSION', job.workspace);
                        proxyRouter.setRouteForContainer(job.workspace, job.ipAddr, job.commPort);
                        var TEMP_location = 'http://'+job.workspace+'.localhost.com';
                        res.redirect(302, TEMP_location);
                    } else throw new Error('CONTAINER IS NOT REALLY FREE, HANDLE ME!!'); // TODO
                });
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
