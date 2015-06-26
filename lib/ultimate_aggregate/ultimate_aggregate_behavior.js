Ultimate('UltimateAggregateBehavior').extends(UltimateBehavior, {}, {	
	attachTo: ['UltimateModel'],

	onAttachedToOwner: function() {
		this.modelClass = this.ownerClass();

		this._addAggregateMethods(this.ownerPrototype());
		this.createAggregateBasicClassMethods();

		this.ownerPrototype().on('methodsAdded', this._addAggregateMethods.bind(this));
	},

	_addAggregateMethods: function(methods) {
		if(methods.aggregates) {
			var aggregates = _.extend({}, this.ownerPrototype().parent.aggregates, methods.aggregates);
			this.ownerPrototype().aggregates = aggregates; //we have to re-assign it so parent aggregates are inherited
			this.createAggregateClassMethods(aggregates);
		}
		
		if(methods.relations) {
			var relations = _.extend({}, this.ownerPrototype().parent.relations, methods.relations);
			this.ownerPrototype().relations = relations; //we have to re-assign it so parent relations are inherited
			this.createAggregateMethods(relations);
		}
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
				if(name == 'count') {
					isAsyncFromClient = callback;
					callback = selector;
					selector = field;
				}
				//support for basic aggregates (avg/sum/count/min/max), but will only be allowed server side
				if(_.isFunction(field)) field = null; //callback was in field arg's spot	
				if(_.isFunction(selector)) selector = null; //callback was in selector arg's spot
				if(_.isString(field) || name == 'count') var agg = self._prepareBasicAggregate(name, field, selector);
			}
			
			UltimateAggregateBehavior.validateAsyncFromClient(isAsyncFromClient, agg, this._group);

			if(!this._group) var helper = new CreateAggregateClassMethodsHelper(this, name, agg);
			else var helper = new CreateAggregateGroupByMethodsHelper(this, name, agg, this._group, this._groupByOptions, isAsyncFromClient);
			
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
			if(/relation(.{1,5})aggregate/.test(relString)) this._createRelationAggregateMethod(rel, name); //for aggregates defined as relations

			if(_.isFunction(rel)) {
				var reg = /aggregates.{1,5}\[(.*)\]/,
					matches = relString.match(reg)
					aggs = matches ? matches[1] : '';
				
				aggregates = aggs.split(',').map(function(agg) {
					return agg.trim().replace(/'/g, '').replace(/"/g, '');
				});	
			}
			else aggregates = rel.aggregates;
			
			if(aggregates) {
				_.each(aggregates, function(name) {
					this._createAggregateMethod(rel, name);
				}, this);
			}
		}, this);
	},
	_createAggregateMethod: function(relConfig, name) {
		this.modelClass.prototype[name] = function(callback, isAsyncFromClient) {	
			var rel = UltimateUtilities.extractConfig(relConfig, this),
				Model = UltimateUtilities.classFrom(rel.model),
				agg = UltimateUtilities.extractConfig(Model.prototype.aggregates[name], Model),
				helper = new CreateAggregateInstanceMethodsHelper(this, name, agg, rel);

			UltimateAggregateBehavior.validateAsyncFromClient(isAsyncFromClient, agg, this);

			return helper.exec(callback);
		};
	},
	_createRelationAggregateMethod: function(rel, name) {
		this.modelClass.prototype[name] = function(callback, isAsyncFromClient) {	
			var agg = UltimateUtilities.extractConfig(rel, this),
				helper = new CreateAggregateInstanceMethodsHelper(this, name, agg, agg); //yes, the agg is the rel in this case

			UltimateAggregateBehavior.validateAsyncFromClient(isAsyncFromClient, agg, this);
			return helper.exec(callback);
		};
	},


	createAggregateBasicClassMethods: function() {
		['sum', 'avg', 'count', 'min', 'max'].forEach(function(name) {
			this._createAggregateClassMethod(null, name);
		}, this);
	},


	validateAsyncFromClient: function(isAsyncFromClient, agg, group) {
		if(isAsyncFromClient && !agg) //basic aggregate methods (avg/sum/count/min/max) don't provide an agg object, and they arent allowed from the client anyway
			throw new Meteor.Error('aggregate-invalid-on-client', 'Aggregate Methods must be marked as allowClientAsync: true when accessed by client');
		if(isAsyncFromClient && !agg.allowClientAsync) 
			throw new Meteor.Error('aggregate-invalid-on-client', 'Aggregate Methods must be marked as allowClientAsync: true when accessed by client');
	
		if(!group) return;
		
		group = UltimateUtilities.classFrom(group)
		var groupName = group.className;
		
		if(isAsyncFromClient && !_.contains(agg.allowedClientGroupsAsync, groupName))
			throw new Meteor.Error('aggregate-invalid-on-client', 'groupBy calls to aggregate methods must have the group model name specified in allowedClientGroupsAsync: ["GroupModelName"]');
	}
});