Ultimate('UltimateAggregatePublisher').extends({
	construct: function(factory, publisher, aggregate, ModelClass) {
		this.factory = factory;
		this.publisher = publisher;
		this.aggregate = aggregate;
		
		this.modelClass = UltimateUtilities.classFrom(ModelClass);
		this.collection = this.modelClass.collection;
		
		this.observers = [];
		this.aggregateObservers = [];
		this.created = new Date;
			
		this._id = this.class.generatePublisherId();
	},

	
	start: function() {
		//For some reason, ids returned from the parent subscription or relation sometimes returns empty when called in succession for a bunch of aggs
		//This is only used by UltimateAggregateRelationsPublisher when used as a relation, not when used by CreateMethodsHelpers
		if(this.getParent && this.getParent()) this.parentIds = this._previousInputIds = this._ids();
		
		var agg = this.aggregate;
		agg = _.isObject(agg) ? this._aggFromRelation(agg) : this._aggFromName(agg); //relation objects | agg names
		
		//SECURITY CHECKS
		if(agg === false) {
			console.log('NOT ALLOWED to subscribe to this aggregate: ' + (_.isString(aggregate) ? this.modelClass.className+'.'+aggregate : this.modelClass.className+'.'+agg.operator+' '+agg.field));
			return;
		}

		this._storedAgg = agg;
		this.removeOldAggregateIds(agg);
		this.stopAllObservers();
		
		this.type = this.class.generatePublisherType(agg, this.fk);
		this.class.addInstantiatedPublisher(this.type, this);
		
		this.onStop(agg);
		
		if(Meteor.isServer) { 
			if(this.isOnlyPublisher()) {
			//if(this.getSimilarPublisherCount() === 1) { //only for publisher for type does the work
				console.log('ONLY 1 PUBLISHER RIGHT NOW', this._id);
				this.update(agg);
				this.observe(agg);
			}
			
			this.observeAggregates(agg); //but they all observe ultimate_aggregates collection & publish its results
		}
		else this.update(agg); //client side publisher caching duck always needs to update
	},
	update: function(agg, singleId) {
		agg = this.prepareUltimateAggregatePropsForSave(agg); //singleId is from AggRelPub observer so exec is filtered to one model.
		singleId = singleId ? [singleId]: null; 
		
		//client side publisher duck responsible for observing UltimateAggregates collection & caching results
		if(Meteor.isClient) return this.publisher.observeUltimateAggregates(agg);

		var result = this.exec(agg, this.modelClass, this.fk, null, singleId); //this.fk == undefined in CollectionPublisher.
		this.store(result, agg, singleId);
	},
	observeAggregates: function(agg) {
		var selector = this.class.ultimateAggregateSelector(agg, this.fk);
		console.log('ULTIMATE AGGREGATE', this._id, selector);
		
		var observer = UltimateAggregates.find(selector).observe({
			added: function(doc) {
				if(!this.isAlreadyAddedAggregateId(doc._id)) {
					console.log("ADDED", doc._id);
					this.publisher.added('ultimate_aggregates', doc._id, doc);
					this.addAggregateId(doc._id);
					
					this.handleCachedClientIds(doc);
				}
				else console.log("ALREADY ADDED", doc._id);
			}.bind(this),
			changed: function(doc) {
				console.log("CHANGED", doc._id);
				this.publisher.changed('ultimate_aggregates', doc._id, doc);
			}.bind(this),
			removed: function(doc) {
				console.log("REMOVED", doc._id);
				this.publisher.removed('ultimate_aggregates', doc._id);
				this.removeAggregateId(doc._id)
			}.bind(this)
		});
		
		this.aggregateObservers.push(observer);
	},
	addAggregateId: function(id) {
		this._aggregateIds = this._aggregateIds || [];
		this._aggregateIds.push(id);
	},
	isAlreadyAddedAggregateId: function(id) {
		return _.contains(this._aggregateIds, id);
	},
	removeAggregateId: function(id) {
		this._aggregateIds = _.without(this._aggregateIds, id);
	},
	removeOldAggregateIds: function(agg) {
		var selector = this.class.ultimateAggregateSelector(agg, this.fk),
			newIds = UltimateAggregates.find(selector).map(function(a) { return a._id; }),
			removedIds = _.difference(this._aggregateIds, newIds);
			
		console.log("REMOVE AGGREGATE IDS", this._id, this._aggregateIds, newIds, removedIds);
		this._aggregateIds = _.difference(this._aggregateIds, removedIds);
		
		UltimateAggregate.remove({_id: {$in: removedIds}});
		
		//wont be handled by removed observer since it's stopped, and if ran before observers stopped
		//it seems to put the new observer in place to quickly for it to fire
		removedIds.forEach(function(id) {
			this.publisher.removed('ultimate_aggregates', id)
		}, this);
	},
	
	
	handleCachedClientIds: function(doc) {
		//For cached Ids, send 'changed' message also since 'added' message will non-fatally fail client side.
		//The client will already have the id in the collection, and won't want to add it again.
		if(_.contains(this.cachedIdsByCollection.ultimate_aggregates, doc._id)) {
			this.publisher.changed('ultimate_aggregates', doc._id, 	doc);
		}
	},
	
	
	exec: function(agg, model, fk, returnOneRow, parentIds) {
		var group = {_id: null, result: {}},
			parentIds = parentIds || this.parentIds; //CreateAggregateGroupByMethodsHelper provides ids already

		if(fk) group._id = '$'+fk; //fk provided groupBy class method & AggregateRelationsPublisher	
		
		if(agg.operator == 'count') group.result.$sum = 1;
		else group.result['$'+agg.operator] = '$'+agg.field; //count handled by default
			

		var selector = this._prepareSelector(agg.selector, model, parentIds, fk),
			pipeline = [
				{$match: selector},
				{$group: group}
			];
			
		var res = model.collection.aggregate(pipeline);

		if(returnOneRow) return res[0] ? res[0].result : 0;
		else return res;
	},
	observe: function(agg) {
		var initializing = true;

		agg = _.clone(agg);
		delete agg.formatter; //the formatter function will break the observers; 
		
		var observer = this.cursor(agg).observe({
			added: function(doc) {
				if(!initializing) {
					this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
				}
			}.bind(this),
			changed: function(doc) {
				this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
			}.bind(this)
		});
		
		var removalObserver = this.removalCursor(agg).observe({
			added: function(doc) {
				if(!initializing) {
					this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
				}
			}.bind(this)
		});
		
		initializing = false;
		
		this.observers.push({observer: observer, removalObserver: removalObserver, agg: agg});
	},

	removalCursor: function(agg) {
		var selector = this._prepareSelector(agg.selector);

		selector.collection = this.collection._name; 
		
		selector.oldClassName = selector.className;
		delete selector.className; //do this because they will end up with className == 'UltimateRemoval'
		
		if(selector.created_at) selector.oldCreated_at = selector.created_at;
		delete selector.created_at;
		
		if(selector.updated_at) selector.oldUpdated_at = selector.updated_at;
		delete selector.updated_at;
		
		return UltimateRemovals.find(selector, {limit: 1, sort: {updated_at: -1}});
	},
	
	
	
	_aggFromRelation: function(agg) { 
		//aggregates defined as a relation on groupBy model
		agg.collection = this.collection._name;
		
		if(!UltimateUtilities.isAllowed(agg, this.modelClass.prototype, this.publisher.userId)) return false;
		//agg.aggregate_name already set in UltimateAggregateRelationsStandalonePublisher
		
		return agg;
	},
	_aggFromName: function(name) {
		var agg = this.modelClass.prototype.aggregates[name]; //agg object doubles as selector
		agg = UltimateUtilities.extractConfig(agg, this.modelClass.prototype, this.publisher.userId);

		//SECURITY CHECKS
		if(!UltimateUtilities.isAllowed(agg, this.modelClass.prototype, this.publisher.userId)) return false;
		
		agg.collection = this.collection._name;
		agg.aggregate_name = name;
		
		return agg;
	},


	_prepareSelector: function(selector, model) {
		model = model || this.modelClass;

		selector = _.clone(selector) || {};

		UltimateUtilities.resolveSelectorClassName(selector, model);
		
		return selector;
	},
	
	
	
	onStop: function(agg) {
		this.publisher.onStop(function() {
			console.log('STOPPING AGGREGATE', this._id);
			this.class.removeInstantiatedPublisherForId(this.type, this._id); //count --decrements here
			
			//if other publishers need to observe  (and none has already become a publisher), we pass the ball
			if(this.isOnlyPublisher()) {
				this.setTimeout(function() {
					this.assignNewCollectionObserver(); //assign a new one to do the job
					this.stopAllObservers();		
					this.removeOldAggregateIds(agg); //call it just in case anything needs to be removed real quick
				}, 1000);
			}
			else {
				this.stopAllObservers();		
				this.removeOldAggregateIds(agg); //call it just in case anything needs to be removed real quick
			}
		}.bind(this));
	},
	assignNewCollectionObserver: function() {
		var pub = this.class.findOneInstantiatedPublisher(this.type)
		
		console.log("BALL BEING PASSED", this._id, ' -- to -- ', pub && pub._id);
		
		if(pub && !pub._oldIds) { //hasn't started to do its thing yet, which is the usual case.
			console.log('DIDNT TAKE OVER ON ITS OWN', pub._id);
			pub._oldIds = this._oldIds;
			pub._oldResults = this._oldResults;
			this.update(pub._storedAgg);
			pub.observe(pub._storedAgg);
		}
		//else it started about the same time this one stopped, 
		//so it started observing/publishing the target collection since it saw no other publisher was.
	},
	isTheCollectionObserver: function() {
		return this.observers && this.observers.length > 0; //only TheCollectionObserver has this.observers
	},
	isOnlyPublisher: function() {
		var pubs = this.class.instantiatedPublishers[this.type];
		
		if(_.isEmpty(pubs)) return true;
			
		var count = _.reduce(pubs, function(acc, pub) {
			return pub.observers.length + acc;
		}, 0);
		
		console.log('REDUCE COUNT', this._id, count, !count);
		
		return !count;
	},
	getSimilarPublisherCount: function() {
		return this.class.instantiatedPublisherCountForType(this.type);
	},
	stopAllObservers: function() {
		//only one Aggregate Publisher will observer the actual target collection 
		//to minimize collection.aggregate() calls via this.exec()
		_.each(this.observers, function(obj) { 
			obj.observer.stop();
			obj.removalObserver.stop();
		}, this);
		
		this.observers.length = 0;
		
		//therefore all but that one will have aggregateObservers to stop
		_.each(this.aggregateObservers, function(observer) {
			observer.stop();
		}, this);
		
		this.aggregateObservers.length = 0;
	}
}, {
	instantiatedPublishers: {},
	
	generatePublisherType: function(agg, fk) {
		return EJSON.stringify(this.ultimateAggregateSelector(agg, fk));
	},
	ultimateAggregateSelector: function(agg, fk) {
		var selector = _.pick(agg, 'model', 'collection', 'operator', 'field', 'aggregate_name');

		//identify publisher uniquely by group ids, and of course find aggs filtered by these ids
		if(fk) selector[fk] = {$in: agg.selector[fk].$in}; 
		
		return selector;
	},
	generatePublisherId: function() {
		return Random.id();
	},
	
	addInstantiatedPublisher: function(type, pub) {
		this.instantiatedPublishers[type] = this.instantiatedPublishers[type] || [];
		this.instantiatedPublishers[type].push(pub);
	},
	removeInstantiatedPublisherForId: function(type, id) {
		var pubs = this.instantiatedPublishers[type];
		
		this.instantiatedPublishers[type] = _.reject(pubs, function(pub) {
			return pub._id == id;
		});
		
		if(this.instantiatedPublishers[type].length === 0) delete this.instantiatedPublishers[type];
	},
	
	instantiatedPublisherCountForType: function(type) {
		var pubs = this.instantiatedPublishers[type];
		
		if(_.isArray(pubs)) return pubs.length;
		else return 0;
	},
	findOneInstantiatedPublisher: function(type) {
		var pubs = this.instantiatedPublishers[type];
		
		if(_.isArray(pubs) && !_.isEmpty(pubs)) return pubs[pubs.length - 1];
		else return null;
	}
});