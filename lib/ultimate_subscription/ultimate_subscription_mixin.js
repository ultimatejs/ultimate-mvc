Ultimate('UltimateSetupSubscription').extends({
	abstract: true,
	mixinTo: ['UltimateModel'],

	onChildStartup: function() {
		//1. `___insecure` allows for nameless subscriptions via any selector until subscriptions are added.
		if(!this.subscriptions) this.subscriptions = {___insecure: {}};
		this._addSubscriptions(this.subscriptions);
		
		//2. `justAggregates` allows for u to call subscribe() without a subscription name parameter:
		//   `Model.agg('someAggName', 'another').subscribe();` 
		//    it will assume ur attempting to subsribe to justAggregates
		this._addSubscriptions({justAggregates: {}});
	},


	_addSubscriptions: function(subs) {
		if(/UltimateUser|UltimateApp/.test(this.className)) return; //internal Model extensions cant have subs

		_.each(subs, function(sub, name) {
			if(Meteor.isServer) this.createPublish(sub, name, this.class);	
			if(Meteor.isClient) this.createSubscribe(sub, name, this.class);

			this.createClassFinderMethods(sub, name, this.class);
		}, this);
	},
	createPublish: function(sub, name, Class) {	
		var pubSubName = this._pubSubName(Class, name),
			self = Class.prototype;

		Meteor.publish(pubSubName, function(options, relations, aggregates, cachedIdsByCollection) {
			this.unblock(); //uses meteorhacks:unblock. subscriptions.ready() reactive method should be used client side if dependent
			
			var urpf = new UltimateRelationsPublisherFactory(this, name, Class, aggregates, cachedIdsByCollection);

			if(name == 'justAggregates') urpf.publishCollectionAggregate();
			else {
				var sub = self.subscriptions[name];
				if(!sub) throw new Error('invalid-subscription-name', 'There is no subscribion named '+name+' on '+self.className+'.');
				sub = UltimateUtilities.extractConfig(sub, self, this.userId);	
				
	
				//SECURITY CHECKS
				if(!UltimateUtilities.isAllowed(sub, self, this.userId, 'publication', self.className+'.'+name)) return false;
				
				sub.selector = sub.selector || {};
				if(options.selector) sub.selector = {$and: [sub.selector, options.selector]}; //client-supplied selector secured by being filtered by server-side selector
				delete options.selector;
				
				UltimateUtilities.checkFields(options.fields);
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
	createClassFinderMethods: function(subscription, name, Class) {	
		Class[name] = function(selector, options) { //create function, eg: Order.recent();
			var userId = options ? options.userId : null,
				sub = UltimateUtilities.extractConfig(subscription, this.prototype, Ultimate.userId(userId));
			
			selector = _.extend({}, sub.selector, selector);
			options = _.extend({}, sub, options);
			
			var findName = options.limit == 1 ? 'findOne' : 'find';
			
			return Class.collection[findName](selector, options);
		};
	},


	_methodName: function(type, name) {
		return type + name.capitalizeFirstLetter();
	},
	_pubSubName: function(Class, name) {
		return Class.className + name.capitalizeFirstLetter();
	}
}, {
	bla: function() {
		
	}
});