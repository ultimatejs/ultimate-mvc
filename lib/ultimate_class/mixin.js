_.extend(UltimateClass, {
	mixinClasses: function(mixins, isNestedMixin) {
		mixins = [].concat(mixins || []);
			
  	var configNames = _.chain(mixins)
			.map(function(Mixin) {
				Mixin = Ultimate.classFrom(Mixin);
				var isStrict = this._mixinIsStrict(Mixin);
			
				//A. dont execute all this code for mixins already mixed in
				if(this._isMixinAttachedAlready(Mixin.className)) return [];
				this._markMixinAttachmentComplete(Mixin.className);
			
				//B. mixins from parents already have their methods inherited by standard inheritance process prior
				if(!isNestedMixin) { //nested mixins already have methods attached
					
					//B.1 do a lot of the same stuff as in B.1 but maintain state in accompanying mixins
					if(isStrict) Mixin = this.mixinStrict(Mixin); //same as in `else` but only mixins public members and binds them to the Mixin
					
					//B.2 main code path
					else {
						if(!this._alreadyHasMethodsFromParent(Mixin.className)) {
							this.attachStaticMethods(Mixin);
							this.attachInstanceMethods(Mixin.prototype);
						}
					}
				}
				
				//C. event handlers need to be attached for every mixin, even if the Parent also has it.
				//The reason is because they aren't inherited like regular methods. Rather, they are ALL added
				//to the `_listeners` array (without overwriting each other) and in the correct order.
				this.mixinEventHandlers(Mixin, isStrict);	
				
				
				//D. recursively handle nested mixins, and return any new collected config names
				var nestedMixins = this._newMixins(Mixin, mixins);
				
				if(!_.isEmpty(nestedMixins)) {
					var mixin = Mixin.prototype;
					var info = this.mixinClasses(nestedMixins, true); //`true` indicates its a nested mixin
					
					return info.configNames.concat(mixin.config); //newly discovered config names, concatted with previous/parent's config
				}
				else return Mixin.prototype.config; //NORMAL RETURN: array of config names
	  	}, this)
			.flatten().value(); 
			
			
		return {
			configNames: configNames,
			mixins: this.hasOwnProperty('_attachedMixins') ? this._attachedMixins : []
		};
	},
	
	
	attachStaticMethods: function(Mixin) {
		UltimateClone.deepExtendOwnUltimate(this, Mixin, function(method, name) {
			return !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately
		}.bind(this));
	},
	attachInstanceMethods: function(mixin) {
		UltimateClone.deepExtendOwnUltimate(this.prototype, mixin, function(method, name) {
			return !_.contains(mixin.config, name) //no config props because they are deeply merged in via `addMethods` below in a custom way
				&& !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately via `mixinEventHandlers()` below
		}.bind(this));
	},
	
	
	_mixinIsStrict: function(Mixin) {
		return  (!_.isEmpty(Mixin.prototype.mixinTo) && Mixin.prototype.strict !== false)
			|| (Mixin.prototype.hasOwnProperty('strict') && Mixin.prototype.strict === true);
	},
	mixinStrict: function(Mixin) {
		//if(this.isAbstract()) return Mixin; //strict state-accompanying mixins only need to add methods to concrete classes
		
		var isAbstract = Mixin.prototype.hasOwnProperty('abstract');
		
		Mixin.cloneNumber = Mixin.cloneNumber ? Mixin.cloneNumber + 1 : 1;
		Mixin = UltimateDouble(Mixin.className+Mixin.cloneNumber, true).extends(Mixin, {abstract: isAbstract});
		Mixin.compose('owner', this);
		Mixin.prototype.compose('owner', this.prototype);
		
		this.attachStaticMethodsStrict(Mixin); //only attach methods without underscore
		this.attachInstanceMethodsStrict(Mixin.prototype); //"strict" mixins are forced to refer to `this.owner` instead of `this`
	
		return Mixin; //return the new Mixin to be used instead of the Parent. Essentially accompany each Class with a mixin that maintains its own state
	},
	attachStaticMethodsStrict: function(Mixin) {
		var mixinMethods = {};
		
		UltimateClone.deepExtendOwnUltimate(mixinMethods, Mixin, function(method, name) {
			return name.charAt(0) !== '_'
				&& !UltimateClass.hasOwnProperty(name)
				&& name != '_attachedMixins' //new Classes keep track of attached mixins so as not to add them 2x+
				&& !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately
		}.bind(this));
		
		mixinMethods = _.mapObject(mixinMethods, function(method, name) {
			return _.isFunction(method) ? method.bind(Mixin) : method;
		}, this);
		
		_.extend(this, mixinMethods);
	},
	attachInstanceMethodsStrict: function(mixin) {
		var mixinMethods = {};
		
		UltimateClone.deepExtendUltimate(mixinMethods, mixin, function(method, name) {
			return name.charAt(0) !== '_'
				&& !UltimateClass.prototype.hasOwnProperty(name)
				&& name != 'abstract' //abstract property is used by isAbstract() and detects if the class `hasOwnProperty('abstract')`
				&& name != 'mixinTo'
				&& !_.contains(mixin.config, name) //no config props because they are deeply merged in via `addMethods` below in a custom way
				&& !this.prototype._isOnMethod(name); //mixins event handlers cant be overriden, so they are attached separately via `mixinEventHandlers()` below
		}.bind(this));
		
		mixinMethods = _.mapObject(mixinMethods, function(method, name) {
			return _.isFunction(method) ? method.bind(mixin) : method;
		}, this);

		_.extend(this.prototype, mixinMethods);
	},
	
	
	_alreadyHasMethodsFromParent: function(className) {
		if(!this.prototype.parent) return false; //UltimatClass has no parent
		else return _.contains(this.prototype.parent.mixins, className); //check parent's mixins as you would expect
	},
	_newMixins: function(Mixin, mixins) {
		var newMixins = this._mixinStrings(Mixin.prototype.mixins),
			oldMixins = this._mixinStrings(this._attachedMixins.concat(mixins));

			return _.difference(newMixins, oldMixins);
	},
	_mixinStrings: function(mixins) {
		return mixins.map(function(Mixin) {
			return Ultimate.classFrom(Mixin).className;
		});
	},
	_isMixinAttachedAlready: function(className) {
		return this.hasOwnProperty('_attachedMixins') && _.contains(this._attachedMixins, className);
	},
	_markMixinAttachmentComplete: function(className) {
		this._attachedMixins = this.hasOwnProperty('_attachedMixins') ? this._attachedMixins : [];
		this._attachedMixins.push(className);
	},
	
	
	
	mixinEventHandlers: function(Mixin, isStrict) {
		//mixin event handlers guaranteed to run via this separate attachment
		//rather than get overwritten as methods in normal inheritance
		this.attachMixinOnMethodListeners(Mixin, isStrict); 
		this.prototype.attachMixinOnMethodListeners(Mixin.prototype, isStrict); 
	},
	
	
	//this method operates the reverse of the other methods--the Mixin is `this`
	//and it's passed the classes it's suppsoed to mixinto as the `Classes` parameter
	mixinToTargetClasses: function(Classes) {	
		var Mixin = this;

		_.each([].concat(Classes || []), function(Class) {
			Class = Ultimate.classFrom(Class);
			
			Class.extend({
				mixins: [Mixin.className]
			});
		});
	}
}).extendBoth({
	attachMixinOnMethodListeners: function(mixin, isStrict) {
		_.each(this._getOnMethods(mixin, isStrict), function(eventName) {
			var onMethod = 'on'+eventName.capitalizeFirstLetter(),
				method = isStrict ? mixin[onMethod].bind(mixin) : mixin[onMethod];
			
			this.on(eventName, method);
		}, this);	
	},
	_getOnMethods: function(mixin, isStrict) {
		var onMethods = [];
		
		for(var name in mixin) {
			(function(name) {
				var descriptor = Object.getOwnPropertyDescriptor(mixin, name),
					isGetter = descriptor && descriptor.get, //hasOwnProperty below will call it and potentially break it;
					hasOwnProp = isStrict ? mixin.parent.hasOwnProperty(name) : mixin.hasOwnProperty(name);
					
				if(!isGetter && hasOwnProp && _.isFunction(mixin[name]) && this._isOnMethod(name)) {
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