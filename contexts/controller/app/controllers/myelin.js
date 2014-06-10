module.exports = function(myelin, codeService) {
    var routes = {};

    routes.show = function(req, res) {
        res.send('MYELIN');
    };

    routes.myelinAction = function(req, res) {
        if(req.params.action === 'init') {
            var userId = req.query.userId;
            var kataId = req.query.refId;
            var workspaceId = req.query.workspaceId;
            var url = decodeURIComponent(req.query.url);
            try {
                myelin.cloneFromUrl(url, workspaceId);
            } catch(err) {
                console.log('Error: '+err);
                res.writeHead(500);
                res.end();
            }
        } else {
            console.log('unrecognized action');
            throw "unrecognized action";
        }
    };

    // workspaceId, verify=true
    // why are we even doing this?  It can/should be handled with git/hooks/build-server
    routes.createNewChallenge = function(req, res) {
        var userWorkspace = req.query.workspaceId; // TODO get from cookie
        var verify = req.query.verify;
        myelin.copyFromWorkspace(workspaceId, function(err, tmpPath) {
            if(err) {
                res.writeHead(500);
                res.end();
            } else {
                if(!!verify) {
                    myelin.getAuthorSolution(solution, tmpPath, function(err) { // TODO
                        if(err) throw err;
                        console.log('after merge from author update');
                    });
                } else {
                    myelin.createChallenge(tmpPath, function(err, id) {
                        if(err) {
                            res.writeHead(500);
                            res.end();
                        } else res.json({ id: id });
                    });
                }
            }
        });
    };

    routes.checkoutAttempt = function(req, res) {
        return routes.checkout(req, res, false);
    };

    routes.checkoutEdit = function(req, res) {
        return routes.checkout(req, res, true);
    };

    routes.checkout = function(req, res, isEdit) {
        console.log('TODO: edit='+isEdit);
    };

    routes.submitChallenge = function(req, res) {
        console.log('received submission request');
        var id = req.body.id;
        var solution = req.body.solution;

        myelin.getChallengePrototype(id, function(err, tmpPath) {
            if(err) throw err;
            console.log('received path: '+tmpPath);
            myelin.mergeSolution(solution, tmpPath, function(err) {
                if(err) throw err; 
                console.log('after merged');
                var tgzStream = myelin.getAsTarballStream(tmpPath);

                codeService.evalSubmission(tgzStream, id, function(err, job, results) {
                    if(err) {
                        console.log('error in submit: '+err);
                        res.writeHead(500);
                        res.end(); // create a utils function like before
                    } else res.json({ results: results });
                });
            });
        });
    };

    routes.notFound = function(req, res) {
        res.writeHead(404);
        res.end();
    };

    return routes;
};
