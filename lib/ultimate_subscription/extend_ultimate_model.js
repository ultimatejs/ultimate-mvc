UltimateModel.extendStatic({
	subscribe: function(name, options, callbacks) {
		callbacks = this._resolveCallbacks(callbacks, arguments);

		var originalRelations = this.getRelations(),
			originalAggregates = this.getAggregates(),
			useCache = this._useCache,
			subsManger = this._subsManager,
			returnHandle = this._returnHandle,
			methodName = UltimateSubscriptionBehavior._methodName('subscribe', name),
			handle = this._prephandle(name, options, methodName, useCache, subsManger, originalRelations, originalAggregates, callbacks),
			ret = returnHandle ? handle : handle();

		this.clearClassSubscribeStorage();
		return ret;

	},
	_resolveCallbacks: function(callbacks, args, subscribeCallbacks) {
		callbacks = callbacks || _.callbackFromArguments(args);
		if(_.isFunction(callbacks)) callbacks = {onReady: callbacks};
		else if(!callbacks) callbacks = {};

		if(subscribeCallbacks) {
			return { 
				onReady: function() {
					if(subscribeCallbacks.onReady) subscribeCallbacks.onReady();
					if(callbacks.onReady) callbacks.onReady();
				},
				onStop: function(error) {
					if(subscribeCallbacks.onStop) subscribeCallbacks.onStop(error);
					if(callbacks.onStop) callbacks.onStop(error);
				}
			};
		}
		else return callbacks;
	},
	_prephandle: function(name, options, methodName, useCache, subsManger, originalRelations, originalAggregates, subscribeCallbacks) {
			var handle = function(datatableSubOrComputation, tableNameOrLimit, ids, fields, handleCallbacks) {
				this._relations = originalRelations;
				this._aggregates = originalAggregates;

				var options = this._prepSubConfig(name, options),
					rels = this.getRelations(), //getRelations() and getAggregates() returns merged rels/aggs on model class.
					aggs = this.getAggregates(); //What's merged is rels/aggs from the subscription definition map + additional ones added at subscribe time
		
				this.clearClassSubscribeStorage();

				
				handle.selector = _.extend({}, options.selector);

				var callbacks = this._resolveCallbacks(handleCallbacks, arguments, subscribeCallbacks);

				if(ids) {
					options = this._prepareOptionsForDatatable(options, ids, fields);
					console.log('PREP HANDLE', methodName, ids, options, fields, rels, aggs);
					return this[methodName](options, rels, aggs, useCache, subsManger, callbacks);//eg: User.orders(opts, rels..)
				}
				else {
					if(_.isNumber(tableNameOrLimit)) options.limit = tableNameOrLimit; //set by reactive components using subLimit
					return this[methodName](options, rels, aggs, useCache, subsManger, callbacks);//eg: User.orders(opts, rels..)
				}
			}.bind(this);
			

			//assign this to the function so UltimateDatatableComponent can access them without calling the function
			//the function is ultimately called by Tabular as its 'pub' property
			handle.model = this;
			handle.subscriptionName = this.className + methodName;
			handle.selector = function(userId) {
				return this._extractSub(name, userId).selector;
			}.bind(this);

			return handle;
	},


	_prepSubConfig: function(name, options) {
		var sub = this._extractSub(name);

		options = _.extend({}, sub, options);
		options.selector = options.selector || {};

		this.with(UltimateClone.deepClone(sub.with));
		this.attachAggregates(UltimateClone.deepClone(sub.aggregates), UltimateClone.deepClone(sub.aggregates_selector));
		//relations and aggregates are now stored on model class; eg: User._relations and User._aggregates

		return options;
	},
	_extractSub: function(name, userId) {
		var sub = this.prototype.subscriptions[name];
		return UltimateUtilities.extractConfig(sub, this.prototype, userId);
	},

	_prepareOptionsForDatatable: function(options, ids, fields) { 
		options.selector = _.extend({}, options.selector, {_id: {$in: ids}});
		//options.fields = fields; //the subscription config obj determines the fields, not the datatable extraFields array
		return options;
	},
	clearClassSubscribeStorage: function() {
		this._relations = {}; //clear up for next calls to subscribe
		this._aggregates = [];
		this._useCache = this._subsManager = this._returnHandle = null;
	},


	keep: function(limit, expireIn) {
		this._subsManager = this._subsManager || new SubsManager({limit: limit, expireIn: expireIn});
		return this;
	},
	clear: function() {
		if(this._subsManager) this._subsManager.clear();
		return this;
	},
	reset: function() {
		if(this._subsManager) this._subsManager.reset();
		return this;
	},

	
	cache: function() {
		this._useCache = true;
		return this;
	},
	handle: function() {
		this._returnHandle = true;
		return this;
	}
});