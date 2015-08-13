UltimateModelPrompt = Ultimate('UltimateModelPrompt').extends(UltimateModalForm, {
	construct: function(id, model, options, save) {
		this.id = id + '_modal';
		this.model = model;
		this.setOptions(options, save);
	},
	
	setOptions: function(options, save) {
		if(options === true) options = {save: true, title: 'Add/Edit ' + this.model.className};
		if(!options) options = {title: 'Add/Edit ' + this.model.className};
			
		if(save) options.save = true;
		
		this.callParent('setOptions', options);
	},
	
	formData: function() {
		var data = this.applyParent('formData');
		data.model = this.model //this.model.reactive('ultimate_model_prompt_'+this.id); //not sure it needs to be reactive anymore, since its not in a wizard
		return data;
	},
	
	submit: function() {
		this.setTimeout(function() {
			var errors = this.model.getErrorMessages(),
				values = this.model.getFormValues();
		
			_.extend(this.model, values);
		
			if(errors.length == 0) {
				if(this.callback) {
					if(this.options.save) this.model.save();
					this.applyCallback(this.model, values);
				}
				else if(this.options.save) this.model.save();
				else return this.model.callCurrentFormOnSubmit(); //handles this.hide() via form.done() call in onSubmit handler

				this.hide();
			}
		}, 0); //set timeout in case customAsync schema validator is in play
	}
});