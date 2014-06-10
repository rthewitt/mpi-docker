var util = require('util'),
    env = process.env.NODE_ENV || 'development',
    config = require('../../config/config')[env];

module.exports = function(runner, proxy, proxyRouter, myelin) {
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


    routes.assignAttempt = function(req, res) {
        return routes.assign(req, res, false);
    };

    routes.assignNew = function(req, res) {
        return routes.assign(req, res, true, true);
    };

    routes.assignEdit = function(req, res) {
        return routes.assign(req, res, true);
    };

    // Assume they have no workspace for now
    routes.assign = function(req, res, isEdit, isNew) {
        var userId = req.query.userId;
        var kataId = isNew ? 'example' : req.params.refId;
        try {
            runner.run([userId, kataId], kataId, function(err, job) {
                job.instrument(util
                    .format('received cloud9 workspace for user %s,  challenge %s', userId, kataId));

                proxyRouter.isContainerFree(job.workspace, function(isOk) {
                    if(isOk) {
                        proxyRouter.setSessionForContainer('SOMEBODY_SESSION', job.workspace);
                        proxyRouter.setRouteForContainer(job.workspace, job.ipAddr, job.commPort);
                        var location = util.format('http://%s.%s', job.workspace, config.domain);
                        res.redirect(302, location);

                        myelin.loadChallengeIntoWorkspace(kataId, job.workspace, isEdit, function(err) {
                            if(err) throw err; // TODO
                        });

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
