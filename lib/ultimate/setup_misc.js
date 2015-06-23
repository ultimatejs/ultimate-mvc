_.extend(Ultimate, {
  setupComponent: function(methods) {
    if(_.isString(methods.template)) methods.templateName = methods.template;
    else if(!methods.template) methods.templateName = this._discernTemplateName();
    else if(methods.template) methods.templateName = methods.template.viewName.replace('Template.'); //actual tmpl provided

    methods.template = Template[methods.templateName]; //string provided, but re-assigned as actual tmpl 
  },

  _discernTemplateName: function() {
    var parentName = this.parent.prototype.templateName;
		
    if(parentName && Template[parentName]) {
			Template[parentName].copyAs(this.className); //copy parent if template exists
    }
   
	 	return this.className;  //otherwise, className doubles as template name
  },

  setupPermissions: function(methods) {
    if(methods.collection) return;
    if(methods.model) methods.collection = methods.model.collection;
    else {
      var modelName = this.className.replace('Permissions', '');
      methods.collection = Ultimate.classes[modelName].collection;
    }
  }
});