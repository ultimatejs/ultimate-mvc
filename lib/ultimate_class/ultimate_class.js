UltimateClass = function UltimateClass() {};

_.extend(UltimateClass, {
  __type: 'class_UltimateClass',
  isStatic: true,
  getPrototype: function() {
    return this.prototype;
  },
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


_.extend(UltimateClass.prototype, {
  __type: 'instance_UltimateClass',
  isUltimatePrototype: true,
  getPrototype: function() {
    return this.___proto;
  }
});

_.extendMultiple([UltimateClass, UltimateClass.prototype], {
  parent: null,
  className: 'UltimateClass',
  construct: UltimateClass,
  abstract: true,
  isUltimate: true,
  mixins: null,

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
    return this.getPrototype().hasOwnProperty('abstract') && this.getPrototype().abstract;
  },
  isClassCreated: function() {
    return this.getPrototype().hasOwnProperty('classCreated');
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


  composeCircular: function(prop, obj) {
    //avoid circular references so EJCON.clone doesn't break
    this[prop] = function() {
      return obj;
    };
  },
	compose: function(prop, obj) {
		this.composeCircular(prop, obj); //alias
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
  }
});




