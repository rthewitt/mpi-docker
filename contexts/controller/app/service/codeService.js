var CodeService = function(runners) {
    this.runner = runners['code'];
};

CodeService.prototype.evalSubmission = function(tgzStream, refId, cb) {
    var startTime = Date.now();
    this.runner.run([tgzStream, refId, startTime], refId, cb);
};

module.exports = CodeService;
