Ultimate('UltimateClientPublisherDuck').extends({
	construct: function(subscriptionCache) {
		this._subscriptionCache = subscriptionCache;
		this.userId = Meteor.userId();
		this.initCache();
	},
	
	
	initCache: function() {
		var cache = this.get();
		
		if(!cache) this.reset();
		else this.rebuild(cache);
	},
	rebuild: function(cache) {
		_.each(cache, function(objects, name) {
			var collection = Ultimate.collections[name]._collection;
			
			_.each(objects, function(obj, id) {
				var model = collection.findOne(id);
				obj = this.prepareRealDates(obj);
				
				if(model) {
					delete obj._id;
					collection.update(id, obj);
				}
				else {
					obj._id = id;
					collection.insert(obj)
				}
			}, this);
		}, this);
		
		this.ready();
	},
	getCachedIdsByCollection: function() {
		return _.mapObject(this.get(), function(modelsMappedById) {
			return _.keys(modelsMappedById);
		});
	},
	
	added: function(collection, id, fields) {
		var cache = this.get();
		
		delete fields._originalDoc;

		if(!cache[collection]) cache[collection] = {};
		console.log('FIELDS', fields.getAllMongoAttributes());
		cache[collection][id] = fields.getAllMongoAttributes();
			
		this.set(cache);
	},
	removed: function(collection, id) {
		var cache = this.get();
		
		delete cache[collection][id];
		
		this.set(cache);
	},
	changed: function(collection, id, fields) {
		var cache = this.get();
		
		cache[collection][id] = fields.getAllMongoAttributes();
		
		this.set(cache);
	},
	
	
	set: function(data) {
		var key = this.key();
		SessionStore.set(key, data);
	},
	get: function() {
		var key = this.key();
		return SessionStore.get(key);
	},
	key: function() {
		return this._subscriptionCache.id;
	},
	
	
	stop: function() {
		this._subscriptionCache.stop();

		_.each(this._onStopCallbacks, function(callback) {
			callback();
		});
	},
	ready: function() {
		this._subscriptionCache.onReady();
	},
	reset: function() {
		this.set({});
	},


	prepareRealDates: function(obj) {
		_.each(obj, function(att, key) {
			if(this._isValidDate(att)) obj[key] = moment(att).toDate();
		}, this);
		
		return obj;
	},
	_isValidDate: function(date) {
		return _.isString(date) && date.charAt(4) == '-' && moment(date).isValid();
	},
	

	onStop: function(callback) {
		this._onStopCallbacks = this._onStopCallbacks || [];
		this._onStopCallbacks.push(callback);
	}
});