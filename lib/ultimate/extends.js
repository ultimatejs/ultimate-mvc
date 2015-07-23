_.extend(Ultimate, {
  extends: function (Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods) {
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
    this.originalConstructor = methods ? methods.construct : null;
  
    var Class = this.transformClass(); //all the fancy inheritance stuff is done here
  
    this.attachPrototype(Class);
    this.configurePrototype();
    this.configureStatics();
		
    this.setupCustomClasses(methods, Class);
    this.addMethods(Class.prototype, methods);
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

    if(Class.className != 'UltimateClone') {
			//only UltimateClone, the first extended class, won't have these yet
			//Note: emitStart is primarily/originally intended to allow UltimateHttp to hook into extends and assign its
			//methods, but why not let any other such future behaviors apply their features at this point in time as well
			Class.emitStart(Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods, clientInstanceMethods, clientStaticMethods, serverInstanceMethods, serverStaticMethods);
		}
		
    return Ultimate.globalScope[Class.className] = Class; //leaping over any closures -- ANOTHER OPTION: return eval(className + ' = ' + Class); //assign class within package scope
  },
  
  
  transformClass: function() {
    var isChildOfForm = this._isChildOf('UltimateForm'),
      isChildOfModel = this._isChildOf('UltimateModel'),
      originalConstructor = this.originalConstructor;
  
    Ultimate.initializing = true;
    this.protoFromParent = new this.parent; //Instantiate a base class, but don't run the constructor
    Ultimate.initializing = false; //because 'initializing' var is in this closure during 'new this.parent' cuz 'this.parent === Class' below
      
    var Class = function Class() {
      if(Ultimate.initializing) return; //construction performed by originalConstructor after, but only after all this initial setup

      var args = _.toArray(arguments);
      this.emit.apply(this, ['beforeConstruct'].concat(args));
      
      this.__type = this.__type; //assign to actual object so they can be stringified and passed to server as part of UltimateHttp
      this.className = this.className; 

      if(this.defaults) _.extend(this, _.isFunction(this.defaults) ? this.defaults.call(this) : this.defaults);
      
      if(arguments[0] == 'no_params') return; //this object will be populated in UltimateHttp code
    
      if(isChildOfModel) UltimateModel.construct.apply(this, arguments); //ifModel must run first since
      else if(isChildOfForm) UltimateForm.construct.apply(this, arguments);//models are also forms
      
      this.attachBehaviors();
      
      var result;
      
      if(originalConstructor) result = originalConstructor.apply(this, arguments); //call the original constructor
      else result = this.construct.apply(this, arguments); //model/form construct method won't be called possibly again because it checks if its called already
      
      this.emit.apply(this, ['afterConstruct'].concat(args));
      
      return result;
    };
    
		return eval(this._prepStringForEval(Class));
    //return this._isDevelopment() ? eval(this._prepStringForEval(Class)) : Class; //development uses NAMED FUNCTIONS!
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
  },
  configureStatics: function() {
    this.class.parent = this.parent;
    this.class.className = this.className;
    this.class.__type = this._typePrefix()+'class_'+this.className; //for use by UltimateHttp functionality
    this.class.construct = this.originalConstructor;
    this.class.createNew = this._createNewFunc();
    this.class.class = this.class;
  
    UltimateClass.mixinStatic.call(this.class, this.parent); //mixinStatic() method doesn't exist on class till after this call
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
  }
});