Ultimate.Modal.extendStatic({
	launchContent: function(id, data, options) {
		var cb = _.callbackFromArguments(arguments); //cb is popped; therefore all prior params can be optional
		var args = _.chain(arguments).toArray().filter(function(arg) { return arg; }).value();
		return Ultimate.ModalContent.createNew.apply(null, args).show(cb);
	},
	launchTabbed: function(id, tabs, options) {
		var cb = _.callbackFromArguments(arguments);
		var args = _.chain(arguments).toArray().filter(function(arg) { return arg; }).value();
		return Ultimate.ModalTabbed.createNew.apply(null, args).show(cb);
	},
	launchWizard: function(id, model, options) {
		var cb = _.callbackFromArguments(arguments);
		var args = _.chain(arguments).toArray().filter(function(arg) { return arg; }).value();
		return Ultimate.ModalWizard.createNew.apply(null, args).show(cb);
	},
	launchPrompt: function(idStringArray, schemaModelArray, options) {
		var cb = _.callbackFromArguments(arguments);
		var args = _.chain(arguments).toArray().filter(function(arg) { return arg; }).value();
		return Ultimate.ModalPrompt.createNew.apply(null, args).show(cb);
	},
	launchModelPrompt: function(id, model, options) {
		var cb = _.callbackFromArguments(arguments);
		var args = _.chain(arguments).toArray().filter(function(arg) { return arg; }).value();
		return Ultimate.ModelPrompt.createNew.apply(null, args).show(cb);
	},
	launchSchemaPrompt: function(id, schema, options) {
		var cb = _.callbackFromArguments(arguments);
		var args = _.chain(arguments).toArray().filter(function(arg) { return arg; }).value();
		return Ultimate.SchemaPrompt.createNew.apply(null, args).show(cb);
	},
	launchSimplePrompt: function(idStringArray, stringArray, options) {
		var cb = _.callbackFromArguments(arguments);
		var args = _.chain(arguments).toArray().filter(function(arg) { return arg; }).value();
		return Ultimate.SchemaPrompt.createNew.apply(null, args).show(cb);
	}
});