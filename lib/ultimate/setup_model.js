_.extend(Ultimate, {
	combineModelConfigObjects: function(proto, methods) {
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
			else {
				collectionName = (this.className + 's').replace(/([A-Z])/g, '_$1').toLowerCase(); //pluralize + turn camel case to snake case to make collection name
				if(collectionName.charAt(0) === '_') collectionName = collectionName.substr(1);
			}
		}

		var collection, collectionObjectName;

		if(_.isObject(collectionName) && !_.isArray(collectionName)) collection = collectionName;
		else {
			if(_.isArray(collectionName)) {
				collectionObjectName = collectionName[0];
				collectionName = collectionName[1];
			}
			else { //if(_.isString(collectionName))
				var parts = collectionName.split('_'),
				  	collectionObjectName = '';

				_.each(parts, function(part) {
				  	collectionObjectName += part.capitalizeFirstLetter();
				});
			}

			if(Ultimate.globalScope[collectionObjectName]) collection = Ultimate.globalScope[collectionObjectName];
			else collection = Ultimate.globalScope[collectionObjectName] = new Meteor.Collection(collectionName);
		}

		this._assignCollection(collection, methods, collectionObjectName);
		this._overrideInsertMethod(collection, this.class.className);

		if(this.parent.collectionName && this.parent.collectionName != this.class.collectionName) {
			this.setupHooks(this.parent.prototype, this.class.prototype); //make sure hooks from possible parent models (which have different collections) are added too
		}
	},
	_assignCollection: function(collection, methods, collectionObjectName) {
		this.class.collectionName = collection._name;
		this.class.prototype.collectionName = collection._name;
		
		this.class.prototype.___collectionObjectName = collectionObjectName || collection._name.split('_').map(function(w) { return w.capitalizeFirstLetter(); }).join(''); //the latter is for the rare case that a full collection is provided, in which case all we can do is camelcase-ify its collection name
		
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
			//where the same collection is used, whereas Collection.insert cannot. Will be documented to
			//use Class.insert for such inheritance situations.
			if(!doc.className) doc.className = className; 
			//NOTE THE ORIGINAL COLLECTION WILL END UP INCORRECTLY USING CHILD CLASSNAMES ON INSERT(), 
			//SO THE INITIAL PARENT SHOULD USE INSERT() FROM THE MODEL CLASS VAR INSTEAD OF THE COLLECTION VAR; 
			//THE REASON WE EVEN HAVE THIS IS JUST SO CLASSNAME IS STORED FOR THE COMMON CASE WHERE 
			//PEOPLE HAVE A SINGLE PARENT AND USE INSERT() OFF THE COLLECITON STILL
			
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
		
		this.setupAutofilledFields();

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
		var onName = 'on'+name.capitalizeFirstLetter();
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
	
	
	_sluggify: function(title) {
		return title.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
	},
	setupAutofilledFields: function() {
		if(this._shouldNotAddHook('autofilledFields')) return;

		var sluggify = this.hookMethods.sluggify,
			titleKey = _.isArray(sluggify) ? sluggify[0] : sluggify,
			slugKey = _.isArray(sluggify) ? sluggify[1] : 'slug',
			self = this;
		
		
		this.collection.before.insert(function(userId, doc) {
			if(Meteor.isClient) return;
			doc.created_at = doc.updated_at = new Date;
			
			//automatically generate slug from sluggify: ['titleKey', 'slugKey']
			if(sluggify && doc[titleKey]) {
				doc[slugKey] =  self._sluggify(doc[titleKey]);
			}
			
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
			
			
			//setup slug updates
			if(sluggify && modifier.$set[titleKey]) { 
				modifier.$set[slugKey] =  self._sluggify(modifier.$set[titleKey]);
			}
		});
		
		this.collection.before.upsert(function(userId, selector, mutator) {
			if(Meteor.isClient) return;

			//setup slug upserts
			if(sluggify && mutator[titleKey]) { 
				mutator[slugKey] = self._sluggify(mutator[titleKey]);
			}
			
			//setup datetime upserts
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
		if(this._addEventHandler('beforeInsert')) return; //only setup event handlers once per event, since any others will be handled by below code

		var newFunc = function(userId, doc) {
			var model = this.transform();	 
			model.emit.apply(model, ['beforeInsert', userId, this]);
			
			//delete props and replace so Collection Hooks thinks its the same object, which it is
			for(var prop in doc) {
				delete doc[prop];	
			}
			_.extend(doc, model.getMongoAttributesForSave());
		};

		this.collection.before.insert(newFunc);
	},
	onBeforeUpdate: function() {
		if(this._addEventHandler('beforeUpdate')) return;
		
		var newFunc = function(userId, doc, fieldNames, modifier, options) {
			//if(doc._local || modifier._local) return; //likely not the right idea. should trigger callbacks even purely on client
		
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