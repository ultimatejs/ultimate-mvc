Future = Npm.require('fibers/future');

UltimateSync = Ultimate('UltimateSync').extends(UltimateClass, {}, {
	makeSync: function(context, method) {
	  	return function (/* arguments */) {
	  		var fn = context[method],
				newArgs = _.toArray(arguments),
				callback;

	    for (var i = newArgs.length - 1; i >= 0; --i) {
	      	var arg = newArgs[i],
	      		type = typeof arg;

	      	if (type !== "undefined") {
	        	if (type === "function") callback = arg;
	        	break;
	      	}
	    }

	    if(!callback) {
      	var fut = new Future();
	      	
				callback = function(error, data) {
			  	fut.return({error:  error, data: data});
				};
			
      	++i; 
	    }

	    newArgs[i] = Meteor.bindEnvironment(callback);
	    var result = fn.apply(context, newArgs);
	    return fut ? fut.wait() : result;
	  };
	},
	applySync: function(context, method, argsArray) {
	  var syncFunc = UltimateSync.makeSync(context, method);
		return syncFunc.apply(context, argsArray);
	},
	callSync: function(context, method,  a, b, c, d, e, f) {
	  var syncFunc = UltimateSync.makeSync(context, method);
		return syncFunc.call(context, a, b, c, d, e, f);
	},
	
	
	post: function() {
		return UltimateSync.applySync(HTTP, 'post', arguments);
	},
	get: function() {
		return UltimateSync.applySync(HTTP, 'get', arguments);
	},
	put: function() {
		return UltimateSync.applySync(HTTP, 'put', arguments);
	},
	del: function() {
		return UltimateSync.applySync(HTTP, 'del', arguments);
	}
});