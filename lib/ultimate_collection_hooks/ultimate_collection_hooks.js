Ultimate('UltimateSetupCollectionHooks').extends({
	abstract: true,
	mixinTo: ['UltimateModel'],
	config: ['enableHooks'],
	
	onAddMethods: function(methods) {
		if(methods.abstract || this.isAbstract() || this.___hooksSetup) return;
		if(/UltimateAggregate|UltimateRemoval/.test(this.className)) return;
		
		this.setupHooks(methods);
		this.___hooksSetup = true;
	},

	setupHooks: function(m) {
		if(this._isEnabled(m, 'before', 'insert')) this.setupBeforeInsert();
		if(this._isEnabled(m, 'before', 'update')) this.setupBeforeUpdate();
		if(this._isEnabled(m, 'before', 'upsert')) this.setupBeforeUpsert();
		if(this._isEnabled(m, 'before', 'remove')) this.setupBeforeRemove();
		
		if(this._isEnabled(m, 'after', 'insert')) this.setupAfterInsert();
		if(this._isEnabled(m, 'after', 'update')) this.setupAfterUpdate();
		if(this._isEnabled(m, 'after', 'remove')) this.setupAfterRemove();
		
		if(this._isEnabled(m, 'before', 'findOne')) this.setupBeforeFindOne();
		if(this._isEnabled(m, 'after', 'findOne')) this.setupAfterFindOne();
		if(this._isEnabled(m, 'before', 'find')) this.setupBeforeFind();
		if(this._isEnabled(m, 'after', 'find')) this.setupAfterFind();
		
		if(this._isEnabled(m, 'invalid', 'insert')) this.setupValidateInsert();
		if(this._isEnabled(m, 'invalid', 'update')) this.setupValidateUpdate();
	},
	_isEnabled: function(methods, stage, action) {
		return _.contains(this._onMethods(methods), stage+action.capitalizeFirstLetter())
			  && _.isEmpty(this.collection._hookAspects[action][stage]);
	},
	_onMethods: function(methods) {
		return _.chain(this.mixins)
			.map(function(Mixin) {
				Mixin = Ultimate.classFrom(Mixin);
				return this._getOnMethods(Mixin.prototype);
			}, this)
			.flatten().unique().value().concat(this._getOnMethods(methods)).concat(this._getOnMethods(this));
	},


	setupBeforeInsert: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform();	 
			model.emit.apply(model, ['beforeInsert', userId, this]);
			
			//delete props and replace so Collection Hooks thinks its the same object, which it is
			for(var prop in doc) {
				delete doc[prop];	
			}
			_.extend(doc, model.atts());
		};

		this.collection.before.insert(newFunc);
	},
	setupBeforeUpdate: function() {
		var newFunc = function(userId, doc, fieldNames, modifier, options) {
			var model = this.transform();		
			_.extend(model, modifier.$set);

			model.emit.apply(model, ['beforeUpdate', userId, doc, fieldNames, modifier, options, this]);
			modifier.$set = model.atts(false);
		};

		this.collection.before.update(newFunc);
	},
	setupBeforeUpsert: function() {
		var newFunc = function(userId, selector, modifier, options) {
			var model = this.transform();		
			_.extend(model, modifier.$set);

			model.emit.apply(model, ['beforeUpdate', userId, selector, modifier, options, this]);
			modifier.$set = model.atts(false);
		};

		this.collection.before.update(newFunc);
	},
	setupBeforeRemove: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform();		
			model.emit.apply(model, ['beforeRemove', userId, doc, this]);
		};

		this.collection.before.remove(newFunc);
	},
	
	
	setupAfterInsert: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform();	
			model.emit.apply(model, ['afterInsert', userId, this]);
		};

		this.collection.after.insert(newFunc);
	},
	setupAfterUpdate: function() {
		var newFunc = function(userId, doc, fieldNames, modifier, options) {
			var model = this.transform();		
			model.emit.apply(model, ['afterUpdate', userId, this.previous, fieldNames, modifier, options, this]);
		};

		this.collection.after.update(newFunc);
	},
	setupAfterRemove: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform();		
			model.emit.apply(model, ['afterRemove', userId, this]);
		};

		this.collection.after.remove(newFunc);
	},
	
	
	setupBeforeFindOne: function() {
		var model = this;
		
		var newFunc = function(userId, selector, options) {
			model.emit.apply(model, ['beforeFindOne', userId, selector, options, this]);
		};
		
		this.collection.before.findOne(newFunc);		
	},
	setupAfterFindOne: function() {
		var newFunc = function(userId, selector, options) {
			if(!doc) return;
			
			var model = this.tansform ? this.transform(doc) : new Ultimate.classes[doc.className](doc);
			model.emit.apply(model, ['afterFindOne', userId, selector, options, this]);
		};
	
		this.collection.after.findOne(newFunc);
	},
	
	
	setupBeforeFind: function() {
		var model = this;
		
		var newFunc = function(userId, selector, options) {
			model.emit.apply(model, ['beforeFind', userId, selector, options, this]);
		};
		
		this.collection.before.find(newFunc);
	},
	setupAfterFind: function() {
		var model = this;
		
		var newFunc = function(userId, selector, options, cursor) {
			model.emit.apply(model, ['afterFind', userId, selector, options, cursor, this]);
		};
		
		this.collection.after.find(newFunc);		
	},
	
	
	setupValidateInsert: function() {
		var newFunc = function(userId, doc) {
			var model = this.transform(),
				errors = model.isValidMultipleForms.apply(model, model.validateInsert); //array of forms to validate
			
			if(!_.isEmpty(errors[0])) {
				var response = model.emit.apply(model, ['invalidInsert', userId, doc, this]);
				if(response === false) throw new Meteor.Error('invalid-insert', EJSON.stringify(errors));		
			}
		};
		
		this.collection.before.insert(newFunc);
	},
	setupValidateUpdate: function(userId, doc, fieldNames, modifier, options) {
		var newFunc = function() {
			var model = this.transform(),
				errors = model.isValidMultipleForms.apply(model, model.validateUpdate); //array of forms to validate
		
				if(!_.isEmpty(errors[0])) {
					var response = model.emit.apply(model, ['invalidUpdatte', userId, doc, fieldNames, modifier, options, this]);
					if(response === false) throw new Meteor.Error('invalid-update', EJSON.stringify(errors));		
				}	
		};
		
		this.collection.before.update(newFunc);
	}
});