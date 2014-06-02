/*
    This server will contain the actual js-git handlers
*/
var Myelin = require('./lib/myelin'),
    express = require('express'),
    bodyParser = require('body-parser');
var myelin = new Myelin();

var app = express();
app.use(bodyParser());

// Setup test maybe?
//app.use(express.static(__dirname + '/public'))
//    .use(express.favicon())
//    TODO make this true REST
app.get('/:action', function(req, res) {
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
});

app.post('/submit', function(req, res){
/*
*  1. load config file
*  2. load template file based on config (stub)
*  3. use existing sting to merge with template
*  4. create tree 
*/
    // get unmerged challenge (repo) by ID (id) -> (repo)
    // create solution attempt merge commit (solutionObj, repo) -> (fs-path)
    // pipe existing folder to response
});

app.listen(7777);

console.log('app started on 7777');
