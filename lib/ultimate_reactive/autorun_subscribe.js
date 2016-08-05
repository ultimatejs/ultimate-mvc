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

		//set things up so reactive changes to subs replace original sub in array, so u can do this.ready(index)
		if(!this._subsArray) this._subsArray = [];
		sub.name = name; //name it so we can find it

		let index = _.findIndex(this._subsArray, (s) => s.name === name);
		if(index > -1) this._subsArray.splice(index, 1, sub);
		else this._subsArray.push(sub); //used for this.ready(0), which checks subs whose names are func.toString()


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
		return this.increment(this._limitName(name), amount, 'limit-store');
	},
	decrementLimit: function(amount, name) {
		return this.decrement(this._limitName(name), amount, 'limit-store');
	},
	getLimit: function(name) {
		return this.get(this._limitName(name), 'limit-store');
	},
	setLimit: function(amount, name) {
		return this.set(this._limitName(name), amount, 'limit-store');
	},
	_limitName: function(name) {
		return name ? 'limit_'+name : 'limit_'+this.mainSubscribeLimitName;
	},


	_infiniteScroll: function() {
		var component = this,
			scrollContainer = component.infiniteScroll[0],
			pageLimit = component.infiniteScroll[1],
			permanentParent = component.infiniteScroll[2],
			subName = component.infiniteScroll[3],
			$container = $(scrollContainer);

		var throttleFunc = _.throttle(function(e) {
			var elem = $(e.currentTarget);

	    if(elem[0].scrollHeight - elem.scrollTop() == elem.outerHeight()) {
	    	component.incrementLimit(pageLimit || 10, subName);
	    }
		}, 1000)


		//if scrolling container element is present onRendered
		if($container) $container.on('scroll.infinite_scroll', throttleFunc);

		//if scrolling element is appended later and permanent parent element is provided (which exists onRendered)
		if(permanentParent) {
			var parent = $(permanentParent)[0];

			if(!parent) return;
			var hooks = parent._uihooks = parent._uihooks || {};

			hooks.insertElement = function(node, next) {
				$(node).insertBefore(next);

				if(node === $container[0]) {
					$container.on('scroll.infinite_scroll', throttleFunc);
				}
			}
		}
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
				sub.stop(true); //true forces stop of infinite scroll limitSubscriptions
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
				setTimeout(function() {
					this.emit('ready');
				}.bind(this), 1); //trigger handlers not in this computation (without setTimeout child autorun computations are prevented)
			}
		});
	},


	ready: function(name) {
		this.depend('readyDep');

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
