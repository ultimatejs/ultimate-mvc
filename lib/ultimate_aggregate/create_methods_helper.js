Ultimate('CreateAggregateMethodsHelper').extends({
	exec: function(callback) {	
		if(Meteor.isServer) return this.format(this.execAggregateSync());
		else if(Meteor.isClient) this.execAggregateAsync(function(res) {
			if(!callback) throw new Error('callback-missing', 'callback missing to async aggregate call');
			else callback.call(this.context, this.format(res));
		}.bind(this));
	},
	format: function(res) {
		var formatter = this.aggregate.formatter,
			useFormatter = this.context.___useFormatter;

		if(!formatter || useFormatter === false) return res;
		
		if(_.isArray(res)) {
			_.each(res, function(obj) {
				obj.result = formatter.call(this.modelClass.prototype, obj.result); 
			}.bind(this))
		}
		else res = formatter.call(this.modelClass.prototype, res);

		context.___useFormatter = null;
	
		return res;
	},

	execAggregateAsync: function(modelClassName, id, groupClassName, groupByOptions, callback) {	
		callback = _.callbackFromArguments(arguments);
		
		Meteor.call('execAggregateAsync', this.name, modelClassName, id, groupClassName, groupByOptions, function(err, res) {
			if(!err) callback(res);
			else throw new Meteor.Error('aggregate-error', err.toString());
		});
	}
});


if(Meteor.isServer) {
	Meteor.methods({
		execAggregateAsync: function(name, modelName, id, groupModelClassName, groupOptions) {
			var Model = Ultimate.classes[modelName],
				isAsyncFromClient = true;
				
			//true params below indicate isAsyncFromClient, and will enforce agg method is validated for the client
			if(id) return Model.findOne(id)[name+'Agg'](null, isAsyncFromClient); 
			else if(groupModelClassName) return Model.groupBy(groupModelClassName, groupOptions)[name](null, null, null, isAsyncFromClient); 
			else return Model[name](null, null, null, isAsyncFromClient);
		}
	});
}