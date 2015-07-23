Ultimate('UltimateEmail').extends(UltimateClass, {	
	construct: function(to, subject, message, from) {
		this.to = to;
		this.subject = subject;
		this.message = message;
		
		if(from) this.from = from;
		else {
			if(typeof Config == 'undefined') this.from = 'site@' + Ultimate.rootUrl.replace('http://', '').replace('https://', '');
			else {
				if(Config.fromAddress) this.from = Config.fromAddress;
				else this.from = Config.defaultFromAddress();
			}
		}
	}
});

UltimateEmail.extendBoth({
	apiUrl: 'https://api.mailgun.net/v2',
	
	apiKey: function() {
		if(Ultimate.config) return Ultimate.config.mailgun;
	},
	send: function(to, subject, message, from) {
		var apiKey = UltimateUtilities.extract(this.apiKey, this);
		
		if(apiKey) this.sendApi(to, subject, message, from);
		else this.sendSmtp(to, subject, message, from);
	},
  
	
  sendApi: function(to, subject, message, from) {
		var apiKey = UltimateUtilities.extract(this.apiKey, this);
		
    HTTP.post(this.apiUrl + '/celebvidy.com/messages', {
        auth:"api:" + apiKey,
        params: {
            'to': to || this.to,
            'subject': subject || this.subject,
            'html': message || this.message, //Handlebars.templates[templateName](order);
            //'text': message || this.message,
						'from': from || this.from
        }
    }, function(error) {
        if(error) console.log('MAILGUN SEND ERROR!', error);
        else console.log('MAILGUN SEND SUCCESS!!');
    }.bind(this));
  },
  sendSmtp: function(to, subject, message, from) {
	  Email.send({
	    to: to || this.to,
	    subject: subject || this.subject,
	    html: message || this.message,
			from: from || this.from
	  });
	},
	
	templateToHtml: function(name, model) {
		return this.message = Handlebars.templates[name](model);
	}
});





