UltimateModalForm = Ultimate('UltimateModalForm').extends(UltimateModal, {
	data: function() {
		var data = UltimateModal.prototype.data.call(this); //unfortunately we can't use applyParent for more than one jump
		data.formData = this.formData();
		return data;
	},
	formData: function() {
		return {
			id: this.id.replace('_modal', ''),
			validation: 'blur',
			class: 'form-horizontal mt-sm'
		};
	}
});