Ultimate('UltimateComponent').extends(UltimateComponentParent, {
	abstract: true,
	_applyBind: function(func, isCallback, onCreated) {
		if(!_.isFunction(func)) return func; 

		var staticUc = this;

		return function() {
			var uc;
			
			if(onCreated) {
				uc = staticUc.class.createNew();
				
				Template.instance().className = staticUc.className;	
				Template.instance().___uc = uc;
				uc.lastComponentInstance = Template.instance();
			}
			else uc = staticUc._trueSelf(); 
			
			
			var args = _.toArray(arguments),
				isEvent = arguments[0] && arguments[0].currentTarget;
			
			//Template.currentData() doesn't get element level data, 
			//so we gotta store it when received here in an event handler as the value of 'this'
			if(isEvent) uc.___data = this;
			
			var ret = func.apply(uc, args); //defined at the top of ultimate_component_parent.js
			
			delete uc.___data;
			return ret;
		};
	}
});

Ultimate.Component = UltimateComponent;