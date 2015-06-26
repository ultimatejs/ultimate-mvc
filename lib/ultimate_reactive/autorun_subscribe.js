UltimateReactive.extend({
	autorun: function(func, name) {
		if(!_.isFunction(func)) return;
		
		var computation;
		
		if(Tracker.currentComputation && !name) {
			console.log('CURRENT COMPUTATION');
			computation = Tracker.currentComputation;
			func.call(this, computation);
		}
		else computation = Tracker.autorun(func.bind(this));
		
		this._addComputation(computation, name || computation._id);
		
		return computation;
	},
	subscribe: function() {
		var args = _.toArray(arguments),
			subName = args[0];
			
		this.autorun(this._execSub.bind(this, args, subName));
		return this._subscriptions[subName]; //sub assigned below in _execSub -> _addSub
	},
	
	
	subscribeLimit: function() {
		var args = _.toArray(arguments),
			subName = args[0],
			startLimit = args.pop();
		
		this.setLimit(startLimit, subName);
		this.autorun(this._execSubLimit.bind(this, args, subName));	
		return this._subscriptions[subName];	
	},
	_execSub: function(args, subName, isLimit) {
		var sub = Meteor.subscribe.apply(Meteor, args);
		this._addSub(sub, subName, isLimit);
	},
	_execSubLimit: function(args, subName) {
		args.push(this.getLimit());
		this._execSub(args, subName, true);
	},
	_addSub: function(sub, name, isLimit) {
		if(!this._subscriptions) this._subscriptions = {};
		this._subscriptions[name] = sub;
		
		if(!this._subsArray) this._subsArray = [];
		this._subsArray.push(sub); //used for this.ready(0), which checks subs whose names are func.toString()
		
		if(isLimit) this.mainSubscribeLimitName = name;
		
		this.autorun(function() {
			if(sub.ready()) this.changed('readyDep');
		}.bind(this), name);
	},
	_addComputation: function(comp, name) {
		if(!this._computations) this._computations = {};
		this._computations[name] = comp;
	},
	
	
	incrementLimit: function(amount, name) {
		return this.increment(this._limitName(name), amount, 'reactive-dict');
	},
	decrementLimit: function(amount, name) {
		return this.decrement(this._limitName(name), amount, 'reactive-dict');
	},
	getLimit: function(name) {
		return this.get(this._limitName(name), 'reactive-dict');
	},
	setLimit: function(amount, name) {
		return this.set(this._limitName(name), amount, 'reactive-dict');
	},
	_limitName: function(name) {
		return name ? 'limit_'+name : 'limit_'+this.mainSubscribeLimitName;
	},
	
	

	getComputation: function(name) {
		return this._computations ? this._computations[name] : null;
	},
	getSubscription: function(name) {
		return this._subscriptions ? this._subscriptions[name] : null;
	},
	getAllComputations: function() {
		return this._computations = this._computations || {};
	},
	getAllSubscriptions: function() {
		return this._subscriptions = this._subscriptions || {};
	},
	
	
	stop: function(name) {
		if(!name) {
			_.each(this._subscriptions, function(sub) {
				sub.stop();
			});
			_.each(this._computations, function(c) {
				c.stop();
			});
		}
		else {
			this._subscriptions[name] && this._subscriptions[name].stop();
			this._computations[name] && this._computations[name].stop();
		}
		
		this.callStopCallbacks(name);
		this.changed('readyDep');
	},
	
	onStop: function(handler, name) {
		this.___onStopCallbacks = this.___onStopCallbacks || {};
		
		name = name || 'all';
		this.___onStopCallbacks[name] = this.___onStopCallbacks[name] || [];
		this.___onStopCallbacks[name].push(handler);
	},
	callStopCallbacks: function(name) {
		if(name) this.callStopCallbacksByName(name);
		else this.callAllStopCallbacks();
	},
	callAllStopCallbacks: function() {
		if(this.___onStopCallbacks) {
			_.each(this.___onStopCallbacks, function(handlers, name) {
				if(this.___onStopCallbacks[name] == 'calledAlready') return; //only call first time called
				
				_.each(handlers, function(handler) {
					handler.call(this);
				}, this);
				
				this.___onStopCallbacks[name] = 'calledAlready';
			}, this)
		}
		
		delete this._subscriptions; //delete stopped subscriptions so they don't affect reactive .ready() call
		delete this._subsArray;
	},
	callStopCallbacksByName: function(name) {
		if(this.___onStopCallbacks && this.___onStopCallbacks[name]) {
			if(this.___onStopCallbacks[name] == 'calledAlready') return; //only call first time called
			
			_.each(this.___onStopCallbacks[name], function(cb) {
				cb.call(this);
			}, this);
			
			this.___onStopCallbacks[name] = 'calledAlready';
			delete this._subscriptions[name]; //delete stopped subscriptions so they don't affect reactive .ready() call
		}
	},
	
	
	onReady: function(handler, name) {
		this.___onReadyCallbacks = this.___onReadyCallbacks || {};
		
		name = name || 'all';
		this.___onReadyCallbacks[name] = this.___onReadyCallbacks[name] || [];
		this.___onReadyCallbacks[name].push(handler);
	},
	callReadyCallbacks: function(name) {
		if(name) this.callReadyCallbacksByName(name);
		else this.callAllReadyCallbacks();
	},
	callAllReadyCallbacks: function() {
		if(this.___onReadyCallbacks) {
			_.each(this.___onReadyCallbacks, function(handlers, name) {
				if(this.___onReadyCallbacks[name] == 'calledAlready') return; //only call first time called
				
				_.each(handlers, function(handler) {
					handler.call(this);
				}, this)
				
				this.___onReadyCallbacks[name] = 'calledAlready';
			}, this)
		}
	},
	callReadyCallbacksByName: function(name) {
		if(this.___onReadyCallbacks && this.___onReadyCallbacks[name]) {
			if(this.___onReadyCallbacks[name] == 'calledAlready') return; //only call first time called
			
			_.each(this.___onReadyCallbacks[name], function(cb) {
				cb.call(this);
			}, this);
			
			this.___onReadyCallbacks[name] = 'calledAlready';
		}
	},
	
	subscriptionsReady: function() {
		return this.ready();
	},
	ready: function(name) {
		if(!this.readyDep) this.depend('readyDep');
		
		var ready;		

		if(this.isUltimateDatatableComponent) {
			var datatableSubReady = this.instance().datatableSubscriptionReady;
			ready = datatableSubReady.get();
			
			//set a reactive dependency since datatables since its subscription isnt created through UltimateReactive
			if(!this.doesDepExist('datatableReadyDep')) {
				Tracker.autorun(function(c) {
					if(datatableSubReady.get()) {
						this.changed('datatableReadyDep');
						c.stop();
					}
				}.bind(this));
			}
		}
		else { //normal ready procedure, i.e. for non-datatableComponents
			if(!name && name !== 0) { //could be the number zero, to check if sub func by index is ready
				_.some(this._subscriptions, function(sub, subName) {
					ready = sub.ready();
					if(ready === false) return true; //exit early, but its not ready
				}, this);
			}
			else {			
				if(_.isNumber(name)) ready = this._subsArray[name].ready();
				else ready = this._subscriptions[name] ? this._subscriptions[name].ready() : false;
			}
		}
		
		if(ready) {
			//hack to make sure any subscribe calls aren't stopped, which the reactive computation
			//stops for some reason. I'd expect them to be stopped at the beginning of this function, not the end.
			//it makes no sense, but whatever. 
			this.setTimeout(function() {
				this.callReadyCallbacks(name);
			}, 1); 
		}
		
		return ready || _.isEmpty(this._subscriptions); //ready if no subscriptions
	}
});