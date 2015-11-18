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
		else return this.___formName || $('form.ultimate-form').last().attr('id') || 'all'; 
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
	
	
	isValid: function(formName1, formNameEtc, validateWholeObject) {
		var errorObject = this.validate.apply(this, arguments);
		return _.size(errorObject) === 0;
	},
	validate: function(formName1, formNameEtc, validateWholeObject) {
		var args = _.toArray(arguments),
			allErrors = {}, forms;
		
		if(_.last(args) === true) validateWholeObject = args.pop(); 
		forms = _.isArray(formName1) ? formName1 : args;
			
		if(_.isEmpty(forms)) forms = ['all'];
			
		_.each(forms, function(form) {
			var errors = this._validateOneForm(form, validateWholeObject);
			_.extend(allErrors, errors);
		}.bind(this));
		
		return allErrors;
	},
	
	_validateOneForm: function(formName, validateWholeObject) { 
		formName = this.getCurrentForm(formName);
		
		this.emit('beforeValidate', formName);
		
		var errorObject = this.getErrorObject(formName, validateWholeObject),
			isValid = _.size(errorObject) === 0;
		
		this.emit('afterValidate', formName, errorObject);
		if(!isValid) this.emit('isInvalid', formName, errorObject);
		if(isValid) this.emit('isValid', formName, errorObject);
		
		return errorObject;
	},
	getErrorObject: function(formName, validateWholeObject) {
		var ctx = this._context(formName),
			obj;

		if(validateWholeObject) {
			obj = this.atts(false);
			delete obj.className;
			delete obj.created_at;
			delete obj.updated_at;
			
		}
		else obj = this.pick(ctx._schemaKeys);
		
		ctx.validate(obj);
		invalidKeys = this.invalidKeys(formName, ctx),
		errors = this.getErrorMessages(formName, ctx);
			
		return _.zipToObject(invalidKeys, errors);
	},
	invalidKeys:function(formName, ctx) {
		formName = this.getCurrentForm(formName);
		
		ctx = ctx || this._context(formName);
		
		return _.map(ctx.invalidKeys(), function(keyObj){
			return keyObj.name;
		});
	},
	getErrorMessages: function(formName, ctx) { 
		formName = this.getCurrentForm(formName);
		
		ctx = ctx || this._context(formName);
		
		return _.map(this.invalidKeys(formName), function(key) {
			return ctx.keyErrorMessage(key);
		});
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