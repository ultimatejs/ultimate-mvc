Ultimate('UltimateAggregateCollectionPublisher').extends(UltimateAggregatePublisher, {
	extractConfig: function(name) {
		var agg = this.modelClass.prototype.aggregates[name]; //agg object doubles as selector
		agg = UltimateUtilities.extractConfig(agg, this.modelClass.prototype, this.publisher.userId);

		if(!UltimateUtilities.isAllowed(agg, this.modelClass.prototype, this.publisher.userId)) return false;
		
		agg.collection = this.collection._name;
		agg.aggregate_name = name;
		agg.type = 'collection';
		
		return agg;
	},
	_prepareSelector: function(selector, model) {
		model = model || this.modelClass;
		selector = _.clone(selector) || {};
		UltimateUtilities.resolveSelectorClassName(selector, model);
		return selector;
	},
	
	
	exec: function(agg, collection, fk) {
		return this.callParent('exec', agg, collection, fk, true)
	},
	store: function(result, agg) {
		var id = EJSON.stringify(agg);
		UltimateAggregates.upsert(id, {$set: {result: result}});
	}
});