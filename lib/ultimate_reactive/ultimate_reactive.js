Ultimate('UltimateReactive').extends({
	abstract: true,

	get: function(k, store) {
		return this.getStore(store).get(k);
	},
	set: function(k, v, store) {
		return this.getStore(store).set(k, v);
	},
	getStore: function(store) {
		store = store || this.store;
		
		if(!store) return this.getReactiveDict();
		
		store = store.toLowerCase();
		
		if(store == 'session') return Session;
		else if(store == 'cache') return SessionStore;
		else if(store == 'reactivedict' || store == 'reactive-dict') return this.getReactiveDict();
		else return this.getReactiveDict();
	},
	getReactiveDict: function() {
		return this._reactiveDict = this._reactiveDict || new ReactiveDict;
	},
	
	
	push: function(k, v, store) {
		var arr = this.get(k, store);
		arr = _.isArray(arr) ? arr : [];		
		arr.push(v);	
		this.set(k, arr, store);
		return arr;
	},
	unshift: function(k, v, store) {
		var arr = this.get(k, store);
		arr = _.isArray(arr) ? arr : [];		
		arr.unshift(v);	
		this.set(k, arr, store);
		return arr;
	},
	pop: function(k, store) {
		var arr = this.get(k, store),
			v = _.isArray(arr) ? arr.pop() : null;
	
		this.set(k, arr);
		return v;
	},
	shift: function(k, store) {
		var arr = this.get(k, store),
			v = _.isArray(arr) ? arr.shift() : null;

		this.set(k, arr, store);
		return v;
	},
	first: function(k, store) {
		return _.first(this.get(k, store));
	},
	last: function(k, store) {
		return _.last(this.get(k, store));
	},
	contains: function(k, v, store) {
		var arr = this.get(k, store);
		return _.contains(arr, v);
	},
	without: function(k, v, store) {
		var arr = this.get(k, store);
		arr = _.without(arr, v);
		this.set(k, arr, store);
		return arr;
	},
	withoutArray: function(k, v, store) {
		var arr = this.get(k, store);
		arr = _.withoutArray(arr, v);
		this.set(k, arr, store);
		return arr;
	},
	
	
	increment: function(k, amount, store) {
		var v = this.get(k, store) || 0;
		v += amount;

		this.set(k, v, store);
		return v;
	},
	decrement: function(k, amount, store) {
		var v = this.get(k, store) || 0;
		v -= amount;

		this.set(k, v, store);
		return v;
	},
	
	
	setReactiveIntervalUntil: function(funcReturnsTrue, delay, id, maxIntervals, runImmediately, cb) {
		id = id || 'reactive';
		maxIntervals = maxIntervals || 60 * 120; //2 hours is default max
		
		if(!this.get(id)) {
			var interval = this.setIntervalUntil(function() {
				
				if(funcReturnsTrue.call(this)) this.clearInterval(interval);
				else this.set(id, new Date); //functions as a basic reactive "tick"
					
			}, delay, maxIntervals, runImmediately, cb);	
		}
	}
});