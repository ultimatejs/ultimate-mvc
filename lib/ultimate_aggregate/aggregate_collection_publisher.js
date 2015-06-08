Ultimate('UltimateAggregateCollectionPublisher').extends(UltimateAggregatePublisher, {
	construct: function(factory, publisher, aggregates, ModelClass, cachedIdsByCollection) {
		this.cachedIdsByCollection = cachedIdsByCollection;
		this.callParentConstructor(factory, publisher, aggregates, ModelClass);
	},
	exec: function(agg, collection, fk) {
		return this.callParent('exec', agg, collection, fk, true)
	},
	store: function(result, agg) {
		var id = EJSON.stringify(agg),
			newAgg = UltimateClone.deepClone(agg);
			
		newAgg.result = result;	
		
		if(_.contains(this._publishedIds, id)) {
			console.log('AggregateCollectionPublisher', 'CHANGED', id, newAgg, result);
			this.publisher.changed('ultimate_aggregates', id, newAgg);
		}
		else {
			console.log('AggregateCollectionPublisher', 'ADDED', id, newAgg, result);
			this._publishedIds.push(id);

			this.publisher.added('ultimate_aggregates', id, newAgg); //normal response -- client doesn't have models from cache already
			
			//send 'changed' message as well since 'added' message will non-fatally fail client side
			if(_.contains(this.cachedIdsByCollection.ultimate_aggregates, id)) this.publisher.changed('ultimate_aggregates', id, newAgg);
		}
	},
	prepareUltimateAggregatePropsForSave: function(agg) {
		agg = UltimateClone.deepClone(agg);
		agg.type = 'collection';

		return agg;
	},
	cursor: function(agg) {
		var selector = agg.selector || {};
		return this.collection.find(selector, {limit: 1, sort: {updated_at: -1}});
	}
});