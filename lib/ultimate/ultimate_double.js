//Clone `Ultimate` to allow for mixin inheritance during main inheritance without 
//obstructing state stored in `Ultimate` for primary inheritance purpose.

UltimateDouble = function UltimateDouble(className) {
	UltimateDouble.className = className;
	return UltimateDouble;
};

_.extend(UltimateDouble, Ultimate);