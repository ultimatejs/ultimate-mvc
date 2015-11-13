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
		if(!Meteor.isClient) return this;
		Ultimate.addMethods(this.prototype, methods);
		Ultimate.addMethods(this, methods);
		return this;
	},

	inheritStaticBase: function(Parent) {
    if(typeof UltimateClone == 'undefined') return; //so UltimateClone itself can be extended before UltimateClone is defined
		
		Parent = _.isString(Parent) ? Ultimate.classes[Parent] : Parent;
		var Class = UltimateClone.deepExtendUltimate(this, Parent, function(method, name) {
			return !Parent.isBehavior || !this.prototype._isOnMethod(name);
		}.bind(this));
		
		//not extended by deepExtendUltimate due to being reserved words, and the fact that they wouldn't extend correctly
		UltimateDouble.addMethods(Class, _.pick(Parent, 'behaviors')); //properly mixin: behaviors
		
		return Class;
	},
	


	mixinClass: function(mixins) {
  	_.each(mixins, this.mixin, this);
		this.mixinEventHandlers(mixins);
	},
	mixin: function(Mixin) {
		Mixin = Ultimate.classFrom(Mixin);
		this.mixinStatic(Mixin);
		this.mixinInstance(Mixin.prototype);
	},
	mixinStatic: function(Mixin) {
		var Class = UltimateClone.deepExtendUltimate(this, Mixin, function(method, name) {
			return !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately
		}.bind(this));
		
		//not extended by deepExtendUltimate due to being reserved words, and the fact that they wouldn't extend correctly
		UltimateDouble.addMethods(Class, _.pick(Mixin, 'behaviors')); //properly mixin: behaviors
		
		return Class;
	},
	mixinInstance: function(mixin) {
		var proto = UltimateClone.deepExtendUltimate(this.prototype, mixin, function(method, name) {
			return !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately
		}.bind(this));
		
		//not extended by deepExtendUltimate due to being reserved words, and the fact that they wouldn't extend correctly
		UltimateDouble.addMethods(proto, _.pick(mixin, 'schema', 'forms', 'behaviors')); //properly mixins: schema, forms, behaviors
		
		return proto;
	},
	
	
	mixinToTargetClasses: function(Classes) {
		var Mixin = this;
		
		_.each(Classes, function(Class) {
			Class = UltimateUtilities.classFrom(Class);

			Class.extend({
				mixins: [Mixin]
			});
		});
	},
	
	
	mixinEventHandlers: function(mixins) {
		var Class = this;
		
		_.each(mixins, function(Mixin) {
			Mixin = Ultimate.classFrom(Mixin);
			Class.attachMixinOnMethodListeners(Mixin); //mixin event handlers guaranteed to run via separate attachment
			Class.prototype.attachMixinOnMethodListeners(Mixin.prototype); 
		
			//combine older mixins by reference (older first) so when this.mixins is re-assigned later in the code, it has em all
			//Class.prototype.mixins = _.unique(Class.prototype.mixins.concat(Mixin.prototype.mixins));
		});
	}
});