var assert = require('assert');

module.exports = function(app, runners) {

    assert(!!app.proxy);
    assert(!!app.proxyRouter);

    var CodeService = require('../app/service/codeService');
    var codeService = new CodeService(runners);

    // make this automatic, somehow bring into Basilisk / architecture
    var docker = require('../app/controllers/docker')(runners),
        c9 = require('../app/controllers/c9')(runners['c9'], app.proxy, app.proxyRouter),
        code = require('../app/controllers/code')(runners['code']),
        myelin = require('../app/controllers/myelin')(codeService);

    app.get('/', code.show);
    app.get('/code', code.show);
    app.post('/code/eval', code.eval);

    app.get('/attempt/:refId', c9.assign);
    app.get('/workspace/:workspace/*', c9.proxy);

    app.get('/myelin/show', myelin.show);
    //app.get('/:action', myelin.myelinAction); // change
    app.post('/kata/submit', myelin.submitChallenge); // change
};
