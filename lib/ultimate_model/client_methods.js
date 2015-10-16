UltimateModel.extendClient({
	store: function(attVals, cb) {
		this._not_persisted_yet = true; //makes this.db() use local client side this.collection._collection, even after stored to the client db, but not after persisted
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
	
	
	//saved to the client temporarily, but when the model is eventually saved (or persisted) to the server, these props will save.
	//see sessionSet below to see props that will never save to the server db
	saveClient: function(attVals, cb) {
		//this._local has different characteristics than this._not_perisisted_yet.
		//the this._local property wont save, whereas the this._not_perisisted_yet will save in the 
		//local db until persisted, triggering the future models returned from find() to be stored locally until persisted
		this._local = true; 
		var ret = this.save(attVals, cb);
		this._local = false;
		return ret;
	},
	toggleClient: function(prop, val, cb) {
		this._local = true; 
		this.toggle(prop, cb);
		this._local = false;
		return this[prop];
	},
	setClient: function(prop, val, cb) {
		this._local = true; 
		this.set(prop, val, cb);
		this._local = false;
		return this;
	},
	
	//flags cant EVER be saved to the server db (EVEN IF PERSISTED), but can be saved to the client db
	sessionSet: function(prop, val, cb) {
		prop = '__client_session__'+prop; 
		this._local = true; 
		this.set(prop, val, cb);
		this._local = false;
		return this;
	},
	sessionGet: function(prop) {
		return this['__client_session__'+prop];
	}
});