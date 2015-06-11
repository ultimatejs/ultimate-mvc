UltimateRouter = Ultimate('UltimateRouter').extends(UltimateFacade, {
	abstract: true,
	deniedMethods: ['path', 'controller', 'template', 'layoutTemplate', 'yieldRegions', 'subscriptions', 'name', 'where', 
  								'waitOn', 'data', 'onRun', 'onRerun', 'onBeforeAction', 'onAfterAction', 'onStop', 'action'],
		
	controller: null,
		
	setTemplateNameConverter: function(str) {
		return str;
	},
	
	
	onFacadeStartup: function() {
		Router.setTemplateNameConverter(this.setTemplateNameConverter.bind(this));
		
		var routes = this.getMethods(null, null, null, true), //last param doesn't bind this, so config.toString() can be called below
			controllerName = this.className + 'Ultimate',
			options = _.pick(this, this.deniedMethods), //deniedMethods are core config props of Iron Router
			controller = this._routeController(options); 

		this._enableIronRouterControllerInheritance(controller, controllerName);
			
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
		key = key.replace('_', '-');
		if(key.indexOf('/') !== 0) key = '/'+key;
		return key;
	},
	nameFromKey: function(key) {
		if(key.indexOf('/') === 0) key = key.substr(1);
		if(key.indexOf('/') !== -1) key = key.substr(0, key.indexOf('/'));		
		
		return key.replace('-', '_');
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
		var model = Router.current().data();
		return model && _.isFunction(model.is) && model.is('model') ? model : null;
	},
	getCurrentCollection: function() {
		return Router.current().data().collection;
	},
	getCurrentPageTitle: function() {
		var component = this.getCurrentComponent();
		if(component && component.pageTitle) return _.isFunction(component.pageTitle) ? component.pageTitle() : component.pageTitle;
		
		var collection = this.getCurrentCollection();
		if(collection) return collection.name.capitalizeOnlyFirstLetter();
		
		var model = this.getCurrentModel();
		if(model) return model.className + ' Profile';
		
		return 'New Page';
	}
});



UltimateRouterServer = Ultimate('UltimateRouterServer').extends(UltimateRouter, {
	abstract: true,

	onFacadeStartup: function() {	
		var routeFuncs = this.getMethods(null, null, null, true);
		
		_.each(routeFuncs, function(func, key) {	
			var path = this.pathFromKey(key);	
			Router.route(path, func.bind(this), {where: 'server'});
		}, this);
		
		this._handleOnBeforeAction();
	},
	
	
	_handleOnBeforeAction: function() {
		if(!this.onBeforeAction) return;
		Router.onBeforeAction(this.onBeforeAction.bind(this), {where: 'server'});
	},


	response: function() {
		return this.iron().response;
	},
	request: function() {
		return this.iron().request;
	}
});