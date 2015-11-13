_.extend(Ultimate, {
  addMethods: function (proto, methods, firstRun) {
    if(!_.isObject(methods)) methods = {}; //just in case, to prevent errors
    if(!firstRun) this._prepareSetup(proto, methods);


		if(!_.isEmpty(proto.mixins) && firstRun) proto.class.mixinEventHandlers(proto.mixins);
		
    if(!_.isEmpty(methods.mixins)) {
			methods.mixins = [].concat(methods.mixins);
			proto.class.mixinClass(methods.mixins);
			
			proto.mixins = proto.mixins.concat(methods.mixins); //parent mixins are combined with child mixins
			delete methods.mixins; //so that child classes get the accumulation of all parent mixins
		}
		
		
    if(methods.behaviors) this._attachBehaviors(proto, methods);

		if(proto.isChildOf && proto.isChildOf('UltimateModel')) this.combineModelConfigObjects(proto, methods);
		if(proto.isChildOf && proto.isChildOf('UltimateForm')) this.combineFormConfigObjects(proto, methods);
		
		this.proto = _.extend(proto, methods);
		
    if(proto.isUltimatePrototype) { //only for extending Ultimate prototypes
      if(proto.isChildOf('UltimateForm')) this.setupForm();
      if(proto.isChildOf('UltimateModel')) this.setupHooks(methods);
    }
		
		//called after class created && UltimateClass won't have emit() in the beginning:
    if(proto.class.___complete && proto.emit) proto.emit('methodsAdded', methods);
    
		
		//after class is all setup, allow it to automatically mix itself into previously created classes
		if(!_.isEmpty(methods.mixinTo)) {
			methods.mixinTo = [].concat(methods.mixinTo);
			proto.class.mixinToTargetClasses(methods.mixinTo);
		}
		
		
    return proto;
  },
  setupCustomClasses: function(methods, Class) {
    if(this.parent.is('model')) this.setupModel(methods);
    if(this.parent.is('component')) this.setupComponent(methods);
    if(this.parent.is('permissions')) this.setupPermissions(methods);
		if(this.parent.is('config')) this.setupConfig(methods, Class);
  },
  _prepareSetup: function(proto, methods) {
    this.collection = proto.collection;
    this.methods = methods;
		

		if(proto.isForm) {
			if(_.isFunction(methods.schema)) methods.schema = methods.schema.call(proto);
			if(_.isFunction(methods.forms)) methods.forms = methods.forms.call(proto);
			if(_.isFunction(methods.errorMessages)) methods.errorMessages = methods.errorMessages.call(proto);
			if(_.isFunction(methods.wizards)) methods.wizards = methods.wizards.call(proto);
		}

		if(proto.isModel) {
			if(_.isFunction(methods.subscriptions)) methods.subscriptions = methods.subscriptions.call(proto);
			if(_.isFunction(methods.relations)) methods.relations = methods.relations.call(proto);
			if(_.isFunction(methods.aggregates)) methods.aggregates = methods.aggregates.call(proto);
			if(_.isFunction(methods.startData)) methods.startData = methods.startData.call(proto);
			if(_.isFunction(methods.sluggify)) methods.sluggify = methods.sluggify.call(proto);
		}
		
		if(_.isFunction(methods.mixins)) methods.mixins = methods.mixins.call(proto);
		if(_.isFunction(methods.behaviors)) methods.behaviors = methods.behaviors.call(proto);
		
		if(proto.isComponent) {
			if(_.isFunction(methods.template)) methods.template = methods.template.call(proto);
			if(_.isFunction(methods.cloneTemplate)) methods.cloneTemplate = methods.cloneTemplate.call(proto);
			
			if(_.isFunction(methods.includes)) methods.includes = methods.includes.call(proto);
			if(_.isFunction(methods.mixinHelpers)) methods.mixinHelpers = methods.mixinHelpers.call(proto);
			if(_.isFunction(methods.mixinEvents)) methods.mixinEvents = methods.mixinEvents.call(proto);
			if(_.isFunction(methods.mixinCallbacks)) methods.mixinCallbacks = methods.mixinCallbacks.call(proto);
		}
  },
  _attachBehaviors: function(proto, methods) {
    if(proto.isStatic && !proto.isAbstract()) proto.attachBehaviors(methods.behaviors); //static behaviors need to be immediately attached
    proto.behaviors = proto.behaviors || []; //gets past behaviors or parent proto behaviors, but because of next [].concat line avoids editing inherited behaviors array object
    methods.behaviors = proto.behaviors.concat(methods.behaviors); //combine rather than overwrite inherited behaviors
  }
});