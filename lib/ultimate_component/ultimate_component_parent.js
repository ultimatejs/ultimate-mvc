Ultimate('UltimateComponentParent').extends(UltimateReactive, {
	isComponent: true,
	abstract: true,
	template: null,
	templateName: null,

	mixinHelpers: [],
	mixinEvents: [],
	mixinCallbacks: [],
	
	//onCreated: function() {},
	//onRendered: function() {},
	//onDestroyed: function() {},
	
	//onCreatedCallbacks: [],
	//onRenderedCallbacks: [],
	//onDestroyedCallbacks: [],
	
  	_helperRegex: /^(model|tableColumns|onCreated|onRendered|onDestroyed|ar|sub|subLimit|click|dblclick|focus|blur|change|mouseenter|mouseleave|mousedown|mouseup|keydown|keypress|keyup|touchdown|touchmove|touchup)(\s|$)/,
  	_eventsRegex: /^(click|dblclick|focus|blur|change|mouseenter|mouseleave|mousedown|mouseup|keydown|keypress|keyup|touchdown|touchmove|touchup)(\s|$)/,
	_animationsRegex: /^(insertElement|moveElement|removeElement|fadeIn|fadeOut)(\s|$)/,
	
	includes: [],
	

	onClassCreated: function() {
		if(this.isAbstract()) Ultimate.abstractComponents[this.className] = this.class;
	},
	onBeforeStartup: function() {
		var uc = this.createNew();
		
		uc.rememberComponent();
    	uc.emit('beforeComponentStartup'); //let UltimateDatatableComponent copy template first

    	uc.setupMixins();
		
	  	if(!uc.template) return;

    	uc.setupHelpers();
    	uc.setupEvents();
    	uc.setupCallbacks();
    	uc.setupIncludes();

    	uc.emit('afterComponentStartup');
	},
	
	
	rememberComponent: function() {
		UltimateComponentParent.components[this.className] = this;
		UltimateComponentParent.componentsByTemplateName[this.templateName] = this;
	},
	setupHelpers: function() {
		this.template.helpers(this.getResolvedHelpers());
	},
	setupEvents: function() {
		var ue = new UltimateEvents(this.template, this);
   		ue.addEvents(this.getResolvedEvents());
	},
	setupCallbacks: function() {
		var onRendered = function(uc) {
			var uc = uc || this;
			uc.setupAnimations(this);
			_.callNext(uc.callbacksOnRendered, this);
		};
		
		var onDestroyed = function(uc) {
			var uc = uc || this;
			_.callNext(uc.callbacksOnDestroyed, this);
			uc.stop();
		};
		
		
		var onCreated = function(uc) {
			//var uc = uc.createNew(); //old way where we didnt use the component proto as the context, but an instantiated component obj for each template
			var uc = uc || Ultimate.components[this.className];
			
			Template.instance().className = uc.className;	

			uc.runReactiveMethods();

			uc.construct.call(this);
			
			_.callNext(uc.callbacksOnCreated, this);
			
			this.template.onRendered(uc._applyBind(onRendered, true, uc));
			this.template.onDestroyed(uc._applyBind(onDestroyed, true, uc));
		};
		
		this.template.onCreated(this._applyBind(onCreated, true, this));
	},
	setupAnimations: function(ctx) {
		var tmplInstance = ctx.component || ctx; //UltimateComponentModel.component || UltimateComponent
				
		_.chain(this.getAnimations())
			.each(function(handler, selector) {
				var hookName = selector.firstWord(), //return insertElement from, eg, 'insertElement .someClass'
					isTopNode = !selector.split(' ')[1],
					els = isTopNode ? [tmplInstance.firsNode] : tmplInstance.findAll(selector);
					
		   		els.forEach(function(el) {
					if(_.isArray(handler)) {
						if(hookName == 'insertElement') el._uihooks[hookName] = this.__insertElementWithAnimation.bind(ctx, handler);
						else if(hookName == 'removeElement') el._uihooks[hookName] = this.__removeElementWithAnimation.bind(ctx, handler);					
					}
					else el._uihooks[hookName] = handler.bind(ctx);
				});
			}, this);
	},
	setupIncludes: function(includes) {
		includes = includes || this.includes; 

		_.each(includes, function(name) {
			var helpersMap = this.getHelpers();
			Template[name].helpers(helpersMap);	
			
			//if component exists for template, its helpers override helpers included from other components
			var component = UltimateComponentParent.componentsByTemplateName[name];
			if(component) component.setupHelpers(); 
		}, this);
	},
	
	
	getResolvedHelpers: function() {
		return _.mapObject(this._resolvedHelpers, this._applyBind, this);
	},
	getHelpers: function() {	
		return _.chain(this.getPrototype())
			.filterPrototype(this._isHelper)
			.mapObject(this._resolveHelper, this)
			.extend(this._getSpecialHelpers())
			.value();
	},
	_isHelper: function(method, prop) {
		return !this._helperRegex.test(prop) && this.isMethod(prop) && this._isFunction(method);
	},
	_isFunction: function(method) {
		return _.isFunction(method) || (_.isArray(method) && method.length > 0); 
	},
	_resolveHelper: function(method, prop) {
		if(_.isArray(method)) return this._helperShortcut(prop);
		else return method;
	},
	_getSpecialHelpers: function() {
		//return _.pickAndBind(this, ['instance', 'templateInstance', 'get', 'getLimit', 'model', 'routeModel', 
		//							'componentModel', 'parentModel', 'routeData', 'componentData', 'parentData']);

		var self = this,
			allSpecialHelpers = {},
			specialHelpers = ['instance', 'templateInstance', 'get', 'getLimit', 'model', 'routeModel', 'ready', 'subscriptionsReady', 
							'componentModel', 'parentModel', 'routeData', 'componentData', 'parentData'];

		_.each(specialHelpers, function(name) {
			allSpecialHelpers[name] = function() {
				var args = _.toArray(arguments);
				args.pop(); //remove the Spacebars.kw object containing args, so these methods can operate correctly
				return self[name].apply(self, args);
			};
		});

		return allSpecialHelpers;
	},
	
	getResolvedEvents: function() {
		//event handlers dont need to be bound here, since it's done in UE, and no bind is applied before
		return this._resolvedEvents; 
	},
	getEvents: function() {
		return _.filterPrototype(this.getPrototype(), this._isEvent);
	},
	_isEvent: function(method, prop) {
		return this._eventsRegex.test(prop) && this.isMethod(prop);
	},


	getAnimations: function() {
		return _.filterPrototype(this.getPrototype(), this._isAnimation);
	},
	_isAnimation: function(event, prop) {
		return this._animationsRegex.test(prop) && this.isMethod(prop);
	},
	__insertElementWithAnimation: function(cssAndOptionsArray, node, next) {
		var css = _.mapObjectAndCall(cssAndOptionsArray[0], this),
	  	options = _.mapObjectAndCall(cssAndOptionsArray[1], this);
	
		$(node).insertBefore(next).velocity(css, options);
	},
	__removeElementWithAnimation: function(cssAndOptionsArray, node) {
		var css = _.mapObjectAndCall(cssAndOptionsArray[0], this),
	  	options = _.mapObjectAndCall(cssAndOptionsArray[1], this);
	
		options.complete = function() {
	  		$(node).remove();
		};
	
		$(node).velocity(css, options);
	},


	isMethod: function(prop) {
		return !this.isPrivateMethod(prop) && !this._isBaseMethod(prop);
	},
	_isBaseMethod: function(prop) {
		if(UltimateClass.prototype.hasOwnProperty(prop)
			|| UltimateReactive.prototype.hasOwnProperty(prop)) return true;

		return _.some(Ultimate.abstractComponents, function(component) {
			if(component.prototype.hasOwnProperty(prop)) return true;
		});
	}
}, {
  components: {},
  componentsByTemplateName: {}
});

Ultimate.components = UltimateComponentParent.components;
Ultimate.componentsByTemplateName = UltimateComponentParent.components;