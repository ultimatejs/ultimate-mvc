Ultimate('UltimateSetupModel').extends({
	abstract: true,
	mixinTo: ['UltimateModel'],
	config: ['permissions', 'subscriptions', 'relations', 'aggregates', 'startData', 'sluggify', 'collection', 'tableName'],
	
	onAddMethods: function(methods) {
		if((methods.abstract || this.isAbstract()) && !/UltimateUser/.test(this.className)) return;
		
		this.setupModel(methods);
		this.setupModelPermissions(methods.permissions);
	},


	setupModel: function(methods) {
		if(this.hasOwnProperty('collection')) return; //model already setup;

		var collectionName = methods.collection,
			tableName = methods.tableName,
			collectionInherited = false,
			collection;


		if(_.isPureObject(collectionName)) { 								//A. already-created Collection object provided (not recommended)
			collection = collectionName;
			collectionName = collection._name;
			Ultimate.globalScope[collection._name] = collection; //put in global scope to be consistent /w others below
		}
		else if(this.parent.className == 'UltimateUser') { 	//B. is a special case where Meteor.users collection created already
			collection = methods.collection = Meteor.users; 
			collectionName = 'Users';
			collectionInherited = true;
		}
		else {
			if(!collectionName && !tableName) { 							//C. collection automatically generated
				if(this.parent.collection) { 										//C1.collection inherited
					collectionName = collection._name;
					collectionInherited = true;
				} 
				else { 																					//C2. MAIN CASE: new collection generated based on class name
					collectionName = this._toCamelCase(this.className+'s');
					tableName = this._toSnakeCase(collectionName);
				}
			}
			else { 																						//D. SPECIALIZED CASE: user provides either collectionName or tableName; the missing one is generated
				if(!collectionName) collectionName = this._toCamelCase(tableName);
				else if(!tableName) tableName = this._toSnakeCase(collectionName);
			}
			
			if(collectionInherited) collection = Ultimate.globalScope[collectionName]; //grab inherited collection
			else if(collectionName) collection = Ultimate.globalScope[collectionName] = new Meteor.Collection(tableName); //create new collection
		}
		
		
		this._assignCollection(collection, methods, collectionName);
		this._overrideInsertMethod(collection, this.class.className, collectionInherited, methods.sluggify);
		this.createClassMethods(this.class);
		
		
		if(this.parent.collectionName && this.parent.collectionName != this.class.collectionName) {
			//this.setupHooks(this.parent, this.class.prototype); //make sure hooks from possible parent models (which have different collections) are added too
		}
	},
	_toCamelCase: function(str) {
		return str.replace(/(\_\w)/g, function(m){ return m[1].toUpperCase(); }).capitalizeFirstLetter();
	},
	_toSnakeCase: function(str) {
		str = str.replace(/([A-Z])/g, '_$1').toLowerCase();
		return str.charAt(0) === '_' ? str.substr(1) : str;
	},
	_assignCollection: function(collection, methods, collectionName) {
		this.___tableName = this.class.___tableName = collection._name;
		this.___collectionName = this.class.___collectionName = collectionName || this._toCamelCase(collection._name); //the latter is for the rare case that a full collection is provided, in which case all we can do is camelcase-ify its collection name
		this.collection = this.class.collection = methods.collection = collection; //`methods.collection` need collection overriden so provided collection string doesnt get assigned to prototype when methods adding process is one
		
		Ultimate.collections[collection._name] = collection;

		var Class = this.class;

		collection._transform = function(doc) {
		  return doc.className ? new Ultimate.classes[doc.className](doc) : new Class(doc); //major dependency on `className`!
		};
	},
	
	_sluggify: function(title) {
		return title.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
	},
	_hasOperator: function(modifier) {
		return !!_.reduce(_.keys(modifier), function(acc, num) { 
			return (num.indexOf('$') === 0 ? 1 : 0) + acc;
		}, 0);
	},
	_overrideInsertMethod: function(collection, className, collectionInherited, sluggify) {
		if(collectionInherited) return; //first class utilizing collection designates overrides
		
		var oldInsert = collection.insert,
			oldUpdate = collection.update,
			oldUpsert = collection.upsert,
			self = this;		
			
		collection.insert = function(doc, callback) {
			//NOTE: ONLY THE ORIGINAL COLLECTION WILL CORRECTLY USIE ITS CLASSNAME ON INSERT().
			//SO CHILD CLASSES SHOULD USE INSERT() FROM THE MODEL CLASS VAR INSTEAD OF THE COLLECTION VAR.
			
			//doc.className will exist because its assigned by `Class.insert`, whereas `Collection.insert` cannot
			//reliably do this for all potential child classes. This is why we promoted the sole use of `Class.insert`. 
			//`Collection.insert` is just a convenience for the common use case of no inheritance + usage of raw Collection objects! 
			 
			if(!doc.className) doc.className = className; //`doc.className` will be assigned in `Model.insert` collection directly called
			
			doc.created_at = doc.updated_at = new Date;
			if(sluggify && doc[sluggify]) doc.slug =  self._sluggify(doc[sluggify]);
			
			return oldInsert.call(collection, doc, callback);
		};

		collection.update = function(selector, modifier, options, callback) {
			if(_.isFunction(options)) {
				callback = options;
				options = null;
			}
			
			if(!self._hasOperator(modifier)) {
				modifier.created_at = modifier.updated_at = new Date;
				if(sluggify && modifier[sluggify]) modifier.slug =  self._sluggify(modifier[sluggify]);
			}
			else {
				modifier.$set = _.extend({}, modifier.$set, {updated_at: new Date});
				if(sluggify && modifier.$set[sluggify]) modifier.$set.slug =  self._sluggify(modifier.$set[sluggify]);
			}
			
			return oldUpdate.call(collection, selector, modifier, options, callback);
		}
		
		//same as INSERT but for UPSERT:
		collection.upsert = function(selector, mutator, options, callback) {
			if(_.isFunction(options)) {
				callback = options;
				options = null;
			}
			
			//get className passed from `Model.upsert` in the doc || $set || or use className from parent Model that created collection
			var klassName = mutator.className || (mutator.$set && mutator.$set.className) || className;
			 
			
			if(!self._hasOperator(mutator)) {
				mutator.created_at = mutator.updated_at = new Date; //`created_at` wont be official created at in updates, but then again, its basically a new doc if they are replacing all fields
				mutator.className = klassName;
				if(sluggify && mutator[sluggify]) mutator.slug =  self._sluggify(mutator[sluggify]);
			}
			else {
				mutator.$set = _.extend({}, mutator.$set, {updated_at: new Date, className: klassName});
				mutator.$setOnInsert = _.extend({}, mutator.$setOnInsert, {created_at: new Date});	
				if(sluggify && mutator.$set[sluggify]) mutator.$set.slug =  self._sluggify(mutator.$set[sluggify]);
			}
			
			return oldUpsert.call(collection, selector, mutator, options, callback);
		};
	},
	
	
	createClassMethods: function(Class) {
		self = this;
		
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
			if(!self._hasOperator(mutator)) {
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
	
	
	_collectionAllowMethods: ['update', 'insert', 'remove', 'fetch', 'transform', 'allowUpdate', 'allowInsert', 'allowRemove', 'allowFetch', 'allowTransform'],
	_collectionDenyMethods: ['denyUpdate', 'denyInsert', 'denyFetch', 'denyRemove', 'denyTransform'],
	
	setupModelPermissions: function(permissions) {
		if(!permissions) return;
		
		var allowMethods = _.pickAndBind(permissions, this._collectionAllowMethods, this),
			denyMethods = _.pickAndBind(permissions, this._collectionDenyMethods, this);

		this._replacePrefix(allowMethods, 'allow');
		this._replacePrefix(denyMethods, 'deny');
		
		this.collection.allow(allowMethods);
		this.collection.deny(denyMethods);
	},


	_replacePrefix: function(methods, prefix) {
		_.each(methods, function(func, name) {
			if(name.indexOf(prefix === 0)) {
				delete methods[name];
				name = name.replace(prefix, '').toLowerCase();
				methods[name] = func;
			}
		});
	}
});