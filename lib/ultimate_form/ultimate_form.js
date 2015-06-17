UltimateForm = Ultimate('UltimateForm').extends({
	abstract: true,
	isForm: true,
	construct: function(doc) {	
		this.extendWithDoc(doc);
		if(doc && doc._id) this.setOriginalDoc(doc);
		else this._originalDoc = {};
	},
	setOriginalDoc: function(newObj) {
		if(!this._local || Meteor.isServer) this._originalDoc = newObj;
	},
	
	user: function() {
		return Meteor.users.findOne(this.user_id);
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
			obj = this.getMongoAttributesForFields(ctx._schemaKeys),
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
	},
	
	__applyOnSubmit: function(onSubmit, model, autoform, schemaFields) {
		var allAsyncs = this.___customAsyncs,
			customAsyncs = [],
			finalOnSubmit = this.__finalOnSubmit;

		_.each(schemaFields, function(field) {
			if(allAsyncs && allAsyncs[field]) customAsyncs.push({field: field, func: allAsyncs[field]});
		});	

		var hookInfo = {
				asyncTotal: customAsyncs.length, 
				timesCalled: 0,
				autoform: autoform,
				model: model,
				onSubmit: onSubmit
			};
			
		if(customAsyncs.length > 0) {
			_.each(customAsyncs, function(async) {
				var func = async.func,
					field = async.field,
					obj = {field: field, hook: hookInfo};
				
				func.apply(model, [finalOnSubmit.bind(obj)]);
			});
		}
		else finalOnSubmit.apply({hook: hookInfo}, [null]);
	},
	__finalOnSubmit: function(errorType) {
		this.hook.timesCalled++;
		console.log('FINAL ON SUBMIT', errorType, this.hook.timesCalled, this.hook.asyncTotal);
		
		if(errorType) {
			errorType = this.hook.model.prepareErrorType(errorType);
			//this.hook.autoform.done(new Error(errorType)); //autoform originally handled errors, but now we do
			this.hook.model.addInvalidKey({name: this.field, type: errorType});
		}
		else if(this.hook.timesCalled >= this.hook.asyncTotal){
			if(this.hook.onSubmit) {
				var autoform = this.hook.autoform;
				
				this.hook.model.done = function(error) {
					if(!error) {
						var currentForm = $('#'+this.getCurrentForm()+'_modal');
						if(currentForm.modal) currentForm.modal('hide');
					}
					
					autoform.done(error);
				};
				
				this.hook.onSubmit.apply(this.hook.model, [this.hook.autoform]);
			}
			else {
				this.hook.model.persist();
				this.hook.autoform.done(null, this.hook.model);
			}
		}
	},
	__validateAsync: function(errorType) {
		if(errorType) {
			errorType = this.prepareErrorType(errorType);
			this.addInvalidKey({name: this.field, type: errorType});
		}
	},
	__onInputBlur: function($input) {
		var field = $input.attr('data-schema-key'),
			value = $input.val(),
			asyncFunc = this.___customAsyncs ? this.___customAsyncs[field] : null;
	
		if(asyncFunc) {
			this[field] = value;
	
			asyncFunc.call(this, function(errorType) {
				if(errorType) {
					errorType = this.prepareErrorType(errorType);
					this.addInvalidKey({name: field, type: errorType});
				}
			}.bind(this));
		}
	}
}, {
	abstract: true,
	isForm: true
});