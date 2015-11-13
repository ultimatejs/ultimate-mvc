UltimateDatatableComponent.extend({
	getJqueryDatatable: function() {
		return $(this.currentEvent.currentTarget).closest('table').DataTable()
	},
	
	tables: function() {
		var dt = this.getJqueryDatatable();
		return dt.tables.apply(dt, arguments);
	},
	table: function() {
		var dt = this.getJqueryDatatable();
		return dt.table.apply(dt, arguments);
	},
	columns: function() {
		var dt = this.getJqueryDatatable();
		return dt.columns.apply(dt, arguments);
	},
	column: function() {
		var dt = this.getJqueryDatatable();
		return dt.column.apply(dt, arguments);
	},
	rows: function() {
		var dt = this.getJqueryDatatable();
		return dt.rows.apply(dt, arguments);
	},
	row: function(selector) {
		var dt = this.getJqueryDatatable();
		
		if(!selector && this.currentEvent)	{
			selector = $(this.currentEvent.currentTarget).parents('tr');
			return dt.row(selector);
		}
		
		return dt.row.apply(dt, arguments);
	},
	cells: function() {
		var dt = this.getJqueryDatatable();
		return dt.cells.apply(dt, arguments);
	},
	cell: function(selector) {
		var dt = this.getJqueryDatatable();
	
		if(!selector && this.currentEvent)	{
			selector = $(this.currentEvent.currentTarget).parents('td');
			return dt.cell(selector);
		}
		
		return dt.cell.apply(dt, arguments);
	},
	
	
	ajax: function() {
		var dt = this.getJqueryDatatable();
		return dt.ajax.apply(dt, arguments);
	},
	clear: function() {
		var dt = this.getJqueryDatatable();
		return dt.clear.apply(dt, arguments);
	},
	DatatableData: function() { //changed from just 'data' so that UltimateComponent's data method still works
		var dt = this.getJqueryDatatable();
		return dt.data.apply(dt, arguments);
	},
	destroy: function() {
		var dt = this.getJqueryDatatable();
		return dt.destroy.apply(dt, arguments);
	},
	draw: function() {
		var dt = this.getJqueryDatatable();
		return dt.draw.apply(dt, arguments);
	},
	init: function() {
		var dt = this.getJqueryDatatable();
		return dt.init.apply(dt, arguments);
	},
	offEvent: function() {
		var dt = this.getJqueryDatatable();
		return dt.off.apply(dt, arguments);
	},
	onEvent: function() {
		var dt = this.getJqueryDatatable();
		return dt.on.apply(dt, arguments);
	},
	one: function() {
		var dt = this.getJqueryDatatable();
		return dt.one.apply(dt, arguments);
	},
	order: function() {
		var dt = this.getJqueryDatatable();
		return dt.order.apply(dt, arguments);
	},
	page: function() {
		var dt = this.getJqueryDatatable();
		return dt.page.apply(dt, arguments);
	},
	search: function() {
		var dt = this.getJqueryDatatable();
		return dt.search.apply(dt, arguments);
	},
	settings: function() {
		var dt = this.getJqueryDatatable();
		return dt.settings.apply(dt, arguments);
	},
	state: function() {
		var dt = this.getJqueryDatatable();
		return dt.state.apply(dt, arguments);
	}
});