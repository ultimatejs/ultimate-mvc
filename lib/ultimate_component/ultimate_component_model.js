Ultimate('UltimateComponentModel').extends(UltimateComponentParent, {
	abstract: true,
	_applyBind: function(func, isCallback) {
		if(!_.isFunction(func)) return func; 

		var uc = this;

		return function() {
			var args = _.toArray(arguments),
				context = this;

			if(isCallback) {
				context = uc.componentModel(); //callbacks need a model as context, since not default as in helpers/events
				args.unshift(uc); //callbacks need UltimateComponent since context is a model, as assigned above
			}
			
			context.component = function() {
				return uc;
			};
		
			return func.apply(context, args); //defined at the top of ultimate_component_parent.js
		};
	}
});