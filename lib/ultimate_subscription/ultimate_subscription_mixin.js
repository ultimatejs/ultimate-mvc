Ultimate('UltimateSetupSubscription').extends({
	abstract: true,
	mixinTo: ['UltimateModel'],
	config: ['subscriptions'],
	
	onChildStartup: function() {
		var owner = this.owner();
		
		if(owner.isCoreUltimateClass()) return;
		
		//1. `___insecure` allows for nameless subscriptions via any selector until subscriptions are added.
		if(!owner.subscriptions) owner.subscriptions = {___insecure: {}};
		this._addSubscriptions(owner.subscriptions);
		
		//2. `justAggregates` allows for u to call subscribe() without a subscription name parameter:
		//   `Model.agg('someAggName', 'another').subscribe();` 
		//    it will assume ur attempting to subsribe to justAggregates
		this._addSubscriptions({justAggregates: {}});
	},


	_addSubscriptions: function(subs) {
		var Class = this.owner().class;
		
		_.each(subs, function(sub, name) {
			if(Meteor.isServer) this._createPublish(sub, name, Class);	
			if(Meteor.isClient) this._createSubscribe(sub, name, Class);

			this._createClassFinderMethods(sub, name, Class);
		}, this);
	},
	_createPublish: function(sub, name, Class) {	
		var pubSubName = this._pubSubName(Class, name),
			owner = this.owner();

		Meteor.publish(pubSubName, function(options, relations, aggregates, cachedIdsByCollection) {
			this.unblock(); //uses meteorhacks:unblock. subscriptions.ready() reactive method should be used client side if dependent
			
			var urpf = new UltimateRelationsPublisherFactory(this, name, Class, aggregates, cachedIdsByCollection);

			if(name == 'justAggregates') urpf.publishCollectionAggregate();
			else {
				var sub = owner.subscriptions[name];
				if(!sub) throw new Error('invalid-subscription-name', 'There is no subscribion named '+name+' on '+owner.className+'.');
				sub = UltimateUtilities.extractConfig(sub, owner, this.userId);	
				
	
				//SECURITY CHECKS
				if(!UltimateUtilities.isAllowed(sub, owner, this.userId, 'publication', owner.className+'.'+name)) return false;
				
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
	_createSubscribe: function(sub, name, Class) {	
		var methodName = this._methodName('subscribe', name),
			pubSubName = this._pubSubName(Class, name);

		Class[methodName] = function(options, relations, aggregates, useCache, subsManager, callbacks) {
			var subscriber = subsManager || Meteor;	
			return subscriber.subscribe(pubSubName, options, relations, aggregates, callbacks);
		};
	},
	_createClassFinderMethods: function(subscription, name, Class) {	
		Class[name] = function(selector, options) { //create function, eg: Order.recent();
			var userId = options ? options.userId : null,
				sub = UltimateUtilities.extractConfig(subscription, this.prototype, Ultimate.userId(userId));
			
			selector = _.extend({}, sub.selector, selector);
			options = _.extend({}, sub, options);
			
			var findName = options.limit == 1 ? 'findOne' : 'find';
			
			return Class[findName](selector, options);
		};
	},


	_methodName: function(type, name) {
		return type + name.capitalizeFirstLetter();
	},
	_pubSubName: function(Class, name) {
		return Class.className + name.capitalizeFirstLetter();
	}
});