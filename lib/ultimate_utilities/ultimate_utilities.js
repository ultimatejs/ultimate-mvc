Ultimate('UltimateUtilities').extends({}, {
	extractConfig: function(config, Class, userId) {
		Class = UltimateUtilities.classFrom(Class);

		var context;
		if(Class && Class.isUltimate) context = Class.isUltimatePrototype ? Class : Class.prototype;

		if(_.isFunction(config)) config = config.call(context, Ultimate.userId(userId));
		config = UltimateClone.deepClone(config);

		return config;
	},
	classFrom: function(Class) {
		return _.isString(Class) ? Ultimate.classes[Class] : Class;
	},
	pickCollectionOptions: function(options) {
		return _.pick(options || {}, 'sort', 'limit', 'fields', 'skip');
	},
	checkOptions: function(options) {
		if(!options) return;

		var ids; //selectors supplied by the client can only provide ids

		if(options.selector && options.selector._id) ids = options.selector._id;
		delete options.selector;

		if(ids) options.selector = {_id: ids};

		this.checkFields(options.fields);
	},
	checkFields: function(fields) {
		_.each(fields, function(field, name) {
			if(field === 1) delete fields[name];
		});
	},
	checkAggregates: function(aggs) {
		if(!aggs) return; 
		if(!_.isString(aggs[0])) throw new Error('aggregates-must-be-strings');
	},
	resolveSelectorClassName: function(selector, model) {
		//allows for inheritance filtered by child models sharing parent collection, but 
		//if you want to return all child models of a parent collection, set className: null in your selector
		if(selector.hasOwnProperty('className')) {
			if(!selector.className) delete selector.className; //selector.className === null || undefined, set intentionally to not filter by child class
			//else for whatever reason, the developer set a custom className: selector.className = selector.className;
		}
		else selector.className = model.className;

		return selector;
	},
	config: function(config, userId, propNames, context) {
		if(propNames) {
			propNames.unshift(config);
			config = _.pick.apply(_, propNames);
		}
		
		context = context || config;
		
		config = _.mapObject(config, function(val, key) {
			return _.isFunction(val) ? val.call(context, Ultimate.userId(userId)) : val;
		});
		return _.clone(config);
	},
	extract: function(val, context, userId) {
		return _.isFunction(val) ? val.call(context, Ultimate.userId(userId)) : val;
	},
	configKey: function(config, key, userId) {
		return _.isFunction(config[key]) ? config[key].call(config, Ultimate.userId(userId)) : config[key];
	},
	isAllowed: function(config, context, userId, type, name) {
		var isAllowed = true;
		
		if(config.admin && !Ultimate.isAdmin(userId)) isAllowed = false;
		
		if(config.isAllowed === false) isAllowed = false;
		else if(_.isFunction(config.isAllowed) && !config.isAllowed.call(context, userId)) isAllowed = false;
		
		if(!isAllowed) {
			if(type && name) console.log('NOT ALLOWED to subscribe to this '+type+': '+name);
			return false;
		}
			
		return true;
	},
	hasMongoOperator: function(modifier) {
		return !!_.reduce(_.keys(modifier), function(acc, num) { 
			return (num.indexOf('$') === 0 ? 1 : 0) + acc;
		}, 0);
	}
});