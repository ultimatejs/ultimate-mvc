UltimateClass.extendBoth({
	makeSync: function() {
		var args = _.toArray(arguments);
	
		if(_.isString(args[0])) {
			var method = args[0];
			return UltimateSync.makeSync(this, method);
		}
		else {
			var context = args[0],
				method = args[1];
			
			return UltimateSync.makeSync(context, method);
		}
	},
	applySync: function() {
		var args = _.toArray(arguments);
		
		if(_.isString(args[0])) { //eg: applySync('methodName', [arg, argEtc])
			var method = args[0],
				args = args[1];
			
			return UltimateSync.applySync(this, method, args);
		}
		else {
			var context = args[0], //pass in a different context than current object, eg: applySync(someObj, 'methodName', [arg, argEtc])
				method = args[1],
				args = args[2];
			
			return UltimateSync.applySync(context, method, args);
		}
	},
	callSync: function() {
		var args = _.toArray(arguments);
		
		if(_.isString(args[0])) { //eg: applySync('methodName', arg, argEtc)
			var method = args[0],
				args = args.slice(1);
			
			return UltimateSync.applySync(this, method, args);
		}
		else {
			var context = args[0], //pass in a different context than current object, eg: applySync(someObj, 'methodName', arg, argEtc)
				method = args[1],
				args = args.slice(2);
			
			return UltimateSync.applySync(context, method, args);
		}
	},
	
	
	POST: function() {
		return UltimateSync.post.apply(UltimateSync, arguments);
	},
	GET: function() {
		return UltimateSync.get.apply(UltimateSync, arguments);
	},
	PUT: function() {
		return UltimateSync.put.apply(UltimateSync, arguments);
	},
	DEL: function() {
		return UltimateSync.del.apply(UltimateSync, arguments);
	}
});