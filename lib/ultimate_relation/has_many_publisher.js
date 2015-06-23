Ultimate('UltimateRelationsHasPublisher').extends(UltimateRelationsHasBelongsPublisher, {
	prepareSelector: function() {
		this._previousInputIds = this._ids();
		this.selector[this.fk] = {$in: this._previousInputIds};
	},
	_ids: function() {
		return this.getParent().outputIds();
	}
});
