UltimateComponentParent.extend({
	setupCallbacks: function() {
		var onRendered = function(uc) {
			uc = uc || this; //`this` is a model/data in UltimateComponentModel, but still needs the current uc instance, so this is how we guarantee it

			uc.setupAnimations(this);
			uc.emitBind('rendered', this);
			
			if(uc.infiniteScroll) uc._infiniteScroll(); //impelement infinite scroll if scrollContainer property set
		};
		
		var onDestroyed = function(uc) {
			uc = uc || this;
			
			uc.stop(); //stop all autoruns and subscriptions
			uc.onDestroyedCleanUp();
			uc.clearAllIntervals();
			uc.emitBind('destroyed', this);
		};
		
		
		var onCreated = function(uc) {
			uc = uc || this; 
			uc.___id = Random.id();

			uc.runReactiveMethods();
			uc.construct.call(this);
			uc.emitBind('created', this);
		};
		

		this.template.onCreated(this._applyBind(onCreated, true, true)); //true is only received by UltimateComponentModel._applyBind, and tells it
		this.template.onRendered(this._applyBind(onRendered, true)); //to use this.componentModel() as the context,as well as passes uc in so it
		this.template.onDestroyed(this._applyBind(onDestroyed, true)); //can be used as normal, as seen in above code lines: `uc = uc || this`
	}
});