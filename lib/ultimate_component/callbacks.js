UltimateComponentParent.extend({
	setupCallbacks: function() {
		var onRendered = function(uc) {
			uc = uc || this;
			
			uc.setupAnimations(this);
			_.callNext(uc.callbacksOnRendered, this);
			
			if(uc.infiniteScroll) uc._infiniteScroll(); //impelement infinite scroll if scrollContainer property set
			uc.emitSkipMethod('rendered');
		};
		
		var onDestroyed = function(uc) {
			uc = uc || this;
			
			uc.stop(); //stop all autoruns and subscriptions
			uc.onDestroyedCleanUp();
			uc.clearAllIntervals();
			_.callNext(uc.callbacksOnDestroyed, this);
			uc.emitSkipMethod('destroyed');
		};
		
		
		var onCreated = function(uc) {
			uc = uc || this; //uc === this in UltimateComponent, but in UltimateComponentModel this === model; uc must be available there too
			
			Template.instance().className = uc.className;	
			uc.runReactiveMethods();
			uc.construct.call(this);
			_.callNext(uc.callbacksOnCreated, this);
			uc.emitSkipMethod('created');
		};
		
		this.template.onCreated(this._applyBind(onCreated, true)); //true is only received by UltimateComponentModel._applyBind, and tells it
		this.template.onRendered(this._applyBind(onRendered, true)); //to use this.componentModel() as the context,as well as passes uc in so it
		this.template.onDestroyed(this._applyBind(onDestroyed, true)); //can be used as normal, as seen in above code lines: `uc = uc || this`
	}
});