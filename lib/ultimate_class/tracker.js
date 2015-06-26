var methods = {
  get: function(prop, name) { //get/set are aliases which will get overwritten by UltimateForm/UltimateModel
		return this.getDepProp(prop, name);
  },
  set: function(prop, val, name) { //but still available for all other classes
    return this.setDepProp(prop, val, name);
  },
	
	
  getDepProp: function(prop, name) { //and you can always count on these
    this.depend(name);
    return this[prop];
  },
  setDepProp: function(prop, val, name) {
    this[prop] = val;
    return this.changed(name);
  },
	
	
  depend: function(name) {
    this.dep(name).depend();
		return this.dep(name);
  },
  changed: function(name) {
    this.dep(name).changed();
		return this.dep(name);
  },
	
	
  dep: function(name) {
		var prop = this._depName(name);
    return this[prop] = this[prop] || new Tracker.Dependency;
  },
	doesDepExist: function(name) {
		var prop = this._depName(name);
		return this[prop];
	},
	
	_depName: function(name) {
		return name ? '___dep_'+name : '___dep';
	},
	
	autorun: function(func) {
		Tracker.autorun(func.bind(this));
	}
};

UltimateClass.extendBoth(methods);
_.extend(Ultimate, methods); //give Ultimate Reactivity too