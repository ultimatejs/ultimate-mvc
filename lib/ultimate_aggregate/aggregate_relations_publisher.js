Ultimate('UltimateAggregateRelationsPublisher').extends(UltimateAggregatePublisher, {
	construct: function(factory, publisher, aggregates, ModelClass, selector, cachedIdsByCollection) {
		this.selector = selector;
		this.cachedIdsByCollection = cachedIdsByCollection;
		this.callParentConstructor(factory, publisher, aggregates, ModelClass)
	},
	linkParent: function(parent, fk) {		
		this.parentPublisher = parent;		
		this.fk = fk;
		this.groupModelClassName = parent.modelClass.className;
		
		parent.on('cursorChange', function() {
			if(this._isSameIds(this._previousInputIds, this._ids())) return;		
			this.start();
		}.bind(this), true);
	},
	store: function(results, agg, singleId) {
		var newAgg = UltimateClone.deepClone(agg),
			ids; //ids of parent group model essentially
		
		if(singleId) { //observer finds changes related to just this groupBy model
			ids = singleId;	
			var id = singleId[0];	
			if(!this._isOldResultValueSame(results[0])) this.updateResultValue(results[0]);
		}
		else { //for when the entire agg relation publisher starts because of parent cursorChanges
			ids = this._ids();	
			this.removeOldIds(newAgg, ids); //remove UltimateAggregate models corresponding to old groupBy models
			
			results = this.setResultZeroForMissingResults(ids, results); //will do a small amount of extra unnecessary work for singleIds
			results = this.removeUnchangedDocs(results); //but whatever, here we consistently get only unchanged results to send over the wire
		}
				
		console.log('RESULTS', this._id, !!singleId ? 'single' : 'group', results);
		
		_.each(results, function(res) {
			var selector = this.class.ultimateAggregateSelector(newAgg),
				doc = _.extend({}, selector, {result: res.result});
			
			selector[this.fk] = res._id;
			doc[this.fk] = res._id;
			
			console.log('AGG UPSERT', this._id, doc);
			UltimateAggregates.upsert(selector, doc);
		}, this);
			
		//store update _oldIds for future removeOldIds calculations, and whether to publish added vs. changed
		if(singleId) {
			if(!_.contains(this._oldIds, id)) {
				if(!this._oldIds) this._oldIds = [];
				this._oldIds.push(id); 
			}
		}
		else this._oldIds = ids;
	},
	
	
	
	
	removeOldIds: function(newAgg, newIds) {
		if(this._oldIds) { //we will only have old ids to compare the 2nd+ time around
			var removedIds = _.difference(this._oldIds, newIds),
				selector = this.class.ultimateAggregateSelector(newAgg, this.fk);
			
			console.log("REMOVE OLD IDS", this._id, this._oldIds, newIds, removedIds);
			
			removedIds.forEach(function(id) {
				selector.fk = id;			
				UltimateAggregates.remove(selector);
			}, this);
		}
	},
	setResultZeroForMissingResults: function(ids, results) {
		//aggregate exec will only produce results for groupBy models whose result !== 0,
		//so we need to produce an array of objects that have result == 0 for those models
		
		return _.map(ids, function(id) {
			var resolvedRes = {_id: id, result: 0};

			_.some(results, function(res) {
				if(res._id === id) {
					resolvedRes.result = res.result;
					return true;
				}
			});

			return resolvedRes;
		});
	},
	removeUnchangedDocs: function(allResults) {
		if(!this._oldResults) return this._oldResults = allResults; //set it for future calls
		
		var resultsToPublish = _.reject(allResults,  this._isOldResultValueSame.bind(this));	
		
		this._oldResults = allResults; //keep storing allResults as the old results
		return resultsToPublish; //but only publish changed results
	},
	_isOldResultValueSame: function(res) {
		var oldRes = _.find(this._oldResults, function(oldRes) { return oldRes._id == res._id});
		
		//either a new aggregate model, or one where the result has changed, which is all we want 
		//to publish, marking as changed
		return oldRes && res.result === oldRes.result
	},
	updateResultValue: function(newResult) {
		var updated = _.some(this._oldResults, function(res) {
			if(res._id == newResult._id) {
				res.result = newResult.result;
				return true;
			}
		});
		
		if(!updated) {
			this._oldResults = this._oldResults || [];
			this._oldResults.push(newResult);
		}
	},
	
	prepareUltimateAggregatePropsForSave: function(agg) {
		agg = UltimateClone.deepClone(agg);

		agg.model = this.groupModelClassName;
		agg.type = 'groupby';

		return agg;
	},
	cursor: function(agg) {
		var selector = this._prepareSelector(agg.selector);
		return this.collection.find(selector, {limit: 1, sort: {updated_at: -1}});
	},
	
	
	_aggFromName: function(name) {
		var agg = this.callParent('_aggFromName', name);
		agg.selector = this._prepareSelector(agg.selector);
		agg.model = this.groupModelClassName;
		return agg;
	},
	_prepareSelector: function(selector, model, parentIds, fk) {
		selector = this.callParent('_prepareSelector', selector, model);
		fk = fk || this.fk; //CreateCroupByMethodsHelper passes in fk

		if(!_.isEmpty(parentIds)) selector[fk] = {$in: parentIds}; //called AggRelPub.exec() and by CreateCroupByMethodsHelper
		else if(this.getParent && this.getParent()) selector[fk] = {$in: this._ids()};  //called from AggRelPub.cursor()
			
		return selector;
	},
	getParent: function() {
		return this.parentPublisher;
	},
	_ids: function() {
		return this.getParent().outputIds();
	},
	
	
	_isSameIds: function(ids1, ids2) {
		var diff1 = _.difference(ids1, ids2),
			diff2 = _.difference(ids2, ids1);
		
		return _.isEmpty(diff1) && _.isEmpty(diff2);;
	}
});