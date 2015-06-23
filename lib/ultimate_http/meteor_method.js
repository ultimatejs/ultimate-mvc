UltimateHttp.extend({
	generateMeteorMethod: function(meth) {
		var isStatic = this.isStatic,
			InstanceOrClass = this.InstanceOrClass,
			className = this.className;

		//define a method to pass to Meteor.methods()
		var method = function() {
			console.log('extendHttp: Meteor.method', className, meth);

			var args = _.toArray(arguments),
				argsTransformed = [],
				self = this;

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
				instance.meteor = function() { return self; }; //usage: instance.meteor().unblock() mainly
				var response = instance[meth].apply(instance, argsTransformed);
			}
			else {
				InstanceOrClass.meteor = function() { return self; }; //WORRIED: this could have side effects, not sure yet
				var response = InstanceOrClass[meth].apply(InstanceOrClass, argsTransformed);
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