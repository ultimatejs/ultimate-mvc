UltimateUser = Ultimate('UltimateUser').extends(UltimateModel, {
  abstract: true,
  collection: Meteor.users, //will be used by child models automatically
  publishFields: [],


  onChildStartup: function() {
    if(_.isEmpty(this.publishFields)) return;

    var self = this;

    if(Meteor.isServer) {
      Meteor.publish('ultimate_user_self', function() {
        self.publishSelf(this);
      });
    }
    else Meteor.subscribe('ultimate_user_self');
  },

  getEmail: function() {
		let email;
		
    if(_.isArray(this.emails) && this.emails[0].address) email = this.emails[0].address;
		else if(this.services){
			_.some(this.services, function(service) {
				if(service.email) return email = service.email;
				else if(_.isArray(service.emails) && service.emails[0].email) return email = service.emails[0].email;
			}, this);
		}
		
		return email;
  },
  usernameFromService: function(service) {
		return this.services[service].username;
  },
  idFromService: function(service) {
		return this.services[service].id;
  },
  getName: function() {
		return this.profile.name;
  },
  isAdmin: function() {
    return Roles.userIsInRole(this._id, ['admin']);
  },
	isInRole: function(role) {
		return Roles.userIsInRole(this._id, [role]);
	},
  publishSelf: function(pub) {
    if(this.publishFields) {
      var options = {};
      options.fields = {};

      _.each(this.publishFields, function(key) {
        options.fields[key] = 1;
      });

      return Meteor.users.find(pub.userId, options);
    }
    else return Meteor.users.find(pub.userId);
  }
});

UltimateUser.extendServer({
  getToken: function(name) {
    return this.services[name].accessToken;
  }
});
