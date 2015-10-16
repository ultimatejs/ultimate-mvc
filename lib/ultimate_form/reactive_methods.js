UltimateForm.extend({
	reactive: function(reactiveId, keep, useCache) {	
		if(this._local_reactive) return this; //prevent overwriting reactiveId by multiple calls to reactive. use the first one only
		
		reactiveId = reactiveId ? this._prefixReactiveId(reactiveId) : this._getLine();
		
		var isStored = this.reactiveRestore(reactiveId);	
		if(!isStored) this.reactiveStore(reactiveId, keep);	
		
		this.setNonSaveable('useCache', useCache);
		
		return this;
	},
	store: function() {
		var doc = this.getAllMongoAttributes();
		this._Session().set(this._local_reactive, doc);
	},
	
	
	reactiveRestore: function(reactiveId) {
		var doc = this._Session().get(reactiveId);
		this.extendWithDoc(doc);
		this._local_reactive = reactiveId;
		return doc;
	},
	reactiveStore: function(reactiveId, keep) {
		if(!Tracker.currentComputation || (this._isFirstAutorun() && !keep)) this.clearReactive(reactiveId); //by default, old objects wont come back in the first autorun
		
    this._local_reactive = reactiveId;
		
		var doc = this.getMongoAttributes();
		if(!this._isStoreEqual(doc, reactiveId)) this._Session().set(reactiveId, doc);
	},
	
	
	clearReactive: function(reactiveId) {
		reactiveId = reactiveId || this._local_reactive;
		if(!reactiveId) return;
		
		reactiveId = reactiveId.replace(this._prefix(), ''); //remove prefix so clearReactive('some_id') can be called by client code
		reactiveId = this._prefixReactiveId(reactiveId);
		this._Session().set(reactiveId, null);
	},
	
	
	_isStoreEqual: function(doc, reactiveId) {
		return _.isEqual(doc, this._Session().get(reactiveId));
	},
	_prefixReactiveId: function(reactiveId) {
		var prefix = this._prefix();
		return prefix + reactiveId; 
	},
	_prefix: function() {
		return 'reactive_'+this.className+'_';
	},
	_isFirstAutorun: function() {
		return Tracker.currentComputation && Tracker.currentComputation.firstRun;
	},
	_Session: function() {
		return this.getNonSaveable('useCache') ? SessionStore : Session;
	},
	
	
	//EXPERIMENTAL FEATURE!!:
	_getLine: function(startLine) {
		var line;
	
		startLine = _.isNumber(startLine) ? startLine : 0;

		try {
			throw new Error;
		}
		catch(e) {
			var lines = e.stack.split('\n');
		
			line = lines[startLine+4] + lines[startLine+5] + lines[startLine+6];
			//identify object via calling code lines (backwards in stack), so we can store it and make it reactive
		}

		return line;
	}
});