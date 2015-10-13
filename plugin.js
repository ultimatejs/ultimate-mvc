Plugin.registerCompiler({
  extensions: ["js"],
  filenames: []
}, function () {
  return new UltimateCompiler;
});

function UltimateCompiler() {}

UltimateCompiler.prototype.processFilesForTarget = function(files) {
  files.forEach(function(file) {
	  var code = file.getContentsAsString(),
			reg = /(Ultimate\(['"])(.+)(['"]\).extends\()/g;
		
		if(file.getPackageName()) code = 'ULTIMATE_IS_PACKAGE = true; '+code;
		
		code = code.replace(reg, '$2 = $1$2$3');
		
		if(file.getPackageName()) code += '; ULTIMATE_IS_PACKAGE = false; ';
				
    file.addJavaScript({data: code, path: file.getPathInPackage() + '.js'});
  });
};