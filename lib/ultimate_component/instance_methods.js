UltimateComponentParent.extend({
	currentInstance: function(prop, val) {
		var instance = Template.instance();

		if(instance) this.lastTemplateInstance = instance; //so we can test component not in helpers/events/cbs (i.e. from Ultimate.components)
		else instance = this.lastTemplateInstance;

		return this._assistInstance(instance, prop, val);
	},
	componentInstance: function(prop, val) {
		var level = this._findParentLevel(),
			instance = this.parentInstance(level);

		if(instance) this.lastComponentInstance = instance; //so we can test component not in helpers/events/cbs (i.e. from Ultimate.components)
		else instance = this.lastComponentInstance;

		return this._assistInstance(instance, prop, val);
	},
	instance: function(prop, val) { //alias for this.componentInstance()
		return this.currentInstance(prop, val);
	},


	_assistInstance: function(instance, prop, val) {
		if(!prop && !val) return instance;
		else if(prop) {
			if(_.isFunction(instance[prop])) return instance[prop].call(this);
			else return instance[prop];
		}
		else if(val) return instance[prop] = val;
	},
	
	_findParentLevel: function(level) {
		level = level || 0;
		var instance = this.parentInstance(level);
		if(instance && instance.className == this.className) return level;
		else if(instance) return this._findParentLevel(level + 1);
	},
	
	
	parentInstance: function(level) {
		return Template.parentInstance(level);
	},
	
	
	$: function(selector) {
		return this.componentInstance().$(selector);
	},
	find: function(selector) {
		return this.componentInstance().find(selector);
	},
	findAll: function(selector) {
		return this.componentInstance().findAll(selector);
	},
	firstNode: function() {
		return this.componentInstance().firstNode;
	},
	lastNode: function() {
		return this.componentInstance().lastNode;
	},
	view: function() {
		return this.componentInstance().view;
	},
	
	
	//override methods from UltimateReactive mixin to be specific to component templates
	getReactiveDict: function() {
		return this.componentInstance()._reactiveDict = this.componentInstance()._reactiveDict || new ReactiveDict;
	}
});



Blaze.TemplateInstance.prototype.parentTemplate = function(level) {
	level = typeof level === 'undefined' ?  1 : level;
	
    var view = Blaze.currentView;
    while (view) {
        if (view.name.substring(0, 9) === "Template." && !(level--)) {
            return view.templateInstance();
        }
        view = view.parentView;
    }
};

Template.parentInstance = function(level) {
	if(!Template.instance()) return null;
	return Template.instance().parentTemplate(level);
};