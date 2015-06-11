Meteor.Collection.Cursor.prototype.fetchIds = function() {
	return this.map(function(model) {
		return model._id;
	});
};

Meteor.Collection.Cursor.prototype.fetchValues = function(key) {
	return this.map(function(model) {
		return model[key];
	});
};


var oldRemove = Meteor.Collection.prototype.remove;
		
Meteor.Collection.prototype.remove = function(selector) {
	if(Meteor.isClient && typeof UltimateAggregate !== 'undefined') Meteor.call('ultimate_remove', selector, this._name);
	oldRemove.call(this, selector); 
};

if(Meteor.isServer) {
	Meteor.methods({
		ultimate_remove: function(selector, name) {
			var collection = Ultimate.collections[name];

			if(!collection) return;

			var models = collection.find(selector, {transform: null}).fetch();

			this.unblock();

			models.forEach(function(obj) {
				obj.collection = collection._name;

				delete obj._id;
				delete obj._originalDoc;
				//delete obj.className; //now needed for removal observer selector filtering

				UltimateRemovals.insert(obj);
			});
		}
	});
};


/** TOO DANGEROUS CUZ PUBLISHERS FROM MULTIPLE USERS SHARE THE SAME Ultimate.currentUserId prop and Ultimate.userId() method
if(Meteor.isServer) {
	var oldPublish = Meteor.publish;

	Meteor.publish = function(name, func) {
		var newFunc = function() {
			Ultimate.currentUserId = this.userId;
			return func.apply(this, arguments);
		};

		return oldPublish.call(Meteor, name, newFunc);
	};
}
**/

