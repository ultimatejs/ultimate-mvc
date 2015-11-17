_.extend(UltimateClass, {
	mixinClasses: function(mixins) {
  	_.each([].concat(mixins || []), function(Mixin) {
			Mixin = Ultimate.classFrom(Mixin);
			
			if(this.isMixinAttachedAlready(Mixin.className)) return;
			this.markMixinAttachmentComplete(Mixin.className);
  		this.mixin(Mixin);
			this.mixinEventHandlers(Mixin);
  	}, this);
	},
	mixin: function(Mixin) {
		this.mixinStatic(Mixin);
		this.mixinInstance(Mixin.prototype);
	},
	mixinStatic: function(Mixin) {
		return UltimateClone.deepExtendUltimate(this, Mixin, function(method, name) {
			return name != '_attachedMixins' //new Classes keep track of attached mixins so as not to add them 2x+
				&& !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately
		}.bind(this));
	},
	mixinInstance: function(mixin) {
		var props = Ultimate._concatProps(this.prototype.config, mixin.config);
		
		var instance = UltimateClone.deepExtendUltimate(this.prototype, mixin, function(method, name) {
			return name != 'abstract' //abstract property is used by isAbstract() and detects if the class `hasOwnProperty('abstract')`
				&& !_.contains(props, name) //no config props because they are deeply merged in via `addMethods` below in a custom way
				&& !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately via `mixinEventHandlers()` below
		}.bind(this));
		
		//properly combine old + new config props
		UltimateDouble.addMethods(this.prototype, _.omit(_.pickArray(mixin, props), 'mixinTo'), null, false); //false indicates dont emit 'addMethods' event
	
		return instance;
	},
	
	
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
		for(var name in methods) {
			(function(name) {
				var descriptor = Object.getOwnPropertyDescriptor(methods, name),
					isGetter = descriptor && descriptor.get; //hasOwnProperty below will call it and potentially break it;

				if(!isGetter && methods.hasOwnProperty(name) && _.isFunction(methods[name]) && this._isOnMethod(name)) {
						var eventName = name.substr(2).lowercaseFirstLetter();
						this.on(eventName, methods[name]);
				}
			}).call(this, name);
		}	
	},
	_isOnMethod: function(name) {
		return name.indexOf('on') === 0 && name.length > 2 && name.charAt(2) === name.charAt(2).toUpperCase();
	}
});