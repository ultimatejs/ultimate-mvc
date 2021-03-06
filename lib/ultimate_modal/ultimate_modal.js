UltimateModal = Ultimate('UltimateModal').extends({
	abstract: true,
	construct: function(id, options) {
		this.id = id;
		this.setOptions(options);
	},


	show: function(callback) {
		this.render();
		this.element().modal('show');
		this.callback = callback;
	},
	hide: function() {
		this.element().modal('hide');	
	},
	
	setOptions: function(options) {
		var defaults = {id: this.id, cancelText: 'Cancel', submitText: 'Submit', noSubmit: true};
		this.options = _.extend(defaults, options);
		
		if(this.options.template) {
			this.options.currentTemplate = this.options.template;
			this.options.currentContext = this.options.data;
			delete this.options.template;
			delete this.options.data;
		}
	},
	
	render: function() {
		if(this.isRendered()) return;

		this._modal = Blaze.renderWithData(this.template(), this.data(), $('body')[0]);
		
		this.onOpen();
		this.onClose();
		this.onSubmit();
	},
	remove: function() {
		Blaze.remove(this._modal);
	},
	isRendered: function() {
		return this.element().length > 0;
	},
	element: function() {
		return $('#'+this.id);
	},
	
	template: function() {
		return Template.modal_popup;
	},
	data: function() {
		return this.options;
	},
	
	onOpen: function() {
		this.element().on('show.bs.modal', this.open.bind(this));
		
		$(document).on('keypress.enter_modal', function(e) {
			if(e.which == 13) {
				this.submit();
        e.preventDefault();
        return false;
			}
		}.bind(this));
	},
	onClose: function() {
		this.element().on('hidden.bs.modal', function() {
			this.remove();
			$(document).off('.enter_modal');
		}.bind(this));
	},
	onSubmit: function() {
		this.element().find('.modalSubmit').on('click', this.submit.bind(this));
	},
	open: function() {},
	submit: function() {
		var hide = this.applyCallback();
		if(hide !== false) this.hide();
	},
	applyCallback: function() {
		var args = _.toArray(arguments),
			context = args.shift() || this;

		if(this.callback) return this.callback.apply(context, args);
	}
});