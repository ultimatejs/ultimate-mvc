UltimateForm.extend({
	_deniedAttributeRegex: /^(_originalDoc|_id|errors|collection|_schema|_forms|__type|parent|component|wizard|_owner|behaviors|_behaviors|_listeners)$/,
	
	atts: function(noId) {
		var includeId = true;
		if(noId === false) includeId = null;
		
		return this.getMongoAttributes(includeId, null, null, null);
	},
	
	getMongoAttributesForSave: function() {
		return this.getMongoAttributes(true, null, true);
	},
	getMongoAttributesForPersist: function() {
		return this.getMongoAttributes(true, null, null, true);
	},
	getAllMongoAttributes: function() {
		return this.getMongoAttributes(true, null, null, null);
	},
	getAllMongoAttributesNoId: function() {
		return this.getMongoAttributes(null, null, null, null);
	},
	getAllMongoAttributesIncludingClassName: function() {
		return this.getMongoAttributes(true, null, null, true);
	},


	getMongoAttributes: function(includeId, subObject, preparingForSave, isPersisting) {
		var mongoValues = {},
			obj = subObject || this;
		
		for(var prop in obj) {
			if(this.isMongoAttribute(obj, prop, preparingForSave, isPersisting)) {
				
				if(_.isObject(obj[prop]) && !_.isDate(obj[prop]) && !_.isArray(obj[prop])) {
					if(!preparingForSave || !obj._originalDoc) mongoValues[prop] = this.getMongoAttributes(null, obj[prop], preparingForSave);
					else {
						var resolvedDoc = this.getMongoAttributes(null, obj[prop]),
							resolvedOriginalDoc = this.getMongoAttributes(null, obj._originalDoc[prop]);

						if(_.isEqual(resolvedDoc, resolvedOriginalDoc)) continue; //dont save old att/vals
						else mongoValues[prop] = this.getMongoAttributes(null, obj[prop], preparingForSave); //should be optimized to only save changed fields, not entire sub-doc
					}
				}
		      	else mongoValues[prop] = obj[prop];
			}
		}
	
		if(includeId && !subObject) mongoValues._id = this._id;
	
		return mongoValues;
	},
	isMongoAttribute: function(obj, prop, preparingForSave, isPersisting) {
		if(this._needsClassName(prop, isPersisting)) return true;
	
		if(this._isBasicDeniedProperty(prop, obj)) return false;
		if(this._isLocal(prop)) return false;
		if(this._isVeryPrivateProperty(prop)) return false;		
		if(this._isClientFlagSavingToServer(prop)) return false;	
		if(this._isPreparingToSaveEqualDocs(prop, obj, preparingForSave)) return false; //no need to save same values
		
		return true;
	},

	
	_needsClassName: function(prop, isPersisting) {
		return (!this._id || isPersisting) && prop == 'className';
	},
	_isBasicDeniedProperty: function(prop, obj) {
		return  !obj.hasOwnProperty(prop) || _.isFunction(obj[prop]) || this._deniedAttributeRegex.test(prop);
	},
	_isLocal: function(prop) {
		return prop == '_local' || prop == '_local_reactive';
	},
	_isVeryPrivateProperty: function(prop) {
		return prop.indexOf('___') === 0;
	},
	_isClientFlagSavingToServer: function(prop) {
		if(prop.indexOf('__client_session__') === 0) {
			if(this._local) return false; //allows it to be saved for local use only
			else return true;
		}
	},
	_isPreparingToSaveEqualDocs: function(prop, obj, preparingForSave) {
		return preparingForSave && obj._originalDoc && _.isEqual(obj._originalDoc[prop], obj[prop]);
	},

	
	copyProperties: function(otherObj) {
		otherObj = otherObj.getAllMongoAttributes ? otherObj.getAllMongoAttributes() : otherObj;
		delete otherObj.className;
		_.extend(this, otherObj);
	},
	copyPropertiesInto: function(otherObj) {
		var obj = this.getAllMongoAttributes();
		delete obj.className;
		_.extend(otherObj, obj);
	},
	
	
	setNonSaveable: function(key, val) {
		this['___'+key] = val;
	},
	getNonSaveable: function(key) {
		return this['___'+key];
	},
	extendWithDoc: function(doc) {
		_.extend(this, doc);
	}
});