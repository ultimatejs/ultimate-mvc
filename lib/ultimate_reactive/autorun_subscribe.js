UltimateReactive.extend({
	autorun: function(func, name) {
		if(!_.isFunction(func)) return;
		
		var computation;
		
		if(Tracker.currentComputation && !name) {
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
		if(!sub) return; //functions supposed to return subs perhaps wont under some conditions
		
		if(!this._subscriptions) this._subscriptions = {};
		this._subscriptions[name] = sub;
		
		if(!this._subsArray) this._subsArray = [];
		this._subsArray.push(sub); //used for this.ready(0), which checks subs whose names are func.toString()
		
		if(isLimit) this.mainSubscribeLimitName = name; //only works for one subscription, which generally is the most common case anyway
		
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
	
	
	_infiniteScroll: function() {
		var component = this,
			scrollContainer = _.first(component.infiniteScroll),
			pageLimit = component.infiniteScroll[1],
			subName = component.infiniteScroll[2];

		Tracker.afterFlush(function() {
			Meteor.setTimeout(function() {
				$(scrollContainer).append('<div class="infinite-load-more" style="height: 0px; opacity: 0;"></div>');
			}, 1500); //give any animations a chance to append its elements
		});
		
		function triggerLoadMore() {
			if($('.infinite-load-more').length === 0) throw new Error('no-infinite-load-more-element', 'You need to add an element with class .infinite-load-more at the bottom of your scroll container');
			
			console.log('SCROLLING')
		  if($('.infinite-load-more').isAlmostVisible()) {
		    component.incrementLimit(pageLimit || 10, subName);
		  }
		};
		
		$(scrollContainer).on('scroll.infinite_scroll', _.throttle(triggerLoadMore, 1000));
	},
	onDestroyedCleanUp: function() {
		if(this._infiniteScroll) $(window).off('.infinite_scroll');
		
		delete this._subscriptions;
		delete this._subsArray;
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
	
	//passed into subscribe calls in get_autorun_subscribe.js
	getSubscriptionCallbacks: function(name) {
		return {
			onStop: function() {
				this.emit('subscriptionStop', name);
			}.bind(this),
			onReady: function() {
				this.emit('subscriptionReady', name);
			}.bind(this)
		}
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
		
		if(!name) this.emit('stop'); //only trigger global stop handlers if no name is provided
		this.changed('readyDep');
	},

	
	triggerReady: function() {
		this.autorun(function(c) {
			if(!this.___emittedReady && this.ready()) {	
				this.___emittedReady = true;
				this.setTimeout(function() {
					this.emit('ready');
				}, 1); //trigger handlers not in this computation (without setTimeout child autorun computations are prevented)
			}
		});
	},

	
	ready: function(name) {
		if(!this.doesDepExist('readyDep')) this.depend('readyDep');
		
		var ready;		

		if(this.isUltimateDatatableComponent) {
			var datatableSubReady = this.componentInstance().datatableSubscriptionReady;
			ready = datatableSubReady && datatableSubReady.get();
			
			//set a reactive dependency since datatables subscription isnt created through UltimateReactive
			if(datatableSubReady && !this.doesDepExist('datatableReadyDep')) {
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
				if(_.isNumber(name)) ready = this._subsArray[name] ? this._subsArray[name].ready() : false;
				else ready = this._subscriptions[name] ? this._subscriptions[name].ready() : false;
			}
		}
		
		
		if((_.isEmpty(this._subscriptions) && !this.isUltimateDatatableComponent)) {
			ready = true; //ready if no subscriptions, but not for datatables
		}
		
		return ready; 
	}
});