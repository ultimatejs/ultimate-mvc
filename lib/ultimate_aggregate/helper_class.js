Ultimate('CreateAggregateClassMethodsHelper').extends(CreateAggregateMethodsHelper, {
	construct: function(modelClass, name, agg) {
		this.modelClass = this.context = modelClass;
		this.modelClassName = modelClass.className;
		this.collection = modelClass.collection;
		this.aggregate = agg;
		
		this.name = this.aggregate.aggregate_name = name;
		this.aggregate.collection = this.collection._name;
		this.aggregate.type = 'collection'; 
	},
	execAggregateSync: function() {
		return UltimateAggregateCollectionObserver.prototype.exec(this.aggregate, this.modelClass);
	},
	execAggregateAsync: function(callback) {
		this.callParent('execAggregateAsync', this.modelClassName, callback);
	},
	
	findAggregateResult: function() {
		var selector = UltimateAggregateCollectionObserver.prototype._upsertSelector(this.aggregate),
			latestAggValue =  UltimateAggregates.findOne(selector, {sort: {updated_at: -1}});

		return latestAggValue ? latestAggValue.result : 0;
	}
});