Ultimate('UltimateAggregateCollectionPublisher').extends({
	construct: function(name, factory, modelClass) {
		this.publisher = factory.publisher;
		this.cachedIds = factory.cachedIdsByCollection.ultimate_aggregates;
		
		this.name = name;
		this.modelClass = modelClass;
		this.collection = this.modelClass.collection;
	},
	
	start: function() {
		var agg = this.extractConfig(this.name);
		
		//SECURITY CHECKS
		if(agg === false) throw new Error('unauthorized-access-to-aggregate', 'NOT ALLOWED to subscribe to this aggregate: ' + (_.isString(aggregate) ? this.modelClass.className+'.'+aggregate : this.modelClass.className+'.'+agg.operator+' '+agg.field));
		
		this.observeUltimateAggregates(agg);
	},
	extractConfig: function(name) {
		var agg = this.modelClass.prototype.aggregates[name]; //agg object doubles as selector
		agg = UltimateUtilities.extractConfig(agg, this.modelClass.prototype, this.publisher.userId);

		if(!UltimateUtilities.isAllowed(agg, this.modelClass.prototype, this.publisher.userId)) return false;
		
		agg.collection = this.collection._name;
		agg.aggregate_name = name;
		agg.type = 'collection';
		
		return agg;
	},
	
	observeUltimateAggregates: function(agg) {
		var selector = UltimateAggregateCollectionObserver.prototype._upsertSelector(agg);

		if(this.aggregateObserver) this.aggregateObserver.stop();
		
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
		if(_.contains(this.cachedIds, doc._id)) {
			this.publisher.changed('ultimate_aggregates', doc._id, 	doc);
		}
	}
});