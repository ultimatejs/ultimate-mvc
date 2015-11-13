UltimateStartup = Ultimate('UltimateStartup').extends(UltimateFacade, {
	abstract: true,
	deniedMethods: ['onStartup', 'ar', 'sub', 'subLimit', 'autoruns', 'subscriptions', 'limitSubscriptions', 'onReady', 'onStop'], //handled by runReactiveMethods & Setup
	mixins: Meteor.isClient ? ['UltimateReactive'] : [],
	
	onFacadeStartup: function() {;
		_.each(this.getMethods(), function(method) {
			Meteor.startup(method);
		});
	},
	onStartup: function() {
    //only client can run the reactive autorun/subscribe/subscribeLimit methods
		if(Meteor.isClient) Meteor.startup(this.runReactiveMethods.bind(this));
	}
});