Ultimate('UltimateAggregateRelationsPublisher').extends(UltimateAggregatePublisher, {
	construct: function(factory, publisher, aggregates, ModelClass, selector, cachedIdsByCollection) {
		this.selector = selector;
		this.cachedIdsByCollection = cachedIdsByCollection;
		this.callParentConstructor(factory, publisher, aggregates, ModelClass)
	},
	linkParent: function(parent, fk) {		
		this.parentPublisher = parent;		
		this.fk = fk;
		this.groupModelClassName = parent.modelClass.className;
		parent.on('cursorChange', this.start.bind(this), true);
	},
	store: function(results, agg) {
		_.each(results, function(res) {
			var newAgg = UltimateClone.deepClone(agg);

			delete newAgg.options; //an extra unnecessary property for aggregates generated from relation config objects

			newAgg.result = res.result;
			newAgg.fk = res._id;

			id = EJSON.stringify(_.pick(newAgg, 'model', 'collection', 'operator', 'field', 'selector', 'fk'));

			if(_.contains(this._publishedIds, id)) {
				this.publisher.changed('ultimate_aggregates', id, newAgg);
			}
			else {
				this._publishedIds.push(id);
				this.publisher.added('ultimate_aggregates', id, newAgg); //normal response -- client doesn't have models from cache already

				//send 'changed' message as well since 'added' message will non-fatally fail client side
				if(_.contains(this.cachedIdsByCollection.ultimate_aggregates, id)) this.publisher.changed('ultimate_aggregates', id, newAgg);
			}
		}, this);
	},
	prepareUltimateAggregatePropsForSave: function(agg) {
		agg = UltimateClone.deepClone(agg);

		agg.model = this.groupModelClassName;
		agg.type = 'groupby';

		return agg;
	},
	cursor: function(agg) {
		var selector = this._prepareSelector(agg.selector);
		return this.collection.find(selector, {limit: 1, sort: {updated_at: -1}});
	},
	
	
	_getAggregate: function(name) {
		var agg = this.callParent('_getAggregate', name);
		this._prepareSelector(agg.selector);
		return agg;
	},
	_prepareSelector: function(selector, model) {
		selector = this.callParent('_prepareSelector', selector, model);
		if(this.getParent()) selector[this.fk] = {$in: this._ids()}; //CreateAggregateMethodsHelpers dont have a parentPublisher 
		
		//console.log("AGG REL PREP SEL", selector);

		return selector;
	},
	getParent: function() {
		return this.parentPublisher;
	},
	_ids: function() {
		return this.getParent().outputIds();
	}
});