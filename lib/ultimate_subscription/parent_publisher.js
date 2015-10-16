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
		if(this.options.observeUser) this._handleUserChange();
	},
	
	
	_handleUserChange: function() {
		this.userObserver = Meteor.users.find(this.publisher.userId).observe({
			changed: function(newUserDoc, oldUserDoc) { 
				var config = this.modelClass.prototype.subscriptions[this.factory.subName].call(this.modelClass.prototype, this.publisher.userId),
					newSelector = config.selector,
					doUpdate;
				
				if(config.hasOwnProperty('limit') && !_.isEqual(this.options.limit, config.limit)) {
					this.options.limit = config.limit;
					doUpdate = true;
				}
				if(config.hasOwnProperty('fields') && !_.isEqual(this.options.fields, config.fields)) {
					this.options.fields = config.fields;
					doUpdate = true;
				}
				if(config.hasOwnProperty('sort') && !_.isEqual(this.options.sort, config.sort)) {
					this.options.sort = config.sort;
					doUpdate = true;
				}
				
				if(config.hasOwnProperty('selector') && !_.isEqual(newSelector, this.selector)) {
					if(this.selector._id && !newSelector._id) newSelector._id = this.selector._id; //bring in IDs selector from DataTable
						
					this.selector = newSelector;
					doUpdate = true;
				}
				
				if(doUpdate) this.updateObserver();
			}.bind(this)
		});
	}
});