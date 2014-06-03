var Myelin = require('../../lib/myelin');
var myelin = new Myelin(); 

module.exports = function(codeService) {
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

    routes.submitChallenge = function(req, res) {

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

    return routes;
};

