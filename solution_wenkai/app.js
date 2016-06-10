/* eslint no-process-exit: 0 */

'use strict';
var syslogserver = require('./syslogserver.js');
var syslogPort, restPort;
syslogPort = process.argv[3];
restPort = process.argv[5];

syslogserver.start(syslogPort, restPort, function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log('server running...');
  }
});
syslogserver.stop(function (error) {
  if (error) {
    console.error(error);
  } else {
    console.log('\nGracefully shutting down from SIGINT (Ctrl-C)');
  }
});
