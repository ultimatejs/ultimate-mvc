Ultimate('UltimateAggregateBehavior').extends(UltimateBehavior, {}, {	
	attachTo: ['UltimateModel'],

	onAttachedToOwner: function() {
		this.modelClass = this.ownerClass();

		this._addAggregateMethods(this.ownerPrototype());
		this.createAggregateBasicClassMethods();

		this.ownerPrototype().on('methodsAdded', this._addAggregateMethods.bind(this));
	},

	_addAggregateMethods: function(methods) {
		this.createAggregateClassMethods(methods.aggregates);
		this.createAggregateMethods(methods.relations);
	},


	createAggregateClassMethods: function(aggregates) {
		_.each(aggregates, this._createAggregateClassMethod.bind(this));
	},
	_createAggregateClassMethod: function(aggConfig, name) {
		var self = this;

		this.modelClass[name] = function(field, selector, callback, isAsyncFromClient) {	
			callback = _.callbackFromArguments(arguments);

			if(aggConfig) var agg = UltimateUtilities.extractConfig(aggConfig, self.ownerPrototype())
			else {
				//support for basic aggregates (avg/sum/count/min/max), but will only be allowed server side
				if(_.isFunction(field)) field = null; //callback was in field arg's spot	
				if(_.isFunction(selector)) selector = null; //callback was in selector arg's spot
				if(_.isString(field) || name == 'count') var agg = self._prepareBasicAggregate(name, field, selector);
			}
			
			UltimateAggregateBehavior.validateAsyncFromClient(isAsyncFromClient, agg);

			if(!this._group) var helper = new CreateAggregateClassMethodsHelper(this, name, agg);
			else var helper = new CreateAggregateGroupByMethodsHelper(this, name, agg, this._group, this._groupBySelector, this._groupByOptions);
			
			return helper.exec(callback);
		};
	},
	_prepareBasicAggregate: function(operator, field, selector) {
		var agg = {};
		
		agg.operator = operator
		if(field && operator != 'count') agg.field = field; //count doesnt have a field
		if(selector) agg.selector = selector;
		
		return agg;
	},

	

	createAggregateMethods: function(relations) {
		_.each(relations, function(rel, name) {
			var relString = _.isFunction(rel) ? rel.toString() : EJSON.stringify(rel),
				aggregates;

			if(/relation(.{1,5})belongs_to/.test(relString)) return; //matches relation: 'belongs_to'
			if(/relation(.{1,5})aggregate/.test(relString)) this._createStandaloneAggregateMethod(rel, name); //for aggregates defined as relations

			if(_.isFunction(rel)) {
				var reg = /aggregates.{1,5}\[(.*)\]/,
					matches = relString.match(reg)
					aggs = matches ? matches[1] : '';
				
				aggregates = aggs.split(',').map(function(agg) {
					return agg.trim().replace(/'/g, '').replace(/"/g, '');
				});	
			}
			else aggregates = rel.aggregates;
			
			console.log(this.owner().className, name, aggregates);
			
			
			_.each(aggregates, function(name) {
				this._createAggregateMethod(rel, name);
			}, this);
		}, this);
	},
	_createAggregateMethod: function(relConfig, name) {
		this.modelClass.prototype[name] = function(callback, isAsyncFromClient) {	
			var rel = UltimateUtilities.extractConfig(relConfig, this),
				Model = UltimateUtilities.classFrom(rel.model),
				agg = UltimateUtilities.extractConfig(Model.prototype.aggregates[name], Model),
				helper = new CreateAggregateInstanceMethodsHelper(this, name, agg, rel);

			UltimateAggregateBehavior.validateAsyncFromClient(isAsyncFromClient, agg);

			return helper.exec(callback);
		};
	},
	_createStandaloneAggregateMethod: function(rel, name) {
		this.modelClass.prototype[name] = function(callback, isAsyncFromClient) {	
			var agg = UltimateUtilities.extractConfig(rel, this),
				helper = new CreateAggregateInstanceMethodsHelper(this, name, agg, agg); //yes, the agg is the rel in this case

			UltimateAggregateBehavior.validateAsyncFromClient(isAsyncFromClient, agg);
			return helper.exec(callback);
		};
	},


	createAggregateBasicClassMethods: function() {
		['sum', 'avg', 'count', 'min', 'max'].forEach(function(name) {
			this._createAggregateClassMethod(null, name);
		}, this);
	},


	validateAsyncFromClient: function(isAsyncFromClient, agg) {
		if(!agg) //basic aggregate methods (avg/sum/count/min/max) don't provide an agg object, and they arent allowed from the client anyway
			throw new Meteor.Error('aggregate-invalid-on-client', 'Aggregate Methods must be marked as allowClient: true when accessed by client');
		if(isAsyncFromClient && !agg.allowClient) 
			throw new Meteor.Error('aggregate-invalid-on-client', 'Aggregate Methods must be marked as allowClient: true when accessed by client');
	}
});