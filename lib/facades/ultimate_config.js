Ultimate('UltimateConfig').extends(UltimateFacade, {
	abstract: true,
	deniedMethods: [/**'development', 'production', 'staging'**/], //env names added by code itself
	
	//mode: function() {} || 'string',
	//envId: function() {} || 'string',
	
	envId: function() {
		return this.isLocalDevelopment() ? 'auto' : this.rootUrl(); //triggers dev env on urls: localhost||127.0.0.1 
	},
	
	//dev + prod environments are created by default
	envs: {
		development: 'auto', //triggers dev env by matching with envId above
		production: function() { //all other envIds/rootUrls are considered production
			return this.rootUrl();
		}
	},
	
	//where methods will need to be tacked on in child classes
	development: {},
	production: {},
	
	//dicts to store environment names + ids/urls
	_environments: {},
	_environmentsById: {},
	
	
	onFacadeStartup: function() {	
		this.removeAutomaticDevEnv();
		this.setMode(this.mode); 
		this.setEnvId(this.envId); 
		this.addEnvironments(this.envs);			
		this.attachEnvironmentMethods(this.currentEnvironment()); //eg: envs.development.stripe becomes: MyConfig.stripe
		
		if(Meteor.isClient) Template.registerHelper('Config', this);
	},
	
	removeAutomaticDevEnv: function() {
		var auto = this.envs && this.envs.development && this.envs.development.auto;
		if(this.hasOwnProperty('envs') && !auto) delete this.parent.envId; //localhost/127.0.0.1 no longer automatically inferred
	},
	addEnvironments: function(environments) {
		_.each(environments, function(url, name) {
			url = _.isFunction(url) ? url.call(this) : url;
			url = url.stripTrailingSlash();
			
			this._environments[name] = url;
			this._environmentsById[url] = name;
			
			this.deniedMethods.push(name);
		}, this);
	},
	attachEnvironmentMethods: function(envKey) {
		_.extend(this.class, this.getMethods(envKey)); //add methods from MyConfig.development/etc object
		_.extend(this.class, this.getMethods()); //add non-environment-centric methods, eg: MyConfig.someMethod
	},
	
	
	getMode: function() {
		return this._mode;
	},
	setMode: function(mode) {
		if(_.isFunction(mode)) this._mode = mode.call(this);
		else if(mode) this._mode = mode;
		else this._mode = Ultimate.mode;
	},

	
	getEnvId: function() {
		return this._envId;
	},
	setEnvId: function(envId) {	
		if(_.isFunction(envId)) this._envId = envId.call(this).stripTrailingSlash(); //envId doesn't need to be url, so that
		else if(envId) this._envId = envId.stripTrailingSlash(); //u can achieve the same env on multiple urls
		else this._envId = Ultimate.rootUrl.stripTrailingSlash();
	},

	
	currentEnvironment: function() {
		return this._environmentsById[this.getEnvId()];
	},
	environment: function() {
		return this.currentEnvironment();
	},
	isEnvironment: function(name) {	
		return this.getEnvId() == this._environments[name];
	},
	
	
	//below are helpful methods developers can use in functions 
	//used to define envs and in envId at the top of the class
	rootUrl: function() {
		return Ultimate.rootUrl.stripTrailingSlash();
	},
	envMode: function() {
		return Ultimate.mode;
	},
	isDevelopment: function() {
		return Ultimate.mode == 'development' || this.environment() == 'development';
	},
	isLocalDevelopment: function() {
		return this.rootUrl().indexOf('localhost') > -1 || this.rootUrl().indexOf('127.0.0.1') > -1;
	}
}, {
	environment: function() {
		return this.prototype.currentEnvironment();
	},
	mode: function() {
		return this.prototype.envMode();
	},
	rootUrl: function() {
		return this.prototype.rootUrl();
	},
	isDevelopment: function() {
		return this.prototype.isDevelopment();
	},
	isLocalDevelopment: function() {
		return this.prototype.isLocalDevelopment();
	}
});