UltimateHttp.extend({
  generateClientStub: function(meth) {
    var __type = this.__type,
      isStatic = this.isStatic;

    return function() {
      var args = _.toArray(arguments),
        cb = null,
        argsNoCb = [],
        methodName = __type + '_' + meth;


      if(!isStatic) args.unshift(this); //make first argument this instance object
			else args.unshift(this.className)
				
      //extract the callback for passing to the dynamicaly defined Meteor.apply call below
      _.each(args, function(arg) {
        if(_.isFunction(arg)) cb = arg; //there should be only one callback
        else {
          if(arg && arg.transformClient) arg = arg.transformClient(); //prepare any instances for passing to server
          argsNoCb.push(arg);
        }
      });

      if(!cb) {
        cb = function(error, data) {
          //console.log('extendHttp -- no Callback provided: (error, data)', error, data);
        };
      }
      cb = cb.bind(this);

      //execute the AJAX call
      //console.log('extendHttp: Meteor.apply', methodName, argsNoCb, this);
      Meteor.apply(methodName, argsNoCb, cb);

      //why not allow user defined stubs to operate in the meantime ;)
      var stub = this['stub_'+meth];
      if(stub) stub.apply(this, argsNoCb);
    };
  }
});