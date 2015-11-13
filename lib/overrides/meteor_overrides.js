//for some reason Cursor.prototype isn't where it should be on the server in Node
var proto = Meteor.isClient ? Meteor.Collection.Cursor.prototype : Object.getPrototypeOf(Meteor.users.find());

proto.fetchIds = function() {
	return this.map(function(model) {
		return model._id;
	});
};

proto.fetchValues = function(key) {
	return this.map(function(model) {
		return model[key];
	});
};

proto.one = function() {
	return this.fetch()[0];
};
proto.first = function() {
	return this.fetch()[0];
};

proto.last = function() {
	return _.last(this.fetch());
};

var oldRemove = Meteor.Collection.prototype.remove;
		
Meteor.Collection.prototype.remove = function(selector, callback) {
	if(typeof UltimateAggregate !== 'undefined' && this._name != 'ultimate_removals') {
		Meteor.call('ultimate_remove', selector, this._name);
	}
	return oldRemove.call(this, selector, callback);
};

if(Meteor.isServer) {
	Meteor.methods({
		ultimate_remove: function(selector, name, userId) {		
			var collection = Ultimate.collections[name],
				userId = userId || this.userId,
				count = 0;

			if(!collection) return 0;

			
			var models = collection.find(selector, {transform: null}).fetch();
			
			models.forEach(function(doc) {
				var allowed = true;
				
				_.some(collection._validators.remove.allow, function(func) {
					if(!func(userId, doc)) {
						allowed = false;
						return true;
					}
				}, this);
				
				_.some(collection._validators.remove.deny, function(func) {
					if(func(userId, doc)) {
						allowed = false;
						return true;
					}
				}, this);
				
				if(!allowed) return;

				
				doc.collection = collection._name;

				doc.oldClassName = doc.className;
				doc.oldCreated_at = doc.created_at;
				doc.oldUpdated_at = doc.updated_at;
				doc.oldId =  doc._id;
				
				delete doc._id;
				delete doc._originalDoc;
				delete doc.className;
				delete doc.created_at;
				delete doc.updated_at
				
				UltimateRemovals.insert(doc);
				count++;
			}, this);
			
			return count;
		}
	});
};