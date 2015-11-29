Ultimate('DatatableComponentModelMixin').extends({
	mixinTo: ['UltimateModel'],
	strict: false,
}, {
	onConfigureSubscription: function(name, handle) {
		//used by UltimateDatatableComponent
		handle.selector = function(userId) {
			return this._extractSub(name, userId).selector;
		}.bind(this);
		
		
		//used by UltimateDatatableComponent observeUser feature
		handle.subName = name;
		handle.class = this;
		handle.observeUser = function() {
			var subFunc = this.prototype.subscriptions[name];
			return _.isFunction(subFunc) ? /observeUser/.test(subFunc.toString()) : subFunc.observeUser;
		}.bind(this);
	}
});