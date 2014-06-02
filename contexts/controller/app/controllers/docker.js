module.exports = function(runners) {
    var routes = {};

    var arrayOfRunners = [];
    for(r in runners) {
        arrayOfRunners.push(runners[r]);
    }

    routes.shutdownAll = function(req, res) {

        var waitId;
        var shuttingDown = function() {
            var fin = arrayOfRunners.some(function(runner){ 
                return !runner.pool;
            });
            if(fin) {
                clearInterval(waitId);
                process.exit();
            } 
        };
        waitId = setInterval(shuttingDown, 400);

        arrayOfRunners.forEach(function(runner) {
            if(!runner.pool) return;
            runner.pool.drain(function() {
                console.log('Shutting down pool: '+runner.name);
                runner.pool.destroyAllNow();
                runner.pool = false;
            });
        });
    };

    routes.shutdownRunner = function(req, res) {
        var name = req.params.runner;
        if(!!runners[name].pool) {
            runners[name].pool.drain(function() {
                console.log('Shutting down pool: '+name);
                runners[name].pool.destroyAllNow();
            });
        }
    };

    return routes;
};

