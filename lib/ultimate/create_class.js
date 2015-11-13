_.extend(Ultimate, {
  createClass: function (Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods) {
    if(arguments.length === 0 || !Parent.isUltimate) { //with no Parent class provided, it's assumed to be UltimateClass
			serverStaticMethods = serverInstanceMethods;
      serverInstanceMethods = clientStaticMethods;
      clientStaticMethods = clientInstanceMethods;
      clientInstanceMethods = httpStaticMethods;
      httpStaticMethods = httpInstanceMethods;
      httpInstanceMethods = staticMethods;
      staticMethods = methods;
      methods = Parent;
      Parent = UltimateClass;
    }
    else if(_.isString(Parent)) Parent = Ultimate.classes[Parent];  

    methods = methods || {};
		
		//allow methods map to be in this format: {instanceMethods: {meth: function() {}}, staticMethods: {meth:function() {}}, etc:..}
		if(_.objectContains(methods, 'instanceMethods', 'staticMethods', 'httpInstanceMethods', 'httpStaticMethods', 'clientInstanceMethods', 'clientStaticMethods', 'serverInstanceMethods', 'serverStaticMethods')) {
			serverStaticMethods = methods.serverStaticMethods;
			serverInstanceMethods = methods.serverInstanceMethods;
      clientStaticMethods = methods.clientStaticMethods;
      clientInstanceMethods = methods.clientInstanceMethods;
      httpStaticMethods = methods.httpStaticMethods;
      httpInstanceMethods = methods.httpInstanceMethods;
      staticMethods = methods.staticMethods;
      methods = methods.instanceMethods;
		}
		
    this.parent = Parent;

    this.originalConstructor = methods ? (methods.hasOwnProperty('constructor') ? methods.constructor : methods.construct) : null;
  	
		if(!this.className) this.className = 'ULTIMATE_CONSOLE_CLASS'; //for classes created at the console. They will end up using the assigned var as the className anyway
		
    var Class = this.transformClass(); //all the fancy inheritance stuff is done here
  
    this.attachPrototype(Class);
    this.configurePrototype();
    this.configureStatics();

		this._prepareSetup(Class.prototype, methods);
    this.setupCustomClasses(methods, Class);
    this.addMethods(Class.prototype, methods, true);
		this.deleteTemporaryProps();
		
    if(staticMethods) this.addMethods(Class, staticMethods);
    
		if(Meteor.isClient) {
			if(clientInstanceMethods) this.addMethods(Class.prototype, clientInstanceMethods);
			if(clientStaticMethods) this.addMethods(Class, clientStaticMethods);
		}
		else {
			if(serverInstanceMethods) this.addMethods(Class.prototype, serverInstanceMethods);
			if(serverStaticMethods) this.addMethods(Class, serverStaticMethods);
		}

		this.assignCoreClass(Class.className, Class);
		
    if(Class.className != 'UltimateClone') {
			//only UltimateClone, the first extended class, won't have these yet
			//Note: emitStart is primarily/originally intended to allow UltimateHttp to hook into extends and assign its
			//methods, but why not let any other such future behaviors apply their features at this point in time as well
			Class.emitStart(Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods);
		}
		
		if(typeof Ultimate.globalScope.ULTIMATE_PACKAGE !== 'undefined' && Ultimate.globalScope.ULTIMATE_PACKAGE) return Class; //allow packages to export to global scope if desired (see plugin.js for how Build Plugin handles scope issues)
    else return Ultimate.globalScope[Class.className] = Class; //non package code is set as globals
  },
	
  
  transformClass: function() {
    var isChildOfForm = this._isChildOf('UltimateForm'),
      isChildOfModel = this._isChildOf('UltimateModel'),
      originalConstructor = this.originalConstructor;
  
    Ultimate.initializing = true;
    this.protoFromParent = new this.parent; //Instantiate a base class, but don't run the constructor
    Ultimate.initializing = false; //because 'initializing' var is in this closure during 'new this.parent' cuz 'this.parent === Class' below
      
    var Class = function Class(className) {
      if(Ultimate.initializing) return; //construction performed by originalConstructor after, but only after all this initial setup

			if(!(this instanceof Class)) { 
				Class.childName = className;
				return Class;
			}
			
      var args = _.toArray(arguments);
      this.emit.apply(this, ['beforeConstruct'].concat(args));
      
      this.__type = this.__type; //assign to actual object so they can be stringified and passed to server as part of UltimateHttp
      this.className = this.className; 

      if(this.defaults) _.extend(this, _.isFunction(this.defaults) ? this.defaults.call(this) : this.defaults);
      
      if(arguments[0] == 'no_params') return; //this object will be populated in UltimateHttp code
    
      if(isChildOfModel) UltimateModel.construct.apply(this, arguments); //if Model must run first since
      else if(isChildOfForm) UltimateForm.construct.apply(this, arguments);//models are also forms
      
      this.attachBehaviors();
      
      var result;
      
      if(originalConstructor) result = originalConstructor.apply(this, arguments); //call the original constructor
      else result = this.construct.apply(this, arguments); //model/form construct method won't be called possibly again because it checks if its called already
      
      this.emit.apply(this, ['afterConstruct'].concat(args));
      
      return result;
    };
    
		return this._isDevelopment() ? eval(this._prepStringForEval(Class)) : Class; //development uses NAMED FUNCTIONS FOR CLASSES!
  },
  
  
  attachPrototype: function(Class) {
    Class.prototype = this.protoFromParent; //ultimate the fancy prototype setup was done in transformClass, with the 'intializing' var
    Ultimate.classes[this.className] = Class;
    this.class = Class;
  },
  configurePrototype: function() {
    this.class.prototype.constructor = this.class; //Enforce constructor to be what we expect
    this.class.prototype.class = this.class; //but also put it here so we can use more "class-like" terminology
    this.class.prototype.parent = this.parent.prototype; //make it so we can call parent method
    this.class.prototype.className = this.className;
    this.class.prototype.__type = this._typePrefix()+'instance_'+this.className; //for use by UltimateHttp functionality
    this.class.prototype.___proto = this.class.prototype;
    this.class.prototype.createNew = this._createNewFunc();
  	
		return;
		this.class.prototype.mixins = _.unique(this.parent.prototype.mixins.concat(this.class.prototype.mixins));
		
		//attach parent mixin listeners here since only new mixin listeners will be attached part of the method adding process
		Meteor.startup(function() { //must run on Startup only after all mixins are attached
			if(!_.isEmpty(this.prototype.parent.mixins)) {
				_.each(this.prototype.parent.mixins, function(mixin) {
					this.prototype.attachMixinOnMethodListeners(Ultimate.classFrom(mixin).prototype);
				}, this);
			}
		}.bind(this.class));
	},
  configureStatics: function() {
    this.class.parent = this.parent;
    this.class.className = this.className;
    this.class.__type = this._typePrefix()+'class_'+this.className; //for use by UltimateHttp functionality
    this.class.construct = this.originalConstructor;
    this.class.createNew = this._createNewFunc();
    this.class.class = this.class;
  
    //we use inheritStaticBase() because extendStatic() does not exust on classes untill after this call
  	UltimateClass.inheritStaticBase.call(this.class, this.parent);
		
		return;
		
		//attach parent mixin listeners here since only new mixin listeners will be attached part of the method adding process
		Meteor.startup(function() { //must run on Startup only after all mixins are attached
			if(!_.isEmpty(this.prototype.parent.mixins)) {
				_.each(this.prototype.parent.mixins, function(mixin) {
					this.attachMixinOnMethodListeners(Ultimate.classFrom(mixin));
				}, this);
			}
		}.bind(this.class));
	},
  
  _isDevelopment: function() {
    return Ultimate.mode === 'development';
  },
  _isChildOf: function(className) {
    return this.parent.className == className || this.parent.isChildOf(className);
  },
  _prepStringForEval: function(Class) {
    return '(' + Class.toString().replace(/Class/g, this.className) + ')';
  },
  _createNewFunc: function() {
    var Class = this.class;
    return function(a, b, c, d, e, f, g, h) { //didnt want to do a dynamic version cuz function Name is lost
      return new Class(a, b, c, d, e, f, g, h);
    };
  },
  _typePrefix: function() {
    if(this.className == 'UltimateModel') return 'model_';
    else if(this.className == 'UltimateForm') return 'form_';
    else if(this.parent.is('form') && !this.parent.is('model')) return 'form_';
    else if(this.parent.is('model')) return 'model_';
    else if(this.parent.is('component')) return 'component_';
    else return '';
  },
	
	
	
  babelInherits: function(className, Child, Parent) {
		if(!Parent.isUltimate) return Child;
		
		className = className.replace(/___/g, ''); //babel inner class is ___ClassName___, so ClassName can be used in methods
		
  	var staticMethods = _.babelExtend({}, Child);
		var methods = _.babelExtend({}, Child.prototype);
		
		delete methods.deprecate;
		
		return Ultimate(className).extends(Parent, methods, staticMethods); //still needs to use extends instead of createClass so build plugin doesnt mess it up
  },
	createClassDynamic: function(className, Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods) {
		return Ultimate(className).extends(Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods);
	},
	
	assignCoreClass: function(className, Class) {
		if(className.indexOf('Ultimate') === 0) Ultimate[className.replace('Ultimate', '')] = Class;
		
		if(Class.isModel) Ultimate.models[className] = Class;
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

Ultimate.extends = Ultimate.createClass; //extends is deprecated. createClass will be used going forward since it's more standards based (e.g. React)