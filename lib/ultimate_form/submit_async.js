UltimateForm.extend({
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
		else if(this.hook.timesCalled >= this.hook.asyncTotal) {
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
	__validateAsync: function(errorType) { //isn't used anymore, but that may be a problem; keep a look out
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
});