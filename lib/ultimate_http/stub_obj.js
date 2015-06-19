UltimateHttp.extend({
	generateServerStub: function(meth) {
		this.generateClassStub(); 
		var ClassStub = Ultimate.httpClasses[this.className]
		
		if(this.isStatic) ClassStub['staticMethods'].push(meth);
		else ClassStub['instanceMethods'].push(meth);
	},
	generateClassStub: function() {
		var ClassStub = Ultimate.httpClasses[this.className]; //will use already created ClassStub if 2nd+ method
		if(!ClassStub) { 
			ClassStub = Ultimate.httpClasses[this.className] = {}; //allow access by object reference
			ClassStub['parentClass'] = this.getParentClass();
			ClassStub['instanceMethods'] = [];
			ClassStub['staticMethods'] = [];
		}
			
		//set constructClient if provided; called multiple times so guaranteed to receive constructClient
		if(!ClassStub['construct'] || this.constructClient) { 
			var constructor = this.constructClient || this.InstanceOrClass.construct;
			ClassStub['construct'] = constructor ? constructor.toString() : "function () {}";
		}
		
		return ClassStub;
	}
});