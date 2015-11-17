_.extend(Ultimate, {
	createClassDynamic: function(className, Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods) {
		return Ultimate(className).extends(Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods);
	},
	createForm: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.Form);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createModel: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.Model);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createComponent: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.Component);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createComponentModel: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.ComponentModel);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createRouter: function() {
		var args = _.toArray(arguments);
		if(Meteor.isClient) args.unshift(Ultimate.Router);
		else if(Meteor.isServer) args.unshift(Ultimate.RouterServer);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createPublishers: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.Publish);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createPermissions: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.Permissions);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createConfig: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.Config);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createStartup: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.Startup);
		return Ultimate.extends.apply(Ultimate, args);
	},
	createAccounts: function() {
		var args = _.toArray(arguments);
		args.unshift(Ultimate.Accounts);
		return Ultimate.extends.apply(Ultimate, args);
	}
});