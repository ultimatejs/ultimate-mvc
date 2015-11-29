UltimateModel.extendStatic({
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
	}
});