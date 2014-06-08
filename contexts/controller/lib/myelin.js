var fs = require('fs'),
    git = require('git-node'),
    ejs = require('ejs'),
    mktemp = require('mktemp'),
    Ignore = require('fstream-ignore'),
    mv = require('mv'),
    tar = require('tar'),
    zlib = require('zlib'),
    exec = require('child_process').exec,
    util = require('util');

// This doesn't seem to be necessary.
// services can be required from /lib, fix controllers
module.exports = Myelin = function(codeService) {
    this.codeService = codeService;
};

Myelin.prototype.initializeBare = function(path) {
};

// rename this
Myelin.prototype.cloneFromUrl = function(url, workspaceId, cb) {
    console.log('called clone for workspace '+workspaceId);

    var remote = git.remote(url);
    var wsPath = '/user_data/workspaces/'+workspaceId;
    if(fs.existsSync(wsPath)) {
        var gitFolder = git.repo((wsPath+'/.git'));
        gitFolder.fetch(remote, {}, function(err) {
            if(err) cb(err);
            else cb(null);
        });
    } else cb(new Error('Error: no workspace '+workspaceId+' exists'));
};

// Future: get branch from proto
// Current: clone, perform logic that would create that branch
Myelin.prototype.cloneAttemptFromUrl = function(url, workspaceId, cb) {
    var remote = git.remote(url);

    var tmpPath = mktemp.createDirSync(util.format("/tmp/%s-XXXXXX", workspaceId)); // way too long, not reasonable
    var tmpRepo = git.repo(tmpPath);

    console.log('creating temp repo at: '+tmpPath);

    var wsPath = '/user_data/workspaces/'+workspaceId;

    var self = this;
    tmpRepo.fetch(remote, {}, function (err) {
        if (err) cb(err);
        else {
            var promptUser = '// TODO see instructions';
            self.mergeSolution(promptUser, tmpRepo, function(err) {
                if(err) throw err; 
                console.log('after prompt merge');
                mv(tmpPath, wsPath+'/.git', cb);
            });
        }
    });


};


// Is used by submit!!! TODO change that
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
    if(foundInCache=false) {
        // TODO
    } else {
        this.getProtoFromGithub(id, cb);
    }
};

Myelin.prototype.loadChallengeIntoWorkspace = function(id, workspaceId, isEdit, cb) {
    // try to load from folder/cache, otherwise clone
    var wsPath = '/user_data/workspaces/'+workspaceId;
    if(foundInCache=false) {
        // TODO get from local fs
    } else {
        var url = 'https://github.com/rthewitt/'+id+'.git';
        var checkoutHead = function(err) {
            if(err) cb(err);
            else exec('/usr/bin/git checkout HEAD', { cwd: wsPath }, function(cerr, stdout, stderr) {
                console.log('STDOUT from myelin checkout? '+(!!stdout)+': ' + stdout);
                console.log('STDERR from myelin checkout? '+(!!stderr)+': ' + stderr);
                if(cerr) console.log('CODE: '+cerr.code);
                var retErr = !!cerr ? cerr : (!!stderr ? stderr : null);
                cb(retErr); 
            });
        };
        if(isEdit) this.cloneFromUrl(url, workspaceId, checkoutHead);
        else this.cloneAttemptFromUrl(url, workspaceId, checkoutHead);
        /* Will place in local storage/cache
        this.getProtoFromGithub(id, function(err, tmpPath) {
            if(err) { cb(err); return; }
            fs.rename(tmpPath, wsPath+'/.git', checkoutHead);
        });
        */
    }
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
      console.log("TREE", util.inspect(tree));
      tree.forEach(function(entry, index, coll) {
          if(entry.name === 'config.js') {
            tmpRepo.loadAs("text", entry.hash, function(err, file) {
                // we may actually want to use a properties file or something
                try {
                    var config = requireFromString(file);
                    // TODO actually get the appropriate template
                    // also consider an actual file update instead of template...
                    console.log('CONFIG: '+util.inspect(config));
                    config.templates.forEach(function(tpl) {
                        var templatePath = util.format('%s/%s', config.templateDir, tpl);
                        var templateName = tpl;
                        coll.forEach(function(baseFolder) {
                            if(baseFolder.name === config.templateDir) {
                                loadTree(tmpRepo, baseFolder.hash, function(err, tDir, hash) {
                                    if(err) throw err; // TODO
                                    tDir.forEach(function(tFile) {
                                        if(tFile.name === templateName)
                                            tmpRepo.loadAs("text", tFile.hash, function(err, template) {
                                                var model = {
                                                    changes: {
                                                        template: template,
                                                        solution: userSolution
                                                    },
                                                    filename: templateName, 
                                                    solutionDir: config.solutionDir,
                                                    parent: {
                                                        tree: coll, // TODO check if this works now that we have subdirectory
                                                        hash: CHEATING
                                                    },
                                                    repo: tmpRepo
                                                }
                                                console.log('reached commit changes');
                                                commitChanges(model, cb);
                                            });
                                    });
                                });
                            }
                        });
                    })
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

        var sDir = {};
        sDir[model.filename] = { mode: 0100644, hash: hash };

        model.repo.saveAs('tree', sDir, function(err, sDirHash) {
            var treeObj = {};
            model.parent.tree.forEach(function(entry){
                // overwrite solution directory with user files if it exists
                // hint: we should remove this by now, or store it elsewhere
                if(entry.name === model.solutionDir) treeObj[entry.name] = { mode: 040000, hash: sDirHash };
                else treeObj[entry.name] = { mode: entry.mode, hash: entry.hash };
            });

            treeObj[model.filename] = { mode: 0100644, hash: hash };

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

    });
}

