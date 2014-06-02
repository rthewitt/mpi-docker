//var myelin = require('../app/controllers/myelin');

module.exports = function(app, runners) {

    // make this automatic, somehow bring into Basilisk / architecture
    var docker = require('../app/controllers/docker')(runners);
        c9 = require('../app/controllers/c9')(runners['c9']),
        code = require('../app/controllers/code')(runners['code']);

    app.get('/', code.show);
    app.get('/code', code.show);
    app.post('/code/eval', code.eval);

    app.get('/assign', c9.assign);


    /*
    app.get('/myelin/show', myelin.show);
    app.get('/:action', myelin.myelinAction); // change
    app.post('kata/submit', myelin.submitChallenge); // change
    */
};
