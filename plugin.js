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
			reg = /Ultimate\(('|")(.+)('|")\).extends\(/,
			className = code.match(reg)[2],
			output = className+' = '+code;
			
    file.addJavaScript({data: output, path: file.getPathInPackage() + '.js' });
  });
};