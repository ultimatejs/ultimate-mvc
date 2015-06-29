Ultimate('UltimateAggregatePublisher').extends({
	update: function(agg, singleId) {
		singleId = singleId ? [singleId]: null; 
		
		var result = this.exec(agg, this.modelClass, this.fk, null, singleId); //this.fk == undefined in CollectionPublisher.
		this.store(result, agg, singleId);
	},
	exec: function(agg, model, fk, returnOneRow, parentIds) {
		var group = {_id: null, result: {}},
			parentIds = parentIds || this.parentIds; //CreateAggregateGroupByMethodsHelper provides ids already

		if(fk) group._id = '$'+fk; //fk provided groupBy class method & AggregateRelationsPublisher	
		
		if(agg.operator == 'count') group.result.$sum = 1;
		else group.result['$'+agg.operator] = '$'+agg.field; //count handled by default
			
		var selector = agg.selector || {},
			pipeline = [
				{$match:  selector},
				{$group: group}
			];
			
		var res = model.collection.aggregate(pipeline);

		if(returnOneRow) return res[0] ? res[0].result : 0;
		else return res;
	},
	
	
	observe: function(agg) {
		if(this.observer) this.observer.stop();
	
		var initializing = true;
		
		//setting up the observer may take a few more ms before this.observer is truthy
		this.observer = this.cursor(agg).observe({
			added: function(doc) {
				if(!initializing) {
					this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
				}
			}.bind(this),
			changed: function(doc) {
				this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
			}.bind(this)
		});
		
		
		if(this.removalObserver) this.removalObserver.stop();
		
		this.removalObserver = this.removalCursor(agg).observe({
			added: function(doc) {
				if(!initializing) {
					this.update(agg, this.fk ? doc[this.fk] : null); //exec just an aggregate call filtered by this doc._id
				}
			}.bind(this)
		});
		
		initializing = false;
	},

	cursor: function(agg) {
		var fields = {};
			
		fields[this._agg.field] = 1;
		if(this.fk) fields[this.fk] = 1;
		
		return this.collection.find(agg.selector, {limit: 1, sort: {updated_at: -1}, fields: fields});
	},
	removalCursor: function(agg) {
		var selector = _.clone(agg.selector);

		selector.collection = this.collection._name; 
		selector.oldClassName = selector.className;
		
		if(selector.created_at) selector.oldCreated_at = selector.created_at;
		if(selector.updated_at) selector.oldUpdated_at = selector.updated_at;
		
		delete selector.className; //do this because they will end up with className == 'UltimateRemoval'
		delete selector.created_at;
		delete selector.updated_at;
		
		return UltimateRemovals.find(selector, {limit: 1, sort: {updated_at: -1}});
	},
	
	
	_prepareSelector: function(selector, model) {
		selector = selector ? _.clone(selector) : {};
		model = model || this.modelClass;
		UltimateUtilities.resolveSelectorClassName(selector, model);
		return selector;
	},
});