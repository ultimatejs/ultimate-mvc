Ultimate('UltimateRelationsBelongsPublisher').extends(UltimateRelationsHasBelongsPublisher, {
	prepareSelector: function() {
		this._previousInputIds = this._ids();
		this.selector[this.key] = {$in: this._previousInputIds};	
	},
	_ids: function() {
		return this.fetchValues(this.getParent().getCursor(), this.fk);
	}
});