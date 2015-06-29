Ultimate('CreateAggregateInstanceMethodsHelper').extends(CreateAggregateMethodsHelper, {
	construct: function(modelInstance, name, agg, rel) {
		this.name = name;
		this.aggregate = agg;
		this.relation = rel;
		
		this.model = this.modelClass = UltimateUtilities.classFrom(rel.model);
		this.modelClassName = this.model.className;
		this.collection = this.model.collection;
		
		this.modelInstance = this.context = modelInstance;
		this.fk = rel.foreign_key;
		this.fkId = modelInstance._id;
	},
	execAggregateSync: function() {
		return UltimateAggregateRelationObserver.prototype.exec(this._getExecSelector(), this.model, this.fk, true);
	},
	execAggregateAsync: function(callback) {
		this.callParent('execAggregateAsync', this.modelInstance.className, this.fkId, callback);
	},
	_getExecSelector: function() {
		var agg = _.clone(this.aggregate);
		agg.selector = agg.selector || {};
		agg.selector[this.fk] = this.fkId;
		return agg;
	},
	findAggregateResult: function() {
		return this.modelInstance[this.name];
	}
});