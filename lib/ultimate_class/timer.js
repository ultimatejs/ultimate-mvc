UltimateClass.extendBoth({
	setTimeout: function(func, delay, runImmediately) {
		if(runImmediately) {
			if(_.isNumber(runImmediately)) return this.setTimeout(func, runImmediately);
			else return func.call(this);
		}
		return Meteor.setTimeout(func.bind(this), delay);
	},
	setInterval: function(func, delay, runImmediately, cb) {
		if(runImmediately) {
			if(_.isNumber(runImmediately)) this.setTimeout(func, runImmediately);
			else func.call(this);
		}
		
		if(_.isString(delay)) {
			var delayString = delay;
			
			if(delay.indexOf('second') > -1) delay = 1000;
			else if(delay.indexOf('min') > -1) delay = 1000 * 60;
			else if(delay.indexOf('hour') > -1) delay = 1000 * 60 * 60;
			else if(delay.indexOf('day') > -1) delay = 1000 * 60 * 60 * 24;
			else if(delay.indexOf('month') > -1) delay = 1000 * 60 * 60 * 24 * 30;
			
			var waitMs = moment().endOf(delayString).add(1, 'millisecond').toDate() - new Date;
			
			this.setTimeout(function() {
				func.call(this); //run it immediately on first second of duration interval
				this.___lastInterval = Meteor.setInterval(func.bind(this), delay);
				if(cb) cb.call(this, this.___lastInterval);
			}, waitMs);
		}
		else return this.___lastInterval = Meteor.setInterval(func.bind(this), delay);
	},
	setIntervalMaxCalls: function(func, delay, maxCalls, runImmediately, cb) {
		var calls = 0;
		
		return this.setInterval(function() {
			func.call(this);
			if(++calls >= maxCalls) this.clearInterval(interval);
		}.bind(this), delay, runImmediately, cb);
	},
	lastIntervalId: function() {
		return this.___lastInterval;
	},
	setIntervalUntil: function(func, delay, maxCalls, runImmediately, cb) {
		var isComplete = false,
			startTime = new Date,
			maxCalls = maxCalls || 10,
			maxMs = delay * maxCalls,
			interval = this.setInterval(function() {
				isComplete = func.call(this);
				if(isComplete) this.clearInterval(interval);
				
				if((new Date) - startTime > maxMs) this.clearInterval(interval);
			}.bind(this), delay, runImmediately, cb);
	},
	clearTimeout: function(id) {
		Meteor.clearTimeout(id);
	},
	clearInterval: function(id) {
		Meteor.clearInterval(id);
	},
	
	

	throttle: function(key, fn, threshhold) {
	  threshhold = threshhold || 250;
		
		this._throttleKeys = this._throttleKeys || {};
		this._throttleKeys[key] = this._throttleKeys[key] || {};
		var last = this._throttleKeys[key];
		
		console.log("THROTTLE", last);
		
	  return function () {
	    var now = +new Date, args = arguments;
			
	    if(last.call && now < last.call + threshhold) {
	      clearTimeout(last.timer); //hold on to it
				
	      last.timer = this.setTimeout(function () {
	        last.call = now;
	        fn.apply(this, args);
					this.cleanupThrottle(key, last, threshhold);
	      }, threshhold);
				
	    } 
			else {
	      last.call = now;
	      fn.apply(this, args);
				this.cleanupThrottle(key, last, threshhold);
	    }
	  }.bind(this);
	},
	throttleCall: function(key, fn, threshhold) {
	  threshhold = threshhold || 250;
		
		this._throttleKeys = this._throttleKeys || {};
		this._throttleKeys[key] = this._throttleKeys[key] || {};
		var last = this._throttleKeys[key];
		
	  (function () {
	    var now = +new Date;
			
	    if(last.call && now < last.call + threshhold) {
	      clearTimeout(last.timer); //hold on to it
				
	      last.timer = this.setTimeout(function () {
	        last.call = now;
	        fn.call(this);
					this.cleanupThrottle(key, last, threshhold);
	      }, threshhold);
				
	    } 
			else {
	      last.call = now;
	      fn.call(this);
				this.cleanupThrottle(key, last, threshhold);
	    }
	  }).call(this);
	},
	cleanupThrottle: function(key, last, threshhold) {
		this.setTimeout(function() {
			if(+new Date >= last.call + threshhold) delete this._throttleKeys[key];
		}, threshhold);
	},
	
	
	defer: function(func) {
		Meteor.defer(func.bind(this));
	}
});