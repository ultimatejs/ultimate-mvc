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
		
		this.key = options.key || '_id';
		
		this.updateObserver();
	}
});