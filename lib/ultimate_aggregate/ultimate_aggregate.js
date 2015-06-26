Ultimate('UltimateAggregate').extends(UltimateModel, {
	collection: 'ultimate_aggregates'
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