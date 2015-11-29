UltimateModalTabbed = Ultimate('UltimateModalTabbed').extends(UltimateModal, {
	construct: function(id, tabs, options) {
		options = options || {};
		options.tabs = tabs;
		
		this.callParentConstructor(id, options);
		this._dep = new Tracker.Dependency;
		this.currentTabIndex = 0;
	},


	data: function() {
		var data = this.applyParent('data');
		
		data.currentTemplate = this.currentTemplate.bind(this);
		data.currentContext = this.currentContext.bind(this);
		
		data.header = data.header || 'modal_tabbed_header';
		data.footer = data.footer || 'modal_tabbed_footer';
		
		data.headerData = {
			tabs: this.getTabs(),
			selected: this.selected.bind(this)
		};

		data.footerData = {
			submitText: data.closeText || data.submitText
		};
		
		
		return data;
	},
	
	
	currentTemplate: function() {
		var index = this.getCurrentTabIndex();
		return this.options.tabs[index].template;
	},
	currentContext: function() {
		var index = this.getCurrentTabIndex(),
			 context = this.options.tabs[index].data;
			 
		if(_.isFunction(context)) return context.call();
		else if(context.__type && context.reactive) {
			return context.reactive('ultimate_modal_tabbed_'+this.id);
		}
		else return context;
	},
	getCurrentTabIndex: function() {
		this._dep.depend();
		return this.currentTabIndex;
	},
	setCurrentTabIndex: function(index) {
		this.currentTabIndex = index;
		this._dep.changed();
	},
	
	selected: function(index) {
		return this.getCurrentTabIndex() === index ? 'active' : ''; 
	},
	
	getTabs: function() {
		return _.map(this.options.tabs, function(tab, index) {
			tab.index = index;
			return tab;
		});
	},
	
	open: function() {
		this.onTabClick();
	},
	onTabClick: function() {
		var self = this;
		
		this.tabElement().find('li').on('click', function(e) {
			e.preventDefault();
			
			var index = self.tabElement().find('li').index(this);
			self.setCurrentTabIndex(index);
		});
	},
	tabElement: function() {
		return this.element().find('.tab-bar');
	}
});

/**
d = new UltimateModalTabbed('settings', {
	closeText: 'Done',
	tabs: [
		{
			icon: '/img/logo.png',
			width: 60,
			title: 'General',
			template: 'empty_modal_content',
			data: Meteor.user()
		},
		{
			icon: '/img/logo.png',
			width: 60,
			title: 'Help',
			template: 'auto_submit',
			data: Meteor.user()
		},{
			icon: '/img/logo.png',
			width: 60,
			title: 'Payment',
			template: 'empty_modal_content',
			data: Meteor.user()
		}
	]
});
**/