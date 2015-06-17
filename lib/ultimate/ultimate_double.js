//A hack to allow for static behaviors to "instantiate" their classes without obstructing
//the properties stored in Ultimate that correspond to the main class being setup around it

UltimateDouble = function UltimateDouble(className) {
	UltimateDouble.className = className;
	return UltimateDouble;
};

_.extend(UltimateDouble, Ultimate);