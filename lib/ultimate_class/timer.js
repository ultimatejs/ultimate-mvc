UltimateClass.extendBoth({
	setTimeout: function(func, delay, runImmediately) {
		if(runImmediately) {
			if(_.isNumber(runImmediately)) this.setTimeout(func, runImmediately);
			else func.call(this);
		}
		return Meteor.setTimeout(func.bind(this), delay);
	},
	setInterval: function(func, delay, runImmediately) {
		if(runImmediately) {
			if(_.isNumber(runImmediately)) this.setTimeout(func, runImmediately);
			else func.call(this);
		}
		return Meteor.setInterval(func.bind(this), delay);
	},
	setIntervalUntil: function(func, delay, maxCalls) {
		var isComplete = false,
			startTime = new Date,
			maxCalls = maxCalls ? (maxCalls < 0 ? 0 : 1) : 1000,
			maxMs = delay * maxCalls,
			interval = Meteor.setInterval(function() {
				isComplete = func.call(this);
				if(isComplete) this.clearInterval(interval);
				
				if((new Date) - startTime > maxMs) this.clearInterval(interval);
			}.bind(this), delay);
	},
	clearTimeout: function(id) {
		Meteor.clearTimeout(id);
	},
	clearInterval: function(id) {
		Meteor.clearInterval(id);
	}
});