Ultimate('UltimateAggregateCollectionPublisher').extends(UltimateAggregatePublisher, {
	extractAggregateConfig: function(name) {
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
		var selector = this.class.ultimateAggregateSelector(this._agg);
		UltimateAggregates.upsert(selector, {$set: {result: result}});
	},
	
	
	observeUltimateAggregates: function(agg) {
		var selector = this.class.ultimateAggregateSelector(agg);

		this.aggregateObserver = UltimateAggregates.find(selector).observe({
			added: function(doc) {
				this.publisher.added('ultimate_aggregates', doc._id, doc);
				this.handleCachedClientIds(doc);
			}.bind(this),
			changed: function(doc) {
				this.publisher.changed('ultimate_aggregates', doc._id, doc);
			}.bind(this),
			removed: function(doc) {
				this.publisher.removed('ultimate_aggregates', doc._id);
			}.bind(this)
		});
	},
	
	
	handleCachedClientIds: function(doc) {
		//For cached Ids, send 'changed' message also since 'added' message will non-fatally fail client side.
		//The client will already have the id in the collection, and won't want to add it again.
		if(_.contains(this.cachedIdsByCollection.ultimate_aggregates, doc._id)) {
			this.publisher.changed('ultimate_aggregates', doc._id, 	doc);
		}
	}
});