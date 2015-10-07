Ultimate('UltimateAggregateRelationObserver').extends(UltimateAggregateObserver, {
	construct: function(rel, agg, groupModel) {
		this.fk = rel.foreign_key;	
		this.groupModel = groupModel;

		this.aggregate = agg;
		this.modelClass = agg.model;
		this.collection = this.modelClass.collection;
		this.trackObserver();
	},
	
	extractConfig: function(agg) {
		agg = _.clone(agg);
		
		agg.type = 'groupby';
		agg.collection = this.collection._name;
		agg.selector = this._prepareSelector(agg.selector);
		agg.model = this.groupModel.className;

		if(agg.formatter) agg.formatter = agg.formatter.bind(this.modelClass.prototype);
		if(agg.callback) agg.callback = agg.callback.bind(this.modelClass.prototype);
		
		return agg;
	},
	
	
	store: function(results, agg, singleId) {	
		if(!singleId) results = this.setResultZeroForMissingResults(results);

		_.each(results, function(res) {
			var Model = UltimateUtilities.classFrom(agg.model),
				result = {},
				callbackRes;

			result[agg.aggregate_name] = this._formatResult(res.result);	
			if(agg.callback) callbackRes = agg.callback(res._id, result[agg.aggregate_name]);
				
			if(callbackRes !== false) Model.update(res._id, {$set: result});
		}.bind(this));
	},
	setResultZeroForMissingResults: function(results) {
		//aggregate exec will only produce results for groupBy models whose result !== 0,
		//so we need to produce an array of objects that have result == 0 for those models
		
		//var ids = this._ids();
		
		var ids = this.groupModel.find().map(function(model) {return model._id; });
		
		return _.map(ids, function(id) {
			var resolvedRes = {_id: id, result: 0};

			_.some(results, function(res) {
				if(res._id === id) {
					resolvedRes.result = res.result;
					return true;
				}
			});

			return resolvedRes;
		});
	}
});