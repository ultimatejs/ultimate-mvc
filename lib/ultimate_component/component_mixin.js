Ultimate('UltimateSetupComponent').extends({
	abstract: true,
	mixinTo: ['UltimateComponentParent'],
	config: ['plain', 'html', 'childTemplate', 'mixinHelpers', 'mixinEvents', 'mixinCallbacks'],
	
	onAddMethods: function(methods) {
		this._setupComponent(methods);
	},
	

  _setupComponent: function(methods) {
		if(this.owner().isCoreUltimateClass() && !Template[this.owner().className]) return; //Most Ultimate abstract parents aren't supposed to be setup, unless they have a template like UltimateChart
		
		var className = this.owner().className,
			owner = this.owner();
		
    if(_.isString(methods.template)) { //component specifies another template to use instead of one based on its name
			if(Template[methods.template]) { //template exists
				Template[methods.template].copyAs(className); //clone so different components that dont inherit each other can use the same template without colliding helpers/events
			}
			else Template.ultimate_abstract_template.copyAs(className); //Component class likely intended to be abstract
			
			owner.templateName = className; //final templateName is the component's name
		}
    else if(!methods.template) owner.templateName = this._inheritTemplateName(className); //inherit parent templates
    else if(methods.template) owner.templateName = methods.template.viewName.replace('Template.'); //actual tmpl provided


		if(!Template[owner.templateName]) Template.ultimate_abstract_template.copyAs(owner.templateName); //template forgotten
		
    owner.template = Template[owner.templateName]; //string provided, but re-assigned as actual tmpl 
  },

  _inheritTemplateName: function(className) {
    var parentName = this.owner().parent.templateName;
		
    if(parentName && Template[parentName]) {
			Template[parentName].copyAs(className); //copy parent if template exists
    }
   
	 	return className;  //otherwise, className doubles as template name
  }
});