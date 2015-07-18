UltimateFacade = Ultimate('UltimateFacade').extends();

UltimateFacade.extendBoth({
	abstract: true,
	deniedMethods: [],
	allowedMethods: [],
	
	
	onBeforeStartup: function() {
		this.emit('facadeStartup');
	},
	onFacadeStartup: function() {
		//child classes often should define this method
	},


	getMethods: function(key, mustBeFunc, fromObj, dontBindThis) {
		var fromObj = fromObj || (key ? this[key] : this),
			facade = this;
		
		return _.chain(fromObj)
			.filterPrototype(function(func, prop) {
				if(this.isMethod(prop, fromObj) && this.isFunction(func, mustBeFunc)) return true;
			}, facade)
			.mapObject(function(func, prop) {
				return _.isFunction(func) && !dontBindThis ? func.bind(this) : func;
			}, facade)
			.value();
	},
	isMethod: function(prop, fromObj) {
		return this.isStandardMethod(prop, fromObj) && !this.isDeniedMethod(prop) && this.isAllowedMethod(prop);
	},
	isFunction: function(func, mustBeFunc) {
		if(mustBeFunc) return _.isFunction(func);
		else return true;
	},
	
	isStandardMethodOld: function(prop, fromObj) {
		fromObj = fromObj.prototype || fromObj; //if fromObj above is not 'this' it may be a plain obj without a proto
		return fromObj.hasOwnProperty(prop) && !this.isPrivateMethod(prop) && !this.usesReservedWord(prop);
	},
	isStandardMethod: function(prop, fromObj) {
		return !this.isBaseMethod(prop) && !this.isPrivateMethod(prop);
	},
	isBaseMethod: function(prop) { //TODO: //make it so sub classes define isBaseMethod, or we automatically do appropriately only for descendants
		return UltimateClass.prototype.hasOwnProperty(prop)
      || UltimateFacade.prototype.hasOwnProperty(prop)
      || UltimateAccounts.prototype.hasOwnProperty(prop)
      || UltimateConfig.prototype.hasOwnProperty(prop)
      || UltimateEmail.prototype.hasOwnProperty(prop)
      || UltimatePermissions.prototype.hasOwnProperty(prop)
      || UltimatePublish.prototype.hasOwnProperty(prop)
      || UltimateRouter.prototype.hasOwnProperty(prop)
      || (Meteor.isServer && UltimateRouterServer.prototype.hasOwnProperty(prop))
      || UltimateStartup.prototype.hasOwnProperty(prop);
	},
	isDeniedMethod: function(prop) {
		if(_.isEmpty(this.deniedMethods)) return false;
		else return _.contains(this.deniedMethods, prop);
	},
	isAllowedMethod: function(prop) {
		if(_.isEmpty(this.allowedMethods)) return true;
		else return _.contains(this.allowedMethods, prop);
	}
});