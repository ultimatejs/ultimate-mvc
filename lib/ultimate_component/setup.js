Ultimate('UltimateSetupComponent').extends({
	abstract: true,
	mixinTo: ['UltimateComponentParent'],
	config: ['template', 'plain', 'html', 'childTemplate', 'mixinHelpers', 'mixinEvents', 'mixinCallbacks'],
	
	onAddMethods: function(methods) {
		if(methods.abstract || this.isAbstract()) return;
		this._setupComponent(methods);
	},
	
	
  _setupComponent: function(methods) {
    if(_.isString(methods.template)) {
			if(Template[methods.template]) {
				Template[methods.template].copyAs(this.className); //clone so different components that dont inherit each other can use the same template without colliding helpers/events
				methods.templateName = methods.template;
			}
			else {
				Template.ultimate_abstract_template.copyAs(this.className); //Component class likely intended to be abstract
				methods.templateName = methods.template; //so we use a blank template, and they can override it in child components
			}
		}
    else if(!methods.template) methods.templateName = this._discernTemplateName();
    else if(methods.template) methods.templateName = methods.template.viewName.replace('Template.'); //actual tmpl provided


		if(!Template[methods.templateName]) Template.ultimate_abstract_template.copyAs(this.className); //template forgotten
		
    methods.template = Template[methods.templateName]; //string provided, but re-assigned as actual tmpl 
  },

  _discernTemplateName: function() {
    var parentName = this.parent.templateName;
		
    if(parentName && Template[parentName]) {
			Template[parentName].copyAs(this.className); //copy parent if template exists
    }
   
	 	return this.className;  //otherwise, className doubles as template name
  }
});