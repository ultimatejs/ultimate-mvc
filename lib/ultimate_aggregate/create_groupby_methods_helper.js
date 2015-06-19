Ultimate('CreateAggregateGroupByMethodsHelper').extends(CreateAggregateMethodsHelper, {
	construct: function(modelClass, name, agg, group, groupBySelector, groupByOptions) {
		this.name = name;
		this.modelClass = modelClass;
		this.modelClassName = modelClass.className;
		this.collection = modelClass.collection;
		this.aggregate = agg;
		
		this._group = group;
		this._selector = groupBySelector;
		this._options = groupByOptions;
	},
	exec: function(callback) {
		this.modelClass._group = this.modelClass._groupBySelector = this.modelClass._groupByOptions = null;
		this._assignModelAsString(); //assign this._group string to actual model class, eg: Model.groupBy('ModelName').someAggMethod();
		return this.callParent('exec', callback);
	},
	
	
	execAggregateSync: function() {	
		var aggRows = UltimateAggregatePublisher.prototype.exec(this._getExecSelector(), this.modelClass, this.getGroupForeignKey());
			
		if(!this.getGroup()) return aggRows; //no related model found; return simple group by field array instead
		else return this._combineModelsAndAggregates(aggRows, this.getGroup(), this._groupByOptions);
	},
	execAggregateAsync: function(callback) {
		var ModelClass = this.getGroup(),
			newCallback = function(docs) {
				if(_.isFunction(ModelClass)) { //it might be sometimes a string such as user_id if no Class for groupBy field
					docs = docs.map(function(doc) {
						delete doc._originalDoc;
						return new ModelClass(doc);
					});
				}
				
				callback(docs);
			};

		this.callParent('execAggregateAsync', this.modelClassName, null, this.getGroupClassName(), newCallback);
	},
	findAggregateResult: function() {
		var selector = this._getFindSelector();
		selector = _.clone(selector);
		delete selector.formatter; //remove formatter function so it doesnt obstruct selector
		
		if(!selector.selector) selector.selector = null;
		
		var aggRows = UltimateAggregates.find(selector, {sort: {updated_at: -1}});
			
		if(!this.getGroup()) return aggRows; //won't even work currently, but its consistent with exec and execAsync
		else return this._combineModelsAndAggregates(aggRows, this._group, this._groupByOptions);
	},

	
	_getExecSelector: function() {
		_.extend(this.aggregate.selector, this._groupBySelector);
		return this.aggregate;
	},
	_getFindSelector: function() {
		this.aggregate = this.callParent('_getFindSelector');
		this.aggregate.model = this.getGroupClassName();
		this.aggregate.type = 'groupby';
		return this.aggregate;
	},
	getGroupClassName: function() {
		return this.getGroup() ? this.getGroup().className : null;
	},
	getGroup: function() {
		return _.isString(this._group) ? this.getGroupClassFromField() : this._group;
	},
	

	_combineModelsAndAggregates: function(aggRows, groupModel, options) {
		var groupsObj = {}, 
			ids = aggRows.map(function(group) {
				groupsObj[group.fk] = group.result;
				return group.fk;
			}),
			options = UltimateUtilities.pickCollectionOptions(options),
			models = groupModel.collection.find({_id: {$in: ids}}, options);

		return models.map(function(model) {
			model.result = groupsObj[model._id];
			return model;
		});
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