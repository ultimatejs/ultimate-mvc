UltimateAggregatePublisher.extend({
	onStop: function(agg) {
		this.publisher.onStop(function() {
			console.log('STOPPING AGGREGATE', this._id);
			this.class.removeInstantiatedPublisherForId(this.type, this._id); //count --decrements here
			
			//if other publishers need to observe  (and none has already become a publisher), we pass the ball
			if(this.isNoPublishers()) {
				this.setTimeout(function() {
					this.assignNewCollectionObserver(); //assign a new one to do the job
					this.stopAllObservers();		
				}, 1000);
			}
			else this.stopAllObservers();	
		}.bind(this));
	},
	assignNewCollectionObserver: function() {
		var pub = this.class.findNonObservingPublisher(this.type);

		if(pub) { 
			console.log('PASSED TO:', pub._id); //hasn't started to do its thing yet, which is the usual case.
			pub.observe(pub._agg);
		}
		else {
			//else it started about the same time this one stopped, 
			//so it started observing/publishing the target collection since it saw no other publisher was.
			console.log(this._id, "0 AGGREGATE PUBLISHERS OR TAKEN OVER ALREADY");
		}	
	},
	isNoPublishers: function() {
		return this.class.isNoPublishers(this.type);
	},
	stopAllObservers: function() {
		if(this.observer) this.observer.stop();//only one Aggregate Publisher will observer the 
		if(this.removalObserver) this.removalObserver.stop(); //actual target collection observer
		if(this.aggregateObserver) this.aggregateObserver.stop(); //to minimize collection.aggregate() calls
	}
});


UltimateAggregatePublisher.extendStatic({
	instantiatedPublishers: {},

	generatePublisherType: function(agg, fk) {
		return EJSON.stringify(this.ultimateAggregateSelector(agg, fk));
	},
	ultimateAggregateSelector: function(agg, fk) {
		var selector = _.pick(agg, 'model', 'collection', 'operator', 'field', 'aggregate_name');
		if(fk) selector[fk] = {$in: agg.selector[fk].$in}; //This method is multi-purposed: 1) identify publisher
		return selector; //uniquely by group ids, 2) and of course find aggs filtered by these ids.
	},
	addInstantiatedPublisher: function(type, pub) {
		this.instantiatedPublishers[type] = this.instantiatedPublishers[type] || [];
		this.instantiatedPublishers[type].push(pub);
	},
	removeInstantiatedPublisherForId: function(type, id) {
		var pubs = this.instantiatedPublishers[type];
		this.instantiatedPublishers[type] = _.reject(pubs, function(pub) { return pub._id == id; });
		if(this.instantiatedPublishers[type].length === 0) delete this.instantiatedPublishers[type];
	},
	findOneInstantiatedPublisher: function(type) {
		var pubs = this.instantiatedPublishers[type];
		if(_.isArray(pubs) && !_.isEmpty(pubs)) return pubs[pubs.length - 1];
		else return null;
	},
	findNonObservingPublisher: function(type) {
		var pubs = this.instantiatedPublishers[type];
		if(!_.isArray(pubs) || _.isEmpty(pubs)) return null;
		
		return this.isNoPublishers(type) ? _.last(pubs) : null
	},
	isNoPublishers: function(type) {
		var pubs = this.instantiatedPublishers[type];
		if(_.isEmpty(pubs)) return true;
			
		var count = _.reduce(pubs, function(acc, pub) {
			return (pub.observer ? 1 : 0) + acc;
		}, 0);
		
		console.log('NO PUBLISHERS?', this._id, !count);
		return !count;
	}
});