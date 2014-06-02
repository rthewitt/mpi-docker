var express = require('express');

var env = process.env.NODE_ENV || 'development';

module.exports = function(app, config) {
    app.use(express.favicon());
    app.use(express.static(config.root + '/public'));
}
