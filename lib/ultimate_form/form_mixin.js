Ultimate('UltimateSetupForm').extends({
	abstract: true,
	mixinTo: ['UltimateForm'],
	config: ['schema', 'forms', 'errorMessages', 'wizards'],
	
	onAddMethods: function(methods) {
		this._setupForm(methods);
	},
  _setupForm: function(methods) {
    if(methods.schema) this._prepareSchema(methods.schema);
		if(methods.errorMessages) this._prepareErrorMessages(methods.errorMessages);
    if(methods.forms) this._prepareForms(methods.forms);
  },


	_prepareSchema: function(schema) {
		var owner = this.owner();
		
		for(var field in schema) {
			for(var prop in schema[field]) {
				var customFunc = schema[field][prop];
			
				if(prop == 'custom') this._prepareCustomFunc(customFunc, owner, schema[field], schema);
				else if(prop == 'customAsync') {
					owner.___customAsyncs = owner.hasOwnProperty('___customAsyncs') ? owner.___customAsyncs : (owner.___customAsyncs ? _.extend({}, owner.___customAsyncs) : {}); //inherit from parent if doesnt have own property
					owner.___customAsyncs[field] = customFunc;
					delete schema[field][prop];
				}
				else if(prop == 'autoValue') this._prepareAutoValue(customFunc, owner, schema[field], schema);
			}
		}
	
		owner._schema = new SimpleSchema(schema); //inherited or mixed in schemas will have been combined already, and therefore be combined here
	},
	_prepareErrorMessages: function(errorMessages) {
		SimpleSchema.messages(messages);
	},
	_prepareForms: function(forms) {
		var owner = this.owner();
		owner._forms = owner._forms || {};

		for(var name in forms) {
			var form = forms[name],
				withoutKeys = form.withoutKeys,
				schemaKeys = owner._schema._schemaKeys,
				keys = form.keys || (withoutKeys ? _.withoutArray(schemaKeys, withoutKeys) : schemaKeys),
				onSubmit = form.onSubmit;

			owner._forms[name] = owner._forms[name] || {};	
			owner._forms[name].schema = owner._subSchema(keys);
			owner._forms[name].keys = keys;
			owner._forms[name].onSubmit = onSubmit;


	    if(Meteor.isClient) this._prepareOnSubmit(owner, onSubmit, keys, name);
		}
	},
	

	_prepareCustomFunc: function(customFunc, proto, schemaField, schema) {
		(function(customFunc) {
			schemaField.custom = function() {
				var props = {};
				for(var key in schema) props[key] = this.field(key).value;
				var model = new proto.class(props);
				
				var errorType = customFunc.apply(model, [this]);
				return errorType ? proto.prepareErrorType(errorType) : null;
			};
		})(customFunc);
	},
	_prepareAutoValue: function(func, proto, schemaField, schema) {
		(function(customFunc) {
			schemaField.custom = function() {
				var props = {};
				for(var key in schema) props[key] = this.field(key).value;
				var model = new proto.class(props);

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

