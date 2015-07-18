Ultimate('UltimateRelationsParentPublisher').extends(UltimateRelationsPublisher, {
	construct: function(factory, publisher, ModelClass, selector, options, cachedIdsByCollection) {
		this.factory = factory;
		this.publisher = publisher;
		this.cachedIdsByCollection = cachedIdsByCollection;
		this.setupParent(ModelClass, selector, options);
	},
	setupParent: function(ModelClass, selector, options) {
		this.type = 'subscription';
		this.collection = ModelClass.collection; 	
		this.modelClass = ModelClass;
		this.selector = selector || {};
		this.options = options;
		this.options.transform = null;
		
		this.options.sort = this.options.sort || {updated_at: -1};
		
		if(!this.options.limit && this.modelClass && this.modelClass.prototype.defaultLimit) 
			this.options.limit = this.modelClass.prototype.defaultLimit;
		
		this.key = options.key || '_id';
		
		this.updateObserver();
	}
});