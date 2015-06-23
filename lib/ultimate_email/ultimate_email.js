Ultimate('UltimateEmail').extends(UltimateClass, {
  send: function(from, to, subject, message) {
	  Email.send({
	    from: from,
	    to: to,
	    subject: subject,
	    html: message
	  });
	}
});

