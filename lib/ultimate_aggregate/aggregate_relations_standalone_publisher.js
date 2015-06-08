Ultimate('UltimateAggregateRelationsStandalonePublisher').extends(UltimateRelationsHasPublisher, {
	setupRelation: function(rel) {
		this.callParent('setupRelation', rel);

		//somewhat of a hack
		//the 'aggregate' relation type has the entire relation config obj set as a single aggregate
		this.aggregates = [this.relation]; 
	},
	linkParent: function(parent) {		
		this.parentPublisher = parent;		

		//aggregate relations dont do the normal observe + publish process, but rather just
		//act as a passthrough, and pass on the aggregate config object to UltimateAggregateRelationsPublisher
		return; 
	}
});
