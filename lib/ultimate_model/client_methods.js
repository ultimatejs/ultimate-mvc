UltimateModel.extendClient({
	store: function(attVals, cb) {
		this._not_persisted_yet = true; //makes this.db() use local client side this.collection._collection
		return this.save(attVals, cb);
	},
	persist: function(attVals, cb) {
		cb = this._extendAngGetCb(attVals, cb);
			
		delete this._local_reactive; //all calls to save() won't store properties in session var going forward
		delete this._local; //all calls to save() will save to the server going forward
		delete this._not_persisted_yet;
		
		var atts = this.getMongoAttributesForPersist();
		this.dbClient().remove(atts._id); //delete client-only model, so we can create a new client-server model to replace it
		
		return this.insert(atts, cb);
	},
	
	
	dbClient: function() {
		return this.db(true);
	},
	
	
	saveClient: function(attVals, cb) {
		this._local = true; //has different characteristics than this._not_perisisted yet -- _local = true wont be saved at all
		var ret = this.save(attVals, cb);
		this._local = false;
		return ret;
	},
	toggleClient: function(prop, val) {
		this._local = true; 
		this.toggle(prop);
		this._local = false;
		return this[prop];
	},
	setClient: function(prop, val) {
		this._local = true; 
		this.set(prop, val);
		this._local = false;
		return this;
	},
	
	//flags cant be saved to the server db, but can be saved to the client db
	sessionSet: function(prop, val) {
		prop = '__client_session__'+prop; 
		this._local = true; 
		this.set(prop, val);
		this._local = false;
		return this;
	},
	sessionGet: function(prop) {
		return this['__client_session__'+prop];
	}
});