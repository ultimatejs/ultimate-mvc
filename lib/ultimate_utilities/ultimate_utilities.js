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

		_.each(options.fields, function(field, name) {
			if(field === 1) delete options[name];
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
			//else selector.className = selector.className; //for whatever reason, the developer set a custom className
		}
		else selector.className = model.className;

		return selector;
	}
});