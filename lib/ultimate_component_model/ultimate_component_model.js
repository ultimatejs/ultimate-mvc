Ultimate('UltimateComponentModel').extends(UltimateComponentParent, {
	abstract: true,
	isComponentModel: true,
	_applyBind: function(func, isCallback) {
		if(!_.isFunction(func)) return func; 

		var uc = this;

		return function() {
			var args = _.toArray(arguments),
				isEvent = arguments[0] && arguments[0].currentTarget,
				context = isEvent ? uc.model(null, null, this) : (uc.model() || this);

			if(isCallback) {
				context = uc.componentModel() || Router.current().data() || {}; //callbacks need a model as context, since not default as in helpers/events
				args.unshift(uc); //callbacks need UltimateComponent since context is a model, as assigned above
			}
			
			context.component = function(prop) {
				if(!prop) return uc;
				else {
					if(_.isFunction(uc[prop])) return uc[prop].apply(this, _.toArray(arguments).slice(1))
					else return uc[prop];
				}
			};
		
			return func.apply(context, args); //defined at the top of ultimate_component_parent.js
		};
	}
});

Ultimate.ComponentModel = UltimateComponentModel;