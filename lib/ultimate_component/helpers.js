UltimateComponentParent.extend({
	setupHelpers: function() {
		this.template.helpers(this.getBoundHelpers());
	},
	
	
	getBoundHelpers: function() {
		return _.mapObject(this._resolvedHelpers, function(func) {
			return this._applyBind(func);
		}.bind(this), this);
	},
	getHelpers: function() {	
		return _.chain(this.getPrototype())
			.filterPrototype(this._isHelper)
			.mapObject(this._resolveHelper, this)
			.extend(this._getSpecialHelpers())
			.value();
	},
	_isHelper: function(method, prop) {
		return !this._deniedRegex.test(prop) && !this._animationsRegex.test(prop) && !this._eventsRegex.test(prop) 
			&& this.isMethod(prop) && this._isFunction(method);
	},
	_isFunction: function(method) {
		return _.isFunction(method) || (_.isArray(method) && method.length > 0); 
	},
	_resolveHelper: function(method, prop) {
		if(_.isArray(method)) return this._helperShortcut(prop);
		else return method;
	},
	_getSpecialHelpers: function() {
		var self = this,
			allSpecialHelpers = {},
			specialHelpers = ['instance', 'templateInstance', 'get', 'getLimit', 'model', 'routeModel', 'ready',
							'componentModel', 'parentModel', 'routeData', 'componentData', 'parentData'];

		_.each(specialHelpers, function(name) {
			allSpecialHelpers[name] = function() {
				var args = _.toArray(arguments);
				args.pop(); //remove the Spacebars.kw object containing args, so these methods can operate correctly
				return self[name].apply(self, args);
			};
		});

		return allSpecialHelpers;
	},
});