Ultimate('UltimateSetupRelation').extends({
	abstract: true,
	mixinTo: ['UltimateModel'],
	config: ['relations'],

	onChildStartup: function() {
		var owner = this.owner();

		if(owner.isCoreUltimateClass()) return;

		if(owner.relations) this._addRelationMethods(owner.relations);
		else this._setupInsecureRelations();
	},


	_setupInsecureRelations: function() {
		var relations = {};

		_.each(Ultimate.models, function(Model, className) {
			if(Model.isCoreUltimateClass() || Model.isAbstract()) return;  //dont relate to Ultimate Models (User, App)

			var methodName = Model.prototype.___collectionName.toLowerCase(); //eg: 'posts'
			if(!Ultimate.reservedWordsRegex.test(methodName)) {
					relations[methodName] = {relation: 'has_many', model: className, foreign_key: this.className.toLowerCase()+'_id'};
			}

			methodName = methodName.substr(0, methodName.length - 1); //eg: 'post'
			if(!Ultimate.reservedWordsRegex.test(methodName)) {
					relations[methodName] = {relation: 'belongs_to', model: className, key: className.toLowerCase()+'_id'};
			}
		}, this.owner());

		this.owner().relations = relations;
		this._addRelationMethods(relations);
	},
	_addRelationMethods: function(relations) {
		_.each(relations, this._createRelationMethod.bind(this));
	},
	_createRelationMethod: function(relConfig, name) {
		var owner = this.owner();

		try { //errors are rarely produced, but sometimes developers need an intantiated object context, not prototype
			var rel = UltimateUtilities.extractConfig(relConfig, owner);
			if(rel.relation == 'aggregate') return; //aggregates dont need methods, since they tack props on models
		}
		catch (e) {}

		owner[name] = function(selector, options, refreshQuery) { //create function, eg: user.orders();
			let cacheKey = '___'+name+JSON.stringify({selector, options}); //use triple underscore in cache key so it's never saved to db

			if(Meteor.isServer && !refreshQuery && this[cacheKey]) { //cache server calls to relations unless refreshQuery===true
				return this[cacheKey];
			}

			var rel = UltimateUtilities.extractConfig(relConfig, this),
				one = selector === 1 || selector === true; //allow for returning first result from hasMany

			if(one) selector = null;

			if(rel.relation == 'many_many' || rel.relation == 'many_to_many') {
				var Model = _.isString(rel.model) ? Ultimate.classes[rel.model] : rel.model,
					junctionCollection = _.isString(rel.through) ? Ultimate.classes[rel.through] : rel.through,
					key1 = rel.key[0] || '_id',
					key2 = rel.key[1] || '_id',
					selector1 = {},
					selector2 = _.extend({}, rel.selector, selector),
					throughOptions = _.extend({}, UltimateUtilities.pickCollectionOptions(rel.throughOptions), options.throughOptions),
					options = _.extend({}, UltimateUtilities.pickCollectionOptions(rel), options);

				selector1[rel.foreign_key[0]] = this[key1];

				var ids = junctionCollection.find(selector1, throughOptions).map(function(model) {
					model[rel.foreign_key[1]];
				});

				//foreign_key: ['user_id', 'payment_id']
				//key: ['_id', '_id']

				selector2[key2] = {$in: ids};

				if(Meteor.isServer) {
					return this[cacheKey] = Model.find(selector2, options);
				}
				else {
					return Model.find(selector2, options);
				}
			}
			else {
				selector = _.extend({}, rel.selector, selector);
				options = _.extend({}, UltimateUtilities.pickCollectionOptions(rel), options);

				var Model = _.isString(rel.model) ? Ultimate.classes[rel.model] : rel.model,
					collection = rel.collection || Model, //`Model` is the standard use case, and we use its `className filtered finders instead
					findName = rel.relation == 'has_one' || rel.relation == 'belongs_to' ? 'findOne' : 'find',
					key = rel.relation == 'belongs_to' ? '_id' : (rel.key || '_id'); //belongs to can only be by _id

				if(rel.relation == 'belongs_to') selector[key]= this[rel.key || rel.foreign_key]; //foreign_key deprecated for belongs_to
				else selector[rel.foreign_key] = this[key];

				if(options.limit == 1 || this.___one || one) {
					findName = 'findOne';
					delete this.___one;
				}

				if(Meteor.isServer) {
					return this[cacheKey] = collection[findName](selector, options);
				}
				else {
					return collection[findName](selector, options);
				}
			}
		};
	}
});
