raiseUltimateClassScope = function(file) {
	console.log('REAL VERSION!!')
	var code = file.getContentsAsString(),
		isPackage = file.getPackageName() ? 'true' : 'false';
	

	//if(file.getPackageName()) code = 'this.ULTIMATE_PACKAGE = true; '+code;
	
	//support the old Ultimate.extends() interface: 
	//eg: Ultimate('SomeClass').extends() -> SomeClass = Ultimate.Component('SomeClass').createClass({
	var reg1 = /(Ultimate\(['"])(.+)(['"])(\).extends\()/g;
	code = code.replace(reg1, '$2 = $1$2$3, '+isPackage+'$4');
	
	//support the new SomeClass = Parent.createClass:
	//eg: SomeClass = Parent.createClass() -> SomeClass = Ultimate.Component('SomeClass').createClass({
	var reg2 = /(?:var| )*(\S+)(?:\s|\=)+(\S+)\.(createClass|createComponent|createModel|createComponentModel|createForm|createRouter|createConfig|createAccounts|createPermissions|createPublishers|createStartup)\(/g;
	code = code.replace(reg2, "$1 = $2('$1', "+isPackage+").$3(");
	
	//change class names for babel, so inner scope does not override outer scope for class name, so we can do, eg, SomeClass.find() within its methods
	var reg3 = /class\s+(.\S+)\s+extends/g; 
	code = code.replace(reg3, 'class ___$1___ extends');
	
	//if(file.getPackageName()) code += '; this.ULTIMATE_PACKAGE = false; ';
	
	return code;
};


transpileToUltimate = function(code, file) {
	var isPackage = file.getPackageName() ? 'true' : 'false';
	
	//substitute all occurrences of classes with Ultimate enabled versions.
	//Ultimate.babelInherits which is called on the resulting class only applies Ultimate
	//inheritance if extending from an Ultimate class, i.e. ParentClass.isUltimate
	var reg = /(babelHelpers\.inherits\((.+),\s*(.+)\);)([\s\S]+)(return \2);([\s\S]+?\}\)\((.+?)\))?;/g; 
	var subst = "if(!$3.isUltimate) babelHelpers.inherits($2, $3);$4return Ultimate.babelInherits('$2', $2, $3, "+isPackage+"); \n })($7);"; 
		
	return code.replace(reg, subst);
};


raiseClassScope = function(code) {
	//Remove var scoping from class definition.
	//Make application classes globally scoped, and package classes scoped to the top of the package.
	var reg1 = /babelHelpers\.inherits\((.+),\s*(.+)\)/g
	var match1;
		
	while((match1 = reg1.exec(code)) !== null) {
    if(match1.index === reg1.lastIndex) reg1.lastIndex++;
    if(match1[2]) code = code.replace('var '+match1[1]+' = (function ('+match1[2]+') {', match1[1].replace(/___/g, '')+' = (function ('+match1[2]+') {');
	}
	
	//handle plain classes (not yet extended)
	var reg2 = /babelHelpers\.classCallCheck\(this,\s*(.+)\)/g
	var match2;
	
	while((match2 = reg2.exec(code)) !== null) {
    if(match2.index === reg2.lastIndex) reg2.lastIndex++;
    if(match2[1]) code = code.replace('var '+match2[1]+' = (function () {', match2[1]+' = (function () {');
	}
	
	//we use constructors as functions, so we can't have this
	var reg3 = /babelHelpers\.classCallCheck\(this,\s*(.+)\);/g
	code = code.replace(reg3, '');
	
	return code;
};