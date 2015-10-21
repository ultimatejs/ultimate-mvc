 /**
  * @summary Constructor for a Collection
	* @class
  */
	UltimateDog = Ultimate.createClass()

 /**
  * @summary test
	* @special config
	* @memberof dog
	*/

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

 /**
  * @summary Constructor for a Collection
  * @locus Anywhere
  * @instancename collection
  * @class
* @param {Object[]} employees - The employees who are responsible for the project.
 * @param {string} employees[].name - The name of an employee.
 * @param {string} employees[].department - The employee's department.
  * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection.
  * @param {Object} [options]
  * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#ddp_connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
  * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:
  - **`'STRING'`**: random strings
  - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values
 The default id generation technique is `'STRING'`.
  * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
  */
	db: function(local) {
		if(((this._local || this._not_persisted_yet) && Meteor.isClient) || local) return this.collection._collection;
		else return this.collection;
	},

	
 /**
  * @summary Constructor for a Collection
	* @property Lennon
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
		if(this._id) return this.update(attributes, cb);
		else return this.insert(attributes, cb);
	},
	
 /**
  * @summary Find the documents in a collection that match the selector.
	* @bla yo *sdf* `var = 23`  [`DDP.connect`](#ddp_connect) 
  * @param {Object} config.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#ddp_connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
  * @param {String} config.idGeneration The m
	* @param {String} config.idGeneration.dog The m
	* @param {String} config.idGeneration.cat The m
	*	@returns {Object} component.test Yada 69 `var dog = 123`
	* @param {(String|Number)} [selector=123] A query describing the documents to find
  */
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
		if(_.isEmpty(attributes)) return this; //dont hit db if nothing to send it
		
		if(Meteor.isClient || cb) this.db().update(this._id, {$set: attributes}, this.refresh.bind(this, cb)); //asyncronous
		else {
			this.db().update(this._id, {$set: attributes}); //syncronous
			this.refresh();
		}
		
		return this;
	},
	remove: function(cb) {
		if(_.isFunction(cb)) cb = cb.bind(this);
		this.db().remove(this._id, cb);
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
	isModel: true,
	
	onStartup: function() {
		if(!Meteor.isServer) return;
		
		var startData = UltimateUtilities.extract(this.prototype.startData, this.prototype);
		
		if(!_.isArray(startData) || this.find().count() > 0) return;

		startData.forEach(function(obj) {
			this.class.insert(obj);
		}, this);
	}
});

Ultimate.Model = UltimateModel;