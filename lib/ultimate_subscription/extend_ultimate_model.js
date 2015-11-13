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
			methodName = UltimateSubscriptionBehavior.prototype._methodName('subscribe', name),
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
		this._useCache = this._subsManager = this._returnHandle = this._params;
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
	
	interval: function(duration) {
		this._intervalDuration = duration;
		return this;
	},
	clearIntervalSubscription: function() {
		//will stop newSub below, since we keep the same object ref for the sub
		if(this._currentSubscription) this._currentSubscription.stop();
		this._currentSubscription = null;
	},
	
	_setupIntervalSub: function(handle, intervalDuration) {
		//Independently get subscription; could put in above onReady callback, but rather not
		//further complicate that code. this is simple enough and independently handles a small rare feature.
		//The goal of the feature is to allow you to use subscriptions that have date-based selectors that
		//have short windows. E.g. u could update a graph every minute, with:
		//Model.interval('minute').subscribe('subname')
		var interval = this.setInterval(function() {
			if(this._currentSubscription && this._currentSubscription.ready()) {
				this.changed('currentSubDep');
				this.clearInterval(interval);
			}
		}, 50);
		
		this.autorun(function(c) {
			this.depend('currentSubDep');
			var sub = this._currentSubscription;	
			if(sub && sub.ready()) {
				this._startInterval(sub, handle, intervalDuration);
				c.stop();
			}
		});
	},
	_startInterval: function(sub, handle, intervalDuration) {
		var interval = this.setInterval(function() {
			if(sub.ourStop) sub.ourStop(); //we stop our old subscription without clearing it
			else sub.stop(); //first run won't have ourStop(), and stop() wont clear the interval yet, as per below
			
			var newSub = handle(); //UPDATE SUBSCRIPTION! this is the main work of the interva
			//below we will keep the same object ref for sub, but use newSub to stop the actual still running subcription.
			//client code such as UltimateComponent needs a reference to this sub, which is why we keep the reference.
			
			sub.stop = function() { //by overwriting its methods
				this.clearInterval(interval); //stop() called by outside code, therefore we need to clear the interval
				return newSub.stop(); 
			}.bind(this); 
			
			sub.ourStop = function() {
				return newSub.stop(); //this interval is calling stop above, but we dont wanna clear the interval
			}; 
				
			sub.ready = function() { //that way the return of subscribe() continues to work	
				return newSub.ready(); 
			}; 
		}, intervalDuration);
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
	}
});