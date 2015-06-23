Ultimate('UltimateChart').extends(UltimateComponent, {
	abstract: true,
	//type: '',
	//chartColumns: [],
	//label: function() {},
	
	
	getData: function() {
		var type = this.type || 'pie';
		
		var config = {
			bindto: '#'+this.chartName(),
			data: {
				columns: (function() {
					var columns = UltimateUtilities.extract(this.chartColumns, this);
					if(this.isColumnsEmpty(columns)) return [[this.noDataTitle || 'No Data', 9999999999999]];
					else return columns;
				}.bind(this))(),
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

		var chart = c3.generate(this.getData()),
			oldData;

		this.autorun(function(computation) {
			var data = this.getData().data;
			
			if(!_.isEqual(data, oldData)) {
				chart.load(data);
				oldData = data;
			}
		});
	}
});