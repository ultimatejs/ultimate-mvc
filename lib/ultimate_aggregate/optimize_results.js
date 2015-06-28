UltimateAggregateRelationsPublisher.extend({
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
	
	
	/** NOT USED ANYMORE -- BUT SAVED JUST IN CASE
	
	
	//Was only used when we had UltimateAggregates to remove
	removeOldIds: function(agg, newIds) {
		if(this._oldIds) { //we will only have old ids to compare the 2nd+ time around
			var removedIds = _.difference(this._oldIds, newIds),
				selector = this.class.ultimateAggregateSelector(agg, this.fk);
			
			console.log("REMOVE OLD IDS", this._id, this._oldIds, newIds, removedIds);
			
			removedIds.forEach(function(id) {
				selector.fk = id;			
				UltimateAggregates.remove(selector);
			}, this);
		}
	},
	
	
	//We could bring this back, but it's probably better we just accept the 
	//network bandwidth loss, and protect cpu/memory resources.
	//And it makes the code a lot easier, which is most important of us at this stage.
	removeUnchangedDocs: function(allResults) {
		if(!this._oldResults) return this._oldResults = allResults; //set it for future calls
		
		var resultsToPublish = _.reject(allResults,  this._isOldResultValueSame.bind(this));	
		
		this._oldResults = allResults; //keep storing allResults as the old results
		return resultsToPublish; //but only publish changed results
	},
	_isOldResultValueSame: function(res) {
		var oldRes = _.find(this._oldResults, function(oldRes) { return oldRes._id == res._id});
		
		//either a new aggregate model, or one where the result has changed, which is all we want 
		//to publish, marking as changed
		return oldRes && res.result === oldRes.result
	},
	updateResultValue: function(newResult) {
		var updated = _.some(this._oldResults, function(res) {
			if(res._id == newResult._id) {
				res.result = newResult.result;
				return true;
			}
		});
		
		if(!updated) {
			this._oldResults = this._oldResults || [];
			this._oldResults.push(newResult);
		}
	}
	**/
});