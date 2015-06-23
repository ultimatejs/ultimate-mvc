Ultimate('CreateAggregateMethodsHelper').extends({
	exec: function(callback) {
		var res;
			
		if(Meteor.isServer) res = this.execAggregateSync();
		else if(Meteor.isClient && callback) this.execAggregateAsync(this.formatter(this.context, callback));
		else if(Meteor.isClient) res = this.findAggregateResult();
		
		return this.formatter(this.context)(res);
	},
	formatter: function(context, callback) {
		return function(res) {
			var formatter = this.aggregate.formatter,
				useFormatter = context.___useFormatter;
	
			if(_.isArray(res)) {
				_.each(res, function(obj) {
					if(formatter && useFormatter !== false) obj.result = formatter.call(this.modelClass.prototype, obj.result); 
				}.bind(this))
			}
			else if(formatter && useFormatter !== false) res = formatter.call(this.modelClass.prototype, res);
	
			context.___useFormatter = undefined;
			
			return callback ? callback(res) : res;
		}.bind(this);
	},
	execAggregateAsync: function(modelClassName, id, groupClassName, callback) {	
		Meteor.call('execAggregateAsync', this.name, modelClassName, id, groupClassName, function(err, res) {
			if(!err) callback(res);
			else throw new Meteor.Error('aggregate-error', err.toString());
		});
	},	
	findAggregateResult: function() {
		var selector = this._getFindSelector();
		selector = _.clone(selector);
		delete selector.formatter; //remove formatter function so it doesnt obstruct selector
		
		//we used to find by selector, but it was problematic because of dates (and probably other things),
		//so we're just gonna fallback to the original plan of searching by aggregate name, which didn't have
		//the added--but likely never used--benefit of allowing u to find aggregates by operator names, fields, etc, 
		//irrespective of the actual aggregate name they are associated with
		//if(!selector.selector) selector.selector = null; //selector that the aggregate itself uses
		delete selector.selector;
		selector.aggregate_name = this.name;
		
		var latestAggValue =  UltimateAggregates.findOne(selector, {sort: {updated_at: -1}});

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