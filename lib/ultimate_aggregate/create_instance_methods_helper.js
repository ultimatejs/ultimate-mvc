Ultimate('CreateAggregateInstanceMethodsHelper').extends(CreateAggregateMethodsHelper, {
	construct: function(modelInstance, name, agg, rel) {
		this.name = name;
		this.modelInstance = this.context = modelInstance;
		this.fk = modelInstance._id;
		this.aggregate = agg;
		
		this.relation = rel;
		this.model = this.modelClass = UltimateUtilities.classFrom(rel.model);
		this.modelClassName = this.model.className;
		this.collection = this.model.collection;

		this.foreign_key = rel.foreign_key
	},
	execAggregateSync: function() {
		return UltimateAggregatePublisher.prototype.exec(this._getExecSelector(), this.model, this.foreign_key, true);
	},
	execAggregateAsync: function(callback) {
		this.callParent('execAggregateAsync', this.modelInstance.className, this.fk, null, callback);
	},
	_getExecSelector: function() {
		var agg = _.clone(this.aggregate);
		agg.selector = agg.selector || {};
		agg.selector[this.foreign_key] = this.fk;
		return agg;
	},
	_getFindSelector: function() {
		this.aggregate = this.callParent('_getFindSelector');
		this.aggregate.model = this.modelInstance.className; //this.modelClassName;
		this.aggregate.fk = this.fk;
		this.aggregate.type = 'groupby';

		return this.aggregate;
	}
});