UltimateClass.extendBoth({
	setTimeout: function(func, delay, runImmediately) {
		if(runImmediately) {
			if(_.isNumber(runImmediately)) return this.setTimeout(func, runImmediately);
			else return func.call(this);
		}
		if(Meteor.isClient) return this.___lastTimer = setTimeout(func.bind(this), delay); //Meteor setTimeout sometimes not called on client
		else return this.___lastTimer = Meteor.setTimeout(func.bind(this), delay);
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
				
				this.___intervals = this.___intervals || [];
				this.___intervals.push(this.___lastInterval);
				
				if(cb) cb.call(this, this.___lastInterval);
			}, waitMs);
		}
		else {
			this.___lastInterval = Meteor.setInterval(func.bind(this), delay);
			
			this.___intervals = this.___intervals || [];
			this.___intervals.push(this.___lastInterval);
			
			return this.___lastInterval;
		}
	},
	clearAllIntervals: function() {
		_.each(this.___intervals, function(i) {
			this.clearInterval(i);
		}, this);
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
		Meteor.clearTimeout(id || this.___lastTimer);
	},
	clearInterval: function(id) {
		Meteor.clearInterval(id || this.___lastInterval);
	},
	
	
	
	defer: function(func) {
		Meteor.defer(func.bind(this));
	},
	afterFlush: function(func, msDelay) {
		if(!msDelay) {
			Tracker.afterFlush(func.bind(this));
		}
		else {
			Tracker.afterFlush(function() {
				this.setTimeout(func, msDelay);
			}.bind(this));
		}
	},
	startup: function(func) {
		Meteor.startup(func.bind(this));
	}
});