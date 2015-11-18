if(Meteor.isServer) {
	__meteor_runtime_config__.ROOT_URL = process.env.ROOT_URL;
	__meteor_runtime_config__.MODE = process.env.NODE_ENV;
}

Ultimate = function Ultimate(className, isPackage) {
	Ultimate.className = className;
	Ultimate.isPackage = isPackage;
	return Ultimate;
};

_.extend(Ultimate, {
  globalScope: this, //assign the globalScope so we can get it wherever needed
  initializing: false,

  classes: {},
  collections: {},
  httpClasses: {}, //for use by optional UltimateHttp package
  
	coreClasses: /^(UltimateForm|UltimateModel|UltimateComponent|UltimateComponentModel|UltimateConfig|UltimateStartup|UltimatePermissions|UltimatePublish|UltimateRouter|UltimateRouterServer|UltimateAccounts|UltimateExec|UltimateSync|UltimateWizard|UltimateFacade|UltimateModalPrompt|UltimateModalContent|UltimateModalTabbed|UltimateModalWizard)$/,
  abstractComponents: {},
  components: {},
  componentsByTemplateName: {},
	models: {},
  wizards: {},
  
  //by assigning these to __meteor_runtime_config__ on the server, they are pre-assigned on the client as well
  mode: __meteor_runtime_config__.MODE,
  rootUrl: __meteor_runtime_config__.ROOT_URL,

	absoluteUrl: function(path, meteor) {
		var base;
		
		if(Meteor.isClient) base = window.location.protocol+'//'+window.location.host;
		else {
			var rootUrl;
			
			if(meteor) {
				try {
					rootUrl = (this.config && this.config.https ? 'https://' : 'http://')+meteor.connection.headers.host;
				}
				catch(e) {}
			}
			
			base = rootUrl || this.rootUrl;
		}
		
		return path ? base + '/' + path : base + '/';
	},
	
  //KEEP THIS UP TO DATE IF NEW PROPS ARE ADDED TO THE CLASS OR PROTOTYPE!!!
  //reservedWordsRegex: /^(construct|class|className|__type|parent|constructor|___proto|createNew)$/,
  reservedWordsRegex: /^(construct|class|className|__type|parent|constructor|___proto|createNew|abstract|_forms|_schema|defaults|mixins|schema|collection|_behaviors|_listeners|forms|collectionName|behaviors|_originalDoc|___complete)$/,

	usesReservedWord: function(prop) {
    return this.reservedWordsRegex.test(prop);
  },

	hasClass: function(className) {
		return !!this.classes[className];
	},
	classFrom: function(Class) {
		return _.isString(Class) ? this.classes[Class] : Class;
	},
	classExists: function(Class) {
		!!this.classes[Class];
	},
	
  //the following are temp props assigned to Ultimate.egProp for use while extending classes
  deleteTemporaryProps: function() {
    delete this.className;
    delete this.parent;
    delete this.protoFromParent;
    delete this.originalConstructor;
    delete this.class;
    delete this.proto;
    delete this.collection;
    delete this.methods;
		delete this.isPackage;
  },
  userId: function(userId) {
    if(userId) return userId;

    try {
      userId = Meteor.userId();
    }
    catch(e) {}

    return userId;
  },
	user: function(userId) {
		var userId = this.userId(userId);
		return userId ? Meteor.users.findOne(userId) : null;
	},
	isAdmin: function(userId) {
		var user = this.user(userId);
		return user && _.isFunction(user.isAdmin) ? user.isAdmin() : false;
	}
});

Meteor.absoluteUrl.defaultOptions.rootUrl = Ultimate.absoluteUrl().substring(0, Ultimate.absoluteUrl().length - 1);
