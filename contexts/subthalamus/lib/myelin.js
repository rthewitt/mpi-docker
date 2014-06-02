var fs = require('fs'),
    git = require('git-node'),
    ejs = require('ejs'),
    util = require('util');

var Myelin = function() {
};

Myelin.prototype.initializeBare = function(path) {
};

// rename this
Myelin.prototype.cloneFromUrl = function(url, workspaceId) {
    console.log('called clone for workspace '+workspaceId);

    var remote = git.remote(url);
    var wsPath = '/user_data/workspaces/'+workspaceId;
    if(fs.existsSync(wsPath)) {
        var gitFolder = git.repo((wsPath+'/.git'));
        gitFolder.fetch(remote, {}, function(err) {
            if(err) throw err;
            console.log('finished');
        });
    } else {
        console.log('Error: no workspace '+workspaceId+' exists');
    }
};

Myelin.prototype.testUserSubmition = function() {
});

module.exports = Myelin;

/*
 * COMES FROM JS-GIT TEST FOLDER
 */

/*
*  1. load config file
*  2. load template file based on config (stub)
*  3. use existing sting to merge with template
*  4. create tree 
*/
// TODO test with multiple commits on remote

var url = "http://localhost/git/001";
var remote = git.remote(url);
var merged = git.repo("merged");

merged.fetch(remote, {}, function (err) {
    if (err) throw err;
    loadCommit("HEAD");
});

var CHEATING;

function loadCommit(hashish) {
  merged.loadAs("commit", hashish, onCommit);
}

function onCommit(err, commit, hash) {
  if (err) throw err;
  //console.log("COMMIT", hash, commit);
  CHEATING = hash;
  loadTree(commit.tree);
  if (commit.parents) {
    commit.parents.forEach(loadCommit);
  }
}

function loadTree(hash) {
  merged.loadAs("tree", hash, onTree);
}

function onTree(err, tree, hash) {
  if (err) throw err;
  //console.log("TREE", hash, tree);
  for(var e in tree) {
      var entry = tree[e];
      if(entry.name !== 'config.js') continue;
      else {
        merged.loadAs("text", entry.hash, function(err, file) {
            // STUB
            var stub = __dirname + '/stub';
            var userSolution = fs.readFileSync(stub, 'utf-8');
            // we may actually want to use a properties file or something
            try {
                var config = requireFromString(file);
                var templatePath = config.templatePath || '/userSol.ejs';
                var templateName = templatePath.split('/')[1];
                for(var oe in tree) {
                    if(tree[oe].name === templateName) 
                        merged.loadAs("text", tree[oe].hash, mergeTemplate(userSolution, templateName, tree, CHEATING));
                }
            } catch(err) {
                console.log('problem loading config: '+err);
            }
        });
      }
  }
}

function requireFromString(src, filename) {
    var Module = module.constructor;
    var m = new Module();
    m._compile(src, filename);
    return m.exports;
}


function mergeTemplate(solution, filename, parentTree, parentHash) {
    return function(err, template) {
        if(err) throw err; // TODO
        var mergedSolution = ejs.render(template, {
            user: { solution: solution },
            filename: filename // FIXME
        });
        merged.saveAs('blob', mergedSolution, function(err, hash) {
                console.log('NEW-BLOB='+hash);
            if(err) throw err;
            //var jsName = filename.replace(new RegExp('ejs$'), 'js');

            var treeObj = {};
            for(var e in parentTree) {
                var entry = parentTree[e];
                treeObj[entry.name] = { mode: entry.mode, hash: entry.hash };
            }
            // new solution file
            var jsName = "userSol.js";
            treeObj[jsName] = { mode: 0100644, hash: hash };

            merged.saveAs('tree', treeObj, function(err, treeHash) {
                if(err) throw err;
                console.log('TREE='+treeHash);
                merged.saveAs('commit', {
                    parents: [parentHash],
                    tree: treeHash,
                    author: { name: "Me", email: "nope@nope.com", date: new Date },
                    message: "generated"
                }, function(err, commitHash){
                console.log('COMMIT='+commitHash);
                    if(err) throw err;
                    merged.setHead('refs/heads/master', function(err){if(err) throw err;
                        merged.updateHead(commitHash, function(err) {
                            if(err) throw err;
                            console.log("damn that's nasty");
                        });
                    });
                });
            });
        });
    };
}
