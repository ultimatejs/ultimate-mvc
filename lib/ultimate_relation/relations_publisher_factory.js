Ultimate('UltimateRelationsPublisherFactory').extends({
	construct: function(publisher, ModelClass, aggregates, cachedIdsByCollection) {
		this.publisher = publisher;
		this.userId = publisher.userId;
		this.modelClass = ModelClass;
		this.aggregates = aggregates;

		//ids mapped by collection name will be passed to all publishers to determine whether to call 'added' or 
		//'changed' in the case that the clients have them cached already. 
		//the obj looks like this: {collection_name: ['asdfsd4id', 'anotherId']}
		console.log('cachedIdsByCollection', cachedIdsByCollection);
		this.cachedIdsByCollection = cachedIdsByCollection || {}; 
	},
	publishCollectionAggregate: function() {
		UltimateUtilities.checkAggregates(this.aggregates);

		//Aggregate Publishers used to publish multiple aggregates, but
		//now they only publish one each, so they can maintain state properly for one aggregate at a time
		_.each(this.aggregates, function(aggregate) {
			var aggColPub = new UltimateAggregateCollectionPublisher(this, aggregate, this.modelClass);
			aggColPub.start();
		}, this);
	},
	startPublishing: function(relations, selector, options) {
		if(!_.isEmpty(this.aggregates)) this.publishCollectionAggregate();
		
		var rp = new UltimateRelationsParentPublisher(this, this.publisher, this.modelClass, selector, options, this.cachedIdsByCollection);
		this.createRelationsPublishers(rp, relations);
	},


	createRelationsPublishers: function(parent, rels) {
		_.each(rels, this._handleRelation.bind(this, parent)); 
	},
	_handleRelation: function(parent, options, name) {
		UltimateUtilities.checkAggregates(options.with);

		//options will look like: {instances: {}} or {{payments: {with: {orders:{} }}}, instances: {}}
		var rel = this._relationFromName(name, parent, options);
		
		//SECURITY CHECK
		if(rel === false) return;
		
		var rp = this._createRelationPublisher(rel, options, name);

		rp.cachedIdsByCollection = this.cachedIdsByCollection;
		rp.linkParent(parent);
		
		if(!_.isEmpty(rp.aggregates)) this._createAggregatePublisher(rp.aggregates, rel, parent);
		if(!_.isEmpty(rel.with)) this.createRelationsPublishers(rp, rel.with);
	},
	
	

	_relationFromName: function(name, parent, options) {
		var rel = this._extractRelation(parent, name);

		UltimateUtilities.checkOptions(options);
		UltimateUtilities.checkOptions(options.throughOptions);

		//if(!rel) rel = options; //an entire object was provided instead of referencing a relation definition; DEPRECATED SINCE CLIENT CANT PROVIDE SELECTORS

		console.log('RELATION', name, parent.modelClass.className);

		rel = UltimateUtilities.extractConfig(rel, parent.modelClass.prototype, this.publisher.userId);

		//SECURITY CHECKS
		if(!UltimateUtilities.isAllowed(rel, parent.modelClass.prototype, this.publisher.userId, 'relation', parent.modelClass.className+'.'+name)) return false;
		
		if(rel.with) {
			var relWith = UltimateUtilities.extractConfig(rel.with, rel.model, this.publisher.userId);
			options.with = UltimateModel.withRelationCombine(options.with, relWith);
		}
		
		return _.extend(rel, options); //subscribe-provided with (options) will combine with the relation defined one (rel)
	},
	_extractRelation: function(parent, name) {
		var relations = parent.modelClass.prototype.relations;
		return relations ? relations[name] : null;
	},
	_createRelationPublisher: function(rel, options, name) {
		rel.options = _.extend({}, rel, options); //extend options again, cuz different ones will be used as the rel.options prop
		if(options.throughOptions) rel.throughOptions = options.throughOptions;

		switch (rel.relation) {
			case 'has_many': 			return new UltimateRelationsHasPublisher(this, this.publisher, rel); 
		    case 'has_one': 			return new UltimateRelationsHasPublisher(this, this.publisher, rel); //code is exact same as has_one

		    case 'belongs_to': 			return new UltimateRelationsBelongsPublisher(this, this.publisher, rel);

		    case 'many_to_many': 		return new UltimateRelationsManyManyPublisher(this, this.publisher, rel);
		    case 'many_many': 			return new UltimateRelationsManyManyPublisher(this, this.publisher, rel); //alias for many_to_many

		    case 'through': 			return new UltimateRelationsThroughPublisher(this, this.publisher, rel); //almost identical to HasPublisher, except nothing published from through Collection
		
		    case 'aggregate': 			return new UltimateAggregateRelationsStandalonePublisher(this, this.publisher, rel, name);
		}
	},
	_createAggregatePublisher: function(aggregates, rel, parent) {
		//we used to create one aggregate relations publisher per relation, but we found it's better
		//for each to manage just one aggregate so it can better determine removed/changed/etc data
		//for just one aggregate at a time. Hence [aggregate] below:
		
		if(_.isString(aggregates)) aggregates = [aggregates];
		
		_.each(aggregates, function(aggregate) {
			var aggPub = new UltimateAggregateRelationsPublisher(this, aggregate, rel);
			aggPub.linkParent(parent);
		}, this);
	},


	ready: function() {
		this.publisher.ready();
	}
});