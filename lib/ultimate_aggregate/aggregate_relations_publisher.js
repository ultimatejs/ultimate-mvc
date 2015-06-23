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
		
		parent.on('cursorChange', function() {
			if(this._isSameIds(this._previousInputIds, this._ids())) return;
			this.start();
		}.bind(this), true);
	},
	store: function(results, agg) {
		var resolvedResults = _.map(this._ids(), function(id) {
				var resolvedRes = {_id: id, result: 0};
			
				_.some(results, function(res) {
					if(res._id === id) {
						resolvedRes.result = res.result;
						return true;
					}
				});
				
				return resolvedRes;
			});
			
		_.each(resolvedResults, function(res) {
			var newAgg = UltimateClone.deepClone(agg);

			delete newAgg.options; //an extra unnecessary property for aggregates generated from relation config objects

			newAgg.result = res.result;
			newAgg.fk = res._id;

			var id = EJSON.stringify(_.pick(newAgg, 'model', 'collection', 'operator', 'field', 'aggregate_name', 'fk'));
			
			delete newAgg.selector; //no longer findable by selector; aggregate_name is used instead since selectors are problematic with Dates

			if(_.contains(this._publishedIds, id)) {
				console.log('STORE', newAgg.aggregate_name, 'changed', res._id, res.result);
				this.publisher.changed('ultimate_aggregates', id, newAgg);
			}
			else {
				console.log('STORE', newAgg.aggregate_name, 'added', res._id, res.result);
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
		agg.selector = this._prepareSelector(agg.selector);
		return agg;
	},
	_prepareSelector: function(selector, model, parentIds) {
		selector = this.callParent('_prepareSelector', selector, model);

		
		if(this.getParent() && !_.isEmpty(parentIds)) selector[this.fk] = {$in: parentIds}; //multiple calls to this.getParent().outputIds() in succession returns empty arrays sometimes, so we do it once in this.start()
		else selector[this.fk] = {$in: this._ids()};  //called from cursor()
			
		return selector;
	},
	getParent: function() {
		return this.parentPublisher;
	},
	_ids: function() {
		return this.getParent().outputIds();
	},
	
	
	_isSameIds: function(ids1, ids2) {
		var diff1 = _.difference(ids1, ids2),
			diff2 = _.difference(ids2, ids1);
		
		return _.isEmpty(diff1) && _.isEmpty(diff2);;
	},
});