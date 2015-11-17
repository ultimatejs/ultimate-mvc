UltimateForm = Ultimate('UltimateForm').extends({
	abstract: true,
	isForm: true,
	construct: function(doc) {	
		if(this.___constructorCalled) return;
		
		this.extendWithDoc(doc);
		if(doc && doc._id) this.setOriginalDoc(doc);
		else this._originalDoc = {};
		
		this.___constructorCalled = true;
	},
	setOriginalDoc: function(newObj) {
		if(!this._local || Meteor.isServer) this._originalDoc = newObj;
	},
	
	user: function() {
		var userId = userIdKey ? this[userIdKey] : this.user_id;
		
		if(userId) return Meteor.users.find(userId);
		else return null;
	},
	
	
	_subSchema: function() {
		var args = _.toArray(arguments);
		args = _.isArray(args[0]) ? args[0] : args;
		
		return this._schema.pick(args);
	},

	
	getForm: function(name) {
		return this._forms[name];
	},
	getFormKeys: function(name) {
		return this.getForm(name) ? this.getForm(name).keys : null;
	},
	getFormSchema: function(name) {
		if(name == 'all') return this._schema;
		else return this.getForm(name) ? this.getForm(name).schema : null;
	},
	getFormOnSubmit: function(formName) {
		return this.getForm(name) ? this.getForm(name).onSubmit : null;
	},


	currentForm: function() {
		return $('form.ultimate-form').last().attr('id');
	},
	setCurrentForm: function(formName) {
		this.___formName = formName;
	},
	getCurrentForm: function(formName) {
		if(formName) return formName;
		else return this.___formName || $('form.ultimate-form').last().attr('id'); 
	},
	getCurrentFormOnSubmit: function(formName) {
		var name = this.getCurrentForm(formName);
		return this._forms[name].onSubmit;
	},
	callCurrentFormOnSubmit: function(formName) {
		var name = this.getCurrentForm(formName);
		$('#'+name).submit();				
	},
	
	
	_context: function(formName) {
		formName = this.getCurrentForm(formName);
		
		var schema = this.getFormSchema(formName), 
			ctx = formName ? schema.namedContext(formName) : schema.newContext();
			
		return ctx;
	},
	
	
	validate: function(formName) { 
		formName = this.getCurrentForm(formName);
		
		this.emit('beforeValidate', formName);
		
		var ctx = this._context(formName),
			obj = this.pick(ctx._schemaKeys),
			isValid = ctx.validate(obj),
			errors = this.getErrorMessages(formName);
		
		this.emit('afterValidate', formName, errors);
		if(!isValid) this.emit('isInvalid', formName, errors);
		if(isValid) this.emit('isValid', formName, errors);
		
		return errors;
	},
	validateAll: function() {
		return this.validate('all');
	},
	isValid: function(formName) {
		var errors = this.validate(formName);
		return _.isArray(errors) ? errors.length === 0 : false;
	},
	isValidAll: function() {
		var errors = this.validate('all');
		return _.isArray(errors) ? errors.length === 0 : false;
	},
	
	//used by validateOnInsert/validateOnUpdate model options
	isValidMultipleForms: function(shouldValidate) {
		var forms = this.formsToValidate(shouldValidate),
			allErrors = [];
		
		_.each(forms, function(form) {
			var errors = this.validate(form);
			allErrors.push(errors);
		}.bind(this));
		
		return allErrors;
	},
	formsToValidate: function(shouldValidate) {
		if(shouldValidate === true) return ['all'];
		else if(shouldValidate) return [].concat(this.validateOnUpdate);
		else return [];
	}, 
	
	//difference from validate() is that this is called directly on AutoForm and triggers other actions by Autoform
	validateForm: function(formName) {
		formName = this.getCurrentForm(formName);
		
		this.emit('beforeValidate', formName);
		
		AutoForm.validateForm(formName);
		this.showFlashMessages(formName);
		
		var errors = this.getErrorMessages(formName);
		
		this.emit('aterValidate', formName, errors);
		if(!_.isEmpty(errors)) this.emit('isInvalid', formName, errors);
		if(_.isEmpty(errors)) this.emit('isValid', formName, errors);
		
		return errors;
	},
	
	values: function() {
		return this.getFormvalues();
	},
	getFormValues: function(formName) {
		formName = this.getCurrentForm(formName);
		return AutoForm.getFormValues(formName).insertDoc;
	},
	
	getErrorMessages: function(formName) { 
		formName = this.getCurrentForm(formName);
		
		var ctx = this._context(formName);
		
		return _.map(this.invalidKeys(formName), function(key) {
			return ctx.keyErrorMessage(key);
		});
	},
	getErrorMessagesString: function(formName) {
		formName = this.getCurrentForm(formName);		
		var errors = this.getErrorMessages(formName);
		return errors.join('/n');
	},
	getFlashMessages: function(formName) {
		formName = this.getCurrentForm(formName);
		
		var errors = this.getErrorMessages(formName),
			messages = '';
		
		console.log('ERRORS', errors);
		
		if(errors.length > 1) {
			messages += '<ul style="list-style:initial; margin-left: 12px">'
			
			_.each(errors, function(error) {
				messages += '<li>' + error + '</li>';
			});
			
			messages += '</ul>'
		}
		else if(errors.length == 1) messages = errors[0];
		
		return messages;
	},
	showFlashMessages: function(formName) {
		formName = this.getCurrentForm(formName);
		
		var errorMessages = this.getFlashMessages();
		if(errorMessages) Flash.danger(errorMessages);
		else Flash.clear();
	},
	
	invalidKeys:function(formName) {
		formName = this.getCurrentForm(formName);
		
		var ctx = this._context(formName);
		
		return _.map(ctx.invalidKeys(), function(keyObj){
			return keyObj.name;
		});
	},
	
	addInvalidKeys: function(formName, keys) {
		if(!keys) {
			keys = formName;
			formName = this.getCurrentForm();
		}
		
		this._context(formName).addInvalidKeys(keys);
	},
	addInvalidKey: function(formName, key) {
		if(!key) {
			key = formName;
			formName = this.getCurrentForm();
		}
		
		this._context(formName).addInvalidKeys([key]);
	},
	
	getAsyncFuncForField: function(field) {
		return this.___customAsyncs[field];
	},
	
	prepareErrorType: function(errorType) {
		if(errorType.indexOf(' ') > 0) {
			var error = {},
				message = errorType,
				type = 'error'+message.substr(0, 15);
		
			type = type.replace(/ /g, '');
				
			error[type] = message;
			console.log('PREPARE ERROR TYPE', error);
			SimpleSchema.messages(error);
			
			errorType = type;
		}
		return errorType;
	}
}, {
	abstract: true,
	isForm: true
});