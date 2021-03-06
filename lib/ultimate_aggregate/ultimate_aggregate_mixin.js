Ultimate('UltimateSetupAggregate').extends({	
	abstract: true,
	mixinTo: ['UltimateModel'],
	config: ['aggregates'],
	
	onChildStartup: function() {
		this._addAggregateMethods();
		this._createAggregateBasicClassMethods();
	},

	_addAggregateMethods: function() {
		this._createAggregateClassMethods(this.owner().aggregates);
		this._createAggregateMethods(this.owner().relations);
	},


	_createAggregateClassMethods: function(aggregates) {
		_.each(aggregates, this._createAggregateClassMethod.bind(this));
	},
	_createAggregateClassMethod: function(aggConfig, name) {
		var owner = this.owner(),
			Class = owner.class,
			self = this;

		Class[name] = function(field, selector, callback, isAsyncFromClient) {	
			callback = _.callbackFromArguments(arguments);

			if(aggConfig) var agg = UltimateUtilities.extractConfig(aggConfig, owner)
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
			
			self.validateAsyncFromClient(isAsyncFromClient, agg, this._group);

			if(!this._group) var helper = new CreateAggregateClassMethodsHelper(this, name, agg);
			else var helper = new CreateAggregateGroupByMethodsHelper(this, name, agg, this._group, this._groupByOptions, isAsyncFromClient);
			
			return helper.exec(callback);
		};
		
		if(!/^(sum|avg|count|min|max)$/.test(name)) {
			this._createAggregateObserver(name, {model: Class}, false, aggConfig);
		}
	},
	_prepareBasicAggregate: function(operator, field, selector) {
		var agg = {};
		
		agg.operator = operator
		if(field && operator != 'count') agg.field = field; //count doesnt have a field
		
		selector = selector || {}
		selector.className = this.owner().className;
		agg.selector = selector;
		
		return agg;
	},

	

	_createAggregateMethods: function(relations) {
		_.each(relations, function(rel, name) {
			var relString = _.isFunction(rel) ? rel.toString() : EJSON.stringify(rel),
				aggregates;

			if(/relation(.{1,5})belongs_to/.test(relString)) return; //matches relation: 'belongs_to'
			if(/relation(.{1,5})aggregate/.test(relString)) { //for aggregates defined as relations
				if(/operator(.{1,2}):/.test(relString)) this._createRelationAggregateMethod(rel, name); //if no operator, its a pass-through using aggregates on collection model, so don't observer and add methods
			}

			if(_.isFunction(rel)) {
				var reg = /aggregates.{1,5}\[(.*)\]/,
					matches = relString.match(reg),
					aggs = matches ? matches[1] : null;
				
				if(aggs) {
					aggregates = aggs.split(',').map(function(agg) {
						return agg.trim().replace(/'/g, '').replace(/"/g, '');
					});	
				}
			}
			else aggregates = rel.aggregates;
			
			if(!_.isEmpty(aggregates)) {
				_.each(aggregates, function(name) {
					this._createAggregateMethod(rel, name);
				}, this);
			}
		}, this);
	},
	_createAggregateMethod: function(rel, name) {
		var owner = this.owner();
		
		owner[name+'Agg'] = function(callback, isAsyncFromClient) {	
			var rel = UltimateUtilities.extractConfig(rel, this),
				Model = UltimateUtilities.classFrom(rel.model),
				agg = UltimateUtilities.extractConfig(Model.prototype.aggregates[name], Model),
				helper = new CreateAggregateInstanceMethodsHelper(this, name, agg, rel);

			UltimateAggregateBehavior.validateAsyncFromClient(isAsyncFromClient, agg, this);

			return helper.exec(callback);
		};
		
		this._createAggregateObserver(name, rel);
	},
	_createRelationAggregateMethod: function(rel, name) {
		var owner = this.owner();
		
		owner[name+'Agg'] = function(callback, isAsyncFromClient) {	
			var agg = UltimateUtilities.extractConfig(rel, this),
				helper = new CreateAggregateInstanceMethodsHelper(this, name, agg, agg); //yes, the agg is the rel in this case

			UltimateAggregateBehavior.validateAsyncFromClient(isAsyncFromClient, agg, this);
			return helper.exec(callback);
		};
		
		this._createAggregateObserver(name, rel, true);
	},

	
	
	/** CREATE OBSERVERS FROM SAME METHOD AND AGGREGATE CONFIG INFO AS METHODS **/
	
	_createAggregateObserver: function(name, rel, relationOnly, classAggregateConfig) {
		if(Meteor.isClient) return;
		
		var owner = this.owner();
		
		this.startup(function() {
			if(relationOnly) {
				var config = UltimateUtilities.extractConfig(rel, this),
					interval = config.interval;
			
				if(config.publish === false) return;
				
				if(!interval) this._startAggregateObserverRelationOnly(name, rel);
				else this.setInterval(this._startAggregateObserverRelationOnly.bind(this, name, rel), interval, true);
			}
			else {
				var relConfig = UltimateUtilities.extractConfig(rel, owner); //get rel, not agg, config
				if(relConfig.publish === false) return; //to see if the rel version of the agg is allowed to be published, regardless of associated model's agg rules
				
				var classAggConfig = UltimateUtilities.extractConfig(classAggregateConfig, owner); //for class level aggregates
				if(classAggConfig && classAggConfig.publish === false) return;
				
				
				var config = this._getAggregateConfig(name, rel),
					interval = config.interval;
			
				if(!interval) this._startAggregateObserver(name, rel);
				else this.setInterval(this._startAggregateObserver.bind(this, name, rel), interval, true);
			}
		});
	},
	_startAggregateObserver: function(name, rel) {
		var rel  = UltimateUtilities.extractConfig(rel, this.owner()),
			agg = this._getAggregateConfig(name, rel), //call again, i.e in an interval, to get dynamic config returned from functions
			ObserverClass = rel.foreign_key ? UltimateAggregateRelationObserver : UltimateAggregateCollectionObserver,
			observer = new ObserverClass(rel, agg, this.owner().class);
			
		observer.start();
	},
	_getAggregateConfig: function(name, rel) {
		var rel = UltimateUtilities.extractConfig(rel, this.owner()),
			CollectionModel = UltimateUtilities.classFrom(rel.model),
			agg = UltimateUtilities.extractConfig(CollectionModel.prototype.aggregates[name], CollectionModel);
			
		agg.model = CollectionModel;
		agg.aggregate_name = name;
		
		return UltimateUtilities.extractConfig(agg, CollectionModel);
	},
	_startAggregateObserverRelationOnly: function(name, rel) {
		var rel  = UltimateUtilities.extractConfig(rel, this.owner()),
			agg = rel, //agg and rel share the same config map in this case,
			CollectionModel = UltimateUtilities.classFrom(rel.model);
			
		agg.model = CollectionModel;
		agg.aggregate_name = name;
		
		var observer = new UltimateAggregateRelationObserver(rel, agg, this.owner().class);
		observer.start();
	},
	
	
	

	_createAggregateBasicClassMethods: function() {
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