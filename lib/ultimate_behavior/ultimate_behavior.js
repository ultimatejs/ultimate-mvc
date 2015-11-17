Ultimate('UltimateBehavior').extends(UltimateFacade, {
	abstract: true,
	isBehavior: true,
	
	attachToOwner: function(owner, prop, environment) {
		this.compose('owner', owner); //avoid circular references so EJCON.clone doesn't break; i.e. we cant do this.owner = owner;

		if(prop) this._attachSelf(prop, environment);

		this._mixinTo(owner);

		this.___propertyName = prop || this.className;
		owner.lazyBehaviors()[this.___propertyName] = this;

		this.emit('attached');
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
	}
});