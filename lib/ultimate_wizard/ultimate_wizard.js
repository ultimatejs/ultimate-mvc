UltimateWizard = Ultimate('UltimateWizard').extends({
	abstract: true,
	construct: function(template) {
  		this._dep = new Tracker.Dependency();
	  	this.template = template;
  
	 	_.extend(this, _.pick(template.data, ['id', 'steps', 'clearOnDestroy', 'model', 'onComplete', 'route', 'noRoute']));

		if(!this.noRoute) this.route = this.route || Router.current().route.getName();
	
		if(!this.steps) {
			if(_.isFunction(this.model.wizards)) this.steps = this.model.wizards()[this.id];
			else this.steps = this.model.wizards[this.id];
		}

		this._stepsByIndex = [];
		this._stepsById = {};

		this.initialize();
	},

	initialize: function() {
		this.totalSteps = this.steps.length;
		this.lastStepIndex = this.totalSteps - 1;
		this.stepsCompleted = this.getStepsCompleted();
	
    _.each(this.steps, function(step, index) {
      this._initStep(step, index);
    }.bind(this));
    

		Tracker.autorun(function() {
			this._setActiveStep();
		}.bind(this));

		Tracker.autorun(function() {
			//this._setActiveStep();

			if(!this.activeStep().form) return;
			this.model.showFlashMessages();
		}.bind(this));
  },

	clearData: function() {
		if(this.model) this.model.clearReactive();
	},

	_initStep: function(step, index) {
		var self = this;

		step.id = step.path;
			
		if(!step.id) throw new Error('Step.id is required');

		this._stepsByIndex.push(step.id);

		this._stepsById[step.id] = _.extend(step, {
			index: index,
			num: index + 1,
		  wizard: self,
			schema: step.form ? this.model.getFormSchema(step.form) : null,
			onNext: step.onNext || (step.form ? this.model.getFormOnSubmit(step.form) : null)
		});

		if(step.defaultData) this.setData(step.defaultData);
			
		AutoForm.addHooks([step.form], {
			onError: function(operation, error, template) {
				if($('.ultimate-wizard').length === 0) return;
				Flash.danger(error.message);
			},
	  	onSubmit: function(data) {
				if($('.ultimate-wizard').length === 0) return false; //insure it doesn't get called when wizard not on page
				
				self.setData(data);			
				self.onNext(this);
		    return false;
	  	}
		});
	},
  
	onNext: function(autoform) {
		var step = this.activeStep(),
			model = this.model,
			schemaFields = step.schema ? step.schema._schemaKeys : [];

		var onSubmit = function() {
			if(step.onNext) step.onNext.apply(model, [this, autoform]);
			else this.next();
		}.bind(this)
	
		model.__applyOnSubmit(onSubmit, model, autoform, schemaFields);
	},

	
	NEXT: function(data) {
		var step = this.activeStep(),
		data = data || {};
		
		if(step.form) {
			var formData = AutoForm.getFormValues(step.form).insertDoc;
			data = _.extend({}, formData, data);
		}

		this.setData(data);

		var $form = $('#'+this.id+' form');
		
		if($form.length > 0) $form.submit();
		else this.onNext();
	},
	PREV: function(data) {
		var step = this.activeStep(),
		data = data || {};
		
		if(step.form) {
			var formData = AutoForm.getFormValues(step.form).insertDoc;
			data = _.extend({}, formData, data);
		}
		this.setData(data);
		
		this.previous();
	},
	
	next: function(data) {	
		var index = this.getActiveIndex() + 1;
		console.log('INDEX', index);
		this.setStepsCompleted(index);
		this.show(index);
		if(this.stepsCompleted === this.totalSteps) self.complete();
	},
	previous: function() {
		this.show(this.getActiveIndex() - 1);
	},
	
	
	setStepsCompleted: function(index) {
		this.stepsCompleted = index;
		Session.set('wizard_steps_completed_'+this.id, index);
	},
	getStepsCompleted: function() {
		var index = Session.get('wizard_steps_completed_'+this.id);
		if(!index) this.setStepsCompleted(0);
		return index || 0;
	},
	
	
	complete: function() {
		if(this.onComplete) this.onComplete.call(this);
		this.clearData();
		this.setStepsCompleted(0);
	},
	
	
	get: function(prop) {
		return this.model.get(prop);
	},
	
  	setData: function(data) {		
		return this._set(data);
  	},
	set: function(key, val) {
		var data = {};
		data[key] = val;
		
		return this._set(data);
	},
	_set: function(data) {
		_.extend(this.model, data); //extend complete model;	
		this.model.save();
		
		return this.model;
	},
	
	
	_setActiveStep: function() {
		if(!this.route) return this.show(0); //show the first step if not bound to a route

		var current = Router.current();

		if(!current || (current && current.route.getName() != this.route)) return false;

		console.log('PARAMS', current.params)
		var params = current.params, 
			index = _.indexOf(this._stepsByIndex, params.step);

		if(!params.step || index === -1) return this.show(0); //initial route or non existing step, redirect to first step

		this.setStep(params.step);
	},
	
	show: function(id) {
		if(typeof id === 'number') {
		  id = id in this._stepsByIndex && this._stepsByIndex[id];
		}

		if(!id) return false;
			
		if(this.route) Router.go(this.route, {step: id});
		else this.setStep(id);

		return true;
	},

	setStep: function(id) {
		var index = _.indexOf(this._stepsByIndex, id),
			stepCompletedId = this._stepsByIndex[this.stepsCompleted];
			
		if(index > this.stepsCompleted) return this.setStep(stepCompletedId); //invalid step (user skipping ahead in the form via URL)
		
    	this._activeStepId = id;
		
		this.model.setCurrentForm(this.getStep(id).form);
		//if(this.lastStepIndex === this.indexOf(id)) this.clearData(); //REMOVE WHEN PROVEN TO WORK WITHOUT IT
		
		var onBeforeShow = this.activeStep(false).onBeforeShow;
		if(onBeforeShow) onBeforeShow.call(this.model, this);
		
		this._dep.changed();
		
    	return this._stepsById[this._activeStepId];
	},
	
  
	getStep: function(id) {
		if(typeof id === 'number') {
		  id = id in this._stepsByIndex && this._stepsByIndex[id];
		}

		return id in this._stepsById && this._stepsById[id];
	},

	activeStep: function(reactive) {
		if(reactive !== false) this._dep.depend();
		return this._stepsById[this._activeStepId];
	},
  
	activeData: function() {
		return this.activeStep().model;
	},
	
	getActiveIndex: function() {
		return _.indexOf(this._stepsByIndex, this._activeStepId);
	},
	
	indexOf: function(id) {
		return _.indexOf(this._stepsByIndex, id);
	},

	destroy: function() {
		if(this.clearOnDestroy) this.clearData();
	} 
});