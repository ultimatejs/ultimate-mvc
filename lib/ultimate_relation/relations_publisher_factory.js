Ultimate('UltimateRelationsPublisherFactory').extends({
	construct: function(publisher, ModelClass, aggregates, cachedIdsByCollection) {
		this.publisher = publisher;
		this.userId = publisher.userId;
		this.modelClass = ModelClass;
		console.log('cachedIdsByCollection', cachedIdsByCollection);
		//ids mapped by collection name will be passed to all publishers to determine whether to call 'added' or 
		//'changed' in the case that the clients have them cached already. 
		//the obj looks like this: {collection_name: ['asdfsd4id', 'anotherId']}
		this.cachedIdsByCollection = cachedIdsByCollection || {}; 

		if(!_.isEmpty(aggregates)) {
			UltimateUtilities.checkAggregates(aggregates);

			var aggColPub = new UltimateAggregateCollectionPublisher(this, publisher, aggregates, ModelClass, this.cachedIdsByCollection);
			aggColPub.start();
		}
	},
	startPublishing: function(relations, selector, options) {
		var rp = new UltimateRelationsParentPublisher(this, this.publisher, this.modelClass, selector, options, this.cachedIdsByCollection);
		this.createRelationsPublishers(rp, relations);
	},


	createRelationsPublishers: function(parent, rels) {
		console.log("RELS", rels);
		_.each(rels, this._handleRelation.bind(this, parent));		
	},
	_handleRelation: function(parent, options, name) {
		UltimateUtilities.checkAggregates(options.with);

		//options will look like: {instances: {}} or {{payments: {with: {orders:{} }}}, instances: {}}
		var rel = this._relationFromName(name, parent, options),
			rp = this._createRelationPublisher(rel, options);

		rp.cachedIdsByCollection = this.cachedIdsByCollection;
		rp.linkParent(parent);
		
		if(rp.aggregates) this._createAggregatePublisher(rp.aggregates, rel, parent);
		if(rel.with) this.createRelationsPublishers(rp, rel.with);
		return rel;
	},
	
	

	_relationFromName: function(name, parent, options) {
		var rel = this._extractRelation(parent, name);

		console.log('CHECK OPTIONS', options);
		UltimateUtilities.checkOptions(options);
		UltimateUtilities.checkOptions(options.throughOptions);

		//if(!rel) rel = options; //an entire object was provided instead of referencing a relation definition; DEPRECATED SINCE CLIENT CANT PROVIDE SELECTORS

		console.log('RELATION', name, parent.modelClass.className);

		rel = UltimateUtilities.extractConfig(rel, parent.modelClass.prototype, this.publisher.userId);

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
	_createRelationPublisher: function(rel, options) {
		rel.options = _.extend({}, rel, options); //extend options again, cuz different ones will be used as the rel.options prop
		if(options.throughOptions) rel.throughOptions = options.throughOptions;

		switch (rel.relation) {
			case 'has_many': 			return new UltimateRelationsHasPublisher(this, this.publisher, rel); 
		    case 'has_one': 			return new UltimateRelationsHasPublisher(this, this.publisher, rel); //code is exact same as has_one

		    case 'belongs_to': 			return new UltimateRelationsBelongsPublisher(this, this.publisher, rel);

		    case 'many_to_many': 		return new UltimateRelationsManyManyPublisher(this, this.publisher, rel);
		    case 'many_many': 			return new UltimateRelationsManyManyPublisher(this, this.publisher, rel); //alias for many_to_many

		    case 'through': 			return new UltimateRelationsThroughPublisher(this, this.publisher, rel); //almost identical to HasPublisher, except nothing published from through Collection
		
		    case 'aggregate': 			return new UltimateAggregateRelationsStandalonePublisher(this, this.publisher, rel);
		}
	},
	_createAggregatePublisher: function(aggregates, rel, parent) {
		var aggPub = new UltimateAggregateRelationsPublisher(this, this.publisher, aggregates, rel.model, rel.agg_selector, this.cachedIdsByCollection);
		aggPub.linkParent(parent, rel.foreign_key);
	},


	ready: function() {
		this.publisher.ready();
	}
});