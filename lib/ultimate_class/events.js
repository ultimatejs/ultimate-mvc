UltimateClass.extendBoth({
  //_listeners: { //generated on child classes when event handlers are added
	//	eventName: [], //array of handlers for `eventName`
	//},

  emit: function(eventName) {
    var args = _.toArray(arguments),
      listeners = this.getListeners(eventName),
      behaviors = this.getBehaviors && this.getBehaviors(), //weak dependency on UltimateBehavior extension
      callNext;

    if(listeners) callNext = _.applyNext(listeners, args.slice(1), this); //remove eventName
    if(behaviors && callNext !== false) callNext = _.invokeNextApply(behaviors, 'emit', null, args); //leave eventName

    return callNext; //emit bubbling will stop if any event handler or behavior.emit() call returns false
  },
	emitBind: function(eventName, context) {
		var args = _.toArray(arguments),
			eventName = args.shift(),
			context = args.shift();
	    listeners = this.getListeners(eventName),
	    behaviors = this.getBehaviors(),
	    callNext;
			
	  if(listeners) callNext = _.applyNext(listeners, args, context || this); //apply context
	  if(behaviors && callNext !== false) callNext = _.invokeNextApply(behaviors, 'emit', null, [eventName, context].concat(args)); //put back eventName and context for behaviors
	
		return callNext;
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

    return method ? listeners.concat(method) : listeners; //prepend onSomeMethod if existent
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
    return 'on'+eventName.capitalizeFirstLetter();
  }
});



UltimateClass.extendStatic({
  emitStart: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic) {
		this.emitClassCreated(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);   
		this.emitStartup(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
		
		this.emitChildClassCreated(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);   
		this.emitChildStartup(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
	},

	
  emitClassCreated: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic) {
    this.getPrototype().emit('classCreated', Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
    this.emit('classCreated', Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
  },
  emitStartup: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic) {
    Meteor.startup(function() {
      this.getPrototype().emit('startup', Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
      this.emit('startup', Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
    }.bind(this));
  },
	
  emitChildClassCreated: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic) {
    if(this.isAbstract()) return; //unlike onClassCreated, abstract classes are not called
		
		this.getPrototype().emit('childClassCreated', Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
    this.emit('childClassCreated', Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
  },
  emitChildStartup: function(Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic) {
    if(this.isAbstract()) return; //unlike onStartup, abstract classes are not called
		
		Meteor.startup(function() {
      this.getPrototype().emit('childStartup', Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
      this.emit('childStartup', Parent, methods, staticMethods, httpMethods, staticHttpMethods, clientInstance, clientStatic, serverInstance, serverStatic);
    }.bind(this));
  }
});