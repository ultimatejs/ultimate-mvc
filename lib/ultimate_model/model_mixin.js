Ultimate('UltimateSetupModel').extends({
	abstract: true,
	mixinTo: ['UltimateModel'],
	config: ['permissions', 'startData', 'sluggify', 'collectionName', 'tableName'],
	
	onAddMethods: function(methods) {
		if(this.owner().className == 'UltimateModel') return;
		
		this._setupModel(methods);
		this._setupModelPermissions(methods.permissions);
	},


	_setupModel: function(methods) {
		if(this.owner().hasOwnProperty('collection')) return; //model already setup;
		
		var owner = this.owner(),
			collectionName = methods.collectionName,
			tableName = methods.tableName,
			collectionInherited = false,
			collection;


		if(_.isPureObject(collectionName)) { 								//A. already-created Collection object provided (not recommended)
			collection = collectionName;
			collectionName = collection._name.capitalizeFirstLetter();
			Ultimate.globalScope[collectionName] = collection; //put in global scope to be consistent /w others below
		}
		else if(owner.parent.className == 'UltimateUser') { 	//B. is a special case where Meteor.users collection created already
			collection = methods.collection = Meteor.users; 
			collectionName = collectionName || owner.className + 's'; //usually 'Users'
			//note: `collectionInherited` stays `false` so inherited model can override collection mdethods
		}
		else {
			if(!collectionName && !tableName) { 							//C. collection automatically generated
				if(owner.parent.collection) { 										//C1.collection inherited
					collection = owner.parent.collection;
					collectionName = owner.parent.___collectionName;
					collectionInherited = true;
				} 
				else { 			
					var name = owner.className;																		//C2. MAIN CASE: new collection generated based on class name
					name = name.charAt(name.length - 1) == 'y' ? name.substr(0, name.length - 1) + 'ies' : name+'s';
					collectionName = this._toCamelCase(name);
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
		this._overrideMethods(collection, owner.className, collectionInherited, methods.sluggify);
		this._createClassMethods(owner.class, methods.sluggify);
	},
	_toCamelCase: function(str) {
		return str.replace(/(\_\w)/g, function(m){ return m[1].toUpperCase(); }).capitalizeFirstLetter();
	},
	_toSnakeCase: function(str) {
		str = str.replace(/([A-Z])/g, '_$1').toLowerCase();
		return str.charAt(0) === '_' ? str.substr(1) : str;
	},
	_assignCollection: function(collection, methods, collectionName) {
		var owner = this.owner();
		
		owner.___tableName = owner.class.___tableName = collection._name;
		owner.___collectionName = owner.class.___collectionName = collectionName || this._toCamelCase(collection._name); //the latter is for the rare case that a full collection is provided, in which case all we can do is camelcase-ify its collection name
		owner.collection = owner.class.collection = collection; 
		
		Ultimate.collections[collection._name] = collection;

		var Class = owner.class;

		collection._transform = function(doc) {
		  return doc.className ? new Ultimate.classes[doc.className](doc) : new Class(doc); //dependent on `className` prop for use in inherited models
		};
	},
	
	_sluggify: function(title) {
		return title.toLowerCase().trim().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
	},
	_hasOperator: function(modifier) {
		return !!_.reduce(_.keys(modifier), function(acc, num) { 
			return (num.indexOf('$') === 0 ? 1 : 0) + acc;
		}, 0);
	},
	_overrideMethods: function(collection, className, collectionInherited, sluggify) {
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
			if(sluggify && doc[sluggify]) doc.slug =  doc.slug || self._sluggify(doc[sluggify]);
			
			return oldInsert.call(collection, doc, callback);
		};

		collection.update = function(selector, modifier, options, callback) {
			if(_.isFunction(options)) {
				callback = options;
				options = null;
			}
			
			if(_.isObject(modifier)) { //the below stuff will cause errors if operating on a possibly accidentally null modifier
				if(!self._hasOperator(modifier)) { //modifier already contains
					modifier.created_at = modifier.updated_at = new Date;
					if(sluggify && modifier[sluggify]) modifier.slug = modifier.slug || self._sluggify(modifier[sluggify]);
				}
				else { //$set or other mongo operators are being used (THIS IS STANDARD BEHAVIOR)
					modifier.$set = _.extend({}, modifier.$set, {updated_at: new Date}); //assign $set in case it wasnt used (it must be in all updates)
					if(sluggify && modifier.$set[sluggify]) modifier.$set.slug =  modifier.$set.slug || self._sluggify(modifier.$set[sluggify]);
				}
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
				if(sluggify && mutator[sluggify]) mutator.slug =  mutator.slug || self._sluggify(mutator[sluggify]);
			}
			else {
				mutator.$set = _.extend({}, mutator.$set, {updated_at: new Date, className: klassName});
				mutator.$setOnInsert = _.extend({}, mutator.$setOnInsert, {created_at: new Date});	
				if(sluggify && mutator.$set[sluggify]) mutator.$set.slug =  mutator.$set.slug || self._sluggify(mutator.$set[sluggify]);
			}
			
			return oldUpsert.call(collection, selector, mutator, options, callback);
		};
	},
	
	
	_createClassMethods: function(Class, sluggify) {
		var self = this;
		
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
			if(sluggify &&  doc[sluggify]) doc[sluggify] = self._sluggify(doc[sluggify]); //do it here in addition to main collection override so that inherited sluggifies are used instead
			
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
			
			if(sluggify && mutator.$set && mutator.$set[sluggify]) mutator.$set[sluggify] = self._sluggify(mutator.$set[sluggify]); //same reason as on insert
			
			return Class.collection.upsert.apply(Class.collection, arguments);
		};
		
		Class.update = function(selector, modifier, options, callback) {
			if(sluggify && modifier[sluggify]) modifier[sluggify] = self._sluggify(modifier[sluggify]);
			else if(sluggify && modifier.$set && modifier.$set[sluggify]) modifier.$set[sluggify] = self._sluggify(modifier.$set[sluggify]); //same reason as on insert
			
			return Class.collection.update.apply(Class.collection, arguments);
		};
		
		Class.remove = function() {
			return Class.collection.remove.apply(Class.collection, arguments);
		};
	},
	
	
	_collectionAllowMethods: ['update', 'insert', 'remove', 'fetch', 'transform', 'allowUpdate', 'allowInsert', 'allowRemove', 'allowFetch', 'allowTransform'],
	_collectionDenyMethods: ['denyUpdate', 'denyInsert', 'denyFetch', 'denyRemove', 'denyTransform'],
	
	_setupModelPermissions: function(permissions) {
		if(!permissions) return;
		var owner = this.owner();
		
		var allowMethods = _.pickAndBind(permissions, this._collectionAllowMethods, this),
			denyMethods = _.pickAndBind(permissions, this._collectionDenyMethods, this);

		this._replacePrefix(allowMethods, 'allow');
		this._replacePrefix(denyMethods, 'deny');
		
		owner.collection.allow(allowMethods);
		owner.collection.deny(denyMethods);
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