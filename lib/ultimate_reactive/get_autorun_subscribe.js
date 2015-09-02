UltimateReactive.extend({
	runReactiveMethods: function() {
		var subs = this.subscriptions || this.sub,
			limitSubs = this.limitSubscriptions || this.subLimit,
			autoruns = this.autoruns || this.ar;
		
		if(subs && !this.isUltimateDatatableComponent) this.__runAllHandlers(subs, 'sub'); //Datatable handles sub on its own
		if(limitSubs) this.__runAllHandlers(limitSubs, 'subLimit'); 
		if(autoruns) this.__runAllHandlers(autoruns, 'ar');
		
		this.triggerReady();
	},
	__runAllHandlers: function(handlers, type) { //UltimateComponentParent provides an array of handlers cuz of mixins
		_.each(this.__combineHandlers(handlers), function(handler) {
			if(type == 'ar') this.autorun(handler); 
			else if(type == 'sub') this.autorun(this._runSubscribe(handler)); 
			else if(type == 'subLimit') this.autorun(this._runSubscribe(handler, true)); 	
		}, this);
	},
	__combineHandlers: function(handlers) {
		var allHandlers = [];
		
		//this._runSubscribe() below will expect an array or a string it turns into arrays, or a function,
		//but here we must return an array of such elements, to be iterated through above in __runAllHandlers.
		if(_.isArray(handlers) && _.isArray(handlers[0])) allHandlers = handlers; //eg: sub: '[['self'], ['something_else', param]]
		else if(_.isArray(handlers) && _.isPureObject(handlers[1])) allHandlers.push(handlers); //sub: ['subName', configObj, limit] //honestly, i cant remember why im expecting single subscriptions to have a configObj as the first param
		else if(_.isArray(handlers) && !_.isArray(handlers[0])) allHandlers = handlers; //ar functions || ['subName1', 'subName2']
		else if(_.isFunction(handlers) || _.isString(handlers)) allHandlers.push(handlers); //single ar function, || sub: 'subName'
		
		return allHandlers;
	},

	
	_runSubscribe: function(subscribeParams, isLimit) {	
		if(_.isFunction(subscribeParams)) {
			var subFunc = subscribeParams,
				subName = subFunc.subscriptionName ? subFunc.subscriptionName() : subFunc.toString(); //subFunc == Model.handle().subscribe(); subscriptionName is assigned to handler for this case
			
			if(isLimit) {
				var startLimit = _.isFunction(subFunc.limit) ? subFunc.limit() : (this.startLimit || 10); 
				this.setLimit(startLimit, subName);
			}
		}
		
		if(_.isString(subscribeParams)) subscribeParams = this.__convertStringToArrayParams(subscribeParams);
				
		if(_.isArray(subscribeParams)) {
			var subName = subscribeParams[0];
				
			if(isLimit) {
				var startLimit = subscribeParams.pop();
				this.setLimit(startLimit, subName);
			}
		
			var subFunc = function(computation, limit, nada, nothing, callbacks) { //callbacks must be 4th param since Model.subscribe() handlers expect it there
				subscribeParams = this.__evalParams(subscribeParams);	
				
				if(isLimit) subscribeParams.push(limit);
				if(callbacks) subscribeParams.push(callbacks);
				
				return Meteor.subscribe.apply(Meteor, subscribeParams);
			};
		}

		return function(computation) {
			var callbacks = this.getSubscriptionCallbacks(subName), 
				isModelSubscribe = !!subFunc.subscriptionName,
				sub;
			
			if(isLimit) { //Model.subscribe will receive the limit as a param to the handle
				if(isModelSubscribe) sub = subFunc.call(this, computation, this.getLimit(subName), null, null, callbacks); 
				else sub = subFunc.call(this, computation, this.getLimit(subName), callbacks); //Model.subscribe handler expects..
				
				return this._addSub(sub, subName, isLimit);
			}
			else {
				if(isModelSubscribe) sub = subFunc.call(this, computation, null, null, null, callbacks); 
				else sub = subFunc.call(this, computation, callbacks); //..callbacks arg in specific position
				
				return this._addSub(sub, subName, isLimit);
			}
		};
	},
	__convertStringToArrayParams: function(subscribeParams) {
		return _.map(subscribeParams.split(','), function(param) {
			return param.trim();
		});
	},
	__evalParams: function(subscribeParams) {
		return _.map(subscribeParams, function(param) {
			if(_.isString(param) && param.indexOf('@') === 0) return eval(param.substr(1));
			else return param;
		}, this);
	}
});