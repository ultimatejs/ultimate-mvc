Ultimate('UltimateSetupCollectionHooks').extends({
	abstract: true,
	strict: true,
	mixinTo: ['UltimateModel'],
	config: ['enableHooks'],
	
	onAddMethods: function(methods) {
		this._setupHooks(methods);
	},

	_setupHooks: function(methods) {
		if(this._isEnabled(methods, 'before', 'insert')) this._setupBeforeInsert();
		if(this._isEnabled(methods, 'before', 'update')) this._setupBeforeUpdate();
		if(this._isEnabled(methods, 'before', 'upsert')) this._setupBeforeUpsert();
		if(this._isEnabled(methods, 'before', 'remove')) this._setupBeforeRemove();
		
		if(this._isEnabled(methods, 'after', 'insert')) this._setupAfterInsert();
		if(this._isEnabled(methods, 'after', 'update')) this._setupAfterUpdate();
		if(this._isEnabled(methods, 'after', 'remove')) this._setupAfterRemove();
		
		if(this._isEnabled(methods, 'before', 'findOne')) this._setupBeforeFindOne();
		if(this._isEnabled(methods, 'after', 'findOne')) this._setupAfterFindOne();
		if(this._isEnabled(methods, 'before', 'find')) this._setupBeforeFind();
		if(this._isEnabled(methods, 'after', 'find')) this._setupAfterFind();
		
		if(this._isEnabled(methods, 'invalid', 'insert')) this._setupValidateInsert();
		if(this._isEnabled(methods, 'invalid', 'update')) this._setupValidateUpdate();
	},
	_isEnabled: function(methods, stage, action) {
		return _.contains(this._onMethods(methods), stage+action.capitalizeFirstLetter())
			  && _.isEmpty(this.owner().collection._hookAspects[action][stage]);
	},
	_onMethods: function(methods) {
		return _.chain(this.mixins)
			.map(function(Mixin) {
				Mixin = Ultimate.classFrom(Mixin);
				return this.owner()._getOnMethods(Mixin.prototype);
			}, this)
			.flatten().unique().value().concat(this.owner()._getOnMethods(methods)).concat(this.owner()._getOnMethods(this));
	},
	_hasOperator: function(modifier) {
		return !!_.reduce(_.keys(modifier), function(acc, num) { 
			return (num.indexOf('$') === 0 ? 1 : 0) + acc;
		}, 0);
	},
	

	_setupBeforeInsert: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform(doc);	 
			model.emit.apply(model, ['beforeInsert', userId, this]);
			
			//delete props and replace so Collection Hooks thinks its the same object, which it is
			for(var prop in doc) delete doc[prop];	
			_.extend(doc, model.atts());
		};

		this.owner().collection.before.insert(newFunc);
	},
	_setupBeforeUpdate: function() {
		var newFunc = function(userId, doc, fieldNames, modifier, options) {
			var model = this.transform(_.extend({}, doc, modifier.$set));		

			model.emit.apply(model, ['beforeUpdate', userId, doc, fieldNames, modifier, options, this]);
			modifier.$set = model.atts(false);

			delete modifier.$set.className;
		};

		this.owner().collection.before.update(newFunc);
	},
	_setupBeforeUpsert: function() {
		var self = this,
			transform = this.owner().collection._transform; //upsert doesnt have `this.transform`
		
		var newFunc = function(userId, selector, modifier, options) {
			var model;
			
			if(self._hasOperator(modifier)) {
				model = transform(modifier.$set);
				
				model.emit.apply(model, ['beforeUpsert', userId, selector, modifier, options, this]);
				modifier.$set = model.atts(false);
			}
			else {
				model = transform(modifier);
				
				model.emit.apply(model, ['beforeUpsert', userId, selector, modifier, options, this]);
				for(var prop in modifier) delete modifier[prop];
				_.extend(modifier, model.atts(false));	
			}
		};

		this.owner().collection.before.upsert(newFunc);
	},
	_setupBeforeRemove: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform();		
			model.emit.apply(model, ['beforeRemove', userId, doc, this]);
		};

		this.owner().collection.before.remove(newFunc);
	},
	
	
	_setupAfterInsert: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform();	
			model.emit.apply(model, ['afterInsert', userId, this]);
		};

		this.owner().collection.after.insert(newFunc);
	},
	_setupAfterUpdate: function() {
		var newFunc = function(userId, doc, fieldNames, modifier, options) {
			var model = this.transform();		
			model.emit.apply(model, ['afterUpdate', userId, this.previous, fieldNames, modifier, options, this]);
		};

		this.owner().collection.after.update(newFunc);
	},
	_setupAfterRemove: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform();		
			model.emit.apply(model, ['afterRemove', userId, this]);
		};

		this.owner().collection.after.remove(newFunc);
	},
	
	
	_setupBeforeFindOne: function() {
		var model = this;
		
		var newFunc = function(userId, selector, options) {
			model.emit.apply(model, ['beforeFindOne', userId, selector, options, this]);
		};
		
		this.owner().collection.before.findOne(newFunc);		
	},
	_setupAfterFindOne: function() {
		var newFunc = function(userId, selector, options, doc) {
			if(!doc) return;

			var model = doc; //doc for whatever reason is already transformed here.
			model.emit.apply(model, ['afterFindOne', userId, selector, options, this]);
		};
	
		this.owner().collection.after.findOne(newFunc);
	},
	
	
	_setupBeforeFind: function() {
		var model = this;
		
		var newFunc = function(userId, selector, options) {
			model.emit.apply(model, ['beforeFind', userId, selector, options, this]);
		};
		
		this.owner().collection.before.find(newFunc);
	},
	_setupAfterFind: function() {
		var model = this;
		
		var newFunc = function(userId, selector, options, cursor) {
			model.emit.apply(model, ['afterFind', userId, selector, options, cursor, this]);
		};
		
		this.owner().collection.after.find(newFunc);		
	},
	
	
	_setupValidateInsert: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform(doc),
				errors = model.validate.apply(model, model.validateInsertForms); //array of forms to validate
			
			if(_.size(errors) > 0) {
				var response = model.emit.apply(model, ['invalidInsert', userId, doc, this]);
				if(response === false) throw new Error('invalid-insert'); //use collection hooks error supression to short-circuit insert
			}
		};
		
		this.owner().collection.before.insert(newFunc);
	},
	_setupValidateUpdate: function(userId, doc, fieldNames, modifier, options) {
		var newFunc = function() {
			var model = this.transform(_.extend({}, doc, modifier.$set)),
				errors = model.validate.apply(model, model.validateUpdateForms); //array of forms to validate
		
				if(_.size(errors) > 0) {
					var response = model.emit.apply(model, ['invalidUpdate', userId, doc, fieldNames, modifier, options, this]);
					if(response === false) throw new Error('invalid-update');//use collection hooks error supression to short-circuit update		
				}	
		};
		
		this.owner().collection.before.update(newFunc);
	}
});