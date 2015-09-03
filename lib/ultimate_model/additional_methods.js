UltimateModel.extend({
	operate: function(name, val, cb) {
		var $operator = {};
		$operator[name] = val;
		
    if(Meteor.isClient || cb) {
	    this.db().update(this._id, $operator, this.refreshFind.bind(this, cb));
		}
		else {
			this.db().update(this._id, $operator);
			this.refreshFind();
		}
		
    return this;
	},
	embed: function(att, value, cb) {
		var obj = {};
		obj[att] = value;
		
		this.update(obj, cb);
		
		
    if(Meteor.isClient || cb) {
	    this.update(obj, function(error,result) {
	    	this.refreshFind.bind(this, cb, error, result);
	    }.bind(this));
		}
		else {
			this.update(obj);
			this.refreshFind();
		}
		
		return this;
	},
	
	
  increment: function(att, val, cb) {
		var attVal = {};
		attVal[att] = val;
		
    if(Meteor.isClient || cb) {
	    this.db().update(this._id, {$inc: attVal}, this.refreshFind.bind(this, cb));
		}
		else {
			this.db().update(this._id, {$inc: attVal});
			this.refreshFind();
		}

    return this;
  },
	decrement: function(att, val, cb) {			
		val = val < 0 ? val : val * -1; //make sure att val is negative, allowing u to pass in positive values			
		return this.increment(att, val, cb);
	},
	incrementOne: function(att, cb) {
		var attVal = {};
		attVal[att] = 1;
		
		return this.increment(attVal, cb);
	},
	decrementOne: function(att, cb) {
		var attVal = {};
		attVal[att] = 1;
		
		return this.decrement(attVal, cb);
	},
	
	
  push: function(att, val, cb) {
		var attVal = {};
		attVal[att] = val;
		
    if(Meteor.isClient || cb) {
	    this.db().update(this._id, {$push: attVal}, this.refreshFind.bind(this, cb));
		}
		else {
			this.db().update(this._id, {$push: attVal});
			this.refreshFind();
		}
		
		return this;
  },
  pop: function(att, cb) {
		var obj = {};
		obj[att] = 1;
		
    if(Meteor.isClient || cb) {
	    this.db().update(this._id, {$pop: obj}, this.refreshFind.bind(this, cb));
		}
		else {
			this.db().update(this._id, {$pop: obj});
			this.refreshFind();
		}
		
		return this;
  },
  shift: function(att, cb) {
		var obj = {};
		obj[att] = -1;
		
    if(Meteor.isClient || cb) {
	    this.db().update(this._id, {$pop: obj}, this.refreshFind.bind(this, cb));
		}
		else {
			this.db().update(this._id, {$pop: obj});
			this.refreshFind();
		}
		
		return this;
  },
  unshift: function(att, val, cb) {
		var arr = this[att];
		
		if(!_.isArray(arr) && !_.isEmpty(arr)) throw new Error('attribute-not-array', 'Attribute is not array');
		else if(_.isEmpty(arr)) arr = [];
		
		arr.unshift(val);
			
		this.set(att, val, cb);
		
		return this;
  },
	
	
	refreshFind: function(cb, error, result) {
		var doc = this.class.findOne(this._id);
		if(doc) doc = doc.getAllMongoAttributes();
		this.setOriginalDoc(doc);
		
		_.extend(this, doc);
		if(cb) cb.call(this, error, result);
	},

	
	pick: function() {
		var fields = _.toArray(arguments),
			atts = this.getMongoAttributes(),
			obj = {};
			
		_.each(fields, function(field) {
			obj[field] = atts[field];
		});
		
		return obj;
	},
	
	
	user: function(userIdKey) {
		var userId = userIdKey ? this[userIdKey] : this.user_id;
		
		if(userId) return Meteor.users.find(userId);
		else return null;
	}
});