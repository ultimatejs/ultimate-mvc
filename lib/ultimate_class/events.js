UltimateClass.extendBoth({
  //_listeners: {},

  emit: function(eventName) {
    var args = _.toArray(arguments),
      listeners = this.getListeners(eventName),
      behaviors = this.getBehaviors(),
      callNext;

    if(listeners) callNext = _.applyNext(listeners, args.slice(1), this); //remove eventName
    if(behaviors && callNext !== false) callNext = _.invokeNextApply(behaviors, 'emit', null, args); //leave eventName

    return callNext; //emit bubbling will stop if any event handler or behavior.emit() call returns false
  },
  on: function(eventName, func, runImmediately, args) {
    if(!_.isFunction(func)) return; //may get called like in setup_model.js without actual functions

    if(runImmediately) func.apply(this, args);
    this._addedListeners(eventName).push(func);
  },
  off: function(eventName, func) {
    var listeners = this._addedListeners(eventName);

    this._listenersObject()[eventName] = _.reject(listeners, function(listener) {
      return listener.toString() == func.toString();
    });
  },


  getListeners: function(eventName) {
    var onMethod = this._onMethod(eventName);

    if(this._listeners) {
      if(!this._listeners[eventName]) return onMethod ? [onMethod] : null;
      else return this.lazyListeners(eventName);
    }
    else return onMethod ? [onMethod] : null;
  },
  lazyListeners: function(eventName) {
    var listeners = this._addedListeners(eventName),
      method = this._onMethod(eventName); //get onSomeMethod attached to class

    return method ? [method].concat(listeners) : listeners; //prepend onSomeMethod if existent
  },


  _addedListeners: function(eventName) {
    return this._listenersObject()[eventName] = this._listenersObject()[eventName] || [];
  },
  _listenersObject: function() {
    return this._listeners = this.hasOwnProperty('_listeners') ? this._listeners : {};
  },
  _onMethod: function(eventName) {
    var methodName = this._onEventName(eventName);
    return this[methodName];
  },
  _onEventName: function(eventName) {
    return 'on'+eventName.capitalizeOnlyFirstLetter();
  }
});

UltimateClass.extendStatic({
  emitStart: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods) {
    this.emitAttachBehaviors(Parent, methods, staticMethods, httpMethods, staticHttpMethods);
    this.emitClassCreated(Parent, methods, staticMethods, httpMethods, staticHttpMethods); 
    this.emitBeforeStartup(Parent, methods, staticMethods, httpMethods, staticHttpMethods);
    this.emitStartup(Parent, methods, staticMethods, httpMethods, staticHttpMethods);
  },


  emitClassCreated: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods) {
    this.getPrototype().emit('classCreated', Parent, methods, staticMethods, httpMethods, staticHttpMethods); //unlike onBeforeStartup, abstract classes called too
    this.emit('classCreated', Parent, methods, staticMethods, httpMethods, staticHttpMethods);
  },
  emitAttachBehaviors: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods) {
    if(this.isAbstract()) return;
    this.getPrototype().emit('attachBehaviors', Parent, methods, staticMethods, httpMethods, staticHttpMethods);
    this.emit('attachBehaviors', Parent, methods, staticMethods, httpMethods, staticHttpMethods);
  },
  emitBeforeStartup: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods) {
    if(this.isAbstract()) return;
    this.getPrototype().emit('beforeStartup', Parent, methods, staticMethods, httpMethods, staticHttpMethods);
    this.emit('beforeStartup', Parent, methods, staticMethods, httpMethods, staticHttpMethods);
  },
  emitStartup: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods) {
    if(this.isAbstract()) return;

    Meteor.startup(function() {
      this.getPrototype().emit('startup', Parent, methods, staticMethods, httpMethods, staticHttpMethods);
      this.emit('startup', Parent, methods, staticMethods, httpMethods, staticHttpMethods);
    }.bind(this));
  }
});