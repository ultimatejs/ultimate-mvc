UltimateModel.extendStatic({
	agg: function(aggregates) {
		var aggs = _.toArray(arguments);
		this.attachAggregates(aggs);	
		
		return this;
	},
	attachAggregates: function(aggregates) {
		if(!_.isArray(aggregates)) return;	
		this._aggregates = this.getAggregates().concat(aggregates);
	},
	getAggregates: function() {
		return this._aggregates = this._aggregates || [];
	},



	groupBy: function(groupModelOrField, options) {
		this._group = groupModelOrField;
		
		options = options || {};
		this._groupBySelector = options.selector || {};
		
		delete options.selector;
		this._groupByOptions = options || {};

		return this;
	},


	format: function(useFormatter) {
		this.___useFormatter = useFormatter;
		return this;
	},
	
	/** NOT ALLOWED ANYMORE -- maybe we add em back with a way to allow them individually server side
	aggSum: function(field, selector, reactive) {
		return this._prepareBasicAggregate('sum', _.toArray(arguments));
	},
	aggAvg: function(field, selector, reactive) {
		return this._prepareBasicAggregate('avg', _.toArray(arguments));
	},
	aggMin: function(field, selector, reactive) {
		return this._prepareBasicAggregate('min', _.toArray(arguments));
	},
	aggMax: function(field, selector, reactive) {
		return this._prepareBasicAggregate('max', _.toArray(arguments));
	},
	aggCount: function(selector, reactive) {
		return this._prepareBasicAggregate('count', _.toArray(arguments));
	},
	_prepareBasicAggregate: function(operator, fieldSelectorReactive) {
		var agg = {}; 
		
		agg.operator = operator;
		if(operator != 'count') agg.field = fieldSelectorReactive.shift();
		agg.selector = fieldSelectorReactive.shift() || {};
		agg.reactive = fieldSelectorReactive.shift();
		
		this.attachAggregates([agg]);

		return this;
	}
	**/
});

UltimateModel.extend({
	format: function(useFormatter) {
		this.___useFormatter = useFormatter;
		return this;
	}
});