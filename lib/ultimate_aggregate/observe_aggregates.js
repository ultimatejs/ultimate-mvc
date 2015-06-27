/** MAY USE IN THE FUTURE IF WE WANNA USE ULTIMATE_AGGREGATES FOR GROUP MODELS
INSTEAD OF SAVING CHANGES TO THE MODELS THEMSELVES:

UltimateAggregatePublisher.extend({
	observeAggregates: function(agg) {
		var selector = this.class.ultimateAggregateSelector(agg, this.fk);

		this.aggregateObserver = UltimateAggregates.find(selector).observe({
			added: function(doc) {
				if(!this.isAlreadyAddedAggregateId(doc._id)) {
					this.updateModel(doc, agg);
					this.addAggregateId(doc._id);
					this.handleCachedClientIds(doc);
				}
			}.bind(this),
			changed: function(doc) {
				this.updateModel(doc, agg);
			}.bind(this),
			removed: function(doc) {
				this.removeAggregateId(doc._id)
			}.bind(this)
		});
	},
	
	
	updateModel: function(doc, agg) {
		var Model = UltimateUtilities.classFrom(doc.model),
			result = {};

		result[agg.aggregate_name] = doc.result;	
		Model.update(doc[this.fk], {$set: result});
	},
	addAggregateId: function(id) {
		this._aggregateIds = this._aggregateIds || [];
		this._aggregateIds.push(id);
	},
	isAlreadyAddedAggregateId: function(id) {
		return _.contains(this._aggregateIds, id);
	},
	removeAggregateId: function(id) {
		this._aggregateIds = _.without(this._aggregateIds, id);
	},
	removeOldAggregateIds: function(agg) {
		var selector = this.class.ultimateAggregateSelector(agg, this.fk),
			newIds = UltimateAggregates.find(selector).map(function(a) { return a._id; }),
			removedIds = _.difference(this._aggregateIds, newIds);
			
		console.log("REMOVE AGGREGATE IDS", this._id, this._aggregateIds, newIds, removedIds);
		this._aggregateIds = _.difference(this._aggregateIds, removedIds);
		
		UltimateAggregate.remove({_id: {$in: removedIds}});
	}
});
**/