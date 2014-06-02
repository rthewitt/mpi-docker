var Myelin = require('../../lib/myelin');
var myelin = new Myelin();


exports.show = function(req, res) {
    res.send('MYELIN');
};

exports.myelinAction = function(req, res) {
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

exports.submitChallenge = function(req, res) {
    res.writeHead(500);
    res.end();
/*
*  1. load config file
*  2. load template file based on config (stub)
*  3. use existing sting to merge with template
*  4. create tree 
*/
    // get unmerged challenge (repo) by ID (id) -> (repo)
    // create solution attempt merge commit (solutionObj, repo) -> (fs-path)
    // pipe existing folder to response
};
