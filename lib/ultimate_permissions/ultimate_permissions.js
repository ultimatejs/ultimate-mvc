Ultimate('UltimatePermissions').extends(UltimateFacade, {
	abstract: true,
	isPermissions: true,
	
	allowMethods: ['update', 'insert', 'remove', 'fetch', 'transform', 'allowUpdate', 'allowInsert', 'allowRemove', 'allowFetch', 'allowTransform'],
	denyMethods: ['denyUpdate', 'denyInsert', 'denyFetch', 'denyRemove', 'denyTransform'],
	
	
	onFacadeStartup: function() {
		var allowMethods = _.pickAndBind(this, this.allowMethods),
			denyMethods = _.pickAndBind(this, this.denyMethods);

		this._replacePrefix(allowMethods, 'allow');
		this._replacePrefix(denyMethods, 'deny');

		this.collection.allow(allowMethods);
		this.collection.deny(denyMethods);
	},

	isMethod: function(prop) {
		return this.isAllowedMethod(prop);
	},

	_replacePrefix: function(methods, prefix) {
		_.each(methods, function(func, name) {
			if(name.indexOf(prefix === 0)) {
				delete methods[name];
				name = name.replace(prefix, '').toLowerCase();
				methods[name] = func;
			}
		});
	}
});