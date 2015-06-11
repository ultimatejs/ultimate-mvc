Ultimate('UltimateRelationBehavior').extends(UltimateBehavior, {}, {
	attachTo: ['UltimateModel'],

	onAttachedToOwner: function() {
		this._addRelationMethods(this.ownerPrototype());
		this.ownerPrototype().on('methodsAdded', this._addRelationMethods.bind(this));
	},
	_addRelationMethods: function(methods) {
		_.each(methods.relations, this._createRelationMethod.bind(this));
	},
	_createRelationMethod: function(relConfig, name) {
		var proto = this.ownerPrototype();

		proto[name] = function(selector, options) { //create function, eg: user.orders();
			var rel = UltimateUtilities.extractConfig(relConfig, this); 
			
			selector = _.extend({}, rel.options ? rel.options.selector : null, selector);
			options = _.extend({}, rel.options, options);
			
			var model = _.isString(rel.model) ? Ultimate.classes[rel.model] : rel.model,
				collection = rel.collection || model.collection,
				findName = rel.relation == 'has_one' || rel.relation == 'belongs_to' ? 'findOne' : 'find';

			if(rel.relation == 'belongs_to') selector._id = this[rel.foreign_key];
			else selector[rel.foreign_key] = this._id;

			if(options.limit == 1) findName = 'findOne';
			
			return collection[findName](selector, options);
		};
	}
});


