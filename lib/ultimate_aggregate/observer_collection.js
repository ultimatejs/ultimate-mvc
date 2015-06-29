Ultimate('UltimateAggregateCollectionObserver').extends(UltimateAggregateObserver, {
	construct: function(rel, agg) {
		this.aggregate = agg;
		this.modelClass = UltimateAggregate; //rel.model
		this.collection = this.modelClass.collection;
	},
	extractConfig: function(agg) {
		agg.collection = this.collection._name;
		agg.type = 'collection';
		return agg;
	},
	exec: function(agg, collection) {
		return this.callParent('exec', agg, collection, null, true);
	},
	store: function(result, agg) {
		var selector = this._upsertSelector(agg);
		UltimateAggregates.upsert(selector, {$set: {result: result}});
	},
	_upsertSelector: function(agg) {
		return _.pick(agg, 'type', 'collection', 'operator', 'field', 'aggregate_name');
	}
});