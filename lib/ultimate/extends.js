_.extend(Ultimate, {
  extends: function (Parent, methods, staticMethods, httpMethods, staticHttpMethods) {
    if(arguments.length === 0 || !Parent.isUltimate) {
      httpMethods = staticMethods;
      staticMethods = methods;
      methods = Parent;
      Parent = UltimateClass;
    }
    else if(_.isString(Parent)) Parent = Ultimate.classes[Parent];  

    //console.log('CLASS START', this.className);
  
    methods = methods || {};
    this.parent = Parent;
    this.originalConstructor = methods ? methods.construct : null;
  
    var Class = this.transformClass(); //some fancy stuff is done here; dig deeper if u want
  
    this.attachPrototype(Class);
    this.configurePrototype();
    this.configureStatics();

    this.setupCustomClasses(methods);

    this.addMethods(Class.prototype, methods);
    if(staticMethods) this.addMethods(Class, staticMethods);
    
    this.addStaticBehaviors(Class); //must be run after all else class configuration since behavior classes may be created here which also use Ultimate.props

    if(Class.className != 'UltimateClone') Class.emitStart(Parent, methods, staticMethods, httpMethods, staticHttpMethods); //only UltimateClone, the first extended class, won't have these yet
  
    //console.log('CLASS COMPLETE', Class.className);
  
    return Ultimate.globalScope[Class.className] = Class; //leaping over any closures
    //return eval(className + ' = ' + Class); //assign class within package scope
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
      else if(!isChildOfForm && !isChildOfModel) result = this.construct.apply(this, arguments); 
      
      this.emit.apply(this, ['afterConstruct'].concat(args));
      
      return result;
    };
    
    return this._isDevelopment() ? eval(this._prepStringForEval(Class)) : Class; //development uses NAMED FUNCTIONS!
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
  addStaticBehaviors: function(Class) {
    if(Class.behaviors) Class.attachBehaviors(Class.behaviors); 
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