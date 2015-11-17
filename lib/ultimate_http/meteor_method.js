UltimateHttp.extend({
	generateMeteorMethod: function(meth) {
		var isStatic = this.isStatic,
			InstanceOrClass = this.InstanceOrClass,
			className = this.className,
			ultimateHttp = this;
	
		//define a method to pass to Meteor.methods()
		var method = function() {
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
		
			
			if(!isStatic) {					
				var instance = argsTransformed.shift();
				
				ultimateHttp.allowedHttpMethod.call(instance.getPrototype(), meth, self.userId, instance, argsTransformed); //throws Meteor.Error if not allowed
					
				self.user = function() { return Meteor.users.findOne(self.userId); };
				instance.meteor = function() { return self; }; //usage: instance.meteor().unblock() mainly
				instance.absoluteUrl = function(path) { return Ultimate.absoluteUrl(path, this); };
				var response = instance[meth].apply(instance, argsTransformed);
			}
			else {
				ultimateHttp.allowedHttpMethod.call(Class.getPrototype(), meth, self.userId, Class, argsTransformed); //throws Meteor.Error if not allowed
				
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
	},
	
	
	//called in context of instance or class
	allowedHttpMethod: function(name, userId, obj, args) {
		if(!this.permissions) return true;
		
		var isAllowed = true,
			newArgs = _.clone(args),
			perms = this.permissions;
		
		newArgs.unshift(obj);
		newArgs.unshift(userId);
		newArgs.unshift(name);

		//check global permission rules for the class
		if(_.isFunction(perms && perms.allowHttp)) isAllowed = perms.allowHttp.apply(this, newArgs);
		if(_.isFunction(perms && perms.this.allowHttpInstance)) isAllowed = perms.allowHttpInstance.apply(this, newArgs);
		if(_.isFunction(perms && perms.this.allowHttpStatic)) isAllowed = perms.allowHttpStatic.apply(this, newArgs);
		

		//check rules where the permission key is the http method name attempting to be called
		if(_.isFunction(perms[name])) {
			args = _.clone(args);
			
			args.unshift(obj);
			args.unshift(userId);
			
			isAllowed = perms[name].apply(this, args);
		}

		if(!isAllowed) throw new Meteor.Error('http-method-not-allowed', 'HTTP Method '+name+' from '+obj.className+' is not allowed.');
		else return true;
	}
});