UltimateRouter = Ultimate('UltimateRouter').extends(UltimateFacade, {
	abstract: true,
	deniedMethods: ['path', 'controller', 'template', 'layoutTemplate', 'yieldRegions', 'subscriptions', 'name', 'where', 
  								'snakeCase', 'waitOn', 'data', 'onRun', 'onRerun', 'onBeforeAction', 'onAfterAction', 'onStop', 'action', 'simpleRoutes'],
		
	controller: null,
		
	convertTemplateName: function(str) {
		return str;
	},
	
	
	onFacadeStartup: function() {
		Router.setTemplateNameConverter(this.convertTemplateName.bind(this));
		
		var routes = this.getMethods(null, null, null, true), //last param doesn't bind this, so config.toString() can be called below
			controllerName = this.className + 'Ultimate',
			options = _.pick(this, this.deniedMethods), //deniedMethods are core config props of Iron Router
			controller = this._routeController(options); 

		this._enableIronRouterControllerInheritance(controller, controllerName);
			
		if(_.isArray(this.simpleRoutes)) {
			this.simpleRoutes.forEach(function(route) {
				routes[route] = {};
			});
		}
		
		_.each(routes, function(config, key) {
			if(_.isFunction(config)) {
				var configString = config.toString();

				if(configString.indexOf('subscribe(') > -1) config = {waitOn: config.bind(this)};
				else if(configString.indexOf('this.render') > -1) config = {action: config.bind(this)};
				else if(configString.indexOf('this.redirect') > -1) config = {action: config.bind(this)};					
				else config = {data: config.bind(this)};
			}
			else {
				config = _.mapObject(config, function(prop, key) {
					return _.isFunction(prop) ? prop.bind(this) : prop;
				}, this)
			}

			var path = config.path || this.pathFromKey(key);	
			delete config.path;
		
			config.controller = config.controller || controllerName;
			config.name = config.name || this.nameFromKey(key);
			if(this.where) config.where = this.where;
			
			Router.route(path, config);
		}, this);
	},


	_routeController: function(options) {
		if(this._controller) return this._controller;
		
		delete options.controller;  //same as this.controller; might mess shit up extending a RouteController with it
		
		return this._controller = this.controller ? Ultimate.globalScope[this.controller].extend(options) : RouteController.extend(options);
	},
	_enableIronRouterControllerInheritance: function(controller, controllerName) {
		Ultimate.globalScope[controllerName] = controller; 
	},
	
	
	pathFromKey: function(key) {
		if(!this.snakeCase) return key; //keys are now always paths. snakeCase is supposed deprecated ways
		
		key = key.replace(/_/g, '-');
		if(key.indexOf('/') !== 0) key = '/'+key;
		return key;
	},
	nameFromKey: function(key) {
		if(key.indexOf('/') === 0) key = key.substr(1);
		if(key.indexOf('/') !== -1) key = key.substr(0, key.indexOf('/'));		
		
		if(this.snakeCase) return key.replace(/-/g, '_');
		else {
			return key.replace(/-(.)/g, function(v) { 
				return v.substr(1).capitalizeFirstLetter();
			}).capitalizeFirstLetter();
		} 
	},


	iron: function() {
		return Iron.controller();
	},
	_applyIron: function(name, args) {
		var iron = this.iron();
		return iron[name].apply(iron, args);
	},
	params: function() {
		return this.iron().params;
	},
	state: function() {
		return this.iron().state;
	},
	render: function() {
		return this._applyIron('render', arguments);
	},
	redirect: function() {
		return this._applyIron('redirect', arguments);
	},
	next: function() {
		return this._applyIron('next', arguments);
	},
	wait: function() {
		return this._applyIron('wait', arguments);
	},
	layout: function() {
		return this._applyIron('layout', arguments);
	},
	ready: function() {
		return this._applyIron('ready', arguments);
	}
}, {
	getCurrentTemplateName: function() {
		return Router.current().lookupTemplate();
	},
	getCurrentTemplate: function() {
		var name = Router.current().lookupTemplate();
		return Template[name];
	},
	getCurrentComponent: function() {
		var templateName = this.getCurrentTemplateName();
		return Ultimate.componentsByTemplateName[templateName];
	},
	getCurrentData: function() {
		return Router.current().data();
	},
	getCurrentModel: function() {
		var model = Router.current().data && Router.current().data();
		return model && _.isFunction(model.is) && model.is('model') ? model : null;
	},
	getCurrentCollection: function() {
		return Router.current().data && Router.current().data() && Router.current().data() && Router.current().data().collection;
	},
	getCurrentPageTitle: function() {
		var component = this.getCurrentComponent();
		if(component && component.pageTitle) return _.isFunction(component.pageTitle) ? component.pageTitle() : component.pageTitle;
		
		var collection = this.getCurrentCollection();
		if(collection) return collection.name.capitalizeFirstLetter();
		
		var model = this.getCurrentModel();
		if(model) return model.className + ' Profile';
	}
});


if(Meteor.isServer) {
	UltimateRouterServer = Ultimate('UltimateRouterServer').extends(UltimateRouter, {
		abstract: true,

		onFacadeStartup: function() {	
			var routeFuncs = this.getMethods(null, null, null, true),
				self = this;
		
			_.each(routeFuncs, function(func, key) {	
				var path = this.pathFromKey(key);	
			
				var finalFunc = function() {
					var request = this.request, 
						response = this.response,
						ultimateRouter = new Ultimate.classes[self.className],
						iron = this;
				
					ultimateRouter.iron = function() {
						return iron;
					};
					
					return func.call(ultimateRouter, request, response);
				};
			
				Router.route(path, finalFunc, {where: 'server'});
			}, this);
		
			this._handleOnBeforeAction();
		},
	
	
		_handleOnBeforeAction: function() {
			Router.onBeforeAction(Iron.Router.bodyParser.urlencoded({
	      extended: true
	    }));
				
			if(!this.onBeforeAction) return;
			Router.onBeforeAction(this.onBeforeAction.bind(this), {where: 'server'});
		},
		
		userId: function() {
			var user = Meteor.users.findOne({
				'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken('LwjTACMYkqyd8djjSEgiYCwoAnYWyr3xT6ehdjaNqyP')
			}, {fields: {_id: 1}});
			
			return user._id;
		},
		user: function() {
			return Meteor.users.findOne({
				'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken('LwjTACMYkqyd8djjSEgiYCwoAnYWyr3xT6ehdjaNqyP')
			});
		},
		
		isBaseMethod: function(prop) {
			return this.callParent('isBaseMethod', prop) || UltimateRouterServer.prototype.hasOwnProperty(prop);
		}
	});
}