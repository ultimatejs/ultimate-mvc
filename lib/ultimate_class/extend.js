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
		if(!Meteor.isServer) return this;;
		Ultimate.addMethods(this, methods);
		return this;
	},
	extendBothServer: function(methods) {
    if(!Meteor.isServer) return this;;
    Ultimate.addMethods(this.prototype, methods);
    Ultimate.addMethods(this, methods);
		return this;
	},

	
	extendClient: function(methods) {
		if(!Meteor.isClient) return this;;
		Ultimate.addMethods(this.prototype, methods);
		return this;
	},
	extendClientStatic: function(methods) {
		if(!Meteor.isClient) return this;;
		Ultimate.addMethods(this, methods);
		return this;
	},
	extendBothClient: function(methods) {
		if(!Meteor.isClient) return this;;
		Ultimate.addMethods(this.prototype, methods);
		Ultimate.addMethods(this, methods);
		return this;
	},


	mixinMultiple: function(mixins) {
  	mixins = [].concat(mixins);
  	_.each(mixins, this.mixin, this);
	},
	mixin: function(Parent) {
		this.mixinStatic(Parent);
		this.mixinInstance(Parent);
	},
	mixinStatic: function(Parent) {
    if(typeof UltimateClone == 'undefined') return; //so UltimateClone itself can be extended before UltimateClone is defined
		
		Parent = _.isString(Parent) ? Ultimate.classes[Parent] : Parent;
		var Class = UltimateClone.deepExtendUltimate(this, Parent);
		
		//not extended by deepExtendUltimate due to being reserved words, and the fact that they wouldn't extend correctly
		UltimateDouble.addMethods(Class, _.pick(Parent, 'behaviors')); //properly mixin: behaviors

		return Class;
	},
	mixinInstance: function(Parent) {
		Parent = _.isString(Parent) ? Ultimate.classes[Parent] : Parent;
		var proto = UltimateClone.deepExtendUltimate(this.prototype, Parent.prototype);
		
		//not extended by deepExtendUltimate due to being reserved words, and the fact that they wouldn't extend correctly
		UltimateDouble.addMethods(proto, _.pick(Parent.prototype, 'schema', 'forms', 'behaviors')); //properly mixins: schema, forms, behaviors
			
		return proto;
	}
});