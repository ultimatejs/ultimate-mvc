Ultimate('UltimateAggregatePublisher').extends({
	construct: function(factory, aggregate, ModelClass) {
		this.factory = factory;
		this.publisher = factory.publisher;
		this.aggregate = aggregate;
		this.cachedIdsByCollection = factory.cachedIdsByCollection;
		
		this.modelClass = UltimateUtilities.classFrom(ModelClass);
		this.collection = this.modelClass.collection;
		
		this.created = new Date;
		this._id = Random.id();
	},

	
	start: function() {
		//For some reason, ids returned from the parent subscription or relation sometimes returns empty when called in succession for a bunch of aggs
		//This is only used by UltimateAggregateRelationsPublisher when used as a relation, not when used by CreateMethodsHelpers
		if(this.parentPublisher) this.parentIds = this._previousInputIds = this._ids();
		
		var agg = this._agg = this.extractAggregateConfig(this.aggregate);
		
		//SECURITY CHECKS
		if(agg === false) throw new Error('unauthorized-access-to-aggregate', 'NOT ALLOWED to subscribe to this aggregate: ' + (_.isString(aggregate) ? this.modelClass.className+'.'+aggregate : this.modelClass.className+'.'+agg.operator+' '+agg.field));


		this.stopAllObservers();
		
		this.type = this.class.generatePublisherType(agg, this.fk);
		this.class.addInstantiatedPublisher(this.type, this);
		this.onStop(agg);
		
		if(Meteor.isServer) { 
			if(this.isNoPublishers()) {
				console.log('AGGREGATE PUBLISHER TAKING OVER', this._id);
				this.update(agg);
				this.observe(agg);
			}
		
			//Only UltimateAggregateCollectionPublisher has this method
			//All AggregateCollectionPulishers observe ultimate_aggregates collection & publish its results/
			if(this.observeUltimateAggregates) this.observeUltimateAggregates(agg); 
		}
		else this.update(agg); //client side publisher caching duck always needs to update
	},
	update: function(agg, singleId) {
		singleId = singleId ? [singleId]: null; 
		
		//client side publisher duck responsible for observing UltimateAggregates collection & caching results
		if(Meteor.isClient) return this.publisher.observeUltimateAggregates(agg);

		var result = this.exec(agg, this.modelClass, this.fk, null, singleId); //this.fk == undefined in CollectionPublisher.
		this.store(result, agg, singleId);
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

		this.observer = this.cursor(agg).observe({
			added: function(doc) {
				if(!initializing) {
					this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
				}
			}.bind(this),
			changed: function(doc) {
				this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
			}.bind(this)
		});
		
		this.removalObserver = this.removalCursor(agg).observe({
			added: function(doc) {
				if(!initializing) {
					this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
				}
			}.bind(this)
		});
		
		initializing = false;
	},

	cursor: function(agg) {
		var selector = this._prepareSelector(agg.selector),
			fields = {};
			
		fields[this._agg.field] = 1;
		return this.collection.find(selector, {limit: 1, sort: {updated_at: -1}, fields: fields});
	},
	removalCursor: function(agg) {
		var selector = this._prepareSelector(agg.selector);

		selector.collection = this.collection._name; 
		selector.oldClassName = selector.className;
		
		if(selector.created_at) selector.oldCreated_at = selector.created_at;
		if(selector.updated_at) selector.oldUpdated_at = selector.updated_at;
		
		delete selector.className; //do this because they will end up with className == 'UltimateRemoval'
		delete selector.created_at;
		delete selector.updated_at;
		
		return UltimateRemovals.find(selector, {limit: 1, sort: {updated_at: -1}});
	}
});