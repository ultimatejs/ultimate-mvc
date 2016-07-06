_.extend(Ultimate, {
  createClass: function (Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods) {
    if(arguments.length === 0 || !Parent.isUltimate) { //with no Parent class provided, it's assumed to be UltimateClass
      httpStaticMethods = httpInstanceMethods;
      httpInstanceMethods = staticMethods;
      staticMethods = methods;
      methods = Parent;
      Parent = UltimateClass;
    }
    else if(_.isString(Parent)) Parent = Ultimate.classes[Parent];

    methods = methods || {};
		this.className = this.className || 'ULTIMATE_CONSOLE_CLASS'; //for classes created at the console. They will end up using the assigned var as the className anyway
    this.parent = Parent;
    this.originalConstructor = methods ? (methods.hasOwnProperty('constructor') ? methods.constructor : methods.construct) : null; //todo: remove support for `construct` since constructor works perfectly now
  	var isPackage = this.isPackage;

    var Class = this.transformClass(); //all the fancy inheritance stuff is done here
    this.attachPrototype(Class);
    this.configurePrototype();
    this.configureStatics();

		methods.config = this._concatProps(Class.prototype.config, methods.config, Class.prototype);
		methods.mixins = this._concatProps(Class.prototype.mixins, methods.mixins, Class.prototype);
		if(methods.abstract === true) Class.prototype.abstract = true; //needs to know at mixin time, which is prior then adding methods

		this.addMethods(Class.prototype, methods, true);
		this.addMethods(Class, staticMethods);

		this.deleteTemporaryProps();
		this.storeCoreClass(Class.className, Class);

		Class.emitStart(Parent, methods, staticMethods, httpInstanceMethods, httpStaticMethods);

		var mixinTo = this._extract(methods.mixinTo, Class.prototype);
		if(!_.isEmpty(mixinTo)) Class.mixinToTargetClasses(mixinTo); //automatically mixin to previously created classes

		if(!isPackage) Ultimate.globalScope[Class.className] = Class; //non package code is set as globals
		return Class;
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

			if(!(this instanceof Class)) { //transpiler will call: `ChildClass = Ultimate.Class('ChildClass')`
				Class.childName = className; //thereby using `Class` as a function to store the upcoming `ChildClass` name.
				return Class; //This is similar to how you can extend from: `Ultimate('ChildClass').extends()`.
			}

			if(this.attachBehaviors) this.attachBehaviors(); //weak dependency on optional UltimateBehavior extension

      var args = _.toArray(arguments);
      this.emit.apply(this, ['beforeConstruct'].concat(args));

      this.__type = this.__type; //assign to actual object so they can be stringified and passed to server as part of UltimateHttp
      this.className = this.className;

      if(this.defaults) _.extend(this, _.isFunction(this.defaults) ? this.defaults.call(this) : this.defaults);

      if(arguments[0] == 'no_params') return; //this object will be populated in UltimateHttp code

      if(isChildOfModel) UltimateModel.construct.apply(this, arguments); //if Model must run first since
      else if(isChildOfForm) UltimateForm.construct.apply(this, arguments);//models are also forms

      var result;

      if(originalConstructor) result = originalConstructor.apply(this, arguments); //call the original constructor
      else result = this.construct.apply(this, arguments); //model/form construct method won't be called possibly again because it checks if its called already

      this.emit.apply(this, ['afterConstruct'].concat(args));

      return result;
    };

    return Class;

		return this._isDevelopment() ? eval(this._prepStringForEval(Class)) : Class; //development uses NAMED FUNCTIONS FOR CLASSES!
  },


  attachPrototype: function(Class) {
    Class.prototype = this.protoFromParent; //protoFromParent setup was done in transformClass, with the 'intializing' var
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

    //Class.extendStatic() does not exist on classes until after this call
  	this.staticInheritParent(this.class, this.parent);
	},
	staticInheritParent: function(Child, Parent) {
		return UltimateClone.deepExtendOwnUltimate(Child, Parent, function(method, name) {
			return !/_attachedMixins|abstract/.test(name); //new Classes keep track of attached mixins so as not to add them 2x+
		});
	},
	storeCoreClass: function(className, Class) {
		Ultimate.classes[className] = Class;

		if(className.indexOf('Ultimate') === 0) Ultimate[className.replace('Ultimate', '')] = Class;

		if(Class.isModel) Ultimate.models[className] = Class;
		if(Class.parent.is('config')) Ultimate.config = Class;
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


  babelInherits: function(className, Child, Parent, isPackage) {
		if(!Parent.isUltimate) return Child;

		className = className.replace(/___/g, ''); //babel inner class is ___ClassName___, so ClassName can be used in methods

  	var staticMethods = _.babelExtend({}, Child);
		var methods = _.babelExtend({}, Child.prototype);

		delete methods.deprecate;

		return Ultimate(className, isPackage).extends(Parent, methods, staticMethods); //still needs to use extends instead of createClass so build plugin doesnt mess it up
  }
});

Ultimate.extends = Ultimate.createClass; //extends is deprecated. createClass will be used going forward since it's more standards based (e.g. React)
