Ultimate('UltimatePermissions').extends(UltimateFacade, {
	abstract: true,
	isPermissions: true,
	
	allowMethods: ['update', 'insert', 'remove', 'fetch', 'transform', 'allowUpdate', 'allowInsert', 'allowRemove', 'allowFetch', 'allowTransform'],
	denyMethods: ['denyUpdate', 'denyInsert', 'denyFetch', 'denyRemove', 'denyTransform'],
	
	
	onFacadeStartup: function() {
		if(!this.collection) return; //UltimateForm that uses UltimatePermissions for allowHttp features dont have collections;
		
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
	},
	
	
	allowedHttpMethod: function(name, userId, obj, args) {
		var isAllowed = true,
			newArgs = _.clone(args);
		
		newArgs.unshift(obj);
		newArgs.unshift(userId);
		newArgs.unshift(name);

		if(_.isFunction(this.allowHttp)) isAllowed = this.allowHttp.apply(this, newArgs);
		if(_.isFunction(this.allowHttpInstance)) isAllowed = this.allowHttpInstance.apply(this, newArgs);
		if(_.isFunction(this.allowHttpStatic)) isAllowed = this.allowHttpStatic.apply(this, newArgs);
		

		if(_.isFunction(this[name])) {
			args = _.clone(args);
			
			args.unshift(obj);
			args.unshift(userId);
			
			isAllowed = this[name].apply(this, args);
		}

		if(!isAllowed) throw new Meteor.Error('http-method-not-allowed', 'HTTP Method '+name+' from '+obj.className+' is not allowed.');
		else return true;
	}
});