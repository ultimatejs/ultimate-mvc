Ultimate('UltimateExecLocal').extends({
  construct: function(cmds, options) {
		this.commands = [].concat(cmds);

		if(_.isFunction(options)) options = {onSuccess: options};
		else options = options || {};

		//options.onSuccess == function() {};
		//options.onFail == function() {};
		//options.stdout == function() {};

		this.options = options;
		this._async = Npm.require('async');
		this._exec = Npm.require('child_process').exec;

		this.allOutput = '';
		this.allErrors = '';
	},
	exec: function() {
		var commands = this.options.combineCommands ? [this.commands.join( ' && ')] : this.commands;
		return this._async.eachSeries(commands, this.runCommand.bind(this), this.done.bind(this));
	},


	runCommand: function(command, done) {
		this._exec(command, this.options, function (error, stdout, stderr) {
			this.allOutput += stdout;
			if(this.options.stdout) this.options.stdout(stdout);
			
  		done(error);
		}.bind(this));
	},
	
	done: function(error, success) {
  	if (error && this.options.onFail) this.options.onFail(error);
  	else if(this.options.onFail) this.options.onSuccess(this.allOutput);
	}
});