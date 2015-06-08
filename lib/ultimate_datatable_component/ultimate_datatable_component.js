Ultimate('UltimateDatatableComponent').extends(Meteor.isClient ? UltimateComponent : UltimateClass, {
	abstract: true,
	name: null,
	pub: null,
	subscription: null,
	mode: null,
	collection: null,
	selector: null,
	columns: [],
	cssClasses: null,
	useUltimateComponentModel: null, 
	
	_optionsRegex: /^(model|allow|allowFields|extraFields|scrollY|paging|autoWidth|deferRender|info|jQueryUI|lengthChange|ordering|paging|processing|scrollX|scrollY|searching|serverSide|stateSave|ajax|data|createdRow|drawCallback|footerCallback|formatNumber|headerCallback|infoCallback|initComplete|preDrawCallback|rowCallback|stateLoadCallback|stateLoaded|stateLoadParams|stateSaveCallback|stateSaveParams|deferLoading|destroy|displayStart|dom|lengthMenu|orderCellsTop|orderClasses|order|orderFixed|orderMulti|pageLength|pagingType|renderer|retrieve|scrollCollapse|search|searchCols|searchDelay|search|stateDuration|stripeClasses|tabIndex|columnDefs|language)$/,
	_dtEventsRegex: /^(onColumn-sizing|onColumn-visibility|onDestroy|onDraw|onError|onInit|onLength|onOrder|onPage|onPreXhr|onProcessing|onSearch|onStateLoaded|onStateLoadParams|onStateSaveParams|onXhr)$/,
	
	
	_applyBind: function() {
		if(this.useUltimateComponentModel) return UltimateComponentModel.prototype._applyBind.apply(this, arguments);
		else return UltimateComponent.prototype._applyBind.apply(this, arguments); 
		//else return this.applyParent('_applyBind', arguments);
	},
	
	onStartup: function() {
		if(Meteor.isClient || this.isAbstract()) return;

		//server needs datatable() to run so Tabular publications are setup
		this.datatable();
		Ultimate.components[this.className] = this;
	},


	onBeforeComponentStartup: function() {
		//this only runs on client since onBeforeComponentStartup isn't called on server
		//which is why we have 2 deleteOptionsFromPrototype() calls between these 2 event handler methods
		this.template = Template.ultimate_datatable_component.copyAs(this.templateName);
		this.datatable();
	},
	
	
	datatable: function() {
		return this._tabular = this._tabular || new Tabular.Table(this.getOptions());
	},
	getOptions: function() {
		var options = {
				name: this.getName(),
			  	collection: this.getCollection(),
				pub: this.getSubscription(),
				selector: this.getSelector(),
		  		columns: this.getColumns()
			};
		
		return _.extend(options, this.getExtraOptions());
	},
	

	getExtraOptions: function() {
		return _.chain(this.getPrototype())
			.filterPrototype(this._isOption)
			.mapObject(this._resolveOption, this)
			.value();
	},
	_isOption: function(option, prop) {		
		return this._optionsRegex.test(prop) && this.getPrototype().hasOwnProperty(prop);
	},
	_resolveOption: function(option, prop) {
		if(_.isFunction(option)) return option.bind(this);
		else return option;
	},
	

	_isHelper: function(method, prop) {
		return !this._helperRegex.test(prop) && !this._optionsRegex.test(prop) && this.isMethod(prop) && this._isFunction(method)
	},
	
	onRendered: function() {
		this.setupDatatableEvents();
	},
	
	
	getName: function() {
		return this.name || this.getCollection()._name;
	},
	getCollection: function() {
		if(this.hasOwnProperty('model')) return UltimateUtilities.classFrom(this.model).collection;
		else return this.collection || UltimateUtilities.classFrom(this.sub.model).collection;
	},
	getSubscription: function() {
		return this.sub || this.pub;
	},
	getSelector: function() {
		//we hackily assign selector to subscription handle in ultimate_subscription/extend_ultiamte_model.js
		if(this.sub) return this.sub.selector || this.selector; 
		else return this.selector;
	},
	
	
	getColumns: function() {
		return _.map(this.tableColumns, function(column) {
			if(column.tmpl) {
				var tmplName = column.tmpl;
				column.tmpl = Meteor.isClient && Template[tmplName];
				if(Meteor.isClient) this.setupIncludes([tmplName]); //included cell templates will inherit helpers from here
			}

			if(column.render) {
				var oldRender = column.render;
				column.render = function() {
					if(this.ready()) return oldRender.apply(this, arguments);
				}.bind(this);
			}
			return column;
		}, this);
	},
	
	
	getCssClasses: function() {
		return this.cssClasses;
	},
	getHelpers: function() {
		var helpers = this.callParent('getHelpers');

		helpers.getCssClasses = this.getCssClasses.bind(this);
		helpers.datatable = this.datatable.bind(this);

		return helpers;
	},
	
	rowData: function(key) {
		var data = this.datatable().row(this.currentEvent.currentTarget).data();
		return key ? data[key] : data;
	},
	currentData: function(key) {
		var data;
		
		if(this.currentEvent && (data = this.rowData(key))) return data;
		else return this.applyParent('currentData', arguments);
	},
	
	
	setupDatatableEvents: function() {
		_.chain(this.getPrototype())
			.filterPrototype(this._isDatatableEvent)
			.each(function(handler, name) {
				name = name.replace('on', '').capitalizeOnlyFirstLetter();
				this.datatable().on(name+'.dt', handler);
			}, this);
	},
	_isDatatableEvent: function(option, prop) {		
		return this._dtEventsRegex.test(prop);
	}
});