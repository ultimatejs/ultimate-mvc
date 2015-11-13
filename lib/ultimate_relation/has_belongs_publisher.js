Ultimate('UltimateRelationsHasBelongsPublisher').extends(UltimateRelationsPublisher, {
	construct: function(factory, publisher, rel) {
		this.factory = factory;
		this.publisher = publisher;
		this.setupRelation(rel);
	},
	setupRelation: function(rel) {
		rel = _.isArray(rel) ? this._convertRelationArray(rel) : rel;

		this.relation = rel;
		this.type = rel.relation;
		this.modelClass = UltimateUtilities.classFrom(rel.model);
		this.fk = rel.relation == 'belongs_to' && rel.key ? rel.key : rel.foreign_key; //belongs_to should be .key
		this.key = rel.relation == 'belongs_to' ? '_id' : (rel.key || '_id'); //non belongs_to relations allow for setting of other keys than _id
		
		this.options = rel.options;
		this.selector = this.options.selector || {};
		this.options.sort = this.options.sort || {updated_at: -1};

		if(!this.options.limit && this.modelClass && this.modelClass.prototype.defaultLimit) 
			this.options.limit = this.modelClass.prototype.defaultLimit;

		this.aggregates = rel.aggregates;
		
		this.collection = rel.collection || this.modelClass.collection;
		this.options.transform = null;
	},
	linkParent: function(parent) {		
		this.parentPublisher = parent;		

  	parent.on('cursorChange', function() {
			if(this._isSameIds(this._previousInputIds, this._ids())) return;
			
  		console.log('CURSOR CHANGE', this.logNote());
  		this.updateObserver();
  	}.bind(this), true);
	},
	updateObserver: function() {
		this.prepareSelector();
		this.callParent('updateObserver');
	},


	//relation subscriptions can be array like this as well eg: orders: ['has_many', Order, 'user_id']
	_convertRelationArray: function(rel) {
		var relation = {};
		
		relation.relation = rel.shift();
		relation.model = rel.shift();
		relation.foreign_key = rel.shift();
		
		if(relation.relation == 'many_to_many') relation.through = rel.shift();

		relation.options = rel.shift();
		relation.aggregates = rel.shift();
		
		return relation;
	}
});