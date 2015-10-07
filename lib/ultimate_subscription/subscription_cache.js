Ultimate('UltimateSubscriptionCache').extends({
	construct: function(subscription, ModelClass, subName, callbacks) {
		this._subscription = subscription;
		this.modelClass = ModelClass;
		this.subName = subName;
		this._callbacks = callbacks;

		this.generateId();

		this._publisher = new UltimateClientPublisherDuck(this); //triggers this.onReady() if cached data found in localStorage 
	},
	cache: function(options, relations, aggregates) {
		this._options = options;
		this._relations = relations;
		this._aggregates = aggregates;
		
		this.startCaching();

		return this._resolveCallbacks();
	},
	generateId: function() {
		this.id = this.modelClass.className + this.subName;
	},
	getCachedIdsByCollection: function() {
		//return map of id arrays by collection name so server publisher can send 'changed' 
		//messages instead of 'added' messages for models already cached
		//eg: {orders: ['dfsfjlk34dgf', 'dafoi4o3in', 'etc'], anotherCollection: ['asfsdt4', 'etc']}
		return this._publisher.getCachedIdsByCollection();
	},
	_resolveCallbacks: function() {
		return {
			onStop: this._callbacks ? this._callbacks.onStop : null,
			onReady: this.onReady.bind(this)
		};
	},
	
	startCaching: function() {
		//this._publisher will have it's duck-typed added/removed/changed() methods called, which store in localStorage
		var urpf = new UltimateRelationsPublisherFactory(this._publisher, this.subName, this.modelClass, this._aggregates);
		urpf.startPublishing(this._relations, this._options.selector, this._options);
	},
	

	store: function(data) {
		SessionStore.set(EJSON.stringify(this), data);
	},
	retreive: function() {
		SessionStore.set(EJSON.stringify(this));
	},
	
	
	onReady: function() {
		this._ready = true;
		
		if(this._callbacks && this._callbacks.onReady) this._callbacks.onReady();
		else if(_.isFunction(this._callbacks)) this._callbacks();
	},
	
	
	ready: function() {
		return !!this._ready;
	},
	stop: function() {
		this._subscription.stop();
		this._publisher.stop();
	},
	
	
	reset: function() {
		this._publisher.reset();
	}
});