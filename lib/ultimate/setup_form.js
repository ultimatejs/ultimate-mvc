_.extend(Ultimate, {
  setupForm: function() {
    if(this.methods.schema) this.schema();
    if(this.methods.defineErrorMessages) this.defineErrorMessages();
    if(this.methods.forms) this.forms();
  },

	schema: function() {
		var proto = this.proto,
			schema = _.isFunction(this.methods.schema) ? this.methods.schema.call(proto) : this.methods.schema;
	
		for(var field in schema) {
			for(var prop in schema[field]) {
				var customFunc = schema[field][prop];
			
				if(prop == 'custom') this._prepareCustomFunc(customFunc, proto, schema[field], schema);
				else if(prop == 'customAsync') {
					proto.___customAsyncs = proto.___customAsyncs || {};
					proto.___customAsyncs[field] = customFunc;
					delete schema[field][prop];
				}
				else if(prop == 'autoValue') this._prepareAutoValue(customFunc, proto, schema[field], schema);
			}
		}
	
		proto._schema = new SimpleSchema(schema);
	},
	defineErrorMessages: function() {
		var messages = _.isFunction(this.methods.defineErrorMessages) ? this.methods.defineErrorMessages.call(this.proto) : this.methods.defineErrorMessages;
		SimpleSchema.messages(messages);
	},
	forms: function() {
		var proto = this.proto,
			forms = _.isFunction(this.methods.forms) ? this.methods.forms.call(proto) : this.methods.forms;
			
		proto._forms = proto._forms || {};

		for(var name in forms) {
			var form = forms[name],
				keys = form.keys,
				onSubmit = form.onSubmit;

			proto._forms[name] = proto._forms[name] || {};	
			proto._forms[name].schema = proto._subSchema(keys);
			proto._forms[name].keys = keys;
			proto._forms[name].onSubmit = onSubmit;


	    if(Meteor.isClient) this._prepareOnSubmit(proto, onSubmit, keys, name);
		}
	},
	

	_prepareCustomFunc: function(customFunc, proto, schemaField, schema) {
		(function(customFunc) {
			schemaField.custom = function() {
				var model = new proto.class;
				for(var key in schema) model[key] = this.field(key).value;
		
				var errorType = customFunc.apply(model, [this]);
				return errorType ? proto.prepareErrorType(errorType) : null;
			};
		})(customFunc);
	},
	_prepareAutoValue: function(func, proto, schemaField, schema) {
		(function(customFunc) {
			schemaField.custom = function() {
				var model = new proto.class;
				for(var key in schema) model[key] = this.field(key).value;
				return customFunc.apply(model, [this]);
			};
		})(customFunc);
	},
	_prepareOnSubmit: function(proto, onSubmit, keys, name) {
    (function(onSubmit) {
			
	    AutoForm.addHooks([name], {	
				onError: function(operation, error, template) {
					Flash.danger(error.message);
				},
	      onSubmit: function(data, modifier, model) {	
					try {		
						model = new window[model.className](data);		
						console.log('BLA BLA', model);
						proto.__applyOnSubmit(onSubmit, model, this, keys);					
					} catch(e) {
						console.log('ERROR', e);
					}	
	        return false;
	      }
	    }, true);
			
    })(onSubmit);
	}
});

