UltimateModel.extend({
	updateUsingModifier: function($modifier, cb) {
    this.db().update(this._id, $modifier, function() {
    	this.refresh(cb);
    }.bind(this));

    return this._id;
	},
	updatedEmbedded: function(att, value, cb) {
		var obj = {};
		obj[att] = value;
		return this.update(obj, cb);
	},
	
	
  increment: function(attVal) {
    this.db().update(this._id, {$inc: attVal}, function() {
    	this.refresh();
    }.bind(this));

    return this._id;
  },
  push: function(attVal) {
    this.db().update(this._id, {$push: attVal}, function() {
    	this.refresh();
    }.bind(this));
  },
  pop: function(att) {
		var obj = {};
		obj[att] = 1;
    this.db().update(this._id, {$pop: obj}, function() {
    	this.refresh();
    }.bind(this));
  },
  shift: function(att) {
		var obj = {};
		obj[att] = -1;
    this.db().update(this._id, {$pop: obj}, function() {
    	this.refresh();
    }.bind(this));
  },
	
	
	getMongoAttributesForFields: function(fields) {
		var atts = this.getMongoAttributes(),
			obj = {};
			
		_.each(fields, function(field) {
			obj[field] = atts[field];
		});
		
		return obj;
	},
	
  formattedDate: function(field, format) {
		field = field || 'created_at';
		format = format || 'MM/DD';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  },
  formattedDatetime: function(field, format) {
		field = field || 'created_at';
		format = format || 'MM/DD - h:mma';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  },
  formattedTime: function(field, format) {
		field = field || 'created_at';
		format = format || 'h:mma';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  }
});