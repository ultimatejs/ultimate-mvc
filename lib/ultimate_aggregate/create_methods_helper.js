Ultimate('CreateAggregateMethodsHelper').extends({
	exec: function(callback) {
		if(Meteor.isServer) return this.execAggregateSync();
		else if(Meteor.isClient && callback) this.execAggregateAsync(callback);
		else if(Meteor.isClient) return this.findAggregateResult();
	},
	execAggregateAsync: function(modelClassName, id, groupClassName, callback) {	
		Meteor.call('execAggregateAsync', this.name, modelClassName, id, groupClassName, function(err, res) {
			if(!err) callback(res);
			else throw new Meteor.Error('aggregate-error', err.toString());
		});
	},	
	findAggregateResult: function() {
		var selector = this._getFindSelector(),
			latestAggValue =  UltimateAggregates.findOne(selector, {sort: {updated_at: -1}});

		return latestAggValue ? latestAggValue.result : 0;
	},
	_getFindSelector: function() {
		this.aggregate.collection = this.collection._name; //info for selecting later in UltimateAggregates collection
		return this.aggregate;
	}
});


if(Meteor.isServer) {
	Meteor.methods({
		execAggregateAsync: function(name, modelName, id, groupModelClassName) {
			var Model = Ultimate.classes[modelName];
				
			if(id) return Model.findOne(id)[name](null, true); //true params indicate isAsyncFromClient, and will enforce agg method is validated for the client
			else return groupModelClassName ? Model.groupBy(groupModelClassName)[name](null, null, null, true) : Model[name](null, null, null, true);
		}
	});
}