UltimateClass = function UltimateClass() {};

_.extend(UltimateClass, {
  __type: 'class_UltimateClass',
  isStatic: true,
  getPrototype: function() {
    return this.prototype;
  }
});


_.extend(UltimateClass.prototype, {
  __type: 'instance_UltimateClass',
  isUltimatePrototype: true,
  getPrototype: function() {
    return this.___proto;
  },
});

_.extendMultiple([UltimateClass, UltimateClass.prototype], {
  parent: null,
  className: 'UltimateClass',
  construct: UltimateClass,
  abstract: true,
  isUltimate: true,
	behaviors: [],
	mixins: [],
	mixinTo: [],
	config: ['mixins', 'config'],
	
  is: function(type) {
    var isType = 'is'+type.capitalizeFirstLetter();
    return this.getPrototype()[isType];
  },
  isClassName: function(className) {
    return this.className == className;
  },
  isChildOf: function(className) {
    function checkParent(Class) {
      if(Class.parent && Class.parent.className == className) return true;
      else if(Class.parent) return checkParent(Class.parent);
      else return false;
    }

    return checkParent(this);
  },
  isAbstract: function() {
    return this.getPrototype().hasOwnProperty('abstract') && this.getPrototype().abstract === true;
  },
  protoHasOwnProperty: function(prop) {
    return this.getPrototype().hasOwnProperty(prop);
  },
  isPrivateMethod: function(prop) {
    return prop.indexOf('_') === 0;
  },
  isBaseMethod: function(prop) {
		return UltimateClass.prototype.hasOwnProperty(prop);
	},
  usesReservedWord: function(prop) {
    return Ultimate.reservedWordsRegex.test(prop);
  },
	isCoreUltimateClass: function() {
		return this.className.indexOf('Ultimate') === 0;
	},

  compose: function(prop, obj) {
    //avoid circular references so EJCON.clone doesn't break
    this[prop] = function() {
      return obj;
    };
  },


  callParent: function(methodName) {
    var args = _.toArray(arguments),
      methodName = args.shift(),
      method = this._resolveParentMethod(methodName);

    return _.isFunction(method) ? method.apply(this, args) : method;
  },
  applyParent: function(methodName, args) {
    var method = this._resolveParentMethod(methodName);
    return _.isFunction(method) ? method.apply(this, args) : method;
  },

  callParentConstructor: function() {
    return this._resolveParentMethod('construct').apply(this, arguments);
  },
  applyParentConstructor: function(args) {
    return this._resolveParentMethod('construct').apply(this, args);
  },
  _resolveParentMethod: function(methodName) {
    if(this.protoHasOwnProperty(methodName)) return this.parent[methodName]; //follow the prototype chain upward normally
    else { //skip parent method and look for grandfather method since parent method is the one being considered the current method
      var parentMethod = undefined,
        parent = this.parent;

      while(parentMethod === undefined && parent && parent.getPrototype()) {
        if(parent.protoHasOwnProperty(methodName)) parentMethod = parent.parent[methodName]; //parent.parent is where the skip happens
        parent = parent.parent;
      }

      return parentMethod;
    }
  },
	
	
	_extract: function(prop, userId, context) {
		var context = context || this;
		return _.isFunction(context[prop]) ? context[prop](Ultimate.userId(userId)) : context[prop];
	},
	log: function() {
		var args = _.toArray(arguments);
		console.log.apply(console, [this.className].concat(args));
	},
	emit: function() {} //stub so core events don't break in inheritance before event methods are added to this class in another file
});

_.extend(UltimateClass, {
  _resolveParentMethod: function(methodName) { //static parent methods only reached through callParent, since no proto chain
    var parentMethod = undefined,
      parent = this.parent;

    while(parentMethod === undefined && parent) {
      if(parent.hasOwnProperty(methodName)) parentMethod = parent[methodName];
      parent = parent.parent;
    }

    return parentMethod;
  }
});


Ultimate.Class = UltimateClass.class = UltimateClass.prototype.class = Ultimate.classes.UltimateClass = UltimateClass;