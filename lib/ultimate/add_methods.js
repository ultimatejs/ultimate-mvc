_.extend(Ultimate, {
  addMethods: function (proto, methods, isClassCreation, isNestedMixin) {
		if(_.isEmpty(methods) && !isClassCreation) return;	
		
		methods.mixins = this._extract(methods.mixins, proto);		 					//A. Extracting mixins must happen here first	
		if(!isNestedMixin && isClassCreation)  {	
			//stop proto.mixins in recursion or class reopened
			methods.mixins = this._concatProps(proto.mixins, methods.mixins);	//	 so that their configs/events are merged/called first.	
		}
		
		proto.class.mixinClasses(methods.mixins, isNestedMixin); 						//	 Mixins will recursively call this `addMethods` method (without emitting addMethods!)
		//methods.mixins = this._concatProps(proto.mixins, methods.mixins);		// 	 ...combine mixins one more time to capture mixin's mixins recursively in above call to `mixinClasse`
		
		methods.config = this.concatConfig(proto, methods);									//B. Consolidated list of config props (from new mixins/parents/class)
		this.combineConfigs(methods.config, proto, methods); 								//C. Custom merge config props from mixins/parents/current class
						
		if(!isNestedMixin) proto.emit('addMethods', methods); 							//D. emit 'onAddMethods' for mixins to hook into (after all mixins attached)
		
		methods.mixins = this._concatProps(proto.mixins, methods.mixins);
		
		return _.extend(proto, methods);
  },
	concatConfig: function(proto, methods) {																													
		_.each(methods.mixins, function(Mixin) {														//1. LOOP THROUGH MIXINS
			var props = Ultimate.classFrom(Mixin).prototype.config;
			methods.config = this._concatProps(methods.config, props);				//2. CONCAT UNIQUE SET OF PROPS
		}, this); 
		
		return this._concatProps(proto.config, methods.config);							//3. RETURN SET FOR EXTENDING INTO `PROTO`
	},
	combineConfigs: function(props, proto, methods) {
		_.each(props, function(name) { 																			//4. IF FUNCTION, CALL TO RETURN PROP
			if(/mixins|mixinTo/.test(name)) return;
			if(methods[name]) methods[name] = this._extract(methods[name], proto);
		}, this);
		
		_.each(props, function(name) { 																			//5. COMBINE PREVIOUSLY ADDED CONFIGS
			if(/mixins|mixinTo/.test(name)) return;
			
			if(methods[name]) {
				if(_.isArray(methods[name])) {																	//6b. CONCAT CONFIG ARRAY, OLDEST TO NEWEST
					methods[name] = (proto[name] || []).concat(methods[name]); 		//parent props are combined with child props so they continue to pass down
				}
				else if(_.isPureObject(methods[name])) {												//6c. EXTEND CONFIG OBJECT
					methods[name] = _.extend({}, proto[name], methods[name]);			//NOTE: STORE IN METHODS[NAME] SINCE THE FINAL
				}																																//STEP IN is: `_.extend(proto, methods)`
			}		
		});
	},
	_extract: function(prop, proto) {
		return _.isFunction(prop) ? prop.call(proto) : prop;
	},
	_concatProps: function(oldProps, newProps, proto) {
		newProps = this._extract(newProps, proto);
		
		oldProps = _.isArray(oldProps) ? oldProps : [];
		newProps = _.isArray(newProps) ? newProps : [];
				
		return _.unique(oldProps.concat(newProps)); 
	},
});