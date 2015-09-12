UltimateModel = Ultimate('UltimateModel').extends(UltimateForm, {
	isModel: true,
	abstract: true,
	
	construct: function(doc) {	
		if(this.___constructorCalled) return;
		
		this.extendWithDoc(doc);
		if(doc && doc._id) this.setOriginalDoc(doc);
		else this._originalDoc = {};
		
		this.___constructorCalled = true;
	},
	setOriginalDoc: function(newObj) {
		if(!this._local || Meteor.isServer) {
			this._originalDoc = newObj;
			
			_.each(newObj, function(val, prop) {
				if(_.isObject(val) && !_.isDate(val)) this._originalDoc[prop] = _.clone(newObj[prop]);
			}, this);
		}
	},

	
	db: function(local) {
		if(((this._local || this._not_persisted_yet) && Meteor.isClient) || local) return this.collection._collection;
		else return this.collection;
	},

	
	
	save: function(attVals, cb) {
		cb = this._extendAngGetCb(attVals, cb);
		
		if(this._local_reactive && !Meteor.isServer) return this.reactiveStore(this._local_reactive, true); //see: ultimate_form/reactive_methods.js
		
		var attributes = this.getMongoAttributesForSave();
		return this._upsert(attributes, cb);
	},
	_extendAngGetCb: function(attVals, cb) {
		if(cb) {
			_.extend(this, attVals);
			return cb;
		}
		else if(attVals) {
			if(_.isFunction(attVals)) return attVals; //attVals is cb
			else _.extend(this, attVals);
		}
	},
	
	
	_upsert: function(attributes, cb) {
		if(this._id) return this.update(attributes, cb);
		else return this.insert(attributes, cb);
	},
	insert: function(attributes, cb) {
		if(_.isEmpty(attributes)) return this; //dont hit db if nothing to send it
		
		if(Meteor.isClient || cb) this.db().insert(attributes, this.refresh.bind(this, cb)); //asyncronous
		else {
			this._id = this.db().insert(attributes); //syncronous
			this.refresh();
		}
		
		return this;
	},
	update: function(attributes, cb) {
		if(_.isEmpty(attributes)) return this; //dont hit db if nothing to send it
		
		if(Meteor.isClient || cb) this.db().update(this._id, {$set: attributes}, this.refresh.bind(this, cb)); //asyncronous
		else {
			this.db().update(this._id, {$set: attributes}); //syncronous
			this.refresh();
		}
		
		return this;
	},
	remove: function(cb) {
		this.db().remove(this._id, cb.bind(this));
	},
	refresh: function(cb, error, result){
		var doc = this.getAllMongoAttributes();
		this.setOriginalDoc(doc);
		
		if(cb) cb.call(this, error, result);
	},
	
	toggle: function(prop, cb) {
		this[prop] = !this[prop];
		this.save(cb);
		return this[prop];
	},
	set: function(prop, val, cb) { //used primarily to evoke reactivity for single property setting
		this[prop] = val;
		this.save(cb);
		return this;
	},
	get: function(prop) {
		return this[prop];
	}
}, {
	abstract: true,
	isModel: true
});