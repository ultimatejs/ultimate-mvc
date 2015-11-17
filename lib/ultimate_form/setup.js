Ultimate('UltimateSetupForm').extends({
	abstract: true,
	mixinTo: ['UltimateForm'],
	config: ['schema', 'forms', 'errorMessages', 'wizards'],
	
	onAddMethods: function(methods) {
		if(methods.abstract || this.isAbstract()) return;
		this._setupForm(methods);
	},
  _setupForm: function(methods) {
    if(methods.schema) this._prepareSchema(methods.schema);
		if(methods.errorMessages) this._prepareErrorMessages(methods.errorMessages);
    if(methods.forms) this._prepareForms(methods.forms);
  },


	_prepareSchema: function(schema) {
		for(var field in schema) {
			for(var prop in schema[field]) {
				var customFunc = schema[field][prop];
			
				if(prop == 'custom') this._prepareCustomFunc(customFunc, this, schema[field], schema);
				else if(prop == 'customAsync') {
					this.___customAsyncs = this.hasOwnProperty('___customAsyncs') ? this.___customAsyncs : (this.___customAsyncs ? _.extend(this.___customAsyncs) : {});
					this.___customAsyncs[field] = customFunc;
					delete schema[field][prop];
				}
				else if(prop == 'autoValue') this._prepareAutoValue(customFunc, this, schema[field], schema);
			}
		}
	
		this._schema = new SimpleSchema(schema); //inherited or mixed in schemas will have been combined already, and therefore be combined here
	},
	_prepareErrorMessages: function(errorMessages) {
		SimpleSchema.messages(messages);
	},
	_prepareForms: function(forms) {
		this._forms = this._forms || {};

		for(var name in forms) {
			var form = forms[name],
				withoutKeys = form.withoutKeys,
				schemaKeys = this._schema._schemaKeys,
				keys = form.keys || (withoutKeys ? _.withoutArray(schemaKeys, withoutKeys) : schemaKeys),
				onSubmit = form.onSubmit;

			this._forms[name] = this._forms[name] || {};	
			this._forms[name].schema = this._subSchema(keys);
			this._forms[name].keys = keys;
			this._forms[name].onSubmit = onSubmit;


	    if(Meteor.isClient) this._prepareOnSubmit(this, onSubmit, keys, name);
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
					if($('.ultimate-wizard').length > 0) return false; //insure it doesn't get called when wizard's autoform on page
					
					Flash.danger(error.message);
				},
	      onSubmit: function(data, modifier, beforeDoc) {	
					if($('.ultimate-wizard').length > 0) return false; //insure it doesn't get called when wizard's autoform on page

					var model = new Ultimate.classes[beforeDoc.className](beforeDoc);	
					_.extend(model, data);

					proto.__applyOnSubmit(onSubmit, model, this, keys);	
					
	        return false;
	      }
	    });
			
    })(onSubmit);
	}
});

