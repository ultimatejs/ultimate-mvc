Ultimate('UltimateExec').extends({
  construct: function(cmds, options, hosts) {
    this.executor = hosts ? new UltimateExecRemote(cmds, options, hosts) : new UltimateExecLocal(cmds, options);
  },
  exec: function() {
    return this.executor.exec();
  }
}, {
	exec: function(cmds, options, hosts) {
		this.execute(cmds, options, hosts);
	},
  execute: function(cmds, options, hosts) {
    return new UltimateExec(cmds, options, hosts).exec();
  }
});