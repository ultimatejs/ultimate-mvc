_.extend(UltimateClass, {
  	extend: function(methods) {
    	Ultimate.addMethods(this.prototype, methods);
  	},
	extendStatic: function(methods) {
		Ultimate.addMethods(this, methods);
	},
	extendBoth: function(methods) {
    	Ultimate.addMethods(this.prototype, methods);
    	Ultimate.addMethods(this, methods);
  	},
	
	extendServer: function(methods) {
		if(!Meteor.isServer) return;
		Ultimate.addMethods(this.prototype, methods);
	},
	extendServerStatic: function(methods) {
		if(!Meteor.isServer) return;
		Ultimate.addMethods(this, methods);
	},
  	extendBothServer: function(methods) {
	    if(!Meteor.isServer) return;
	    Ultimate.addMethods(this.prototype, methods);
	    Ultimate.addMethods(this, methods);
  	},

	
	extendClient: function(methods) {
		if(!Meteor.isClient) return;
		Ultimate.addMethods(this.prototype, methods);
	},
	extendClientStatic: function(methods) {
		if(!Meteor.isClient) return;
		Ultimate.addMethods(this, methods);
	},
	extendBothClient: function(methods) {
		if(!Meteor.isClient) return;
		Ultimate.addMethods(this.prototype, methods);
		Ultimate.addMethods(this, methods);
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