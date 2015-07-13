Ultimate('UltimateRelationBehavior').extends(UltimateBehavior, {}, {
	attachTo: ['UltimateModel'],

	onAttachedToOwner: function() {
		this._addRelationMethods(this.ownerPrototype());
		this.ownerPrototype().on('methodsAdded', this._addRelationMethods.bind(this));
	},
	_addRelationMethods: function(methods) {
		if(methods.relations) {
			var relations = _.extend({}, this.ownerPrototype().parent.relations, methods.relations);
			this.ownerPrototype().relations = relations; //we have to re-assign it so parent relations are inherited
			_.each(relations, this._createRelationMethod.bind(this));
		}
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
		};
	}
});


