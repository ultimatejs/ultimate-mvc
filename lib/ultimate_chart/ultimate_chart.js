Ultimate('UltimateChart').extends(UltimateComponent, {
	abstract: true,
	//type: '',
	//chartColumns: [],
	//label: function() {},
	//noDataTitle: '',
	//colors: ['#000000'] || function() { return ['#0000000'] }
	
	getData: function() {
		var type = this.type || 'pie';
		
		var config = {
			bindto: '#'+this.chartName(),
			data: {
				columns: this.getColumns(),
				type: type,
				unload: true
			}
		};
		
		config[type] = {label: {}};
		
		config[type].label.format = function(value, ratio, id) {
			if(value == 9999999999999) return 0;
			else return this.label ? this.label(value, ratio, id) : value;
		}.bind(this);
		
		if(this.colors) config.color =  {pattern: _.shuffle(UltimateUtilities.extract(this.colors, this)) };
		
		return config;
	},
	getColumns: function() {
		var columns = UltimateUtilities.extract(this.chartColumns, this);
		if(this.isColumnsEmpty(columns)) return [[this.noDataTitle || 'No Data', 9999999999999]];
		else return columns;
	},
	isColumnsEmpty: function(columns) {
		if(_.isEmpty(columns)) return true;
		else {
			return !columns.map(function(column) {
				return column[1];
			}).reduce(function(acc, num) {
				return acc + num;
			});
		}
	},
	chartName: function() {
		return this.templateName + '-chart';
	},
	onRendered: function() {
		this.$('.ultimate-chart').attr('id', this.chartName());

		var oldData, chart = c3.generate(this.getData()),
			lastUpdated = new Date;

		this.autorun(function(computation) {
			var data = this.getData().data;
			
			if(computation.firstRun) return; //since begining of onRendered will have handled it already

			if(!_.isEqual(data, oldData)) {
				chart.load(data); //and the graph will get glitchy if re-loaded too quickly
				oldData = data;
			}
		}.bind(this));
	}
});