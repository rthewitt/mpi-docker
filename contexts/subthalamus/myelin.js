var fs = require('fs'),
    git = require('git-node');

var Myelin = function() {
};

Myelin.prototype.initializeBare = function(path) {
};

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

module.exports = Myelin;
