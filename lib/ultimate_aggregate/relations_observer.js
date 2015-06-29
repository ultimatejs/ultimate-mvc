Ultimate('UltimateAggregateRelationsPublisher').extends(UltimateAggregatePublisher, {
	construct: function(name, rel, agg, groupModel) {
		this.fk = rel.foreign_key;	
		this.groupModel = groupModel;

		this.aggregate = agg;
		this.modelClass = agg.model;
		this.collection = this.modelClass.collection;
	},
	start: function() {
		var agg = this._agg = this.extractConfig(this.aggregate);
		this.update(agg);
		this.observe(agg);
	},
	
	extractConfig: function(agg) {
		if(_.isString(agg)) {
			var name = agg;	
			agg = this.modelClass.prototype.aggregates[name]; 
			agg = UltimateUtilities.extractConfig(agg, this.modelClass.prototype, this.publisher.userId);
			agg.aggregate_name = name; //aggregate_name not already on agg as in relation aggregates
		}

		//if(!UltimateUtilities.isAllowed(agg, this.modelClass.prototype, this.publisher.userId)) return false;
		
		agg.collection = this.collection._name;
		agg.selector = this._prepareSelector(agg.selector);
		agg.model = this.groupModel.className;
		agg.type = 'groupby';

		if(agg.formatter) agg.formatter = agg.formatter.bind(this.modelClass.prototype);
		return agg;
	},
	
	
	store: function(results, agg, singleId) {	
		if(!singleId) results = this.setResultZeroForMissingResults(results);

		_.each(results, function(res) {
			var Model = UltimateUtilities.classFrom(agg.model),
				result = {};

			result[agg.aggregate_name] = this.formatResult(res.result);	
			
			Model.update(res._id, {$set: result});
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
	},
	formatResult: function(result) {
		if(this._agg.formatter) return this._agg.formatter(result);
		else return result; 
 	}
});