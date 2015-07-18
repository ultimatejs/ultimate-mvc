Ultimate('UltimateConfig').extends(UltimateFacade, {
	abstract: true,
	deniedMethods: [/*'development', 'production', 'staging'*/], //env names added by code itself
	
	//envId: function() {} || 'string',
	envId: function() {
		return this.isLocalDevelopment() ? 'auto' : this.rootUrl(); //triggers dev env on urls: localhost||127.0.0.1 
	},
	
	//dev + prod environments are created by default
	environments: {
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
		this.setEnvId(this.envId); 
		this.addEnvironments(this.environments);			
		this.attachEnvironmentMethods(this.environment()); //eg: this.development.stripe becomes: MyConfig.stripe
		
		if(Meteor.isClient) Template.registerHelper('Config', this);
		
		if(Meteor.isServer) {
			if(this.class.MAIL_URL) process.env.MAIL_URL = this.class.MAIL_URL;
		}
	},
	
	removeAutomaticDevEnv: function() {
		if(!this.manual) { //if the developer didn't explicitly set manual: true
			if(!this._isAutomaticDevelopment()) { //then continue to implement the development environment automatically set
				if(_.isArray(this.environments.development)) this.environments.development.push('auto'); //based on using localhost/127.0.0.1
				else this.environments.development = [this.environments.development, 'auto']; //yup. 
			}
		}
		else { //manual: true set, so localhost/127.0.0.1 no longer automatically inferred by this.envId() function
			if(this.hasOwnProperty('environments')) delete this.parent.envId; 
		}
	},
	_isAutomaticDevelopment: function() {
		return this.environments.development.auto || _.contains(this.environments.development, 'auto')
	},
	addEnvironments: function(environments) {
		_.each(environments, function(url, name) {
			if(_.isArray(url)) {
				var urls = url; //rename it for explicitness sake
				
				_.each(urls, function(url) {
					this._addEnvironment(url, name);
				}, this);
				
				urls = urls.map(function(url) {
					url = _.isFunction(url) ? url.call(this) : url; //make sure urls are resolved from functions to actual urls in a rare case
					return  url.replace('http://', '').replace('https://', '').stripTrailingSlash();
				}, this); 
				
				this._environments[name] = urls; //store array; this.isEnvironment(name) will look in arrays now too
			}
			else this._addEnvironment(url, name);
		}, this);
	},
	_addEnvironment: function(url, name) {
		url = _.isFunction(url) ? url.call(this) : url;
		url = url.stripTrailingSlash();
		url = url.replace('http://', '').replace('https://', '');
		
		this._environments[name] = url;
		this._environmentsById[url] = name;
		
		this.deniedMethods.push(name);
	},
	attachEnvironmentMethods: function(envKey) {
		_.extend(this.class, this.getMethods(envKey)); //add methods from MyConfig.development/etc object
		_.extend(this.class, this.getMethods()); //add non-environment-centric methods, eg: MyConfig.someMethod
	},
	

	
	getEnvId: function() {
		return this._envId;
	},
	setEnvId: function(envId) {	
		if(_.isFunction(envId)) this._envId = envId.call(this).stripTrailingSlash(); //envId doesn't need to be url, so that
		else if(envId) this._envId = envId.stripTrailingSlash(); //u can achieve the same env on multiple urls
		else this._envId = Ultimate.absoluteUrl().stripTrailingSlash(); //this.envId is deleted and undefined is passed when development.auto is replaced as an environment
	
		this._envId = this._envId.replace('http://', '').replace('https://', '').stripTrailingSlash();
	},

	
	environment: function() {	
		return this._environmentsById[this.getEnvId()];
	},
	isEnvironment: function(name) {	
		var environment = this._environments[name];
		
		if(_.isArray(environment)) return _.contains(environment, this.getEnvId());
		else return this.getEnvId() == environment;
	},
	
	
	//below are helpful methods developers can use in functions 
	//used to define environments and in envId at the top of the class
	rootUrl: function() {
		return Ultimate.absoluteUrl();
	},
	isDevelopment: function() {
		return this.environment() == 'development';
	},
	isLocalDevelopment: function() {
		return this.rootUrl().indexOf('localhost') > -1 || this.rootUrl().indexOf('127.0.0.1') > -1;
	},
	host: function() {
		return Ultimate.absoluteUrl().replace('http://', '').replace('https://', '');
	},
	defaultFromAddress: function() {
		return 'site@'+this.host();
	}
}, {
	environment: function() {
		return this.prototype.environment();
	},
	isEnvironment: function(name) {
		return this.prototype.environment(name);
	},
	rootUrl: function() {
		return this.prototype.rootUrl();
	},
	isDevelopment: function() {
		return this.prototype.isDevelopment();
	},
	isLocalDevelopment: function() {
		return this.prototype.isLocalDevelopment();
	},
	host: function() {
		return this.prototype.host();
	},
	defaultFromAddress: function() {
		return this.prototype.defaultFromAddress();
	}
});