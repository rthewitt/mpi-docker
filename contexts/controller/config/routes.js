var assert = require('assert');

module.exports = function(app, runners) {

    assert(!!app.proxy);
    assert(!!app.proxyRouter);

    var CodeService = require('../app/service/codeService');
    var codeService = new CodeService(runners);
    var MyelinService = require('../lib/myelin');
    var myelinService = new Myelin(); 

    // make this automatic, somehow bring into Basilisk / architecture
    var docker = require('../app/controllers/docker')(runners),
        c9 = require('../app/controllers/c9')(runners['c9'], app.proxy, app.proxyRouter, myelinService),
        code = require('../app/controllers/code')(runners['code']),
        myelin = require('../app/controllers/myelin')(myelinService, codeService);

    /*
     *  Intercept for Ajax requests from c9
     *  can also be mapped directly for test UI
     *
     *  subdomain-handler will redirect xxx.mpi.com/myelin/{ajax-url} to
     *  mpi.com/workspace/xxx/myelin/{ajax-url}
     */
    app.get('/workspace/:workspace/myelin/show', myelin.show);
    app.get('/workspace/:workspace/myelin/attempt/:refId', myelin.checkoutAttempt); // load into existing
    app.get('/workspace/:workspace/myelin/edit/:refId', myelin.checkoutEdit); // Author permissions required
    // consider PUT instead
    app.post('/workspace/:workspace/myelin/edit/:refId', myelin.TODO); // Author permissions required
    app.post('/workspace/:workspace/myelin/submit', myelin.submitChallenge); // change
    app.get('/workspace/:workspace/myelin/*', myelin.notFound); // stopper to avoid c9 proxy

    /* Will allow passing on to c9.  I do not have a use case for this.
    app.get('/workspace/:workspace/myelin/example', function(req, res, next) {
        res.write('myelin received\n');
        next();
    });
    */

    // This test UI will serve as mockup UI for simple embedding
    app.get('/', code.show);
    app.get('/code', code.show);
    app.post('/code/eval', code.eval);

    // no workspace at all, will assign & redirect to c9.proxy
    // but not before calling myelin:
    app.get('/attempt/:refId', c9.assignAttempt);
    app.get('/edit/:refId', c9.assignEdit); // Author permissions required
    app.all('/workspace/:workspace/*', c9.proxy);

    // Test / direct calls 
    // these should both work, maybe combine these above using route array
    app.get('/myelin/show', myelin.show);
    app.get('/myelin/attempt/:refId', myelin.checkoutAttempt);
    app.get('/myelin/edit/:refId', myelin.checkoutEdit); // Author permissions required
    // consider PUT instead
    app.post('/myelin/edit/:refId', myelin.TODO); // Author permissions required
    app.post('/myelin/submit', myelin.submitChallenge); // change
};
