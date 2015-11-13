Ultimate('UltimateComponentModel').extends(UltimateComponentParent, {
	abstract: true,
	isComponentModel: true,
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
				isEvent = arguments[0] && arguments[0].currentTarget,
				context = isEvent ? uc.model(null, null, this) : (uc.model() || this);
			
			if(isCallback) {
				context = uc.componentModel() || (_.isFunction(Router.current().data) && Router.current().data()); //callbacks need a model as context, since not default as in helpers/events
				if(_.isEmpty(context)) context = uc; //fall back to the ComponentModel being the context 
				
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