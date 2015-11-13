/**

Ultimate('UltimateRelationBehavior').extends(UltimateBehavior, {
	abstract: true,
	attachTo: ['UltimateModel'],

	onStartup: function() {
		//1. `___insecure` allows for nameless subscriptions via any selector until subscriptions are added.
		if(!this.subscriptions) this.subscriptions = {___insecure: {}};
		this._addSubscriptions(this.subscriptions);
		
		//2. `justAggregates` allows for u to call subscribe() without a subscription name parameter:
		//   `Model.agg('someAggName', 'another').subscribe();` 
		//    it will assume ur attempting to subsribe to justAggregates
		this._addSubscriptions({justAggregates: {}});
	},

	onStartup: function() {
		if(this.relations)this._addRelationMethods(this.ownerPrototype());
		else this.setupInsecureRelations();
		
		if(this.ownerClassName().indexOf('Ultimate') === 0) return; //dont setup relations for Ultimate Models (User, App)
		
		this.setupInsecureRelations();
	},
	setupInsecureRelations: function() {
		if(this.ownerPrototype().hasOwnProperty('relations')) return;
			
		var ownerClassName = this.ownerClassName(),
			relations = {};
	
		_.each(Ultimate.models, function(M, className) {
			if(className.indexOf('Ultimate') === 0) return;  //dont relate to Ultimate Models (User, App)
			
			var methodName = M.prototype.___collectionObjectName.toLowerCase();
			relations[methodName] = {relation: 'has_many', model: className, foreign_key: ownerClassName.toLowerCase()+'_id'};
			
			methodName = methodName.substr(0, methodName.length - 1);
			relations[methodName] = {relation: 'belongs_to', model: className, key: className.toLowerCase()+'_id'};
		});
	
		this.ownerPrototype().relations = relations;
		this._addRelationMethods({relations: relations});
	},
	_addRelationMethods: function(relations) {
		_.each(relations, this._createRelationMethod.bind(this));
	},
	_createRelationMethod: function(relConfig, name) {
		var proto = this.ownerPrototype();

		try { //errors are rarely produced, but sometimes developers need an intantiated object context, not proto
			var rel = UltimateUtilities.extractConfig(relConfig, this);
			if(rel.relation == 'aggregate') return; //aggregates dont need methods, since they tack props on models
		}
		catch (e) {}
		
		proto[name] = function(selector, options) { //create function, eg: user.orders();
			var rel = UltimateUtilities.extractConfig(relConfig, this),
				one = selector === 1 || selector === true; //allow for returning first result from hasMany 
			
			if(one) selector = null;
				
			if(rel.relation == 'many_many' || rel.relation == 'many_to_many') {
				var model = _.isString(rel.model) ? Ultimate.classes[rel.model] : rel.model,
					junctionCollection = _.isString(rel.through) ? Ultimate.classes[rel.through] : rel.through,
					finalColletion = model.collection,
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
				return finalColletion.find(selector2, options);
			} 
			else {
				selector = _.extend({}, rel.selector, selector);
				options = _.extend({}, UltimateUtilities.pickCollectionOptions(rel), options);
			
				var model = _.isString(rel.model) ? Ultimate.classes[rel.model] : rel.model,
					collection = rel.collection || model.collection,
					findName = rel.relation == 'has_one' || rel.relation == 'belongs_to' ? 'findOne' : 'find',
					key = rel.relation == 'belongs_to' ? '_id' : (rel.key || '_id'); //belongs to can only be by _id

				if(rel.relation == 'belongs_to') selector[key]= this[rel.key || rel.foreign_key]; //foreign_key deprecated for belongs_to
				else selector[rel.foreign_key] = this[key];

				if(options.limit == 1 || this.___one || one) {
					findName = 'findOne';
					delete this.___one;
				}

				return collection[findName](selector, options);
			}
		};
	}
});
**/

Ultimate('UltimateRelationBehavior').extends(UltimateBehavior, {}, {
	attachTo: ['UltimateModel'],

	onAttachedToOwner: function() {
		this._addRelationMethods(this.ownerPrototype());
		this.ownerPrototype().on('methodsAdded', this._addRelationMethods.bind(this));	
		
		if(this.ownerClassName().indexOf('Ultimate') === 0) return; 
		
		this.on('startup', function() {
			this.setupInsecureRelations();
		});
	},
	setupInsecureRelations: function() {
		if(this.ownerPrototype().hasOwnProperty('relations')) return;
			
		var ownerClassName = this.ownerClassName(),
			relations = {};
	
		_.each(Ultimate.models, function(M, className) {
			if(className.indexOf('Ultimate') === 0) return; 
			
			var methodName = M.prototype.___collectionObjectName.toLowerCase();
			relations[methodName] = {relation: 'has_many', model: className, foreign_key: ownerClassName.toLowerCase()+'_id'};
			
			methodName = methodName.substr(0, methodName.length - 1);
			relations[methodName] = {relation: 'belongs_to', model: className, key: className.toLowerCase()+'_id'};
		});
	
		this.ownerPrototype().relations = relations;
		this._addRelationMethods({relations: relations});
	},
	_addRelationMethods: function(methods) {
		if(methods.relations) _.each(methods.relations, this._createRelationMethod.bind(this));
	},
	_createRelationMethod: function(relConfig, name) {
		var proto = this.ownerPrototype();

		try { //errors are rarely produced, but sometimes developers need an intantiated object context, not proto
			var rel = UltimateUtilities.extractConfig(relConfig, this);
			if(rel.relation == 'aggregate') return; //aggregates dont need methods, since they tack props on models
		}
		catch (e) {}
		
		proto[name] = function(selector, options) { //create function, eg: user.orders();
			var rel = UltimateUtilities.extractConfig(relConfig, this),
				one = selector === 1 || selector === true; //allow for returning first result from hasMany 
			
			if(one) selector = null;
				
			if(rel.relation == 'many_many' || rel.relation == 'many_to_many') {
				var model = _.isString(rel.model) ? Ultimate.classes[rel.model] : rel.model,
					junctionCollection = _.isString(rel.through) ? Ultimate.classes[rel.through] : rel.through,
					finalColletion = model.collection,
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
				return finalColletion.find(selector2, options);
			} 
			else {
				selector = _.extend({}, rel.selector, selector);
				options = _.extend({}, UltimateUtilities.pickCollectionOptions(rel), options);
			
				var model = _.isString(rel.model) ? Ultimate.classes[rel.model] : rel.model,
					collection = rel.collection || model.collection,
					findName = rel.relation == 'has_one' || rel.relation == 'belongs_to' ? 'findOne' : 'find',
					key = rel.relation == 'belongs_to' ? '_id' : (rel.key || '_id'); //belongs to can only be by _id

				if(rel.relation == 'belongs_to') selector[key]= this[rel.key || rel.foreign_key]; //foreign_key deprecated for belongs_to
				else selector[rel.foreign_key] = this[key];

				if(options.limit == 1 || this.___one || one) {
					findName = 'findOne';
					delete this.___one;
				}

				return collection[findName](selector, options);
			}
		};
	}
});


