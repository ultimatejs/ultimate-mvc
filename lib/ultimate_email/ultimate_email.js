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
	},
  send: function(to, subject, message, from) {
	  Email.send({
	    to: to || this.to,
	    subject: subject || this.subject,
	    html: message || this.message,
			from: from || this.from
	  });
	}
}, {
	send: function(to, subject, message, from) {
	  Email.send({
	    to: to,
	    subject: subject,
	    html: message,
			from: from
	  });
	}
});

