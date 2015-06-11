Ultimate('UltimateAggregateRelationsStandalonePublisher').extends(UltimateRelationsHasPublisher, {
	setupRelation: function(rel) {
		this.callParent('setupRelation', rel);

		//somewhat of a hack:
		//the 'aggregate' relation type can have the entire relation config obj set as a single aggregate
		//or if it has an 'aggregates' property (which contains an array of of aggregate names from the related model),
		//this relation serves the purpose of just passing on those aggregate names
		this.aggregates = this.relation.aggregates || [this.relation]; //['aggregate', 'names'] || aggregateRelationConfigObject
	},
	linkParent: function(parent) {		
		this.parentPublisher = parent;		

		//aggregate relations dont do the normal observe + publish process, but rather just
		//act as a passthrough, and pass on the aggregate config object to UltimateAggregateRelationsPublisher
		return; 
	}
});
