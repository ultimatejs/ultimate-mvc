Ultimate('UltimateAggregateCollectionObserver').extends(UltimateAggregateObserver, {
	construct: function(rel, agg) {
		this.aggregate = agg;
		this.modelClass = agg.model; //rel is the same as agg in this case, since observer_relation code is reused
		this.collection = this.modelClass.collection;
	},
	extractConfig: function(agg) {
		agg = _.clone(agg);
		
		agg.type = 'collection';
		agg.collection = this.collection._name;
		agg.selector = this._prepareSelector(agg.selector);
		
		if(agg.formatter) agg.formatter = agg.formatter.bind(this.modelClass.prototype);
		if(agg.callback) agg.callback = agg.callback.bind(this.modelClass.prototype);
		
		return agg;
	},
	exec: function(agg, collection) {
		return this.callParent('exec', agg, collection, null, true);
	},
	store: function(res, agg) {
		var selector = this._upsertSelector(agg),
			result = this._formatResult(res), //res is a single value, not an array for CollectionObserver
			callbackRes;
		
		if(agg.callback) callbackRes = agg.callback(result);
			
		if(callbackRes !== false) UltimateAggregates.upsert(selector, {$set: {result: result}});
	},
	_upsertSelector: function(agg) {
		return _.pick(agg, 'type', 'collection', 'operator', 'field', 'aggregate_name');
	}
});