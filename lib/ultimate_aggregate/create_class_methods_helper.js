Ultimate('CreateAggregateClassMethodsHelper').extends(CreateAggregateMethodsHelper, {
	construct: function(modelClass, name, agg) {
		this.name = name;
		this.modelClass = this.context = modelClass;
		this.modelClassName = modelClass.className;
		this.collection = modelClass.collection;
		this.aggregate = agg;
	},
	execAggregateSync: function() {
		return UltimateAggregateCollectionPublisher.prototype.exec(this.aggregate, this.modelClass, null, true);
	},
	execAggregateAsync: function(callback) {
		this.callParent('execAggregateAsync', this.modelClassName, callback);
	}
});