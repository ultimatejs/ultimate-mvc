Template.ultimate_form.created = function() {
	if(!this.data.model) return;
	
	this.data.model.setCurrentForm(this.data.id);
	this.autorun(function() {
		this.data.model.showFlashMessages();
	}.bind(this));
};

Template.ultimate_form.helpers({
	newData: function() {		
		var context = {};
		_.extend(context, this);
		
		if(this.model) {
			this.model.className = this.model.className; //tack it on object from proto to reinstantiate later when stripped from proto chain
			context.schema = this.model.getFormSchema(this.id);
			context.doc = this.model;
			delete context.model;
		}
		//else this.schema is used (and this.doc if provided)
		
		delete context.placeholders;
		context.class = this.class ? this.class+' ultimate-form' : 'ultimate-form';
		context.validation = this.validation || 'blur';
		
		return context;
	},
	fullContext: function() {
		var fieldName = this.valueOf(),
			context = {name: fieldName};

		var placeholders = Template.parentData(1).placeholders;
		if(placeholders && placeholders[fieldName]) context.placeholder = placeholders[fieldName];
		
		return context;
	},
	inputTemplate: function() {
		var inputTemplate = Template.parentData(4).inputTemplate;
		return inputTemplate || 'form_group';
	}
});

Template.ultimate_form.events({
	'blur input[data-schema-key]': function(e, t) {
		var $input = $(e.currentTarget),
			formId = $input.parents('form').attr('id');
		
		var model = Template.currentData().model;
		if(model) model.__onInputBlur($input);
	}
});


Template.form_group.created = function() {
	this.help = this.data.help;
	delete this.data.help;
	
	this.addon = this.data.addon;
	delete this.data.addon;
};

Template.form_group.helpers({
	help: function() {
		return Template.instance().help;
	},
	addon: function() {
		return Template.instance().addon;
	}
});


Template.cc_exp_group.helpers({
	monthData: function() {		
		var context = {};
		
		context.name = this.month;
		if(this.montyType) context.type = this.monthType;
		if(this.monthOptions) context.options = this.monthOptions;
		if(this.monthClass) context.class = this.monthClass;
		if(this.monthStyle) context.style = this.monthStyle;
		context.firstOption = 'Select Month';
		
		return context;
	},
	yearData: function() {		
		var context = {};
		
		context.name = this.year;
		if(this.yearType) context.type = this.yearType;
		context.options = 'allowed';
		if(this.yearClass) context.class = this.yearClass;
		if(this.yearStyle) context.style = this.yearStyle;
		context.firstOption = 'Year';
		
		return context;
	}
});