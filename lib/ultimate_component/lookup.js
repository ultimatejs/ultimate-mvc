Blaze._getTemplateHelperFromParents = function(name) {
	var view = Blaze.currentView.parentView,
		helper;

	while(view && !helper) {
		if(view.template) {
			helper = Blaze._getTemplateHelper(view.template, name, view.templateInstance);
		}
		view = view.parentView
	}

	return helper;
};

// Looks up a name, like "foo" or "..", as a helper of the
// current template; the name of a template; a global helper;
// or a property of the data context.  Called on the View of
// a template (i.e. a View with a `.template` property,
// where the helpers are).  Used for the first name in a
// "path" in a template tag, like "foo" in `{{foo.bar}}` or
// ".." in `{{frobulate ../blah}}`.
//
// Returns a function, a non-function value, or null.  If
// a function is found, it is bound appropriately.
//
// NOTE: This function must not establish any reactive
// dependencies itself.  If there is any reactivity in the
// value, lookup should return a function.
Blaze.View.prototype.lookup = function (name, _options) {
  var template = this.template;
  var lookupTemplate = _options && _options.template;
  var helper;
  var binding;
  var boundTmplInstance;
  var foundTemplate;

  if (this.templateInstance) {
    boundTmplInstance = _.bind(this.templateInstance, this);
  }

  // 0. looking up the parent data context with the special "../" syntax
  if (/^\./.test(name)) {
    // starts with a dot. must be a series of dots which maps to an
    // ancestor of the appropriate height.
    if (!/^(\.)+$/.test(name))
      throw new Error("id starting with dot must be a series of dots");

    return Blaze._parentData(name.length - 1, true /*_functionWrapped*/);

  }

  // 1. look up a helper on the current template
  if (template && ((helper = Blaze._getTemplateHelper(template, name, boundTmplInstance)) != null)) {
    return helper;
  }

	// 1.b. lookup a helper on all parent views
  if (template && ((helper = Blaze._getTemplateHelperFromParents(name)) != null)) {
    return helper;
	}
  
	
  // 2. look up a binding by traversing the lexical view hierarchy inside the
  // current template
  if (template && (binding = Blaze._lexicalBindingLookup(Blaze.currentView, name)) != null) {
    return binding;
  }


  // 3. look up a template by name
  if (lookupTemplate && ((foundTemplate = Blaze._getTemplate(name, boundTmplInstance)) != null)) {
    return foundTemplate;
  }

  // 4. look up a global helper
  if ((helper = Blaze._getGlobalHelper(name, boundTmplInstance)) != null) {
    return helper;
  }

  // 5. look up in a data context
  return function () {
    var isCalledAsFunction = (arguments.length > 0);
    var data = Blaze.getData();
    var x = data && data[name];
    if (! x) {
      if (lookupTemplate) {
        throw new Error("No such template: " + name);
      } else if (isCalledAsFunction) {
        throw new Error("No such function: " + name);
      } else if (name.charAt(0) === '@' && ((x === null) ||
                                            (x === undefined))) {
        // Throw an error if the user tries to use a `@directive`
        // that doesn't exist.  We don't implement all directives
        // from Handlebars, so there's a potential for confusion
        // if we fail silently.  On the other hand, we want to
        // throw late in case some app or package wants to provide
        // a missing directive.
        throw new Error("Unsupported directive: " + name);
      }
    }
    if (! data) {
      return null;
    }
    if (typeof x !== 'function') {
      if (isCalledAsFunction) {
        throw new Error("Can't call non-function: " + x);
      }
      return x;
    }
    return x.apply(data, arguments);
  };
};
