Ultimate('UltimateEmail').extends(UltimateClass, {	
	construct: function(to, subject, message, from) {
		this.to = to;
		this.subject = subject;
		this.message = message;
		
		this.from = from || this.fromAddress();
	}
});

UltimateEmail.extendBoth({
	apiUrl: 'https://api.mailgun.net/v2',
	
	apiKey: function() {
		if(Ultimate.config) return Ultimate.config.mailgunKey;
	},
	domain: function() {
		if(Ultimate.config) return Ultimate.config.mailgunDomain;
	},
	fromAddress: function() {
		if(this.from) return this.from;
		else if(!Ultimate.config) return 'site@' + Ultimate.rootUrl.replace('http://', '').replace('https://', '');
		else {
			if(Ultimate.config.mailgunFrom) return Ultimate.config.mailgunFrom;
			else return Ultimate.config.defaultFromAddress();
		}
	},
	
	send: function(to, subject, message, from) {
		var apiKey = UltimateUtilities.extract(this.apiKey, this);
		
		if(apiKey) this.sendApi(to, subject, message, from);
		else this.sendSmtp(to, subject, message, from);
	},
  
	
  sendApi: function(to, subject, message, from) {
		var apiKey = UltimateUtilities.extract(this.apiKey, this);
		
    HTTP.post(this.apiUrl + '/'+this.domain+'/messages', {
        auth:"api:" + apiKey,
        params: {
            'to': to || this.to,
            'subject': subject || this.subject,
            'html': message || this.message, //Handlebars.templates[templateName](order);
            //'text': message || this.message,
						'from': from || this.fromAddress()
        }
    }, function(error) {
        if(error) console.log('ULTIMATE_EMAIL SEND ERROR', error);
        else console.log('ULTIMATE_EMAIL SEND SUCCESS');
    }.bind(this));
  },
  sendSmtp: function(to, subject, message, from) {
	  Email.send({
	    to: to || this.to,
	    subject: subject || this.subject,
	    html: message || this.message,
			from: from || this.fromAddress()
	  });
	},
	
	templateToHtml: function(name, model) {
		return this.message = Handlebars.templates[name](model);
	}
});





