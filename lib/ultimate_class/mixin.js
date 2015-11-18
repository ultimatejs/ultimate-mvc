_.extend(UltimateClass, {
	mixinClasses: function(mixins, isNestedMixin) {
  	_.each([].concat(mixins || []), function(Mixin) {
			Mixin = Ultimate.classFrom(Mixin);
			
			if(this.isMixinAttachedAlready(Mixin.className)) return;
			this.markMixinAttachmentComplete(Mixin.className);
			
  		this.mixin(Mixin, isNestedMixin);
			this.mixinEventHandlers(Mixin);
  	}, this);
	},
	mixin: function(Mixin, isNestedMixin) {
		if(!isNestedMixin) this.mixinStatic(Mixin);
		this.mixinInstance(Mixin.prototype, isNestedMixin);
	},
	mixinStatic: function(Mixin) {
		if(!this.prototype.parent || !_.contains(this.prototype.parent.mixins, Mixin.className)) { //no point tacking on methods the parent already has
			return UltimateClone.deepExtendOwnUltimate(this, Mixin, function(method, name) {
				return name != '_attachedMixins' //new Classes keep track of attached mixins so as not to add them 2x+
					&& !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately
			}.bind(this));
		}
	},
	mixinInstance: function(mixin, isNestedMixin) {
		var props = Ultimate._concatProps(this.prototype.config, mixin.config);
		
		/**
		if(mixin.hasOwnProperty('strict') && mixin.strict === true) {
			mixin = this.extractStrictMixinMethods(mixin);
		}
		**/
		if(!isNestedMixin) {
			if(!this.prototype.parent || !_.contains(this.prototype.parent.mixins, mixin.className)) { //same as above, also: UltimateClass has no parent
				UltimateClone.deepExtendOwnUltimate(this.prototype, mixin, function(method, name) {
					return name != 'abstract' //abstract property is used by isAbstract() and detects if the class `hasOwnProperty('abstract')`
						&& !_.contains(props, name) //no config props because they are deeply merged in via `addMethods` below in a custom way
						&& !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately via `mixinEventHandlers()` below
				}.bind(this));
			}
		}
		
		this.mixinConfigsAndNestedMixins(mixin, props);
	},
	mixinConfigsAndNestedMixins: function(mixin, props) {
		//properly combine old + new config props:
		//true indicates NOT to perform actions on nested mixins such as emit 'methodsAdded' + mixin methods already mixed in from main mixin
		UltimateDouble.addMethods(this.prototype, _.omit(_.pickArray(mixin, props), 'mixinTo'), null, true); 
	},
	/**
	extractStrictMixinMethods: function(mixin) {
		return UltimateClone.deepExtendUltimate(this.prototype, mixin, function(method, name) {
				return name != 'abstract' //abstract property is used by isAbstract() and detects if the class `hasOwnProperty('abstract')`
					&& !_.contains(props, name) //no config props because they are deeply merged in via `addMethods` below in a custom way
					&& !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately via `mixinEventHandlers()` below
			}.bind(this));
	},
	**/
	
	mixinToTargetClasses: function(Classes) {	
		var Mixin = this;

		_.each([].concat(Classes || []), function(Class) {
			Class = Ultimate.classFrom(Class);
			
			Class.extend({
				mixins: [Mixin.className]
			});
		});
	},
	
	
	isMixinAttachedAlready: function(className) {
		return this.hasOwnProperty('_attachedMixins') && _.contains(this._attachedMixins, className);
	},
	markMixinAttachmentComplete: function(className) {
		this._attachedMixins = this.hasOwnProperty('_attachedMixins') ? this._attachedMixins : [];
		this._attachedMixins.push(className);
	},
	
	
	mixinEventHandlers: function(Mixin) {
		//mixin event handlers guaranteed to run via this separate attachment
		//rather than get overwritten as methods in normal inheritance
		this.attachMixinOnMethodListeners(Mixin); 
		this.prototype.attachMixinOnMethodListeners(Mixin.prototype); 
	}
}).extendBoth({
	attachMixinOnMethodListeners: function(methods) {
		_.each(this._getOnMethods(methods), function(eventName) {
			var onMethod = 'on'+eventName.capitalizeFirstLetter();
			this.on(eventName, methods[onMethod]);
		}, this);	
	},
	_getOnMethods: function(methods) {
		var onMethods = [];
		
		for(var name in methods) {
			(function(name) {
				var descriptor = Object.getOwnPropertyDescriptor(methods, name),
					isGetter = descriptor && descriptor.get; //hasOwnProperty below will call it and potentially break it;

				if(!isGetter && methods.hasOwnProperty(name) && _.isFunction(methods[name]) && this._isOnMethod(name)) {
						var eventName = name.substr(2).lowercaseFirstLetter();
						onMethods.push(eventName);
				}
			}).call(this, name);
		}
		
		return onMethods;
	},
	_isOnMethod: function(name) {
		return name.indexOf('on') === 0 && name.length > 2 && name.charAt(2) === name.charAt(2).toUpperCase();
	}
});