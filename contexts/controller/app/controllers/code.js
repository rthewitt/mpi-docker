module.exports = function(runner, proxy) {

    var storePort = process.env.STORE_PORT_80_TCP_PORT,
        storeHost = process.env.STORE_PORT_80_TCP_ADDR,
        storeURI = 'http://'+storeHost+':'+storePort;

    var routes = {};

    routes.show = function(req, res) {
        res.sendfile('/index.html', {root: './public'});
    };

    routes.glNotFound = function(req, res) {
        res.send('gitlab not yet handled');
    };

    routes.storeProxy = function(req, res) {
        /* This will be handled elsewhere?
        var workspace = req.params.workspace;
        req.workspace = workspace;
        var undoRegxp = util.format('/workspace/%s', workspace);
        */
        console.log('gitlab proxy');
        console.log('url before: '+req.url);
        req.url = req.url.replace('/workspace/gitlab', '');
        console.log('url after: '+req.url);
        proxy.web(req, res ,{ target: storeURI }); 
    };

    // TODO Use service layer method now!
    routes.eval = function(req, res) {

        var buf = new Buffer(body.toString('binary'), 'binary');

        var startTime = Date.now();
        var cStream = createStreamForScript(req.body.code);
        var kataId = req.query.refId;

        if(!cStream) {
            res.send(getError('Problem streaming from POST')); 
            return;
        }

        // passing in request to pipe directly
        runners.run([req, kataId, startTime], kataId, function(err, job, results) {
            if(!!err) res.send(errResponse(err));
            // modify instrument to take an initial time
            job.instrument('sending test results.');
            res.json({results: results});
        });
    };

    return routes;
};
