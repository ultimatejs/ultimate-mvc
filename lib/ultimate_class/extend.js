_.extend(UltimateClass, {
	createClass: function(methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods) {
		var className = this.childName || 'ULTIMATE_CONSOLE_CLASS'; //UC will appear at the console when the build plgin hasn't had a chance to interpret the className
		var NewClass = Ultimate(className).extends(this, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods);
		delete this.childName;
		return NewClass;
	},
	
	extend: function(methods) {
  	Ultimate.addMethods(this.prototype, methods);
		return this;
	},
	extendStatic: function(methods) {
		Ultimate.addMethods(this, methods);
		return this;
	},
	extendBoth: function(methods) {
		Ultimate.addMethods(this.prototype, methods); 
  	Ultimate.addMethods(this, methods);
		return this;
	},
	
	extendServer: function(methods) {
		if(!Meteor.isServer) return this;;
		Ultimate.addMethods(this.prototype, methods);
		return this;
	},
	extendServerStatic: function(methods) {
		if(!Meteor.isServer) return this;
		Ultimate.addMethods(this, methods);
		return this;
	},
	extendBothServer: function(methods) {
    if(!Meteor.isServer) return this;
    Ultimate.addMethods(this.prototype, methods);
    Ultimate.addMethods(this, methods);
		return this;
	},
	extendClient: function(methods) {
		if(!Meteor.isClient) return this;
		Ultimate.addMethods(this.prototype, methods);
		return this;
	},
	extendClientStatic: function(methods) {
		if(!Meteor.isClient) return this;
		Ultimate.addMethods(this, methods);
		return this;
	},
	extendBothClient: function(methods) {
		if(!Meteor.isClient) return this;
		Ultimate.addMethods(this.prototype, methods);
		Ultimate.addMethods(this, methods);
		return this;
	},
	
	mixin: function() {
		var mixins = _.toArray(arguments);
		Ultimate.addMethods(this.prototype, {mixins: mixins});
	}
});