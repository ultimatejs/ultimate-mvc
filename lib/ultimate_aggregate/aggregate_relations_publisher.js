Ultimate('UltimateAggregateRelationsPublisher').extends(UltimateAggregatePublisher, {
	construct: function(factory, aggregate, rel) {
		this.fk = rel.foreign_key;
		this.selector = rel.selector;
		this.callParentConstructor(factory, aggregate, rel.model);
	},
	linkParent: function(parent) {		
		this.parentPublisher = parent;		
		this.groupModelClassName = parent.modelClass.className;
		
		parent.on('cursorChange', function() {
			if(this._isSameIds(this._previousInputIds, this._ids())) return;
			this.class.removeInstantiatedPublisherForId(this.type, this._id); 
			this.start();
		}.bind(this), true);
	},
	
	
	extractAggregateConfig: function(agg) {
		if(_.isString(agg)) {
			var name = agg;	
			agg = this.modelClass.prototype.aggregates[name]; 
			agg = UltimateUtilities.extractConfig(agg, this.modelClass.prototype, this.publisher.userId);
			agg.aggregate_name = name; //aggregate_name not already on agg as in relation aggregates
		}

		if(!UltimateUtilities.isAllowed(agg, this.modelClass.prototype, this.publisher.userId)) return false;
		
		agg.collection = this.collection._name;
		agg.selector = this._prepareSelector(agg.selector);
		agg.model = this.groupModelClassName;
		agg.type = 'groupby';

		if(agg.formatter) agg.formatter = agg.formatter.bind(this.modelClass.prototype);
		return agg;
	},
	_prepareSelector: function(selector, model, parentIds, fk) {
		model = model || this.modelClass;
		selector = _.clone(selector) || {};
		UltimateUtilities.resolveSelectorClassName(selector, model);
		
		fk = fk || this.fk; //CreateCroupByMethodsHelper passes in fk

		if(!_.isEmpty(parentIds)) selector[fk] = {$in: parentIds}; //called AggRelPub.exec() and by CreateCroupByMethodsHelper
		else if(this.parentPublisher) selector[fk] = {$in: this._ids()};  //called from AggRelPub.cursor()
			
		return selector;
	},
	
	
	store: function(results, agg, singleId) {	
		if(!singleId) results = this.setResultZeroForMissingResults(results);
		
		//console.log('STORE', this._id, singleId, agg.aggregate_name, results);
		
		_.each(results, function(res) {
			var Model = UltimateUtilities.classFrom(agg.model),
				result = {};

			result[agg.aggregate_name] = this.formatResult(res.result);	
			
			//console.log('UPDATE', result);
			
			Model.update(res._id, {$set: result});
		}.bind(this));
	},
	formatResult: function(result) {
		if(this._agg.formatter) return this._agg.formatter(result);
		else return result; 
 	},
	
	_ids: function() {
		return this.parentPublisher.outputIds();
	},
	_isSameIds: function(ids1, ids2) {
		var diff1 = _.difference(ids1, ids2),
			diff2 = _.difference(ids2, ids1);
		
		return _.isEmpty(diff1) && _.isEmpty(diff2);;
	}
});