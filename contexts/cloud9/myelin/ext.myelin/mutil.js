/**
 * Myelin Utils - cleaning out my code
 * and temporary ajax workaround
 */
define(function(require, exports, module) {

module.exports = {
     sendAjaxRequest: function(ajax) {
       var xmlHttp = new XMLHttpRequest();
       ajax.isPOST = (ajax.method.toUpperCase() == 'POST' && ajax.params);
       ajax.params = ajax.params || '';

       if(ajax.method.toUpperCase() == 'GET')
           ajax.url += '?'+ajax.params;
       else if(!isPOST)
           return; 
       
       xmlHttp.open(ajax.method, ajax.url, true);

       if(ajax.isPOST) {
           xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
           xmlHttp.setRequestHeader("Content-length", ajax.params.length);
           xmlHttp.setRequestHeader("Connection", "close");
         }

       xmlHttp.onreadystatechange = function() {
           if(xmlHttp.readyState == 4) {
               if(xmlHttp.status == 200) {
                   if(ajax.success) 
                       ajax.success(xmlHttp.responseText);
               } else if(ajax.failure) ajax.failure();
           } 
       }
       if(ajax.isPOST) xmlHttp.send(ajax.params);
       else xmlHttp.send(); // may be redundant
      }
};

});
