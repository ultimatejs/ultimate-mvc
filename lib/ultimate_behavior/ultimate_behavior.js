UltimateBehavior = Ultimate('UltimateBehavior').extends(UltimateFacade);

UltimateBehavior.extendBoth({
	abstract: true,
	isBehavior: true,
	//attachTo: [],
	
	attachToOwner: function(owner, prop, environment) {
		this.composeCircular('owner', owner); //avoid circular references so EJCON.clone doesn't break; i.e. we cant do this.owner = owner;

		if(prop) this._attachSelf(prop, environment);

		this._mixinTo(owner);

		this.___propertyName = prop || this.className;
		owner.lazyBehaviors()[this.___propertyName] = this;

		this.emit('attachedToOwner');
	},
	_mixinTo: function(owner) {
		_.extend(owner, this.getMethods());
	},
	_attachSelf: function(prop, environment) {
		_.extend(this, this.owner()[prop]); //copy behavior props previously assigned to saved model to this behavior object
		this.owner()[prop] = this; //now assign actual behavior object to owner prop, overwriting it, so that the prop/vals are there, but has access to behavior methods
		this.___environment = environment;
	},


	getMethods: function() {
		var methods = this.callParent('getMethods', null, true, null, null);

		return _.chain(methods)
			.filterObject(function(method, name) {
				return _.contains(this.proxyMethods, name) && !this._isStubEnvironment();
			}, this)
			.mapObject(function(method, name) {
				return method.bind(this);
			}, this)
			.value();
	},
	isBaseMethod: function(prop) {
		return UltimateClass.prototype.hasOwnProperty(prop)
      		|| UltimateFacade.prototype.hasOwnProperty(prop)
      		|| UltimateBehavior.prototype.hasOwnProperty(prop);
	},


	removeSelfAsBehavior: function() {
		_.each(this.getMethods(), function(method, name) {
			delete this.owner()[name];
		}, this);

		delete this.owner()[this.___propertyName];
		delete this.owner()._behaviors[this.___propertyName];
	},
	
	
	_isStubEnvironment: function() {
		var env = this.___environment;

		if(env && env.toLowerCase() == 'client' && Meteor.isServer) return true;
		if(env && env.toLowerCase() == 'server' && Meteor.isClient) return true;
		return false;
	},


	ownerClassName: function() {
		return this.owner().className;
	},
	ownerClass: function() {
		return this.owner().class;
	},
	ownerPrototype: function() {
		return this.owner().getPrototype();
	},

	//Special functionality to allow behaviors to attach themselves when the class is first created
	onAttachBehaviors: function() {
		if(_.isEmpty(this.attachTo) || this.className.indexOf('_static_clone_') > -1) return; //"instantiated" static clones dont run this code; this code is run by the parent to set them up

		if(!_.isArray(this.attachTo[0])) {
			if(this.isStatic) this.attachTo = [this.attachTo]; //single behaviors: ['BehaviorClass', 'prop']	-> [[BehaviorClass, 'prop']]
			else this.getPrototype().attachTo = [this.attachTo]; //single behaviors: ['BehaviorClass', 'prop']	-> [[BehaviorClass, 'prop']]
		}
		//else eg: _.isArray(this.attachTo[1]) [[Class, prop, env], [Class, prop, env]]

		_.each(this.attachTo, function(classArray) {
			classArray = _.clone(classArray);

			var className = classArray.shift(),
				behavior = [this.className].concat(classArray); //[SomeBehaviorClass, prop, environment]

			if(this.isStatic) Ultimate.classes[className].addBehavior(behavior);
			else Ultimate.classes[className].getPrototype().addBehavior(behavior);
		}, this);
	}
});

UltimateBehavior.extendStatic({
	cloneCount: 0,
	getCloneName: function() {
		this.cloneCount++;
		return this.className+'_static_clone_'+this.cloneCount;
	},
	cloneClass: function() {
		var BehaviorName = this.getCloneName();
    return UltimateDouble(BehaviorName).extends(this);
	}
});