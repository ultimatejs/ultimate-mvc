UltimateComponentParent.extend({
	setupMixins: function() {	
		this._assignMixinHelpers();
		this._assignMixinEvents();
		this._assignAutoruns();
		//generic mixins assigned from this.mixins handled by UltimateClass code
	},
	

	_assignMixinHelpers: function() {
		var mixins = this._extractMixins(this.mixins.concat(this.mixinHelpers)),
			helpers = {};
		
		mixins.shift();
		mixins.push(this); //overwrite mixin helpers by being last
		
		_.each(mixins, function(mixin) {
			if(mixin.getHelpers) _.extend(helpers, mixin.getHelpers()); //non-Component classes wont have `getHelpers`
		}, this);

		this._resolvedHelpers = helpers;
	},
	_assignMixinEvents: function() {
		var mixins = this._extractMixins(this.mixins.concat(this.mixinEvents)),
			events = {};
			
		_.each(mixins, function(mixin) {
			if(!mixin.getEvents) return;
			
			_.each(mixin.getEvents(), function(eventHandler, name) {
				if(!events[name]) events[name] = [];
				events[name].push(eventHandler);
			}, this);
		}, this);
		
		this._resolvedEvents = events;
	},
	_assignAutoruns: function() {
		var mixins = this._extractMixins(this.mixins.concat(this.mixinAutoruns)),
			ar = [],
			sub = [],
			subLimit = [],
			context = this.getPrototype();

		_.each(mixins, function(mixin) {
			if(mixin.autoruns) ar = ar.concat(UltimateUtilities.extract(mixin.autoruns, context));
			if(mixin.subscriptions) sub = sub.concat(UltimateUtilities.extract(mixin.subscriptions, context));
			if(mixin.limitSubscriptions) subLimit = subLimit.concat(UltimateUtilities.extract(mixin.limitSubscriptions, context));
		}, this);

		if(!_.isEmpty(ar)) this.getPrototype().autoruns = ar;
		if(!_.isEmpty(sub)) this.getPrototype().subscriptions = sub;
		if(!_.isEmpty(subLimit)) this.getPrototype().limitSubscriptions = subLimit;
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