Ultimate('UltimateExecRemote').extends({
	construct: function(cmds, options, hosts) {
		this.hosts = [].concat(hosts)
		this.commands = [].concat(cmds);

		if(_.isFunction(options)) options = {onSuccess: options};
    else options = options || {};

    options.onSuccess = options.onSuccess || function() {};
    options.onFail = options.onFail || function() {};

    this.stdout = options.stdout;
    this.stderr = options.stderr;

    options.stdout = {write: this.onStdout.bind(this)};
    options.stderr = {write: this.onStderr.bind(this)};

    if(options.privateKey) options.privateKey = Npm.require('fs').readFileSync(options.privateKey);

    options.port = options.port || 22;
    options.username = options.username || 'root'; //options.password should contain pw is no key provided

    this.options = options;
    this._execRemote = Npm.require('remote-exec');

    this.allOutput = '';
    this.allErrors = '';
	},
  exec: function() {
    console.log("REMOTE EXEC", this.commands, this.hosts, this.options);
		var commands = this.options.combineCommands ? [this.commands.join( ' && ')] : this.commands;
    return this._execRemote(this.hosts, this.commands, this.options, this.done.bind(this));
  },


  onStdout: function(data) {
    data = data.toString('utf8');

    if(this.stdout) this.stdout.call(this, data);
    this.allOutput += data;
  },
  onStderr: function(data) {
    data = data.toString('utf8');

    if(this.stderr) this.stderr.call(this, data);
    this.allErrors += data;
  },

  done: function(error, success) {  
    if (error) this.options.onFail(error, this.allErrors);
    else this.options.onSuccess(this.allOutput);
  }
});