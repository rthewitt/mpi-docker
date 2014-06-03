var redis = require('redis');

var ProxyRouter = function(options) {
   if(!options.backend) {
      throw "Backend required for ProxyRouter.  Please provide options.backend!";
   }

   this.client = options.backend;
   this.cache_ttl = (options.cache_ttl || 10) * 1000;
   this.cache = {};

   console.log("ProxyRouter cache TTL is set to " + this.cache_ttl + " ms.");
};


// FIXME 
ProxyRouter.prototype.lookupRouteForContainer = function(containerId, callback) {
   var self = this;
   if(!this.cache[containerId]) {
      console.log('Looking in redis: workspace with id: ' + containerId);

      this.client.hget('routes', containerId, function(err, data) {
         if(data) {
            // lookup
            var route = data.split(':');
            var target = {host: route[0], port: route[1]};

            // set cache and expiration
            self.cache[containerId] = target;
            self.expireRoute(containerId, self.cache_ttl);

            callback(target);
         } else {
            callback(null);
         }
      });
   } else {
      callback(this.cache[containerId]);
   }
};

ProxyRouter.prototype.isContainerFree = function(containerId, callback) {
   this.client.hget('active_containers', containerId, function(err, data) {
       if(err) throw new Error('ERROR: '+err);
       else callback(!data);
   });
}

ProxyRouter.prototype.setRouteForContainer = function(containerId, ip, port) {
    var route = (ip+':'+port);
    this.client.hset('routes', containerId, route, redis.print);
}

ProxyRouter.prototype.setSessionForContainer = function(sessionId, containerId) {
    this.client.hset('session_container', sessionId, containerId);
    this.client.hset('active_containers', containerId, sessionId);
}

ProxyRouter.prototype.flush = function() {
   this.cache = {};
}

ProxyRouter.prototype.flushRoute = function(userId) {
   delete(this.cache[userId]);
};

ProxyRouter.prototype.expireRoute = function(userId, ttl) {
   var self = this;
   setTimeout(function() {
      self.flushRoute(userId);
   }, ttl);
}

module.exports = ProxyRouter;
