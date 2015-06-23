UltimateClass.extend({
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
  },
	
	
  formattedCreatedDate: function(field, format) {
		field = field || 'created_at';
		format = format || 'MM/DD';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  },
  formattedCreatedDatetime: function(field, format) {
		field = field || 'created_at';
		format = format || 'MM/DD - h:mma';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  },
  formattedCreatedime: function(field, format) {
		field = field || 'created_at';
		format = format || 'h:mma';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  },
	
	
  formattedUpdatedDate: function(field, format) {
		field = field || 'updated_at';
		format = format || 'MM/DD';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  },
  formattedUpdatedDatetime: function(field, format) {
		field = field || 'updated_at';
		format = format || 'MM/DD - h:mma';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  },
  formattedUpdatedTime: function(field, format) {
		field = field || 'updated_at';
		format = format || 'h:mma';
		
    return this[field] ? moment(this[field]).format(format) : 'n/a';
  }
});