UltimateAggregatePublisher.extend({
	onStop: function(agg) {
		this.publisher.onStop(function() {
			//immediately let other publishers know there isn't doing the job of observing:
			this.class.removeInstantiatedPublisherForId(this.type, this._id); //count --decrements here
			
			console.log('STOPPING AGGREGATE', this._agg.aggregate_name);

			//if other publishers need to observe  (and none has already become a publisher), we pass the ball
			if(this.isNoObserversForType()) {
				console.log('BEFORE TIME OUT', 'NO PUBS FOR TYPE!');
				this.setIntervalUntil(function() {
					this.stopAllObservers();	
					var ret = this.assignNewCollectionObserver(); //assign a new one to do the job	
					console.log('STOP INTERVAL', ret);
					return ret;
				}, 3000, 5);
			}
			else this.stopAllObservers();	
		}.bind(this));
	},
	assignNewCollectionObserver: function() {
		var pub = this.class.findNonObservingPublisher(this.type);
		
		var allPubs = this.class.instantiatedPublishers[this.type];
		
		if(allPubs) {
			var noPubsForType = this.isNoObserversForType();
			var successfullyTakenOver = !noPubsForType;
			var observingCount = this.class.observingPubsCountForType(this.type);
			
			console.log('BEFORE PASSING OBSERVATION TASK', this._agg.aggregate_name, this._id, 'TOTAL PUBS:', allPubs.length, 'TOTAL OBSERVERS:', observingCount, 'TAKE-OVER SUCCESS:', successfullyTakenOver)
		}
		
		if(pub) { 
			console.log('PASSED TO:', pub._id); //Hasn't started to observe yet, unless it started just as this stopped.
			pub.update(pub._agg);
			pub.observe(pub._agg); // //if a publisher did start observing already, this wouldnt need to execute
		}
		else {
			//else it started about the same time this one stopped, 
			//so it started observing/publishing the target collection since it saw no other publisher was.
			console.log(this._id, "0 AGGREGATE PUBLISHERS OR TAKEN OVER ALREADY");
		}	
		
		return !!pub; //new pub observing, setIntervalUntil can stop
	},
	isNoObserversForType: function() {
		return this.class.isNoObserversForType(this.type, this._id);
	},
	isActiveObserverForType: function() {
		return this.class.isActiveObserverForType(this.type, this._id);
	},
	stopAllObservers: function() {
		if(this.observer) this.observer.stop();//only one Aggregate Publisher will observer the 
		if(this.removalObserver) this.removalObserver.stop(); //actual target collection observer
		if(this.aggregateObserver) this.aggregateObserver.stop(); //to minimize collection.aggregate() calls
		
		delete this.observer;
		delete this.removalObserver;
		delete this.aggregateObserver;
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
		
		if(_.isEmpty(pubs)) {
			console.log('EMPTY PUBS', id);
			return;
		}
		
		console.log('BEFORE PUBS', id, pubs.length, pubs.map(function(pub) {return pub._id}));
		
		this.instantiatedPublishers[type] = _.reject(pubs, function(pub) { return pub._id == id; });
		
		var pubsAgain = this.instantiatedPublishers[type];
		console.log('AFTER PUBS', id, pubsAgain.length, pubsAgain.map(function(pub) {return pub._id}));

		if(this.instantiatedPublishers[type].length === 0) delete this.instantiatedPublishers[type];
		
		console.log('FINAL PUBS', id, !!this.instantiatedPublishers[type])
	},
	findOneInstantiatedPublisher: function(type) {
		var pubs = this.instantiatedPublishers[type];
		if(_.isArray(pubs) && !_.isEmpty(pubs)) return pubs[pubs.length - 1];
		else return null;
	},
	findNonObservingPublisher: function(type) {
		var pubs = this.instantiatedPublishers[type];
		if(!_.isArray(pubs) || _.isEmpty(pubs)) return null;
		
		return this.isNoObserversForType(type) ? _.last(pubs) : null
	},
	isNoObserversForType: function(type, id) {
		var pubs = this.instantiatedPublishers[type];
		if(_.isEmpty(pubs)) return true;
			
		var count = _.reduce(pubs, function(acc, pub) {
			return (pub.observer ? 1 : 0) + acc;
		}, 0);
		
		//console.log('NO PUBLISHERS?', id, !count);
		return !count;
	},
	observingPubsCountForType: function(type) {
		var pubs = this.instantiatedPublishers[type];
		if(_.isEmpty(pubs)) return 0;
			
		return _.reduce(pubs, function(acc, pub) {
			return (pub.observer && !pub.observer._stopped ? 1 : 0) + acc;
		}, 0);
	},
	isActiveObserverForType: function(type, id) {
		var pubs = this.instantiatedPublishers[type];
		if(_.isEmpty(pubs)) return false; //shouldn't be empty at this stage, but just in case
			
		var self = _.find(pubs, function(pub) {
			return pub._id == id;
		}, 0);
		
		return !!self.observer;
	}
});

//PUBLISHER SEEM TO HAPPEN IN A DIFFERENT PROCESS THAN METHODS
//SO THIS DOESN'T WORK. WEIRD.
UltimateAggregatePublisher.extendHttpStatic({
	stats: function() {
		var res = {};

		_.each(UltimateAggregatePublisher.instantiatedPublishers, function(pubs, type) {
			res[type] = {};
			res[type].count = pubs.length;
			res[type].observerCount = _.reduce(pubs, function(acc, pub) { 
				return (pub.observer ? 1 : 0) + acc; 
			}, 0);
		});
	
		return res;
	}
});