Ultimate('UltimateAggregateObserver').extends({
	trackObserver: function() {
		this.id = this.generateId(); //Identical interval aggregates can be stopped by IDs later.
		this.class.observers[this.id] = this; //This allows aggregates to have different selectors, e.g. date windows
	},
	generateId: function() {
		var agg = this.extractConfig(this.aggregate);
		delete agg.selector;
		return EJSON.stringify(agg);
	},
	
	
	start: function() {
		this.class.stopExistingObserver(this);
		
		var agg = this._agg = this.extractConfig(this.aggregate);
		this.update(agg);
		this.observe(agg);
	},
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
	
	currentDoc: {},
	observe: function(agg) {
		if(this.observer) this.observer.stop();
	
		var initializing = true;
		
		//setting up the observer may take a few more ms before this.observer is truthy
		this.observer = this.cursor(agg).observeChanges({
			added: function(id, doc) {
				this.currentDoc[id] = doc;
				if(initializing) return; //dont call throttleUpdate on initialization, since its handled in batch by this.exec()
				
				this.throttleUpdate(agg, doc, 'added_removed_changed');
			}.bind(this),
			changed: function(id, doc) {
				//Only update groupby model if it exists (sometimes `delete this.currentDoc[id]` in `removed:` below is called first and doesnt exist).
				if(!this.currentDoc[id]) return;
				//Trigger throttleUpdate only if the field being tracked has changed (as opposed to possibly other irrelevant fields)
				//or if the foreign key has changed in the aggregated/related model.
				if(doc[agg.field] != this.currentDoc[id][agg.field] || doc[this.fk] != this.currentDoc[id][this.fk]) {
					this.throttleUpdate(agg, doc, 'added_removed_changed');
				}
			}.bind(this),
			removed: function(id) {
				var doc = this.currentDoc[id];
				delete this.currentDoc[id];
				this.throttleUpdate(agg, doc, 'added_removed_changed'); //cursor emptied; added won't handle update in this edge case
			}.bind(this)
		});
		
		
		if(this.removalObserver) this.removalObserver.stop();
		
		this.removalObserver = this.removalCursor(agg).observeChanges({
			added: function(id, doc) {
				if(!initializing) this.throttleUpdate(agg, doc, 'removed');
			}.bind(this)
		});
		
		initializing = false;
	},
	
	throttleUpdate: function(agg, doc, type) {
		var key = this.throttleKey(type, doc);
		
		this.throttleCall(key, function() {
			this.update(agg, this.fk && doc ? doc[this.fk] : null); //exec just an aggregate call filtered by id
		}, 500);
	},
	throttleKey: function(type, doc) {
		return this.id + '_' + type + '_' + (this.fk && doc ? doc[this.fk] : 'collection')
	},

	cursor: function(agg) {
		var fields = {};
			
		fields[this._agg.field] = 1;
		if(this.fk) fields[this.fk] = 1;
		
		//limit 10 instead of 1, so similar observed set isn't always triggering changes
		return this.collection.find(agg.selector, {limit: 10, sort: {updated_at: -1}, fields: fields}); 
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
	
	_formatResult: function(result) {
		if(this._agg.formatter) return this._agg.formatter(result);
		else return result; 
 	},
	
	
	stop: function() {
		if(this.observer) this.observer.stop();
		if(this.removalObserver) this.removalObserver.stop();
	}
}, {
	observers: {},
	stopExistingObserver: function(observer) {
		var observer = this.observers[observer.id];
		if(observer) observer.stop();
	}
});