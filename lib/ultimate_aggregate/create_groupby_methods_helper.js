Ultimate('CreateAggregateGroupByMethodsHelper').extends(CreateAggregateMethodsHelper, {
	construct: function(modelClass, name, agg, group, groupByOptions, isAsyncFromClient) {
		this.name = name;
		this.modelClass = this.context = modelClass;
		this.modelClassName = modelClass.className;
		this.collection = modelClass.collection;
		this.aggregate = agg;
		
		this._group = group;
		
		this._groupByOptions = groupByOptions || {};
		
		if(isAsyncFromClient) this._groupBySelector = agg.clientGroupSelectorAsync || null;
		else this._groupBySelector = this._groupByOptions.selector || {};
		
		this._groupByOptions = UltimateUtilities.pickCollectionOptions(this._groupByOptions)
	},
	exec: function(callback) {
		this.modelClass._group = this.modelClass._groupByOptions = null;
		this._assignModelAsString(); //assign this._group string to actual model class, eg: Model.groupBy('ModelName').someAggMethod();
		return this.callParent('exec', callback);
	},
	
	
	execAggregateSync: function() {	
		var aggRows = UltimateAggregateRelationsPublisher.prototype.exec(this.aggregate, this.modelClass, this.getGroupForeignKey(), null, this.getGroupByIds());
			
		if(!this.getGroup()) return aggRows; //no related model found; return simple group by field array instead
		else return this._combineModelsAndAggregates(aggRows);
	},
	execAggregateAsync: function(callback) {
		
		var aggMethodName = this.name,
			ModelClass = this.getGroup(),
			newCallback = function(docs) {
				if(_.isFunction(ModelClass)) { //it might be sometimes a string such as user_id if no Class for groupBy field
					docs = docs.map(function(doc) {
						delete doc._originalDoc;
						return new ModelClass(doc);
					});
				}
				
				callback(docs);
			};

		this.callParent('execAggregateAsync', this.modelClassName, null, this.getGroupClassName(), this._groupByOptions, newCallback);
	},

	
	getGroupByIds: function() {
		return this.getGroup().collection.find(this._groupBySelector, this._groupByOptions).map(function(m) {
				return m._id;
			});
	},
	getGroupClassName: function() {
		return this.getGroup() ? this.getGroup().className : null;
	},
	getGroup: function() {
		return _.isString(this._group) ? this.getGroupClassFromField() : this._group;
	},
	

	_combineModelsAndAggregates: function(aggRows) {
		var groupsObj = {}; 

		aggRows.forEach(function(group) {
			groupsObj[group.fk || group._id] = group.result; //exec uses fk and findAggregateResults id
		});
		
		var models = this.getGroup().collection.find(this._groupBySelector, this._groupByOptions);
		
		return models.map(function(model) { 
			model[this.name] = groupsObj[model._id] || 0;
			return model;
		}.bind(this));
	},

	
	getGroupForeignKey: function() {
		if(_.isString(this._group)) return this._group; //this._group is already foreign_key
		
		var className = this.modelClassName;
		
		//find the foreignkey of by relation model that links to this aggregate model 
		var rel = _.find(this._group.prototype.relations, function(rel) {
			rel = UltimateUtilities.extractConfig(rel, this._group); 
			var Model = UltimateUtilities.classFrom(rel.model);
			return Model.className == className;
		}, this);

		rel = UltimateUtilities.extractConfig(rel, this._group.prototype); 

		return rel ? rel.foreign_key : null;
	},
	_assignModelAsString: function() {
		var Model = UltimateUtilities.classFrom(this._group);
		if(Model) this._group = Model; //Model provided as string; assign model and proceed as if Model.groupBy(ModelName) was provided
	},
	getGroupClassFromField: function() {
		var field = this._group,
			className = this.modelClassName;

		return _.find(Ultimate.classes, function(Class) {
			return _.find(Class.prototype.relations, function(rel) {
				rel = UltimateUtilities.extractConfig(rel, Class);
				var Model = UltimateUtilities.classFrom(rel.model);
				return Model.className == className && rel.foreign_key == field;
			});
		});
	}
});