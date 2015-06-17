Ultimate('UltimateRelationsManyManyPublisher').extends(UltimateRelationsPublisher, {
	construct: function(factory, publisher, rel) {
		this.factory = factory;
		this.publisher = publisher;
		this.setupRelation(rel);
	},
	setupRelation: function(rel) {
		var throughRelation = {
			collection: this.collectionFromThrough(rel.through), //collection instead of non-existent model
			foreign_key: rel.foreign_key[0],
			options: UltimateClone.deepClone(rel.throughOptions),
			relation: 'through'
		};
		
		var belongsRelation = {
			model: UltimateUtilities.classFrom(rel.model),
			foreign_key: rel.foreign_key[1],
			options: UltimateClone.deepClone(rel.options),
			aggregates: rel.aggregates,
			relation: 'many_to_many' //actually a 'belongs_to' relation; display 'many_to_many' for logging purposes
		};		
		
		this.throughPublisher = new UltimateRelationsThroughPublisher(this.factory, this.publisher, throughRelation);	
		this.belongsPublisher = new UltimateRelationsBelongsPublisher(this.factory, this.publisher, belongsRelation);

		this.modelClass = this.belongsPublisher.modelClass; //needed for children to link to this parent in urp_factory.js
	},
	
	collectionFromThrough: function(through) {
		if(_.isString(through)) {
			if(Ultimate.classes[through]) return Ultimate.classes[through].collection;
			else if(Ultimate.collections[through]) return Ultimate.collections[through];
		}
		else return through.isModel ? through.collection : through;
	},
	linkParent: function(parent) {	
		this.parentPublisher = parent;	

		this.throughPublisher.linkParent(parent); 
		this.belongsPublisher.linkParent(this.throughPublisher);

		this.belongsPublisher.on('cursorChange', function() {
			this.emit('cursorChange');
		}.bind(this));
	},
	getCursor: function() {
		return this.belongsPublisher.cursor;
	},
	getOldCursor: function() {
		return this.belongsPublisher.oldCursor;
	}
});