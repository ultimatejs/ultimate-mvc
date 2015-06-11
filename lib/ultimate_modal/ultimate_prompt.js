UltimatePrompt = Ultimate('UltimatePrompt').extends(UltimateModalForm, {
	construct: function(id, form, options) {
		this.id = id;
	
		if(form && form.__type) this._self = new UltimateModelPrompt(id, form, options);
		else this._self = new UltimateSchemaPrompt(id, form, options);
		
		return this._self;
	},


	formData: function() {
		return this._self.formData.apply(this, arguments);
	},
	submit: function() {
		return this._self.submit.apply(this, arguments);
	}
});