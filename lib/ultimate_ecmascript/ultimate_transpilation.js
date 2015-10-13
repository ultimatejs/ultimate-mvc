raiseUltimateClassScope = function(file) {
	var code = file.getContentsAsString();
	var reg = /(Ultimate\(['"])(.+)(['"]\).extends\()/g;

	if(file.getPackageName()) code = 'ULTIMATE_IS_PACKAGE = true; '+code;
	code = code.replace(reg, '$2 = $1$2$3');
	if(file.getPackageName()) code += '; ULTIMATE_IS_PACKAGE = false; ';
	
	return code;
};


transpileToUltimate = function(code, file) {
	//substitute all occurrences of classes with Ultimate enabled versions.
	//Ultimate.babelInherits which is called on the resulting class only applies Ultimate
	//inheritance if extending from an Ultimate class, i.e. ParentClass.isUltimate
	var reg = /(babelHelpers\.inherits\((.+),\s*(.+)\);)([\s\S]+)(return \2);([\s\S]+?\}\)\((.+?)\))?;/g; 
	var subst = "if(!$3.isUltimate) babelHelpers.inherits($2, $3);$4return Ultimate.babelInherits('$2', $2, $3); \n })($7);"; 
		
	return code.replace(reg, subst);
};


raiseClassScope = function(code) {
	//Remove var scoping from class definition.
	//Make application classes globally scoped, and package classes scoped to the top of the package.
	var reg1 = /babelHelpers\.inherits\((.+),\s*(.+)\)/g
	var match1;
		
	while((match1 = reg1.exec(code)) !== null) {
    if(match1.index === reg1.lastIndex) reg1.lastIndex++;
    if(match1[2]) code = code.replace('var '+match1[1]+' = (function ('+match1[2]+') {', match1[1]+' = (function ('+match1[2]+') {');
	}
	
	//handle plain classes (not yet extended)
	var reg2 = /babelHelpers\.classCallCheck\(this,\s*(.+)\)/g
	var match2;
	
	while((match2 = reg2.exec(code)) !== null) {
    if(match2.index === reg2.lastIndex) reg2.lastIndex++;
    if(match2[1]) code = code.replace('var '+match2[1]+' = (function () {', match2[1]+' = (function () {');
	}
	
	return code;
};