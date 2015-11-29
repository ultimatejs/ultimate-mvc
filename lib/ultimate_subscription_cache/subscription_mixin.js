UltimateSetupSubscription.extend({
	_createSubscribe: function(sub, name, Class) {	
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
});