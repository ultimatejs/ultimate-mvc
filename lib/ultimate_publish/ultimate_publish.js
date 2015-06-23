UltimatePublish = Ultimate('UltimatePublish').extends(UltimateFacade, {
	abstract: true,
	construct: function(context) {
		this._meteor = context;
		this.userId = this._meteor.userId;
		this.connection = this._meteor.connection;
	},
	
	onFacadeStartup: function() {
		var methods = this.getPublishMethods(),
      		UP = this;

		_.each(methods, function(method, name) {
			if(name.indexOf('null') === 0) name = null;

			Meteor.publish(name, function() {
				var up = UP.createNew(this);
				return method.apply(up, arguments);
			});
		});
	},
	
	
	getPublishMethods: function() {
		var methods = this.getMethods(null, true, null, true);
	
		if(this.self) methods.self = this.publishSelf;
		if(this.roles) methods.roles = this.publishRoles;
		
		return methods;
	},

	
	
	meteor: function() {
		return this._meteor;
	},
	user: function() {
		return Meteor.users.findOne(this.userId);
	},
	publishSelf: function() {
		if(this.self) {
	  		var options = {};
		  	options.fields = {};
		
			_.each(this.self, function(key) {
				options.fields[key] = 1;
			});
			
		  	return Meteor.users.find(this.userId, options);
	    }
		else return Meteor.users.find(this.userId);
	},
	publishRoles: function() {
		return Meteor.roles.find({});
	},
	
	
	added: function() {
		return this._meteor.added.apply(this._meteor, arguments);
	},
	changed: function() {
		return this._meteor.changed.apply(this._meteor, arguments);
	},
	removed: function() {
		return this._meteor.removed.apply(this._meteor, arguments);
	},	
	ready: function() {
		return this._meteor.ready.apply(this._meteor, arguments);
	},
	onStop: function() {
		return this._meteor.onStop.apply(this._meteor, arguments);
	},	
	error: function() {
		return this._meteor.error.apply(this._meteor, arguments);
	},
	stop: function() {
		return this._meteor.stop.apply(this._meteor, arguments);
	}
});