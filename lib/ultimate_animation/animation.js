UltimateComponentParent.extend({
	setupAnimations: function(context) {
		var uc = context.component ? context.component() : context; //UltimateComponentModel.component || UltimateComponent
				
		_.chain(this.getAnimations())
			.each(function(handler, methodKey) {
				var hookName = methodKey.firstWord(), //return insertElement from, eg, 'insertElement .someClass'
					isTopNode = !methodKey.split(' ')[1],
					selector = methodKey.replace(hookName, '').trim(),
					els = isTopNode ? (uc.firstNode() ? [uc.firstNode()] : []) : uc.findAll(selector);
				
				
				if(/animateOnRendered/.test(hookName)) {
					var elements = $(els);
					
					if(elements.length === 0) return;
					
					if(_.isFunction(handler)) handler.call(context, elements);
					else uc.__insertElementWithAnimation(handler, elements);
				}
				else {
		   		els.forEach(function(el) {
						var hooks = el._uihooks = el._uihooks || {};
					
						if(hookName == 'animateOnChildInsert') {
							hooks.insertElement = uc.__queueAnimation.bind(uc, methodKey, 'insert', context, handler);
						}
						if(hookName == 'animateOnChildInsertAndRendered') {
							hooks.insertElement = uc.__queueAnimation.bind(uc, methodKey, 'insert', context, handler);
						}
						else if(hookName == 'animateOnChildRemoved') {
							hooks.removeElement = uc.__queueAnimation.bind(uc, methodKey, 'remove', context, handler);			
						}		
					
					
						//handled regular rendered case for onChild animations. Note: this is called during onRendered cb.
						//All the elements will already be on the page, so __queueAnimation() is not needed
						if(/animateOnChildInsertAndRendered|animateOnChildRendered/.test(hookName)) {
							var elements = $(el).children();
						
							if(elements.length === 0) return;
							
							if(_.isFunction(handler)) handler.call(context, elements);
							else {
								if(_.isInt(_.last(handler))) { //clone and pop delay integer so above queued Animations dont lose the delay param
									handler = _.clone(handler);
									var delay = handler.pop();
									
									//then delay it, since __queueAnimation() above is responsible for delaying it in post-onRendered cases
									Meteor.setTimeout(function() { 
										uc.__insertElementWithAnimation(handler, elements);
									}, delay);
								}
								else uc.__insertElementWithAnimation(handler, elements);
							}
						}
					});
				}	
	   		
				
			}, this);
	},
	getAnimations: function() {
		return _.filterPrototype(this.getPrototype(), this._isAnimation);
	},
	_isAnimation: function(event, prop) {
		return this._animationsRegex.test(prop) && this.isMethod(prop);
	},
	__queueAnimation: function(methodKey, type, context, handler, node, next) {
		this.___animations = this.___animations || {};

		var animations = this.___animations[methodKey] = this.___animations[methodKey] || [],
			animation = {handler: handler, node: node, next: next},
			timers = this.___animationTimers = this.___animationTimers || {},
			delay = 100;
		
		if(_.isArray(handler) && _.isInt(_.last(handler))) delay = _.last(handler);
			
		this.clearTimeout(this.___animationTimers[methodKey]);
		
		
		this.___animationTimers[methodKey] = Meteor.setTimeout(function() {
			Tracker.afterFlush(function() {
				var nodes = _.map(animations, function(animation) { return animation.node; }),
					handler = _.last(animations).handler; //handler and next will be the same for all nodes.
					next = _.last(animations).next; //this is essentially an animation queue.
					
				delete this.___animations[methodKey];
				delete this.___animationTimers[methodKey];
			
				if(nodes.length === 0) return;
				
				if(_.isArray(handler) && _.isInt(_.last(handler))) {
					handler = _.clone(handler); //clone handler so future batches of queued animations still have the delay, since handler array is a reference object
					handler.pop(); //remove the delay integer from the array, its not needed anymore
				}
					
				if(_.isFunction(handler)) handler.apply(context, [$(nodes), next]); //custom function to handle animation
				else if(_.isArray(handler)){ //velocity animation defintion
					if(type == 'insert') this.__insertElementWithAnimation(handler, nodes, next);
					else if(type == 'remove') this.__removeElementWithAnimation(handler, nodes);
				}
			}.bind(this));
		}.bind(this), delay); //even 1ms is enough time to collect all insert/remove animations that come as one batch
		
		animations.push(animation);
	},
	__insertElementWithAnimation: function(cssOptionsArr, nodes, next) {
		if(nodes.length === 0) return;
		
		var sequence = this._prepAnimationSequence(cssOptionsArr, nodes, 'easeInSine'),
			css = sequence[0].p;
	
		//presume that animations generally want to start with opacity === 0
		//if not explicitly provided or set to opacity: false.
		if(!_.isString(css)) { //strings are velocity transitions from the ui pack, which already start at opacity === 0
			if(!css.opacity && css.opacity !== false) css.opacity = [1, 'easeInSine', 0];		
			if(css.opacity === false) delete css.opacity;
		}
		else $(nodes).css('opacity', 0);
		
		if(next) $(nodes).insertBefore(next); //animateOnRendered won't supply next, but will already be in the DOM
		$.Velocity.RunSequence(sequence);
	},
	__removeElementWithAnimation: function(cssOptionsArr, nodes) {
		if(nodes.length === 0) return;
		
		var sequence = this._prepAnimationSequence(cssOptionsArr, nodes, 'easeOutSine'),
			lastOptions = _.last(sequence).o,
			onComplete = _.isObject(lastOptions) && lastOptions.complete;
			
		lastOptions.complete = function(els) {
			if(_.isFunction(onComplete)) {
				onComplete(nodes);
				if(lastOptions.remove !== false) $(nodes).remove();
			}
	  	else $(nodes).remove();
		};
	
		if(lastOptions.reverse !== false) nodes = nodes.reverse(); 
		$.Velocity.RunSequence(sequence);
	},
	_prepAnimationSequence: function(cssOptionsArr, node, easing) {
		var sequence = [];
		
		_.each(cssOptionsArr, function(obj, i) {
			if(i & 1) return; //index is odd, skip it, and move to the next pair
			var css = cssOptionsArr[i] || {},
				options = cssOptionsArr[i+1] || {};
			
			if(!options.duration && !_.isString(css)) options.duration = 500; //velocity ui pack transitions have their own good default duration
			if(!options.easing) options.easing = easing;
			if(options.queue === false) options.sequenceQueue = false; //just in case they try to use queue instead
				
			//automatically stagger arrays of elements who are being animated by a ui pack string transition.
			//note: you cant stagger non ui pack animations. Wish we could, but the Veolcity ui pack offers plenty.
			if(_.isString(css) && !options.stagger && options.stagger !== false) {
				options.stagger = 150;
			}

			sequence.push({e: node, p: css, o: options});
		});
		
		return sequence;
	},
});