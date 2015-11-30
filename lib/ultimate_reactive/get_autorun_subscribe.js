UltimateReactive.extend({
	runReactiveMethods: function() {
		var subs = this.subscriptions || this.sub, //this.sub is deprecated
			limitSubs = this.limitSubscriptions || this.subLimit,
			autoruns = this.autoruns || this.ar;
		
		if(this.isUltimateDatatableComponent && _.isArray(subs)) {
			subs = _.clone(subs); //clone it so we dont affect .subscriptions property used by DatatableComponent
			subs.shift(); //when shifted right here. The goal is to allow for additional subscriptions after the first used by the Datatable. UltimateDatatableComponent extracts the first subscription and handles it separately!
		}
			
		if(subs) this.__runAllHandlers(subs, 'sub'); //Datatable handles sub on its own
		if(limitSubs) this.__runAllHandlers(limitSubs, 'subLimit'); 
		if(autoruns) this.__runAllHandlers(autoruns, 'ar');
		
		this.triggerReady();
	},
	__runAllHandlers: function(handlers, type) { //UltimateComponentParent provides an array of handlers cuz of mixins
		_.each(UltimateUtilities.extract(handlers, this), function(handler) {
			if(type == 'ar') this.autorun(handler); 
			else if(type == 'sub') this.autorun(this._runSubscribe(handler)); 
			else if(type == 'subLimit') this.autorun(this._runSubscribe(handler, true)); 	
		}, this);
	},
	/** THE OLD WAY. DELETE SOON.
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
	**/
	
	_runSubscribe: function(config, isLimit) {	
		var subFunc, startLimit, subName, callbacks;
		
		
		if(_.isPureObject(config) || _.isString(config)) {
			if(config.model) config = UltimateModel._configObjToHandle(config); //MODEL SUBSCRIPTION CONFIG
			else { //BASIC SUBSCRIPTION: {name: 'subname', args: [], limit: 10, onReady: func, onStop: func}
				if(_.isString(config)) subName = config;
				else {
					subName = config.name;
				
					if(config.onReady || config.onStop) {
						callbacks = {onReady: config.onReady, onStop: config.onStop};
					}
			
					if(isLimit) {
						startLimit = config.limit || 10;
						this.setLimit(startLimit, subName);
					}
				}
			
				subFunc = function(computation, limit, cb) {
					var args = this.__evalParams(config.args);	
					args = [subName].concat(args || []);

					if(isLimit) args.push(limit);
					if(cb) args.push(cb);

					return Meteor.subscribe.apply(Meteor, args);
				};
			}
		}
		
		
		//CUSTOM FUNCTION THAT PERFORMS SUBSCRIPTION (OR EXTRA WORK ON MODEL SUBSCRIPTION FUNC FROM ABOVE):
		if(_.isFunction(config)) {
			subFunc = config;
			subName = subFunc.subscriptionName ? subFunc.subscriptionName() : subFunc.toString(); //subFunc == Model.handle().subscribe(); subscriptionName is assigned to handler for this case
			
			if(subName == '___insecure') subName = subName+':'+Random.id(); //allow for accessing this.ready(index) with multiple insecures of same model
			if(subFunc.model) subName = subFunc.model.className+':'+subName;
			
			if(isLimit) {
				startLimit = _.isFunction(subFunc.limit) ? subFunc.limit() : (this.startLimit || 10); 
				this.setLimit(startLimit, subName);
			}
		}
		

		return function(computation) {
			var cbs = callbacks || this.getSubscriptionCallbacks(subName), 
				isModelSubscribe = !!subFunc.subscriptionName,
				sub;
			
			if(isLimit) { //Model.subscribe will receive the limit as a param to the handle
				if(isModelSubscribe) sub = subFunc.call(this, computation, this.getLimit(subName), null, null, cbs); 
				else sub = subFunc.call(this, computation, this.getLimit(subName), cbs); //Model.subscribe handler expects..
				
				return this._addSub(sub, subName, isLimit);
			}
			else {
				if(isModelSubscribe) sub = subFunc.call(this, computation, null, null, null, cbs); 
				else sub = subFunc.call(this, computation, null, cbs); //..callbacks arg in specific position
				
				return this._addSub(sub, subName);
			}
		}.bind(this);
	},
	__evalParams: function(config) {
		return _.map(config, function(param) {
			if(_.isString(param) && param.indexOf('@') === 0) return eval(param.substr(1));
			else return param;
		}, this);
	}
});