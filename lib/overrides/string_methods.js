_.extend(String.prototype, {
	capitalizeOnlyFirstLetter: function() {
	    return this.charAt(0).toUpperCase() + this.slice(1);
	},
	lowercaseOnlyFirstLetter: function() {
	    return this.charAt(0).toLowerCase() + this.slice(1);
	},
	capitalizeFirstLetter: function() {
		return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
	},
	lowercaseFirstLetter: function() {
	    return this.charAt(0).toLowerCase() + this.slice(1);
	},
	stripTrailingSlash: function() {
	  return this.substr(-1) == '/' ? this.substr(0, this.length - 1) : this.toString();
	},
	stripTrailingChar: function(char) {
		if(_.isRegExp(char)) return char.test(this.substr(-1)) ? this.substr(0, this.length - 1) : this.toString();
	  else return this.substr(-1) == char ? this.substr(0, this.length - 1) : this.toString();
	},
	firstWord: function() {
		return this.split(' ')[0];
	}
});