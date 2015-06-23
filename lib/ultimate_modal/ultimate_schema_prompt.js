UltimateSchemaPrompt = Ultimate('UltimateSchemaPrompt').extends(UltimateModalForm, {
	construct: function(id, fields, options) {
		var autoId = _.isArray(id) ? id[0] : id;
		this.id = this.generateKeyId(autoId);
		
	  if(arguments.length === 1) {
	  	if(_.isString(id)) {
				this.preparePrompt(id);
				options = this._setTitle(id);
			}
			else if(_.isArray(id)) this.prepareMultiFieldPrompt(id);
	  }
	  else {
	  	if(_.isString(id) && _.isString(fields)) {
	  		this.preparePromptWithPlaceHolder(id, fields);
				if(arguments.length === 2) options = this._setTitle(id);
	  	}
			else if(_.isArray(id) && _.isArray(fields)) {
				this.prepareMultiFieldPrompt(id);
				this.prepareMultiFieldPlaceHolders(id, fields);
			}
			else this.prepareSchema(fields); //_.isString(id) && (_.isArray(schema) || _.isObject(schema))
	  }
		
		if(_.isString(options)) options = {title: options};
		this.setOptions(options);
	},
	
	
	preparePrompt: function(label) {
		this.prepareSchema(['Your Response:']);
		this.id = this.generateKeyId(label);
	},
	preparePromptWithPlaceHolder: function(label, placeholder) {
		this.prepareSchema([label]);
		this.id = this.generateKeyId(label);
	
		this.placeholders = {};
		this.placeholders[this.id] = placeholder;
	},
	
	prepareMultiFieldPrompt: function(labels) {
		this.prepareSchema(labels);
		this.id = this.generateKeyId(labels[0]);
	},
	prepareMultiFieldPlaceHolders: function(labels, placeholders) {
		this.placeholders = {};
		
		_.each(placeholders, function(placeholder, index) {
			var key = this.generateKeyId(labels[index]);
			this.placeholders[key] = placeholder;
		}.bind(this));
	},
	
	
	prepareSchema: function(schema) {
		if(_.isArray(schema)) schema = this.prepareSchemaFromArray(schema);
		else if(_.isObject(schema)) schema = this.prepareSchemaFromObject(schema);
		
		this.schema = new SimpleSchema(schema);
	},
	
	prepareSchemaFromArray: function(keys) {
		var schema = {};
		
		_.each(keys, function(label) {
			var key = this.generateKeyId(label);
			schema[key] = {type: String, label: label};
		}.bind(this));
		
		return schema;
	},
	prepareSchemaFromObject: function(obj) {
		var schema = obj; //obj can be a schema config map or even a SimpleSchema object, i.e. returned from model.getFormSchema()
		if(obj.schema && obj.schema.keys) schema = obj.schema; //user provided a model's form object, i.e. from model.getForm()	
		return schema;
	},
	
	generateKeyId: function(label) {
		return label.replace(/ /g, '_').replace(/ |:|,|;|\.|'|"/g, '').toLowerCase().substr(0, 60);
	},
	
	
	submit: function() {
		var values = this.getFormValues(),
			valsArray = _.values(values),
			values = valsArray.length === 1 ? valsArray[0] : values; //if it's a single field prompt, return just that value
		
		if(AutoForm.validateForm(this.id)) {
			Flash.clear();
			this.applyCallback(values, values);
			this.hide();
		}
		else Flash.danger('Please fix the below issues.');
	},
	getFormValues: function() {
		return AutoForm.getFormValues(this.id).insertDoc;
	},
	formData: function() {
		var formData = this.applyParent('formData');
		formData['schema'] = this.schema;
		if(this.placeholders) formData['placeholders'] = this.placeholders;
		return formData;
	},
	
	
	_setTitle: function(title) {
		title = title.replace(/\w\S*/g, function(txt) {
			return txt.capitalizeFirstLetter();
		});
		
		return {title: title};
	}
});
