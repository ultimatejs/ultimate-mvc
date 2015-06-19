Ultimate('UltimateRelationsPublisher').extends({
	onAfterConstruct: function() {
		this.publisher.onStop(function() {
			console.log('RELATION STOP OBSERVING');
			this.stopObserving();
		}.bind(this));
	},
	updateObserver: function() {
		this.prepareCursor();	
		this.observe();
		this.removeOldIds();
		this.emit('cursorChange');
	},
	prepareCursor: function() {
		this.oldCursor = this.cursor;
		var options = UltimateUtilities.pickCollectionOptions(this.options),
			selector = _.clone(this.selector);

		UltimateUtilities.resolveSelectorClassName(selector, this.modelClass);

		//console.log('INPUT', this.logNote(), selector, options.limit, options.fields, options.sort);
		
		this.cursor = this.collection.find(selector, options);
	},

	
	observe: function() {
		var initializing = true,
			self = this;
		
		this.stopObserving();
		
		this.observer = this.getCursor().observe({
			added: function(doc) {
				self._runPublisherMethod('added', initializing, doc);//added called on same id, does nothing
			},
			removed: function(doc) {
				self._runPublisherMethod('removed', initializing, doc);
			},
			changed: function(doc) {
				self._runPublisherMethod('changed', initializing, doc); //could be optimized to only emit if fks change
			}
		});
		
		initializing = false;
	},	
	stopObserving: function() {
		if(this.observer){
			this.observer.stop();
		}
	},
	_runPublisherMethod: function(method, initializing, doc) {
		var colName = this.collection._name;
		delete doc._originalDoc; //we'll end up with duplicate _originalDoc props if we publish it; the client adds it itself
		delete doc._behaviors; //same with behaviors since they're dynamically added 
		delete doc._listeners; //to be safe, in case any were added, perhaps by behaviors

		//console.log('PUBLISH', this.logNote(), initializing ? 'initializing' : '', method, doc && doc._id);
		if(!this.through) {
			this.publisher[method].apply(this.publisher, [colName, doc._id, doc]); //could be optimized to not add already added docs from prev cursor
		}
		
		if(_.contains(this.cachedIdsByCollection[colName], doc._id) && method == 'added' && initializing) {
			//if client has models from cache already, send changed message in addition so they're updated;
			//the 'added' message will non-fatally fail client side before hand, but there is nothing we can do about that
			if(!this.through) {
				this.publisher.changed.apply(this.publisher, [colName, doc._id, doc]);
			}
		}

		if(!initializing) this.emit('cursorChange'); //could be optimized to only emit on changes to ids or fks
	},
	
	
	removeOldIds: function() {
		if(!this.oldCursor || this.through) return; //we may not need to check this.through, i forget.

		var oldIds = this.fetchIds(this.getOldCursor()),
			newIds = this.fetchIds(this.getCursor()),
			removedIds = _.difference(oldIds, newIds);
			
		removedIds.forEach(function(id) {
			this.publisher.removed(this.collection._name, id);
		}, this);
	},
	getCursor: function() {
		return this.cursor;
	},
	getOldCursor: function() {
		return this.oldCursor;
	},


	getParent: function() {
		return this.parentPublisher;
	},
	fetchIds: function(cursor) {
		return cursor.map(function(model) {
			return model._id;
		});
	},
	fetchValues: function(cursor, fk) {
		return cursor.map(function(model) {
			return model[fk];
		});
	},
	inputIds: function() {
		return this.getParent() ? this.fetchIds(this.getParent().getCursor()) : [];
	},
	outputIds: function() {
		return this.fetchIds(this.getCursor());
	},


	logNote: function() {
		var through = this.through ? 'through' : '',
			parentName;

		if(this.type == 'many_to_many') parentName = this.parentPublisher.parentPublisher.modelClass.className;
		else parentName = this.parentPublisher ? this.parentPublisher.modelClass.className : '';

		return parentName+' '+this.type+' '+this.collection._name+' '+through;
	}
});