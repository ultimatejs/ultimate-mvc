UltimateModel.extendStatic({
	with: function(relationsGroup, relationsGroup2, relationsEtc, options) {
		if(_.isString(relationsGroup)) this.addRelationsArray(this.getRelations(), _.toArray(arguments));
		else if(_.isArray(relationsGroup)) this.addRelationsArray(this.getRelations(), relationsGroup);
		else if(_.isObject(relationsGroup)) this.combineRelations(this.getRelations(), relationsGroup); //relations arg already in expected object format
		
		return this;
	},
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
			relations = {}
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