Ultimate('UltimateComponentParent').extends(UltimateReactive, {
	isComponent: true,
	abstract: true,
	template: null,
	templateName: null,

	mixins: [],
	mixinHelpers: [],
	mixinEvents: [],
	mixinAutoruns: [],
	
	//onCreated: function() {},
	//onRendered: function() {},
	//onDestroyed: function() {},
	
	//onCreatedCallbacks: [],
	//onRenderedCallbacks: [],
	//onDestroyedCallbacks: [],
	
	//basic features child components can implement to include html from js
	//into a cloned version of Template.ultimate_plain_template
	/**
	plain: true,
	html: function() {},
	childTempalte: function() {}.
	**/
	
 	
	includes: [],
	infiniteScroll: [],

	onClassCreated: function() {
		if(this.isAbstract()) Ultimate.abstractComponents[this.className] = this.class;
	},
	onBeforeStartup: function() {
		var uc = this.createNew(); //usually we use prototypes, but in this case we instantiate an object for reasons concerning callbacks and mixins
		
		uc.rememberComponent();
  	uc.emit('beforeComponentStartup'); //let UltimateDatatableComponent copy template first

		if(uc.cloneTemplate) this.template = Template[this._extract('cloneTemplate')].copyAs(this.templateName);
		if(uc.plain) this.template = Template.ultimate_plain_template.copyAs(this.templateName);
			
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

	
	setupIncludes: function(includes) {
		includes = includes || this.includes; 

		var helpersMap = this.getBoundHelpers();
		
		_.each(includes, function(name) {
			Template[name].helpers(helpersMap);	
			
			//if component exists for template, its helpers override helpers included from other components
			var component = UltimateComponentParent.componentsByTemplateName[name];
			if(component) component.setupHelpers(); 
		}, this);
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
	},
	component: function() {
		return this; //so if .component() is called when the user thinks he's dealing with UltimateComponentModel, it doesnt break
	},
	params: function(param) {
		var params = _.extend({}, this._params(), this._query());
		return param ? params[param] : params;
	},
	_params: function() {
		return _.pickArray(Router.current().params, _.keys(_.omit(Router.current().params, 'query', 'hash')));
	},
	_query: function() {
		return Router.current().params.query;
	},
	hash() {
		return Iron.Location.get().hash;
	},
	go: function() {
		var args = _.toArray(arguments);
		
		Meteor.setTimeout(function() {
			Router.go.apply(Router, args);
		}.bind(this), 20);
	}
}, {
	isComponent: true,
	abstract: true,
  components: {},
  componentsByTemplateName: {}
});

Ultimate.components = UltimateComponentParent.components;
Ultimate.componentsByTemplateName = UltimateComponentParent.componentsByTemplateName;