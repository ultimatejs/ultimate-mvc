_.extend(Ultimate, {
	combineFormConfigObjects: function(proto, methods) {
		if(proto.schema && methods.schema) methods.schema =_.extend(proto.schema, methods.schema);
		if(proto.forms && methods.forms) methods.forms = _.extend(proto.forms, methods.forms);
		if(proto.defineErrorMessages && methods.defineErrorMessages) methods.defineErrorMessages =_.extend(proto.defineErrorMessages, methods.defineErrorMessages);
	},
  setupForm: function() {
    if(this.methods.schema) this.schema();
    if(this.methods.forms) this.forms();
		if(this.methods.defineErrorMessages) this.defineErrorMessages();
  },

	schema: function() {
		var proto = this.proto,
			schema = this.methods.schema;
			
		for(var field in schema) {
			for(var prop in schema[field]) {
				var customFunc = schema[field][prop];
			
				if(prop == 'custom') this._prepareCustomFunc(customFunc, proto, schema[field], schema);
				else if(prop == 'customAsync') {
					proto.___customAsyncs = proto.hasOwnProperty('___customAsyncs') ? proto.___customAsyncs : (proto.___customAsyncs ? _.extend(proto.___customAsyncs) : {});
					proto.___customAsyncs[field] = customFunc;
					delete schema[field][prop];
				}
				else if(prop == 'autoValue') this._prepareAutoValue(customFunc, proto, schema[field], schema);
			}
		}
	
		proto._schema = new SimpleSchema(schema); //combine possibly inherited schemas, or schemas extended in other calls to Class.extend()
	},
	defineErrorMessages: function() {
		var messages = this.methods.defineErrorMessages;
		SimpleSchema.messages(messages);
	},
	forms: function() {
		var proto = this.proto,
			forms = this.methods.forms;
			
		proto._forms = proto._forms || {};

		for(var name in forms) {
			var form = forms[name],
				withoutKeys = form.withoutKeys,
				schemaKeys = this.proto._schema._schemaKeys,
				keys = form.keys || (withoutKeys ? _.withoutArray(schemaKeys, withoutKeys) : schemaKeys),
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

