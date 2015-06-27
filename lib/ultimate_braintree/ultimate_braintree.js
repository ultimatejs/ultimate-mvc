UltimateBraintree = Ultimate('UltimateBraintree').extends({ //will be moved to package
	abstract: true,
	deniedHttp: ['_braintree'],
	
  //environment: //expected by child class
  //merchantId: 
  //publicKey: 
  //privateKey: 
	
	//onTokenizedCard: function(nonce) {} //callback passed nonce developers can use
	//customerIdForUser: function() {} //simple method users can use to return a braintree customerId for pre-existing user
	
	construct: function(config) {
		if(config) _.extend(this, config);
	},
	
	
	onStartup: function() {
		if(Meteor.isClient) this.loadBraintreeJs(this.assignClientToken.bind(this));
		else {
			this._braintree = Npm.require('braintree');
			this.connect();
		}
	},
	loadBraintreeJs: function(callback) {
		$.ajax({
		  url: 'https://js.braintreegateway.com/v2/braintree.js',
		  dataType: 'script',
		  cache: true, // otherwise will get fresh copy every page load
		  success: function() {
		  	callback()
		  }
		});
	},
	
	
	connect: function() {
		var config = UltimateUtilities.config(this, null, ['environment', 'merchantId', 'publicKey', 'privateKey']);
		config.environment = this._braintree.Environment[config.environment];
		this._gateway = this._braintree.connect(config);
	},
	assignClientToken: function(customerId, callback) {
		if(!Meteor.isClient) return;
		
		if(!customerId && this.tokenFromUser) customerId = this.customerIdForUser();
			
		this.generateToken(customerId, function(error, result) {
			if(!error) {
				this.clientToken = result;
				if(callback) callback.call(this, result);
			}
		}.bind(this));
	},
	tokenizeCard: function(options, customerId, callback) {
		if(!Meteor.isClient) return;
		
		if(arguments.length === 2 && _.isFunction(customerId)) customerId = null;
		
		callback = _.callbackFromArguments(arguments) || this.onTokenizedCard.bind(this);

		this._braintree = this._braintree || braintree; //assign it first time it's needed, since braintree js wont be loaded before onStartup
		
		if(!this.clientToken) this.assignClientToken(customerId, function(clientToken) {
			this._finalizeTokenizeCard(options, callback, clientToken);
		});
		else this._finalizeTokenizeCard(options, callback);
	},
	_finalizeTokenizeCard: function(options, callback, clientToken) {
		var client = new this._braintree.api.Client({clientToken: clientToken || this.clientToken});
		
		client.tokenizeCard(options, function (error, nonce) {
		  if(error) throw new Error('braintree-tokenize-card-error', error.toString());
			else callback(nonce);
		});
	}
}, {}, { //http instance methods
	generateToken: function(customerId) {
		var res = this.applySync(this._gateway.clientToken, 'generate', [{customerId: customerId}]);
		if(res.error) throw new Meteor.Error('braintree-client-token-generation-filed', res.error.toString())
		else return res.data.clientToken;
	},
	
	
	createCustomer: function(nonce, firstName, lastName, email, options, customFields) {
		var config = {
			paymentMethodNonce: nonce,
			firstName: firstName,
			lastName: lastName,
			email: email
		};
		
		if(customFields) config.customFields = customFields;
		
		var res = this.customer('create', config);
		if(nonce && res.customer) this.createPaymentMethod(nonce, res.customer.id, options);
		return res;
	},
	createSale: function(nonce, token, amount, customerId, options, customFields) {
		var config = {
			paymentMethodNonce: nonce,
			paymentMethodToken: token,
			amount: amount,
			customerId: customerId,
		  options: {
				storeInVault: true
		  }
		};
		
		_.extend(config.options, options);
		if(customFields) config.customFields = customFields;
		
		return this.transaction('sale', config);
	},
	createPaymentMethod: function(nonce, customerId, options) {
		var config = {
			paymentMethodNonce: nonce,
			customerId: customerId,
		  options: {
				makeDefault: true,
		    verifyCard: true
		  }
		};
		
		_.extend(config.options, options);
		return this.paymentMethod('create', config);
	},
	findCustomerPaymentMethods: function(customerId) {
		this.customer('find', customerId).paymentMethods;
	}
}, {}, {}, {}, { //server-only instance methods
	_callBraintree: function(objectName, method, options) {
		var res = this.applySync(this._gateway[objectName], method, [options]);
		if(res.error) throw new Meteor.Error('invalid-braintree-'+objectName+'-'+method+'-request', res.error.toString());
		else return res.data;
	},
	address: function(objectName, method, options) {
		return this._callBraintree('address', method, options);
	},
	clientToken: function(method, options) {
		return this._callBraintree('clientToken', method, options);
	},
	customer: function(method, options) {
		return this._callBraintree('customer', method, options);
	},
	discount: function(method, options) {
		return this._callBraintree('discount', method, options);
	},
	customer: function(method, options) {
		return this._callBraintree('customer', method, options);
	},
	merchantAccount: function(method, options) {
		return this._callBraintree('merchantAccount', method, options);
	},
	paymentMethod: function(method, options) {
		return this._callBraintree('paymentMethod', method, options);
	},
	subscription: function(method, options) {
		return this._callBraintree('subscription', method, options);
	},
	transaction: function(method, options) {
		return this._callBraintree('transaction', method, options);
	}
});