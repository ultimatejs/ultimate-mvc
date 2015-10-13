_.extend(Ultimate, {
	combineModelConfigObjects: function(proto, methods) {
		if(proto.className == 'Kid') {
			console.log('IM!');
		}
		if(proto.subscriptions && methods.subscriptions) methods.subscriptions = _.extend({}, proto.subscriptions, methods.subscriptions);
		if(proto.relations && methods.relations) methods.relations = _.extend({}, proto.relations, methods.relations);
		if(proto.aggregates && methods.aggregates) methods.aggregates = _.extend({}, proto.aggregates, methods.aggregates);
	},
	setupModel: function(methods) {
  	this.createClassMethods(this.class);

		var collectionName = methods.collection;

		if(!collectionName) {
			if(this.parent.className == 'UltimateUser') {
				collectionName = methods.collection = Meteor.users; //make sure it has wrapped collection class from hooks
			}
			else if(this.parent.prototype.collection) {
				this.class.collection =  methods.collection = this.parent.prototype.collection; //class .collection already inherited on class is broken by UltimateClone.deepClone
				return; //class will use parent's collection
			} 
			else collectionName = (this.className + 's').toLowerCase(); //pluralize + lowercase model name to make collection name
		}

		var collection;

		if(_.isObject(collectionName) && !_.isArray(collectionName)) collection = collectionName;
		else {
			if(_.isArray(collectionName)) {
				var collectionObjectName = collectionName[0];
				collectionName = collectionName[1];
			}
			else { //if(_.isString(collectionName))
				var parts = collectionName.split('_'),
				  	collectionObjectName = '';

				_.each(parts, function(part) {
				  	collectionObjectName += part.capitalizeOnlyFirstLetter();
				});
			}

			if(Ultimate.globalScope[collectionObjectName]) collection = Ultimate.globalScope[collectionObjectName];
			else collection = Ultimate.globalScope[collectionObjectName] = new Meteor.Collection(collectionName);
			//eval(collectionObjectName + ' = new Meteor.Collection(' + collectionName + ')'); //assign collection within package scope
		}

		this._assignCollection(collection, methods);
		this._overrideInsertMethod(collection, this.class.className);

		if(this.parent.collectionName && this.parent.collectionName != this.class.collectionName) {
			this.setupHooks(this.parent.prototype, this.class.prototype); //make sure hooks from possible parent models (which have different collections) are added too
		}
	},
	_assignCollection: function(collection, methods) {
		this.class.collectionName = collection._name;
		this.class.prototype.collectionName = collection._name;

		methods.collection = this.collection = this.class.collection = this.class.prototype.collection = collection; //methods and this need collection for upcoming work
		Ultimate.collections[collection._name] = collection;

		var Class = this.class;

		collection._transform = function(doc) {
		  return doc.className ? new Ultimate.classes[doc.className](doc) : new Class(doc);
		};
	},
	_overrideInsertMethod: function(collection, className) {
		var oldInsert = collection.insert,
			oldUpsert = collection.upsert;

		collection.insert = function(doc, callback) {
			//doc.className will exist if assigned by Class.insert, which handles inheritance 
			//where the same collection is used, where is Collection.insert cannot. Will be documented to
			//use Class.insert for such inheritance situations.
			if(!doc.className) doc.className = className; 
			return oldInsert.call(collection, doc, callback);
		};

		collection.upsert = function(selector, mutator, options, callback) {
			if(!mutator.className && (!mutator.$set || !mutator.$set.className)) {
				if(!UltimateUtilities.hasMongoOperator(mutator)) {
					var $set = _.extend({}, mutator);
					for(var prop in mutator) delete mutator[prop];
					mutator.$set = $set; //assign doc to $set, so we can use mutator as a modifier
				}
				if(!mutator.$set) mutator.$set = {}; //just in case another operator other than $set triggered above code
				_.extend(mutator.$set, {className: className}); //and we therefore need to add $set
			}
			
			return oldUpsert.call(collection, selector, mutator, options, callback);
		};
	},
	createClassMethods: function(Class) {
		Class.find = function(selector, options) {
			if(!selector) selector = {};
			else selector = _.isObject(selector) && !selector._str ? selector : {_id: selector};
			selector.className = Class.className;

			return Class.collection.find(selector, options);
		};

		Class.findOne = function(selector, options) {
			if(!selector) selector = {};
			else selector = _.isObject(selector) && !selector._str ? selector : {_id: selector};
			selector.className = Class.className;

			return Class.collection.findOne(selector, options);
		};
		
		Class.insert = function(doc) {
			doc.className = Class.className; //doc modified in arguments object by reference of course
			return Class.collection.insert.apply(Class.collection, arguments);
		};
		
		Class.upsert = function(selector, mutator) {
			if(!UltimateUtilities.hasMongoOperator(mutator)) {
				var $set = _.extend({}, mutator);
				for(var prop in mutator) delete mutator[prop];
				mutator.$set = $set; //assign doc to $set, so we can use mutator as a modifier
			}
			
			if(!mutator.$set) mutator.$set = {}; //maybe had a modifier, but not $set
			_.extend(mutator.$set, {className: Class.className}); //we need $set to assign className
			
			return Class.collection.upsert.apply(Class.collection, arguments);
		};
		
		Class.update = function() {
			return Class.collection.update.apply(Class.collection, arguments);
		};
		
		Class.remove = function() {
			return Class.collection.remove.apply(Class.collection, arguments);
		};
	},


	setupHooks: function(methods, proto) {
		this.hookMethods = methods; //methods may come from methods map or parent.prototype
		this.hookProto = proto || this.proto; //proto may be standard proto or supplied by Behavior
		
		this.setupDatetimes();

		if(methods.onBeforeInsert) this.onBeforeInsert();
		if(methods.onBeforeUpdate) this.onBeforeUpdate();
		if(methods.onBeforeRemove) this.onBeforeRemove();
		if(methods.onAfterInsert) this.onAfterInsert();
		if(methods.onAfterUpdate) this.onAfterUpdate();
		if(methods.onAfterRemove) this.onAfterRemove();
		
		if(methods.onAfterFindOne) this.onAfterFindOne();
		if(methods.onBeforeFind) this.onBeforeFind();
		if(methods.onAfterFind) this.onAfterFind();
		if(methods.onBeforeFindOne) this.onBeforeFindOne();
	
		if(methods.validateOnInsert) this.validateInsert();
		if(methods.validateOnUpdate) this.validateUpdate();
		
		delete this.hookMethods;
		delete this.hookProto;
	},
	
	
	_addEventHandler: function(name) {
		//eg: this.hookProto.on('beforeInsert', methods.onBeforeInsert)
		var onName = 'on'+name.capitalizeOnlyFirstLetter();
		this.hookProto.on(name, this.hookMethods[onName]); //the value of methods[onName] could be  simply `true` so that the event is emitted for later-attached handlers
		
		//delete this.hookProto[onName]; //this prevented inheritance. i forget why i event put this here. probably not needed anymore, but we'll see..
		
		return this._shouldNotAddHook(name);
	},
	_shouldNotAddHook: function(name) {
		var addedHooks = this.hookProto.hasOwnProperty('___addedHooks') ? this.hookProto.___addedHooks : {},
			shouldNotAddHook = addedHooks[name]; //only add the hook once, the first time

		addedHooks[name] = true;
		this.hookProto.___addedHooks = addedHooks;
		return shouldNotAddHook;
	},
	
	
	setupDatetimes: function() {
		if(this._shouldNotAddHook('datetimes')) return;

		this.collection.before.insert(function(userId, doc) {
			if(Meteor.isClient) return;
			doc.created_at = doc.updated_at = new Date;
		});

		this.collection.before.update(function(userId, doc, fieldNames, modifier) {
			if(Meteor.isClient) return;

			if(!UltimateUtilities.hasMongoOperator(modifier)) {
				var $set = _.extend({}, modifier);
				for(var prop in modifier) delete modifier[prop];
				modifier.$set = $set; //assign doc to $set, so we can use mutator as a modifier
			}
			
			if(!modifier.$set) modifier.$set = {}; //just in case another operator other than $set triggered above code

			modifier.$set.updated_at = new Date; //now we can set updated_at without losing fields or operator objects
		});
		
		this.collection.before.upsert(function(userId, selector, mutator) {
			if(Meteor.isClient) return;

			if(!UltimateUtilities.hasMongoOperator(mutator)) {
				var $set = _.extend({}, mutator);
				for(var prop in mutator) delete mutator[prop];
				mutator.$set = $set; //assign doc to $set, so we can use mutator as a modifier
			}
			
			if(!mutator.$set) mutator.$set = {}; //in case no $set was provided (but other mongo operators were)
			_.extend(mutator.$set, {updated_at: new Date});

			if(!mutator.$setOnInsert) mutator.$setOnInsert = {};
			_.extend(mutator.$setOnInsert, {created_at: new Date});	
		});
	},
	onBeforeInsert: function() {
		if(this._addEventHandler('beforeInsert')) return;

		var newFunc = function(userId, doc) {
			var model = this.transform();	 
			model.emit.apply(model, ['beforeInsert', userId, this]);
			

			for(var prop in doc) {
				if(prop != '_id') delete doc[prop];	
			}
			_.extend(doc, model.getMongoAttributesForSave());

			if(!doc._id) doc._id = Random.id(); //may not not be needed anymore -- client side, gotta assign an ID so meteor-collection-hooks doesn't sign a Mongo.objectID, which isnt compatible
		};

		this.collection.before.insert(newFunc);
	},
	onBeforeUpdate: function() {
		if(this._addEventHandler('beforeUpdate')) return;
		
		var newFunc = function(userId, doc, fieldNames, modifier, options) {
			if(doc._local || modifier._local) return; 
		
			var model = this.transform();		
			_.extend(model, modifier.$set);

			model.emit.apply(model, ['beforeUpdate', userId, this, fieldNames, modifier, options]);
			modifier.$set = model.getMongoAttributesForSave();
		};

		this.collection.before.update(newFunc);
	},
	onBeforeRemove: function() {
		if(this._addEventHandler('beforeRemove')) return;
		
		var newFunc = function(userId, doc) {
			var model = this.transform();		
			model.emit.apply(model, ['beforeRemove', userId, this]);
		};

		this.collection.before.remove(newFunc);
	},
	onAfterInsert: function() {
		if(this._addEventHandler('afterInsert')) return;
		
		var newFunc = function(userId, doc) {
			var model = this.transform();	
			console.log("AFTER INSERT", model._id, this._id);	
			model.emit.apply(model, ['afterInsert', userId, this]);
		};

		this.collection.after.insert(newFunc);
	},
	onAfterUpdate: function() {
		if(this._addEventHandler('afterUpdate')) return;
		
		var newFunc = function(userId, doc, fieldNames, modifier, options) {
			var model = this.transform();		
			model.emit.apply(model, ['afterUpdate', userId, this, fieldNames, modifier, options]);
		};

		this.collection.after.update(newFunc);
	},
	onAfterRemove: function() {
		if(this._addEventHandler('afterRemove')) return;
		
		var newFunc = function(userId, doc) {
			var model = this.transform();		
			model.emit.apply(model, ['afterRemove', userId, this]);
		};

		this.collection.after.remove(newFunc);
	},
	
	
	onBeforeFindOne: function() {
		if(this._addEventHandler('beforeFindOne')) return;
		
		var model = this.hookProto;
		
		var newFunc = function(userId, selector, options) {
			model.emit.apply(model, ['beforeFindOne', userId, selector, options, this]);
		};
		
		this.collection.before.findOne(newFunc);		
	},
	onAfterFindOne: function() {
		if(this._addEventHandler('affterFindOne')) return;
		
		var newFunc = function(userId, selector, options, doc) {
			var model = this.tansform ? this.transform(doc) : new Ultimate.classes[doc.className](doc);
			model.emit.apply(model, ['afterFindOne', userId, selector, options, this]);
		};
	
		this.collection.after.findOne(newFunc);
	},
	
	
	onBeforeFind: function() {
		if(this._addEventHandler('beforeFind')) return;
		
		var model = this.hookProto;
		
		var newFunc = function(userId, selector, options) {
			model.emit.apply(model, ['beforeFind', userId, selector, options, this]);
		};
		
		this.collection.before.find(newFunc);
	},
	onAfterFind: function() {
		if(this._addEventHandler('afterFind')) return;
		
		var model = this.hookProto;
		
		var newFunc = function(userId, selector, options, cursor) {
			model.emit.apply(model, ['afterFind', userId, selector, options, cursor, this]);
		};
		
		this.collection.after.find(newFunc);		
	},
	
	
	validateInsert: function() {
		if(this._shouldNotAddHook('validateOnInsert')) return;
		
		var newFunc = function() {
			var model = this.transform(),
				errors = model.isValidMultipleForms(model.validateOnInsert); //array of forms to validate
			
			if(!_.isEmpty(errors[0])) throw new Meteor.Error('invalid-insert', errors.join('\n'));		
		};
		
		this.collection.before.insert(newFunc);
	},
	validateUpdate: function() {
		if(this._shouldNotAddHook('validateOnUpdate')) return;
		
		var newFunc = function() {
			var model = this.transform(),
				errors = model.isValidMultipleForms(model.validateOnUpdate); //array of forms to validate
		
			if(!_.isEmpty(errors[0])) throw new Meteor.Error('invalid-update', errors.join('\n'));	
		};
		
		this.collection.before.update(newFunc);
	}
});