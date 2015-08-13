Ultimate('UltimateDatatableComponent').extends(Meteor.isClient ? UltimateComponent : UltimateClass, {
	abstract: true,
	isUltimateDatatableComponent: true,
	name: null,
	pub: null,
	subscription: null,
	mode: null,
	collection: null,
	selector: null,
	columns: [],
	cssClasses: null,
	useModel: null, 
	
	_optionsRegex: /^(model|allow|allowFields|extraFields|scrollY|paging|autoWidth|deferRender|info|jQueryUI|lengthChange|ordering|paging|processing|scrollX|scrollY|searching|serverSide|stateSave|ajax|data|createdRow|drawCallback|footerCallback|formatNumber|headerCallback|infoCallback|initComplete|preDrawCallback|rowCallback|stateLoadCallback|stateLoaded|stateLoadParams|stateSaveCallback|stateSaveParams|deferLoading|destroy|displayStart|dom|lengthMenu|orderCellsTop|orderClasses|order|orderFixed|orderMulti|pageLength|pagingType|renderer|retrieve|scrollCollapse|search|searchCols|searchDelay|search|stateDuration|stripeClasses|tabIndex|columnDefs|language)$/,
	_dtEventsRegex: /^(onColumn-sizing|onColumn-visibility|onDestroy|onDraw|onError|onInit|onLength|onOrder|onPage|onPreXhr|onProcessing|onSearch|onStateLoaded|onStateLoadParams|onStateSaveParams|onXhr)$/,
	
	
	_applyBind: function() {
		if(this.useModel) return UltimateComponentModel.prototype._applyBind.apply(this, arguments);
		else return UltimateComponent.prototype._applyBind.apply(this, arguments); 
	},
	
	onCreated: function() { //CALLED ON CLIENT ONLY
		if(this.isAbstract() || this._tabular) return;
		
		var uc = Ultimate.components[this.className]; //instantiated class from UltimateComponent.onBeforeStartup
		uc.datatable(); //needs to run all methods off instantiated class
	},
	
	onStartup: function() { //CALLED ON SERVER ONLY
		if(this.isAbstract() || Meteor.isClient || this._tabular) return;

		this.datatable();
		Ultimate.components[this.className] = this; //basic prototype extended from UltimateClass on server is all thats needed to run methods called by datatable()
	},


	onBeforeComponentStartup: function() {
		//this only runs on client since onBeforeComponentStartup isn't called on server
		//which is why we have 2 deleteOptionsFromPrototype() calls between these 2 event handler methods
		this.template = Template.ultimate_datatable_component.copyAs(this.templateName);
	},
	
	
	datatable: function() {
		return this._tabular = this._tabular || new Tabular.Table(this.getOptions());
	},
	getOptions: function() {
		var selector = this.getSelector();
		
		if(Meteor.isClient && _.isFunction(selector)) selector = selector(Meteor.userId());

		var options = {
				name: this.getName(),
			  collection: this.getCollection(),
				pub: this.getSubscription(),
				selector: selector,
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
		return this.name || this.className;
	},
	getCollection: function() {
		if(this.hasOwnProperty('model')) return UltimateUtilities.classFrom(this.model).collection;
		else return this.collection || UltimateUtilities.classFrom(this.getSub().model).collection;
	},
	getSubscription: function() {
		return this.sub ? this.sub[0] : this.pub; 
	},
	getSelector: function() {
		//we hackily assign selector to subscription handle in ultimate_subscription/extend_ultiamte_model.js
		if(this.getSub()) return this.getSub().selector; 
		else return this.selector;
	},
	getSub: function() {
		//NOTE: SUBS ARE TURNED INTO ARRAYS BY COMPONENT SETUP CODE TO HOLD MULTIPLE SUBSCRIPTIONS
		//BUT THE DATATABLE COMPONENT ONLY USES 1. WELL, ON THE CLIENT AN ARRAY OF SUBS IS MAINTAINED
		//BUT IN THE CASE OF THE DATATABLE COMPONENT CALLED ON THE SERVER, THE PROTOTYPE OF THE COMPONENT
		//IS USED INSTEAD, WHICH WILL HAVE THE SUB NOT IN ARRAY (BECAUSE THE COMPONENT HASN'T BEEN READIED DURING
	  //INSTANTIATION LIKE ON THE CLIENT)
		return _.isArray(this.sub) ? this.sub[0] : this.sub;
	},
	
	getColumns: function() {
		var columns = UltimateUtilities.extract(this.tableColumns, this);
		
		return _.filter(columns, function(column) {
			if(column.tmpl) {
				var tmplName = column.tmpl;
				column.tmpl = Meteor.isClient && Template[tmplName];
				if(Meteor.isClient) this.setupIncludes([tmplName]); //included cell templates will inherit helpers from here
			}

			if(column.render) {
				if(_.isString(column.render)) { 
					var render = column.render,
						methods = render.split('.');
						
					if(methods[1]) { //render: 'agent().fullName()' || 'agent.fullName'
						var renderOne = this._parseRenderMethod(methods[0]),
							renderTwo = this._parseRenderMethod(methods[1]);
						
						column.render = function(val, type, model) {
							if(this.ready()) {
								if(!model[renderOne.funcName]) return 'prop unavailable';
								var prop = renderOne.isProp ? model[renderOne.funcName] : model[renderOne.funcName].apply(model, renderOne.params);
								
								if(!prop) return 'object unavailable';
								return renderTwo.isProp ? prop[renderTwo.funcName] : prop[renderTwo.funcName].apply(prop, renderTwo.params);
							}
						}.bind(this);
					}
					else { //render: 'fullName()' || render: 'fullName'
						render  = this._parseRenderMethod(render);
						
						column.render = function(val, type, model) {
							if(this.ready())  return render.isProp ? model[render.funcName] : model[render.funcName].apply(model, render.params);
						}.bind(this);
					}
				}
				else if(_.isFunction(column.render)) { //render: function(model) {}
					var oldRender = column.render;
					
					column.render = function(val, type, model) {
						if(this.ready()) {
							if(this.useModel) return oldRender.apply(model, [this, val, type]);
							else return oldRender.apply(this, [model, val, type]);
						}
					}.bind(this);
				}
				else if(_.isObject(column.render)) { //render: function(model) {}
					
					_.each(column.render, function(func, name) {
						if(!_.isFunction(func)) return;
						
						var oldRender = func;
						
						column.render[name] = function(val, type, model) {
								var args = [model, type, val];
								if(this.ready()) return oldRender.apply(this, args);
							}.bind(this);
					}.bind(this));
				}
			}

			if(column.admin && !Meteor.user().isAdmin()) return;

			if(column.show && !column.show.call(this, column, Meteor.userId())) return; 

			return column;
		}, this);
	},
	_parseRenderMethod: function(render) {
		var firstParensIndex = render.indexOf('('),
			secondParensIndex = render.indexOf(')'),
			hasParams = secondParensIndex > firstParensIndex + 1,
			isProp = firstParensIndex === -1,
			funcName = isProp ? render : render.substr(0, firstParensIndex);
		
		if(hasParams) {
			var params = render.substring(firstParensIndex + 1, render.length - 1),
					paramsArray = params.split(',').map(function(param) { 
						param = param.trim();
	
						var num = parseInt(param);
	
						if(_.isNumber(num) && !_.isNaN(num)) param = num;
						else if(param == 'true' || param == 'false') param = !!(new Boolean(param));
						else if(param.indexOf('"') === 0 || param.indexOf("'") === 0) param = param.substring(1, param.length -1); //remove extra quotes, since string already
	
						return param;
					});
				
				return {funcName: funcName, isProp: false, params: paramsArray};
		}
		else return {funcName: funcName, isProp: isProp};
	},
	
	getCssClasses: function() {
		return this.cssClasses;
	},
	getLimit: function() {
		return this.limit || 10;
	},
	getHelpers: function() {
		var helpers = this.callParent('getHelpers');

		helpers.getCssClasses = this.getCssClasses.bind(this);
		helpers.datatable = this.datatable.bind(this);

		return helpers;
	},
	
	rowData: function(key) {
		var data = this.row().data();
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