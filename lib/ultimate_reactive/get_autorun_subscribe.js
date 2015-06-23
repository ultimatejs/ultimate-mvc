UltimateReactive.extend({
	runReactiveMethods: function() {
		if(this.ar) this.__runAllHandlers(this.ar, 'ar');
		if(this.sub && !this.isUltimateDatatableComponent) this.__runAllHandlers(this.sub, 'sub'); //Datatable handles sub on its own
		if(this.subLimit) this.__runAllHandlers(this.subLimit, 'subLimit'); 
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
		
		if(_.isArray(handlers) && _.isArray(handlers[0])) allHandlers = handlers; //eg: sub: '[['self'], ['something_else', params]]
		else if(_.isArray(handlers) && _.isPureObject(handlers[1])) allHandlers.push(handlers); //sub: ['subName', configObj, limit]
		else if(_.isArray(handlers) && !_.isArray(handlers[0])) allHandlers = handlers; //ar functions || ['subName1', 'subName2']
		else if(_.isFunction(handlers) || _.isString(handlers)) allHandlers.push(handlers); //single ar function, || sub: 'subName'

		return allHandlers;
	},

	
	_runSubscribe: function(subscribeParams, isLimit) {	
		if(_.isFunction(subscribeParams)) {
			var subFunc = subscribeParams,
				regex = new RegExp(/Meteor.subscribe\(('|")(.+)('|")/),
				matches = regex.exec(subFunc.toString()),
				subName = _.isArray(matches) ? matches[2] : null;

			//subFunc == Model.handle().subscribe(); subscriptionName is assigned to handler for this case
			if(!subName && subFunc.subscriptionName) subName = subFunc.subscriptionName; 
		}
		
		if(_.isString(subscribeParams)) subscribeParams = this.__convertStringToArrayParams(subscribeParams);
				
		if(_.isArray(subscribeParams)) {
			var subName = subscribeParams[0];
				
			if(isLimit) {
				var startLimit = subscribeParams.pop();
				this.setLimit(startLimit, subName);
			}
		
			var subFunc = function(computation, limit) {
				subscribeParams = this.__evalParams(subscribeParams);	
				if(isLimit) subscribeParams.push(limit);
				return Meteor.subscribe.apply(Meteor, subscribeParams);
			};
		}

		return function(computation) {
			var sub = subFunc.call(this, computation, isLimit ? this.getLimit(subName) : null); 
			return this._addSub(sub, subName);
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