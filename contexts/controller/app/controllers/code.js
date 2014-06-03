module.exports = function(runner) {
    var routes = {};

    routes.show = function(req, res) {
        res.sendfile('/index.html', {root: './public'});
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
