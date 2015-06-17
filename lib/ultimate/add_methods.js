_.extend(Ultimate, {
  addMethods: function (proto, methods) {
    if(!_.isObject(methods)) methods = {}; //just in case, to prevent errors
    this._prepareSetup(proto, methods);

    if(!_.isEmpty(methods.mixins)) proto.class.mixinMultiple(methods.mixins);

    if(methods.behaviors) this._attachBehaviors(proto, methods);

    this.proto = _.extend(proto, methods); //override mixin methods (current class -> mixin -> parents)

    if(proto.isUltimatePrototype) { //only for extending Ultimate prototypes
      if(proto.isChildOf('UltimateForm')) this.setupForm();
      if(proto.isChildOf('UltimateModel')) this.setupHooks(methods);
    }
  
    if(proto.emit) proto.emit('methodsAdded', methods); //UltimateClass won't have emit() in the beginning
    //note methodsAdded won't be called on behaviors until after Class is fully created, and that should be changed somehow
    
    return proto;
  },
  setupCustomClasses: function(methods) {
    if(this.parent.is('model')) this.setupModel(methods);
    if(this.parent.is('component')) this.setupComponent(methods);
    if(this.parent.is('permissions')) this.setupPermissions(methods);
  },
  _prepareSetup: function(proto, methods) {
    this.collection = proto.collection;
    this.methods = methods;
  },
  _attachBehaviors: function(proto, methods) {
    if(proto.isStatic && !proto.isAbstract()) proto.attachBehaviors(methods.behaviors); //static behaviors need to be immediately attached
    proto.behaviors = proto.behaviors || []; //gets past behaviors or parent proto behaviors, but because of next [].concat line avoids editing inherited behaviors array object
    methods.behaviors = proto.behaviors.concat(methods.behaviors); //combine rather than overwrite inherited behaviors
  }
});