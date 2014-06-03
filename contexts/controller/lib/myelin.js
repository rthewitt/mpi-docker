var fs = require('fs'),
    git = require('git-node'),
    ejs = require('ejs'),
    mktemp = require('mktemp'),
    Ignore = require('fstream-ignore'),
    tar = require('tar'),
    zlib = require('zlib'),
    util = require('util');

module.exports = Myelin = function(codeService) {
    this.codeService = codeService;
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


Myelin.prototype.getProtoFromGithub = function(id, cb) {
    //var url = "git@github.com:/rthewitt/"+id;
    var url = "https://github.com/rthewitt/"+id+".git";
    var remote = git.remote(url);

    var tmpPath = mktemp.createDirSync(util.format("%s-XXXXXX", id));
    var tmpRepo = git.repo(tmpPath);

    console.log('creating temp repo at: '+tmpPath);

    tmpRepo.fetch(remote, {}, function (err) {
        if (err) cb(err, null);
        else cb(null, tmpPath);
    });
};

// We may have these in volume, db, gitlab, github
// Regardless, there should be a cache of recently
// obtained challenges. Avoid cloning if possible.
Myelin.prototype.getChallengePrototype = function(id, cb) {
    this.getProtoFromGithub(id, cb);
};

function loadCommit(repo, hashish, onCommit) {
    repo.loadAs("commit", hashish, onCommit);
}

// pass path or repo
Myelin.prototype.mergeSolution = function(userSolution, tmp, cb) {
    var tmpRepo = (typeof tmp === 'string') ? git.repo(tmp) : tmp;

    // TODO understand what needs to be loaded and why
    // TODO test with multiple commits on remote
    var CHEATING;

    function myOnCommit(err, commit, hash) {
      if (err) throw err;
      CHEATING = hash;
      loadTree(tmpRepo, commit.tree, myOnTree);
      if (commit.parents) {
        commit.parents.forEach(function(e, i, coll) {
            // Add some logic here
            tmpRepo.loadAs(e, myOnCommit);
        });
      }
    }

    // Will be called multiple times, so CHANGE THIS
    function myOnTree(err, tree, hash) {
      if (err) throw err;
      //console.log("TREE", hash, tree);
      tree.forEach(function(entry, index, coll) {
          if(entry.name === 'config.js') {
            tmpRepo.loadAs("text", entry.hash, function(err, file) {
                // we may actually want to use a properties file or something
                try {
                    var config = requireFromString(file);
                    // TODO actually get the appropriate template
                    // also consider an actual file update instead of template...
                    var templatePath = config.templatePath || '/userSol.ejs';
                    var templateName = templatePath.split('/')[1];
                    coll.forEach(function(otherEntry) {
                        if(otherEntry.name === templateName) 
                            tmpRepo.loadAs("text", otherEntry.hash, function(err, template) {
                                var model = {
                                    changes: {
                                        template: template,
                                        solution: userSolution
                                    },
                                    filename: templateName, // TODO why does this exist
                                    parent: {
                                        tree: coll,
                                        hash: CHEATING
                                    },
                                    repo: tmpRepo
                                }
                                console.log('reached commit changes');
                                commitChanges(model, cb);
                            });
                    });
                } catch(err) {
                    console.log('problem loading config: '+err);
                }
            });
          }
      });
    }

      loadCommit(tmpRepo, 'HEAD', myOnCommit);
};

Myelin.prototype.getAsTarballStream = function(repoPath) {
    var gzStream = zlib.createGzip()
    // possibly add these ignore files in Myelin
    Ignore({ path: repoPath, ignoreFiles: [".ignore", ".gitignore"] })
        .on("child", function(c) {
            console.error(c.path.substr(c.root.path.length + 1));
        })
        .on('error', function(e) {
            console.error(e); // err callback
        }) // ??
        .pipe(tar.Pack())
        .pipe(gzStream);

    return gzStream;
}

function loadTree(repo, hash, onTree) {
  repo.loadAs("tree", hash, onTree);
}

function requireFromString(src, filename) {
    var Module = module.constructor;
    var m = new Module();
    m._compile(src, filename);
    return m.exports;
}

// Change model to be future proof (new API on js-git master)
function commitChanges(model, done) {
    var mergedSolution = ejs.render(model.changes.template, {
        user: { solution: model.changes.solution },
        filename: model.filename // FIXME ??? does this need to exist?
    });
    console.log('MERGED::: \n'+mergedSolution); // TODO remove!
    console.log('mergedSolution done, now saving');
    model.repo.saveAs('blob', mergedSolution, function(err, hash) {
            console.log('NEW-BLOB='+hash);
        if(err) throw err;
        //var jsName = filename.replace(new RegExp('ejs$'), 'js');

        var treeObj = {};
        model.parent.tree.forEach(function(entry){
            treeObj[entry.name] = { mode: entry.mode, hash: entry.hash };
        });

        // new solution file
        var jsName = "userSol.js";
        treeObj[jsName] = { mode: 0100644, hash: hash };

        model.repo.saveAs('tree', treeObj, function(err, treeHash) {
            if(err) throw err;
            console.log('TREE='+treeHash);
            model.repo.saveAs('commit', {
                parents: [model.parent.hash],
                tree: treeHash,
                author: { name: "Me", email: "nope@nope.com", date: new Date },
                message: "generated"
            }, function(err, commitHash){
                console.log('COMMIT='+commitHash);
                if(err) throw err;
                model.repo.setHead('refs/heads/master', function(err){if(err) throw err;
                    model.repo.updateHead(commitHash, done);
                });
            });
        });
    });
}


