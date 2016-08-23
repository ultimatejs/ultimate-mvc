Ultimate('UltimateChart').extends(UltimateComponent, {
	abstract: true,
	//type: '',
	//chartColumns: [],
	//label: function() {},
	//noDataTitle: '',
	//colors: ['#000000'] || function() { return ['#0000000'] }

	chartName: function() {
		return this.templateName + '-chart';
	},

	onRendered: function() {
		if(this.realtime === true) {
			this.setupRealtimeLoad();
		}
		else {
			this.loadDataIntoChart();
		}
	},

	loadDataIntoChart: function() {
		this.$('.ultimate-chart').attr('id', this.chartName());

		this.chartColumns((error, columns) => {
			if(error) return [];

			columns = this.prepareColumns(columns);
			let data = this.getData(columns);
			c3.generate(data);
		});

	},

	prepareColumns: function(columns) {
		if(this.isColumnsEmpty(columns)) return [[this.noDataTitle || 'No Data', 9999999999999]];
		else return columns;
	},
	isColumnsEmpty: function(columns) {
		if(_.isEmpty(columns)) return true;
		else {
			return !columns.map(function(column) {
				return column[1];
			}).reduce(function(acc, num) {
				return acc + num; //determine if all columns have zero values, in which case chart is also considered empty
			});
		}
	},

	getData: function(columns) {
		var type = this.type || 'pie';

		var config = {
			bindto: '#'+this.chartName(),
			data: {
				columns: columns || this.getColumnsSync(),
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

	//MAY NOT WORK ANYMORE. I CODED WHAT I THINK SHOULD KEEP THIS FUNCTIONALITY VIA THE CODE:  `columns || this.getColumnsSync()` in `getData()` BUT I HAVENT TESTED IT.  WHEN WE NEED IT, WE CAN TEST IT.
	setupRealtimeLoad: function() {
		this.$('.ultimate-chart').attr('id', this.chartName());

		var oldData = this.getData(),
			oldColumns = oldData.data.columns,
			chart = c3.generate(oldData);

		/** can get glitchy quick if data changes too quickly -- could be debounced, but an interval is probably the most straightforward
		this.autorun(function(computation) {
			var data = this.getData().data;

			if(computation.firstRun) return; //since begining of onRendered will have handled it already

			console.log("NEW CHART DATA", this.className, data);

			if(!_.isEqual(data, oldData)) {
				chart.load(data); //and the graph will get glitchy if re-loaded too quickly
				oldData = data;
			}
		}.bind(this));
		**/


		this.interval = this.setInterval(function() {
			var data = this.getData().data;

			if(!_.isEqual(data.columns, oldColumns)) {
				chart.load(data); //and the graph will get glitchy if re-loaded too quickly
				oldColumns = data.columns;
			}
		}, 2500);
	},

	getColumnsSync: function() {
		var columns = UltimateUtilities.extract(this.chartColumns, this);
		if(this.isColumnsEmpty(columns)) return [[this.noDataTitle || 'No Data', 9999999999999]];
		else return columns;
	},


	onDestroyed: function() {
		this.clearInterval(this.interval);
	}
});
