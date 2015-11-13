 /**
	* @class
	* @locus Anywhere
	* @name Ultimate.Model
	* @summary Ultimate Model does stuff
	*
	* @overview 
	* ###Test 123
	* ######Dog
	*	```
	* var dog = 123
	* ```
	* ###Section 2 Mofo
	* ####Hello World H4 Title
	* bla ysdf sljkdf ljksdfjlk
	*/

UltimateModel = Ultimate('UltimateModel').extends(UltimateForm, {
	isModel: true,
	abstract: true,
	
 /**
	* @name construct
  * @summary constructor to used when create new models: `new Model(attributes)`
  * @locus Anywhere
  * @memberOf Ultimate.Model
	* @instance
	* @new true
	*
  * @param {Object} [attributes] - optional initial attributes to intantiate the object with
	*	@returns {Model} returns the new model
	*/
	construct: function(doc) {	
		if(this.___constructorCalled) return;
		
		this.extendWithDoc(doc);
		if(doc && doc._id) this.setOriginalDoc(doc);
		else this._originalDoc = {};
		
		if(!this._id) {
			this._id = Random.id();
			this.___isNewObject = true;
		}
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

	
 /**
  * @summary Main way of saving models
  * @locus Anywhere
  * @memberOf Ultimate.Model
	* @instance
	*
  * @param {String} [attributes] - object containing attributes and their values to save in addition to properties already assigned to the model since the last save.
  * @param {Function} [callback] - (Client Only) callback to be called with `error` and `result` parameters; same as calls to `collection.insert/update()`
	*
	*	@returns {Model} returns `this` for chaining
	*/
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
		if(this.___isNewObject) {
			delete this.___isNewObject;
			return this.insert(attributes, cb);
		}
		else return this.update(attributes, cb);
	},
	

	insert: function(attributes, cb) {
		if(_.isEmpty(attributes)) return this; //dont hit db if nothing to send it
		
		if(Meteor.isClient || cb) this._id = this.db().insert(attributes, this.refresh.bind(this, cb)); //asyncronous
		else {
			this._id = this.db().insert(attributes); //syncronous
			this.refresh();
		}
		
		return this;
	},
	update: function(attributes, cb) {
		delete attributes._id; //updates cant have _id
		if(_.isEmpty(attributes)) return this; //dont hit db if nothing to send it
		
		if(Meteor.isClient || cb) this.db().update(this._id, {$set: attributes}, this.refresh.bind(this, cb)); //asyncronous
		else {
			this.db().update(this._id, {$set: attributes}); //syncronous
			this.refresh();
		}
		
		return this;
	},
	
	//server only
	upsertSave: function(selector) {
		var id = this.class.upsert(selector, this.atts());
		if(_.isString(id)) this._id = id; //inserted

		//updated a different model than this one, so lets make this model that one
		//and make sure we have all its properties, particularly `_id`
		if(!this._id && id && id.numberAffected) { 
			var atts = this.class.findOne(selector).atts(true); //will exist since numberAffected > 0
			_.extend(this, atts);
			this.setOriginalDoc(atts);
		}
		
		_.extend(this, selector); //selector props are expected to be part of object, and may not be already	
		console.log("UPSERT RETURN", this._id, this.className, this.name);
		return this;
	},
	
 /**
  * @summary remove model
  * @locus Anywhere
  * @memberOf Ultimate.Model
	* @instance
	*
  * @param {Function} [callback] - (Client Only) callback to be called up with `error` and `result` parameters; same as calls to `collection.remove(this._id)`
	* @param {String} config.test bljkasf ljk
	* @param {String} config.animal Yo YO 123
	*
	*	@returns {Model} returns `this` for chaining
	*/
	remove: function(cb) {
		if(_.isFunction(cb)) cb = cb.bind(this);
		this.db().remove(this._id, cb);
	},
	refresh: function(cb, error, result){
		var doc = this.atts();
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
	isModel: true,
	
	onStartup: function() {
		if(!Meteor.isServer) return;
		
		var startData = UltimateUtilities.extract(this.prototype.startData, this.prototype);
		
		if(!_.isArray(startData) || this.find().count() > 0) return;

		startData.forEach(function(obj) {
			this.class.insert(obj);
		}, this);
	},
	
	
	toggleRemoveInsert: function(selector, client, callback) {	
		if(_.isFunction(client)) {
			callback = client;
			client = undefined;
		}
		
		if(_.isFunction(callback)) callback = callback.bind(this);
		
		let collection = client ? this.collection._collection : this.collection,
			oldModel, _id;
	
		if(oldModel = collection.findOne(selector)) return collection.remove(oldModel._id, callback);
		else {
			_id = collection.insert(selector, callback);
			selector = _.extend(selector, {_id: _id});
			return new this(selector);
		}

	}
});

Ultimate.Model = UltimateModel;