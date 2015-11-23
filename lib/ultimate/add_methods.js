_.extend(Ultimate, {
  addMethods: function (proto, methods, isClassCreation) {
		if(_.isEmpty(methods) && !isClassCreation) return;	//do nothing when no methods and not class creation
		
		var info = proto.class.mixinClasses(methods.mixins); //returns object containing keys for consolidated `configNames` & `mixins`
		info.configNames = this._concatProps(methods.config, info.configNames); //append mixin configNames after `methods.configNames`
		
		var methodsGroups = [methods].concat(info.mixins);
		
		var allConfigs = this.combineConfigs(proto, methodsGroups, info.configNames); 
		_.extend(methods, allConfigs); //give methods all config props for `emit('addMethods')` to have all previous config info
		_.extend(proto, methods); //the proto is now finalized here					

		if(_.isEmpty(proto.mixinTo)) proto.emit('addMethods', methods); //but only pass on new methods									
		
		return proto;
  },


	combineConfigs: function(proto, methodsGroups, configNames) {
		var allConfigs = {};

		_.each(methodsGroups, function(group) {
			var configs = {};
			group = Ultimate.prototypeFrom(group); //methods map will return itself, and mixin strings will be converted
			
			_.each(configNames, function(name) { 																			//5. COMBINE PREVIOUSLY ADDED CONFIGS
				if(group[name]) {
					configs[name] = this._extract(group[name], proto);

					if(_.isArray(configs[name])) {																	//6b. CONCAT CONFIG ARRAY, OLDEST TO NEWEST
						allConfigs[name] = (proto[name] || []).concat(allConfigs[name] || []).concat(configs[name]); 		//parent props are combined with child props so they continue to pass down
						allConfigs[name] = _.unique(allConfigs[name]); 
					}
					else if(_.isPureObject(configs[name])) {												//6c. EXTEND CONFIG OBJECT
						allConfigs[name] = _.extend({}, proto[name], allConfigs[name], configs[name]);			//NOTE: STORE IN METHODS[NAME] SINCE THE FINAL
					}		
					else {
						allConfigs[name] = configs[name];
					}																														
				}		
			}, this);
		}, this);
		
		return allConfigs;
	},
	
	
	_extract: function(prop, proto) {
		return _.isFunction(prop) ? prop.call(proto) : prop;
	},
	_concatProps: function(oldProps, newProps, proto) {
		oldProps = this._extract(oldProps, proto);
		newProps = this._extract(newProps, proto);
		
		oldProps = _.isArray(oldProps) ? oldProps : [];
		newProps = _.isArray(newProps) ? newProps : [];
				
		return _.unique(oldProps.concat(newProps)); 
	}
});