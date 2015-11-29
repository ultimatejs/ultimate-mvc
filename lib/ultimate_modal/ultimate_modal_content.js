UltimateModalContent = Ultimate('UltimateModalContent').extends(UltimateModal, {
	construct: function(id, data, options) {
		options = options || {};
		
		options.currentTemplate = options.template || 'empty_modal_content';
		options.currentContext = data;
		
		delete options.template;
		
		this.callParentConstructor(id, options);
	},


	data: function() {
		var data = this.applyParent('data');
		return data; //was doing other stuff here, but not anymore (for now)
	}
});