UltimateClass.extendBoth({
	//behaviors: [], //defined by developers on protos, eg: [BehaviorClass, [BehaviorClass, 'prop', 'methodName']]
	//_behaviors: {}, //internally used to keep track of dynamnically attached behaviors to instantiated objects 

	attachBehaviors: function() {
		if(!_.isArray(this.behaviors)) return;
		if(!_.isArray(this.behaviors[0])) this.getPrototype().behaviors = [this.behaviors]; //single behaviors: [BehaviorClass, 'prop']	-> [[BehaviorClass, 'prop']]
		
		_.each(this.behaviors, function(behavior) {
			var parts = [].concat(behavior);
			this.attachBehavior.apply(this, parts);
		}, this);
	},
	attachBehavior: function(Class, prop, environment) {
		if(_.isString(Class)) {
			if(Ultimate.classes[Class]) Class = Ultimate.classes[Class];
			else Class = Ultimate(Class).extends(UltimateBehavior, {});
		}
	
		var obj = Class instanceof UltimateClass ? Class : new Class; //instantiated : BehaviorClass
		obj.attachToOwner(this, prop, environment);
		
		if(this.isChildOf('UltimateModel')) { //Model hooks have a custom way to deal with behavior events.
			Ultimate.setupHooks(obj, this.getPrototype()); //unfortunately hook handlers will be added to proto rather than just this object
		}
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
	},


	//Unlike attachBehavior, addBehavior is for STATIC binding of behaviors to all instantiated objects.
	//It essentially just allows you to append to .behaviors[] from other code, namely UltimateBehavior's attachTo() method
	addBehavior: function(Class, prop, environment) {
  	behavior = _.toArray(arguments);
  	behavior = _.isArray(behavior[0]) ? behavior[0] : behavior; //single argument behavior alrady in array format : arguments
  	this.behaviors = this.hasOwnProperty('behaviors') ? this.behaviors : [];
  	this.behaviors.push(behavior);
	}
});

UltimateClass.extendStatic({
	attachBehaviors: function(behaviors) {
		if(!_.isArray(behaviors[0])) behaviors = [behaviors]; //single behaviors: ['BehaviorClass', 'prop']	
		
		_.each(behaviors, function(behavior) {
			var parts = [].concat(behavior);
			this.attachBehavior.apply(this, parts);
		}, this);
	},
  	attachBehavior: function(Class, prop, environment) {
    	if(_.isString(Class)) {
      		if(Ultimate.classes[Class]) Class = Ultimate.classes[Class];
      		else Class = Ultimate(Class).extends(UltimateBehavior); //non-existent client Classes are automatically created
    	}

    	//must clone class similar to how instantiated objects work, but for classes, in order so multiple
    	//owner <-> behavior relationships may be maintained
    	Class = Class.cloneClass();
    	Class.attachToOwner(this, prop, environment);
  	}
});