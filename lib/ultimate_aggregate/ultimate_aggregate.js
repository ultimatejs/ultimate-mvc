Ultimate('UltimateAggregate').extends(UltimateModel, {
	collection: 'ultimate_aggregates',
});


Ultimate('UltimateRemoval').extends(UltimateModel, {
	collection: 'ultimate_removals',

	onStartup: function() {
		if(Meteor.isClient) return;
		this.setInterval(this.removeUltimateRemovals, 2 * 60 * 1000);
	},
	removeUltimateRemovals: function() {
		UltimateRemovals.remove({updated_at: {$lt: moment().subtract(2, 'minutes').toDate()}});
	}
});


//END POINT SO DEVELOPERS REMOVING MODELS OUTSIDE OF METEOR CAN NOTIFY THE ULTIMATE SYSTEM
//THAT THE MODELS HAVE BEEN REMOVED. SHOULD BE CALLED BEFORE ACTUAL REMOVAL. 
if(Meteor.isServer) {
	Meteor.startup(function() {
		Ultimate('RemovalRouter').extends(UltimateRouterServer, {
			removal_notification: function(request, response) {
				try { 
					var selector = request.query.selector,
						collectionName = request.query.collection,
						removeCount = Meteor.call('ultimate_remove', selector, collectionName, this.userId()),
						res = {
							success: true,
							removed: removeCount
						};
				}
				catch(e) {
					var res = {
						success: false,
						removed: 0
					};
				}
		
		
				response.writeHead(200, {'Content-Type': 'text/json'});
				response.end(EJSON.stringify(res));
			}
		});
	});
}