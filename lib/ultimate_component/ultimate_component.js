Ultimate('UltimateComponent').extends(UltimateComponentParent, {
	abstract: true,
	_applyBind: function(func) {
		//OLD WAY:
		//if(_.isFunction(func)) return func.bind(this); 
		//else return func;
		
		//NEW WAY WHERE WE MAKE SURE WE HAVE EVENT DATA CONTEXT ON POINT:
		if(!_.isFunction(func)) return func; 

		var uc = this;

		return function() {
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