Ultimate('UltimateRelationBehavior').extends(UltimateBehavior, {}, {
	attachTo: ['UltimateModel'],

	onAttachedToOwner: function() {
		this._addRelationMethods(this.ownerPrototype());
		this.ownerPrototype().on('methodsAdded', this._addRelationMethods.bind(this));
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
			var rel = UltimateUtilities.extractConfig(relConfig, this); 
			
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
					key = rel.key || '_id';

				if(rel.relation == 'belongs_to') selector[key]= this[rel.foreign_key];
				else selector[rel.foreign_key] = this[key];

				if(options.limit == 1) findName = 'findOne';
				return collection[findName](selector, options);
			}
		};
	}
});


