Ultimate('UltimateRelationsPublisher').extends({
	onAfterConstruct: function() {
		this.publisher.onStop(function() {
			this.stopObserving();
			if(this.userObserver) this.userObserver.stop();
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
		
		var handlers = {
			added: function(id, doc) {
				self._runPublisherMethod('added', initializing, id, doc);//added called on same id, does nothing
			},
			removed: function(id) {
				self._runPublisherMethod('removed', initializing, id);
			},
			changed: function(id, doc) {
				self._runPublisherMethod('changed', initializing, id, doc); 
			}
		};
		
		if(Meteor.isClient) {
			handlers.addedBefore = function(id, doc) { //client publisher duck needs addedBefore for miniMongo limit queries
				self._runPublisherMethod('added', initializing, doc);//added called on same id, does nothing
			};
			delete handlers.added;
		}
			
		this.observer = this.getCursor().observeChanges(handlers);
		
		initializing = false;
	},	
	stopObserving: function() {
		if(this.observer) this.observer.stop();
	},
	_runPublisherMethod: function(method, initializing, id, doc) {
		var colName = this.collection._name;
		
		if(doc) {
			delete doc._originalDoc; //we'll end up with duplicate _originalDoc props if we publish it; the client adds it itself
			delete doc._behaviors; //same with behaviors since they're dynamically added 
			delete doc._listeners; //to be safe, in case any were added, perhaps by behaviors
			
			if(method == 'changed' && _.size(doc) === 1 && doc.updated_at) return; //dont send changed messages if only the update time changed
		}
		
		//console.log('PUBLISH', this.logNote(), initializing ? 'initializing' : '', method, id);
		if(!this.through) {
			this.publisher[method].apply(this.publisher, [colName, id, doc]); //could be optimized to not add already added docs from prev cursor
		}
		
		if(_.contains(this.cachedIdsByCollection[colName], id) && method == 'added' && initializing) {
			//if client has models from cache already, send changed message in addition so they're updated;
			//the 'added' message will non-fatally fail client side before hand, but there is nothing we can do about that
			if(!this.through) {
				this.publisher.changed.apply(this.publisher, [colName, id, doc]);
			}
		}

		if(!initializing) this.emit('cursorChange'); 
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
	_isSameIds: function(ids1, ids2) {
		var diff1 = _.difference(ids1, ids2),
			diff2 = _.difference(ids2, ids1);
		
		return _.isEmpty(diff1) && _.isEmpty(diff2);
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
		if(!cursor) return;
		
		return cursor.map(function(model) {
			return model[this.key];
		}.bind(this));
	},
	fetchValues: function(cursor, fk) {
		if(!cursor) return;
		
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