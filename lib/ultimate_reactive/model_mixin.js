Ultimate('ReactiveModelMixin').extends({
	mixinTo: ['UltimateModel'],
	strict: false,
}, {
	onConfigureSubscription: function(name, handle) {
		//assign this to the function so UltimateDatatableComponent can access them without calling the function
		//the function is ultimately called by Tabular as its 'pub' property.
		//subscriptionName and limit is used by subLimit in UltimateComponent, unrelated to datatable
		handle.model = this;


		//used by UltimateReactive
		handle.subscriptionName = function(userId) {
			return name;
		}.bind(this);
		handle.limit = function(userId) {
			return this._extractSub(name, Ultimate.userId(userId)).limit || 10;
		}.bind(this);
	}
});