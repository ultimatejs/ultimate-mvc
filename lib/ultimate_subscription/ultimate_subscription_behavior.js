Ultimate('UltimateSubscriptionBehavior').extends(UltimateBehavior, {}, {
	attachTo: ['UltimateModel'],

	onAttachedToOwner: function() {
		this._addSubscriptions(this.ownerPrototype());
		this.ownerPrototype().on('methodsAdded', this._addSubscriptions.bind(this));
	},


	_addSubscriptions: function(methods) {
		if(methods.subscriptions) {
			var subscriptions = _.extend({}, this.ownerPrototype().parent.subscriptions, methods.subscriptions);
			
			this.ownerPrototype().subscriptions = subscriptions; //we have to re-assign it so parent subscriptions are inherited
			
			var Class = this.ownerClass();

			_.each(subscriptions, function(sub, name) {
				if(Meteor.isServer) this.createPublish(sub, name, Class);	
				if(Meteor.isClient)this.createSubscribe(sub, name, Class);

				this.createClassMethods(sub, name, Class);
			}, this);
		}
	},
	createPublish: function(sub, name, Class) {	
		var pubSubName = this._pubSubName(Class, name),
		owner = this.ownerPrototype();

		Meteor.publish(pubSubName, function(options, relations, aggregates, cachedIdsByCollection) {
			UltimateUtilities.checkOptions(options);
			var urpf = new UltimateRelationsPublisherFactory(this, Class, aggregates, cachedIdsByCollection);

			if(pubSubName == 'just_aggregates') urpf.publishCollectionAggregate();
			else {
				var sub = owner.subscriptions[name];
				sub = UltimateUtilities.extractConfig(sub, owner, this.userId);	
				_.extend(sub, options);
				
				urpf.startPublishing(relations, sub.selector, sub);
			}

			urpf.ready();
		});
	},
	createSubscribe: function(sub, name, Class) {	
		var methodName = this._methodName('subscribe', name),
			pubSubName = this._pubSubName(Class, name);

		Class[methodName] = function(options, relations, aggregates, useCache, subsManager, callbacks) {
			var subscriber = subsManager || Meteor;	

			if(!useCache) return subscriber.subscribe(pubSubName, options, relations, aggregates, callbacks);
			else {
				var usc = new UltimateSubscriptionCache(this, Class, pubSubName, callbacks);
				var callbacks = usc.cache(options, relations, aggregates);
				
				subscriber.subscribe(pubSubName, options, relations, aggregates, usc.getCachedIdsByCollection(), callbacks);
				//the following non fatal error occurs since we already manually added docs from the localStorage cache:
				//Uncaught Error: Expected not to find a document already present for an add
				//try/catching it doesnt suppress it; so for now the only option is just to leave it. 
			
				return usc; //has ready() and stop() methods that pass thru to subscriber properly, i.e. duck-typed
			}
		};
	},
	createClassMethods: function(sub, name, Class) {	
		Class[name] = function(selector, options) { //create function, eg: Order.recent();
			selector = _.extend({}, sub.selector, selector);
			options = _.extend({}, sub, options);
			
			var findName = options.limit == 1 ? 'findOne' : 'find';
			
			return Class.collection[findName](selector, options);
		};
	},


	_methodName: function(type, name) {
		return type + name.capitalizeOnlyFirstLetter();
	},
	_pubSubName: function(Class, name) {
		return Class.className + name.capitalizeOnlyFirstLetter();
	}
});


