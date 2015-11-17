Ultimate('UltimateThrottle').extends();

UltimateThrottle.extendBoth({
	throttle: function(key, fn, threshhold) {
	  threshhold = threshhold || 250;
		
		this._throttleKeys = this._throttleKeys || {};
		this._throttleKeys[key] = this._throttleKeys[key] || {};
		var last = this._throttleKeys[key];
		
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
	}
});