UltimateClass.extend({
	//behaviors: [], //defined by developers on protos, eg: [BehaviorClass, [BehaviorClass, 'prop', 'methodName']]
	//_behaviors: {}, //internally used to keep track of dynamnically attached behaviors to instantiated objects 

	attachBehaviors: function() {
		_.each(this.behaviors, function(behavior) {
			var parts = [].concat(behavior);
			this.attachBehavior.apply(this, parts);
		}, this);
	},
	attachBehavior: function(Class, prop, environment) {
		if(_.isString(Class)) {
			if(Ultimate.classes[Class]) Class = Ultimate.classes[Class];
			else Class = Ultimate(Class).extends(UltimateBehavior, {}); //server side behavior, stubbed on client (or vice versa)
		}
	
		var obj = Class instanceof UltimateClass ? Class : new Class; //instantiated : BehaviorClass
		obj.attachToOwner(this, prop, environment);
	},
	

	getBehaviors: function() {
  	if(!this._behaviors) return null;
  	else return this.lazyBehaviors();
	},
	lazyBehaviors: function() {
		return this._behaviors = this.hasOwnProperty('_behaviors') ? this._behaviors : {};
	},
	getBehavior: function(prop) {
		if(!this.getBehaviors()) return null;
		else return this.lazyBehaviors()[prop];
	},
	removeBehavior: function(prop) {
		this._behaviors[prop].removeSelfAsBehavior();
	}
});