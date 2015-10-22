UltimateModel.extendStatic({
 /**
  * @summary specify a relations to subscribe to related to the subscription models: `ModelClass.with('relation1', 'relationEtc').subscribe('subscriptionName')`
  * @locus Anywhere
  * @memberOf Ultimate.Model
	* @static
	*
  * @param {String} relationName - any number of relation names configured in the `relations` property for the given model
	* @param {Object} [options] - typical options map you would supply to `find()` with keys: `limit`, `fields`, `sort`
	*
	*	@returns {Object} returns `ModelClass` for chaining, which should end in `subscribe()`. 
	*/
	with: function(relationsGroup, relationsGroup2, relationsEtc, options) {
		if(_.isString(relationsGroup)) this.addRelationsArray(this.getRelations(), _.toArray(arguments));
		else if(_.isArray(relationsGroup)) this.addRelationsArray(this.getRelations(), relationsGroup);
		else if(_.isObject(relationsGroup)) this.combineRelations(this.getRelations(), relationsGroup); //relations arg already in expected object format
		
		return this;
	},
	
	
 /**
	* @name relations
  * @summary Configuration property to specify relations used in `model.with('relationName').subscribe('subscriptionName)`
  * @locus Anywhere
  * @memberOf Ultimate.Model
	* @instance
	* @configproperty true
	*
  * @param {String} [userId] - the userId of the subscribing user if available
	* @param {String} config.relation - the relation type. Can be: `has_many`, `belongs_to`, `has_one`, `many_many`
	* @param {String} config.model - the name of the model class related
	* @param {String} config.foreign_key - the key on the related model class, or in the case of `belongs_to`, the key on this model
	*
	*	@returns {Object} returns a map of config objects, where keys are the relation anames, accessible at: `model.relationName()`. 
	*/
	getRelations: function() {
		return this._relations = this._relations || {};
	},


	addRelationsArray: function(allRelations, args) { //args == ['orders', 'posts.comments', options]
		var	options = _.lastObjectFromArguments(args); //only pops options object, if available, otherwise null
	
		_.each(args, function(relationsGroup, index) {
			var lastRelationGroupOptions = index === args.length-1 ? options : null;
			this.addGroup(allRelations, relationsGroup, lastRelationGroupOptions); //apply options only to last relationGroup
		}, this);

		return allRelations;
	},
	addGroup: function(allRelations, relationsString, options) { //eg: 'posts.comments'
		var rels = relationsString.split('.'),
			relations = {},
			lastRelation;

		_.reduce(rels, function(relations, name) { 
			relations.with = {};
			return relations.with[name] = lastRelation = {};
		}, relations);

		_.extend(lastRelation, options); //options apply to last relation only
		relations = relations.with //actual content starts in first 'with' object; just easier to start with 'with' in _.reduce

		return this.combineRelations(allRelations, relations);		
	},

	//Instead of _.extend(this.getRelations(), relations), we combine them so that
	//if the same relation appears 2x+, any 'with' relations of its own are combined 
	//eg: 'instances.payments' and 'instances.orders' becomes:
	//{instances: {with: {payments: {}, orders: {}}}}
	combineRelations: function(allRelations, newRelations) {
		var relations = allRelations;

		_.each(newRelations, function(obj, name) { 
			var current = relations[name];

			//you will only be dealing with an array, eg: ['orders'], at this point 
			if(_.isArray(obj.with)) { //from object groups passed in that have with: []
				var temp = current && current.with || {};
				obj.with = this.addRelationsArray(temp, obj.with); 
			}

			if(_.isFunction(obj)) obj = obj.call(); //sometimes 'with' is a function

			if(current && obj.with) {
				if(!current.with) current.with = {}; 
				this.combineRelations(current.with, obj.with); //'with' properties recursively merged

				delete obj.with;
				_.extend(current, obj); //only want to merge in non 'with' properties now, hence 'with' prop deleted
			}
			else if(!current) {
				if(obj.with) obj.with = this.combineRelations({}, obj.with); 
				current = relations[name] = obj; //relation doesn't exist yet, just assign it in the tree

			}
			else current = _.extend(current, obj); //obj.with relation does exist, but plain _.extend() can be used since there is no recursive 'with' merging

			relations = current; //progress deeper into getRelations object, looking for next set of already existing 'with' objects
		}, this);

		return allRelations;
	},


	//used by RelationsPublisherFactory to combine 'relationWith' provided in relation definitions
	//with 'subscribeWith' provided at subscribe time, eg: User.with('orders.payments').subscribe('users')
	withRelationCombine: function(subscribeWith, relationWith) {
		if(!relationWith) return;
		if(!subscribeWith) subscribeWith = {};

		if(_.isArray(relationWith)) return this.addRelationsArray(subscribeWith, relationWith);
		else if(_.isObject(relationWith)) return this.combineRelations(subscribeWith, relationWith); //relations arg already in expected object format
	}
});