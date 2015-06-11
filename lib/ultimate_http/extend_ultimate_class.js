UltimateClass.extendStatic({
	extendHttp: function(methods) {
		var constructClient = null;
	
		if(methods['constructClient']) {
			constructClient = methods['constructClient'];
			delete methods['constructClient'];
		}
	
		var http = new UltimateHttp(this, methods, constructClient);
		http.connect();
	},
	extendHttpStatic: function(methods) {
		var http = new UltimateHttp(this, methods, null, true);
		http.connect();
	},


	onClassCreated: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods) {
		if(!_.isEmpty(httpMethods)) this.extendHttp(httpMethods);
    if(!_.isEmpty(staticHttpMethods)) this.extendHttpStatic(staticHttpMethods);
	}
});


UltimateClass.extend({
	transformClient: function() { 
		this.__type = this.__type; //tack these props from the prototype on the actual instance
		this.className = this.className; //so they will be stringified below
		
		try {
			var str = EJSON.stringify(this);
		}
		catch(e) {
			var msg = 'MOST LIKELY A CIRCULAR REFERENCE ISSUE. ';
			msg += 'YOU CANNOT COMPOSE OBJECTS OF OBJECTS THAT REFERENCE THE INITIAL COMPOSER, ETC. SORRY.'
			throw new Meteor.Error('circular-reference', msg);
		}
		
		var obj = EJSON.parse(str); //deep copy while removing functions; may not be needed since Meteor.call may handle it
		
		delete obj.___dep;
		delete obj._local;
		return obj;
	},
	transformServer: function(clientObj) {
		function iterate(obj, serverObj) {
		    for(var prop in obj) {
          		if(obj[prop] && obj[prop].className)  { //instance extended from our classes
					var className = obj[prop].className,
						Class = Ultimate.classes[className];

					if(Class.isBehavior) serverObj[prop] = obj[prop]; //will be handled in meteor_methods.js via attachBehaviors(), but only goes one level deep
					else {
						var newObj = new Class('no_params');
						serverObj[prop] = newObj.transformServer(obj[prop]); //recursively transform this nested instance
					}
          		} 
				else {
					if(typeof obj[prop] == "object") serverObj[prop] = iterate(obj[prop], {}); //standard objects
					else serverObj[prop] = obj[prop]; //basic types
				}
		    }
		    
			return serverObj;
		}	
		
		return iterate(clientObj, this);
	},
	
	
	check: function() {
		if(this._schema) check(this, this._schema);
	}
});