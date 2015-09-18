UltimateComponentParent.extend({
	setupMixins: function() {	
		this._assignMixinHelpers();
		this._assignMixinEvents();
		this._assignMixinCallbacks();
		//generic mixins assigned from this.mixins handled by UltimateClass code
	},
	

	_assignMixinHelpers: function() {
		var mixins = this._extractMixins(this.mixinHelpers),
			helpers = {};
		
		mixins.shift();
		mixins.push(this); //overwrite mixin helpers by being last
		
		_.each(mixins, function(mixin) {
			_.extend(helpers, mixin.getHelpers());
		}, this);

		this._resolvedHelpers = helpers;
	},
	_assignMixinEvents: function() {
		var mixins = this._extractMixins(this.mixinEvents),
			events = {};
			
		_.each(mixins, function(mixin) {
			_.each(mixin.getEvents(), function(eventHandler, name) {
				if(!events[name]) events[name] = [];
				events[name].push(eventHandler);
			}, this);
		}, this);
		
		this._resolvedEvents = events;
	},
	_assignMixinCallbacks: function() {
		var mixins = this._extractMixins(this.mixinCallbacks),
			callbacksOnCreated = [],
			callbacksOnRendered = [],
			callbacksOnDestroyed = [],
			ar = [],
			sub = [],
			subLimit = [];

		_.each(mixins, function(mixin) {
			if(mixin.onCreated) callbacksOnCreated.push(mixin.onCreated);
			if(mixin.onRendered) callbacksOnRendered.push(mixin.onRendered);
			if(mixin.onDestroyed) callbacksOnDestroyed.push(mixin.onDestroyed);
			
			if(mixin.ar) ar = ar.concat(this.__combineHandlers(mixin.ar));
			if(mixin.sub) sub = sub.concat(this.__combineHandlers(mixin.sub));
			if(mixin.subLimit) subLimit = subLimit.concat(this.__combineHandlers(mixin.subLimit));
		}, this);

		if(!_.isEmpty(callbacksOnCreated)) this.callbacksOnCreated = callbacksOnCreated;
		if(!_.isEmpty(callbacksOnRendered)) this.callbacksOnRendered = callbacksOnRendered;
		if(!_.isEmpty(callbacksOnDestroyed)) this.callbacksOnDestroyed = callbacksOnDestroyed;

		if(!_.isEmpty(ar)) this.ar = ar;
		if(!_.isEmpty(sub)) this.sub = sub;
		if(!_.isEmpty(subLimit)) this.subLimit = subLimit;
	},
	
	
	_extractMixins: function(mixins) {
		if(_.isEmpty(mixins)) mixins = [];

		mixins = mixins.map(function(mixin) {
			mixin = UltimateUtilities.classFrom(mixin);
			return mixin.getPrototype();
		});

		mixins.unshift(this);
		return mixins;
	}
});