UltimateClass.extend({
	formattedDollars: function(field, param1, param2, param3) {
		field = field || 'amount';

		var amount = _.isFunction(this[field]) ? this[field](param1, param2, param3) : this[field];
		if(_.isString(amount)) {
			amount = parseInt(amount.replace(/\$|,/g, ''));
		}
		return this.formatMoney(amount);
	},
	formattedDollarsInt: function(field, param1, param2, param3) {
		field = field || 'amount';

		var amount = _.isFunction(this[field]) ? this[field](param1, param2, param3) : this[field];
		if(_.isString(amount)) {
			amount = parseInt(amount.replace(/\$|,/g, ''));
		}
		amount = amount.toString();
		amount = amount.substring(0, amount.length - 2) + '.' + amount.substring(amount.length - 2);

		return this.formatMoney(amount);
	},

	formattedDollarsNo$: function(field, param1, param2, param3) {
		field = field || 'amount';

		var amount = _.isFunction(this[field]) ? this[field](param1, param2, param3) : this[field];
		return this.formatMoneyNo$(amount);
	},
	formattedDollarsIntNo$: function(field, param1, param2, param3) {
		field = field || 'amount';

		var amount = _.isFunction(this[field]) ? this[field](param1, param2, param3) : this[field];
		amount = amount.toString();
		amount = amount.substring(0, amount.length - 2) + '.' + amount.substring(amount.length - 2);

		return this.formatMoneyNo$(amount);
	},

	formatMoney: function(n, c, d, t){
		var n = parseFloat(n),
				c = isNaN(c = Math.abs(c)) ? 2 : c,
		    d = d == undefined ? "." : d,
		    t = t == undefined ? "," : t,
		    s = n < 0 ? "-" : "",
		    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
		    j = (j = i.length) > 3 ? j % 3 : 0;

		return '$' + s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	},
	formatMoneyNo$: function(amount) {
		return this.formatMoney(amount).replace('$', '');
	},

	formattedDollarsDigits: function(field) {
		field = field || 'amount';
		return parseFloat(parseFloat(this[field]).toFixed(2));
	}
});
