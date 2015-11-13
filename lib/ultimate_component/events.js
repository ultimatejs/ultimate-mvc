UltimateComponentParent.extend({
 	_eventsRegex: /^(click|dblclick|focus|blur|change|mouseenter|mouseleave|mousedown|mouseup|keydown|keypress|keyup|touchdown|touchmove|touchup)(\s|$)/,
	
	setupEvents: function() {
		var ue = new UltimateEvents(this.template, this);
   		ue.addEvents(this.getResolvedEvents());
	},
	
	
	getResolvedEvents: function() {
		//event handlers dont need to be bound here, since it's done in UE, and no bind is applied before
		return this._resolvedEvents; 
	},
	getEvents: function() {
		return _.filterPrototype(this.getPrototype(), this._isEvent);
	},
	_isEvent: function(method, prop) {
		return this._eventsRegex.test(prop) && this.isMethod(prop);
	}
});