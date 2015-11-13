UltimateHttp.extend({
	generateMeteorMethod: function(meth) {
		var isStatic = this.isStatic,
			InstanceOrClass = this.InstanceOrClass,
			className = this.className;
	
		//define a method to pass to Meteor.methods()
		var method = function() {
			console.log('HEADERS', this.connection.httpHeaders)
			console.log('extendHttp: Meteor.method', className, meth);

			var args = _.toArray(arguments),
				argsTransformed = [],
				self = this;

			//insure we are dealing with the appropriate class, if inherited
			if(isStatic) {
				className = args.shift();
				var Class = InstanceOrClass = Ultimate.classes[className];
			}
			
			//morph appropriate objects into instances extended from our classes
			_.each(args, function(arg) {
				if(_.isObject(arg) && arg.className) { //is an object extended from our classes
					var instance = new Ultimate.classes[arg.className]('no_params');
					arg = instance.transformServer(arg);
					arg.attachBehaviors();
					arg.check();
				}
				argsTransformed.push(arg);
			});
		
			this.isAllowed
			
			var PermissionsClass = UltimateUtilities.classFrom(className+'Permissions');
				
			if(!isStatic) {					
				var instance = argsTransformed.shift();
				
				if(PermissionsClass) PermissionsClass.prototype.allowedHttpMethod(meth, self.userId, instance, argsTransformed); //throws Meteor.Error if not allowed
					
				self.user = function() { return Meteor.users.findOne(self.userId); };
				instance.meteor = function() { return self; }; //usage: instance.meteor().unblock() mainly
				instance.absoluteUrl = function(path) { return Ultimate.absoluteUrl(path, this); };
				var response = instance[meth].apply(instance, argsTransformed);
			}
			else {
				if(PermissionsClass) PermissionsClass.prototype.allowedHttpMethod(meth, self.userId, Class, argsTransformed); //throws Meteor.Error if not allowed
				
				self.user = function() { return Meteor.users.findOne(self.userId); };
				
				//duplicate class so that we can attach methods do it that are specific to the information within `this` of the Meteor method
				var ContextClass = _.extend({}, Class);
				ContextClass.prototype = Class.prototype;
				ContextClass.meteor = function() { return self; }; 
				ContextClass.absoluteUrl = function(path) { return Ultimate.absoluteUrl(path, self); };
				
				var response = Class[meth].apply(ContextClass, argsTransformed);
			}

			//console.log('extend HTTP response: ', response);
			return response;
		};
	
		this.addMeteorMethod(meth, method);
	},
	addMeteorMethod: function(meth, method) {
		var methodObj = {},
			methodName = this.__type + '_' + meth;
	
		methodObj[methodName] = method;
		Meteor.methods(methodObj);
	}
});