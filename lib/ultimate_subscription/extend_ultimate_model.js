UltimateModel.extendStatic({
	subscribe: function(name, selector, options, callbacks) {
		if(!_.isString(name)) {
			callbacks = options;
			options = selector;
			selector = name; 
			
			//edge case: user is attempting to subscribe to just aggregates, eg: 
			//Model.agg('someAggName', 'another').subscribe(); 
			if(!_.isEmpty(this._aggregates)) name = 'justAggregates'; 
			else name = '___insecure'; //user is operating in our "insecure mode" where they can sub to anything
		}
		
		if(selector) {
			options = options || {};
			options.selector = selector;
		}
		
		callbacks = this._resolveCallbacks(callbacks, arguments);
		
		var originalRelations = this.getRelations(),
			originalAggregates = this.getAggregates(),
			useCache = this._useCache,
			subsManger = this._subsManager,
			returnHandle = this._returnHandle,
			intervalDuration = this._intervalDuration,
			params = this._params,
			methodName = UltimateSetupSubscription.prototype._methodName('subscribe', name),
			handle = this._prephandle(name, options, methodName, useCache, subsManger, originalRelations, originalAggregates, params, callbacks);
			
		if(intervalDuration) this._setupIntervalSub(handle, intervalDuration);
		
		var subOrHandle = returnHandle ? handle : handle();
		this.clearClassSubscribeStorage();
		return subOrHandle;
	},
	_prephandle: function(name, opts, methodName, useCache, subsManger, originalRelations, originalAggregates, params, subscribeCallbacks) {
			var handle = function(datatableSubOrComputation, tableNameOrLimit, ids, fields, handleCallbacks) {
				this._relations = originalRelations;
				this._aggregates = originalAggregates;

				var options = this._prepSubConfig(name, opts, params),
					rels = this.getRelations(), //getRelations() and getAggregates() returns merged rels/aggs on model class.
					aggs = this.getAggregates(); //What's merged is rels/aggs from the subscription definition map + additional ones added at subscribe time

				this.clearClassSubscribeStorage();

				
				//Make limit subscriptions in components overlap, so there is never a moment without models.
				//Here we override the onReady callback to stop the previous limit subscription
				if(datatableSubOrComputation instanceof Tracker.Computation && _.isInt(tableNameOrLimit)) {
					this._handleCallbacksForComponentLimit(handleCallbacks, name);
				}
				
				
				var callbacks = this._resolveCallbacks(handleCallbacks, arguments, subscribeCallbacks);

				ids = ids || this._ids;
				delete this._ids; //make sure ids attached to model class won't be there after this call
				
				if(ids) {
					if(_.isNumber(tableNameOrLimit)) options.limit = tableNameOrLimit; //set by reactive components using subLimit
					
					options = this._prepareOptionsForDatatable(options, ids, fields); //THIS IS THE MAIN PURPOSE HERE, BUT USERS CAN ALSO SUPPLY IDS VIA Model.ids([id, id, etc])
					return this[methodName](options, rels, aggs, useCache, subsManger, callbacks);//eg: User.orders(opts, rels..)
				}
				else {
					if(_.isInt(tableNameOrLimit)) options.limit = tableNameOrLimit; //set by reactive components using subLimit
					this._currentSubscription = this[methodName](options, rels, aggs, useCache, subsManger, callbacks);//eg: User.orders(opts, rels..)
					
					if(!this._currentSubscription.stop) { //.keep() will use SubsManager, which has no stop method
						this._currentSubscription.stop = function() {
							return this.clear();
						}.bind(this);
					}
					
					//Here we override the subscription stop function to only stop when the new limit subscription is ready
					//as per above. The reactive changed/depend methods are used within an autorun triggered within stop to perform the final stopping.
					if(datatableSubOrComputation instanceof Tracker.Computation && _.isInt(tableNameOrLimit)) {
						this._handleComponentLimitStop(this._currentSubscription, name);
					}
					
					return this._currentSubscription;
				}
			}.bind(this);
			
//assign this to the function so UltimateDatatableComponent can access them without calling the function
			//the function is ultimately called by Tabular as its 'pub' property.
			//subscriptionName and limit is used by subLimit in UltimateComponent, unrelated to datatable
			handle.model = this;


			//used by UltimateReactive
			handle.subscriptionName = function(userId) {
				return name;
			}.bind(this);
			handle.limit = function(userId) {
				return this._extractSub(name, Ultimate.userId(userId)).limit || 10;
			}.bind(this);
			
			
			
			//used by UltiamteDatatableComponent
			handle.selector = function(userId) {
				return this._extractSub(name, userId).selector;
			}.bind(this);
			handle.selector = function(userId) {
				return this._extractSub(name, userId).selector;
			}.bind(this);
			
			
			//used by UltimateDatatableComponent observeUser feature
			handle.subName = name;
			handle.class = this;
			handle.observeUser = function() {
				var subFunc = this.prototype.subscriptions[name];
				return _.isFunction(subFunc) ? /observeUser/.test(subFunc.toString()) : subFunc.observeUser;
			}.bind(this);
			
			return handle;
	},


	ids: function(ids) {
		if(!ids) return this;
		this._ids = _.isArray(ids) ? ids : [ids];
		return this;
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
	
	
	_handleCallbacksForComponentLimit: function(handleCallbacks, name) {
		var onReady = handleCallbacks.onReady;
		
		handleCallbacks.onReady = function() {
			this.changed('component_limit_stop_'+name);
			onReady();
		}.bind(this)
	},
	_handleComponentLimitStop: function(currentSubscription, name) {
		var realStop = currentSubscription.stop,
			realSub = currentSubscription;
		
		currentSubscription.stop = function() { 
			this.autorun(function(c) {
				this.depend('component_limit_stop_'+name);
				
				if(!c.firstRun) {
					realStop.call(realSub);
					c.stop();
				}
			});
		}.bind(this);
	},

	_prepSubConfig: function(name, options, params) {
		var sub = this._extractSub(name);

		options = _.extend({}, sub, options);
		options.selector = options.selector || {};
		_.extend(options.selector, this._getParams(params));
		
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
		this._useCache = this._subsManager = this._returnHandle = this._params = null;
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


	handle: function() {
		this._returnHandle = true;
		return this;
	},
	
	params: function(param1, param2, paramEtc) {
		this._params = param1 ? _.values(arguments) : 'all';
		return this;
	},
	_getParams: function(params) {
		if(_.isEmpty(params)) return;
		
		if(params == 'all') {
			params = _.keys(_.omit(Router.current().params, 'query', 'hash'));
			params = params.concat(_.keys(Router.current().params.query));
		}
		
		var finalParams = {};
		
		_.each(params, function(p) {
			finalParams[p] = Router.current().params[p] || Router.current().params.query[p] || '';
			if(_.isNumeric(finalParams[p])) finalParams[p] = parseInt(finalParams[p]);
		});

		return finalParams;
	},
	
	
	_configObjToHandle: function(config) {
		var Model = UltimateUtilities.classFrom(config.model),
			subName = config.name,
			withs = config.with,
			aggregates = config.aggregates, 
			slug = config.slug, 
			params = config.params, 
			selector = config.selector,
			onReady = config.onReady,
			onStop = config.onStop,
			keep = config.keep, 
			cache = config.cache,
			options = UltimateUtilities.pickCollectionOptions(config), //pick limit, fields, sort, skip
			handle = Model.handle();
		
		if(cache) handle = handle.cache();
		if(slug) handle = handle.slug(slug);
		
		if(params) handle = handle.params.apply(handle, [].concat(params));
		if(aggregates) handle = handle.with.apply(handle, [].concat(aggregates));
		
		if(keep) handle = _.isObject(keep) ? handle.keep(keep) : handle.keep();
		
		if(withs) {
			_.each([].concat(withs), function(relation) { //array of relation names or relation config objects
				if(_.isString(relation)) handle = handle.with(relation);
				else handle = handle.with(relation.name, _.omit(relation, 'name')); //2nd param is options
			});
		}
	
		if(subName) return handle.subscribe(subName, selector, options, {onReady: onReady, onStop: onStop});
		else return handle.subscribe(selector, options, {onReady: onReady, onStop: onStop});
	}
});