/* eslint no-process-exit: 0 */

'use strict';
var Path = require('path');
var Fs   = require('fs');
var Dgram = require('dgram');
var Util = require('util');

var config = {};

// Parse arguments and build config
(function(){
  var argumentDefines = {
    'file': {
      desc: 'File to read (default: syslog.txt)',
      param: 'file.txt',
      prop: 'file',
      type: 'string',
      default: Path.join(__dirname, 'syslog.txt'),
    },
    'start': {
      desc: 'Row index to start processing',
      param: 'index',
      prop: 'index',
      min: 0,
      type: 'number',
      default: 0
    },
    'num': {
      desc: 'Number of rows to process',
      param: 'num logs',
      prop: 'numRows',
      min: 0,
      type: 'number',
      default: -1
    },
    'port': {
      desc: 'Destination port for logs (default: 514)',
      param: 'dest port',
      prop: 'port',
      min: 1,
      type: 'number',
      default: 514,
    },
    'host': {
      desc: 'Destination address for logs (default: "127.0.0.1")',
      param: 'dest ip',
      prop: 'host',
      type: 'string',
      default: '127.0.0.1'
    },
    'delay': {
      desc: 'Ínterval for sending log messages (default: 1000)',
      param: 'ms delay',
      prop: 'delay',
      type: 'number',
      min: 10,
      default: 1000
    }
  };

  /**
   * Print help text
   * @return {void}
   */
  function printHelp() {
    var i, tmp, argOption, minText, maxText;
    var indent = "                    ";

    console.log('');
    console.log('%s %s',
                Path.basename(process.argv[1]),
                '...');

    tmp = '-h, --help';
    console.log('    %s:%s %s', tmp, indent.substring(tmp.length), 'Display help text');

    for (i in argumentDefines) {
      if (!argumentDefines.hasOwnProperty(i)) continue;
      argOption = argumentDefines[i];
      minText = (argOption.min !== undefined) ? Util.format(" (min: %d)", argOption.min) : '';
      maxText = (argOption.max !== undefined) ? Util.format(" (max: %d)", argOption.max) : '';

      tmp = Util.format('-%s <%s>', i, argOption.param);
      console.log('    %s:%s %s%s%s', tmp, indent.substring(tmp.length), argOption.desc, minText, maxText);
    }
  }

  /**
   * Validate number
   * @param  {String} flag  Argument
   * @param  {String} param Argument parameter
   * @param  {Number} val   Parsed valued
   * @param  {?Number} min  Min value (optional)
   * @param  {?Number} max  Max value (optional)
   * @return {void}
   */
  function validateNum(flag, param, val, min, max) {
    var doExit = false;
    if (isNaN(val)) {
      console.error('ERROR: Invalid argument %j to %j', param, flag);
      doExit = true;
    }
    if (min !== undefined && min > val) {
      console.error('ERROR: %d is less than min value %d for %j', val, min, flag);
      doExit = true;
    }
    if (max !== undefined && val > max) {
      console.error('ERROR: %d is more than max value %d for %j', val, max, flag);
      doExit = true;
    }

    if (doExit) {
      printHelp();
      process.exit(1);
    }
  }

  var arg, flag, param, option;

  // Setup default values
  for (flag in argumentDefines) {
    if (!argumentDefines.hasOwnProperty(flag)) continue;
    option = argumentDefines[flag];
    config[option.prop] = option.default;
  }

  // Parse arguments
  for (arg = 2; arg < process.argv.length; arg += 2) {
    flag = process.argv[arg + 0];
    param = process.argv[arg + 1];

    // Print help text and exit
    if (flag === '-h' || flag === '--help') {
      printHelp();
      process.exit(0);
    }

    // Need both flag and param
    if (flag === undefined || param === undefined) {
      console.error('ERROR: Missing argument for "%j"', flag);
      printHelp();
      process.exit(1);
    }

    if (flag[0] === '-' && argumentDefines.hasOwnProperty(flag.substring(1))) {
      option = argumentDefines[flag.substring(1)];

      if (option.type === 'number') {
        config[option.prop] = parseInt(param, 10);
        validateNum(flag, param, config[option.prop], option.min, option.max);
        continue;

      } else if (option.type === 'string') {
        config[option.prop] = param;

      } else {
        throw new Error('Unknown type "' + option.type + '"');
      }
    } else {
      console.error('ERROR: Unknown flag %j with argument %j', flag, param);
      printHelp();
      process.exit(1);
    }
  }
})();

// Read file and split on newline
var syslogData = Fs.readFileSync(config.file, {encoding: 'utf-8'});
syslogData = syslogData.split(/\r?\n/);


// Calculate end index
config.endIndex = syslogData.length;
if (config.numRows > 0)
  config.endIndex = config.index + config.numRows;

// UDP socket
var udpSocket = Dgram.createSocket('udp4');


/**
 * Sends one Syslog message
 * @return {void}
 */
function sendSyslogRow() {
  var syslogRow;

  // Find nonempty line
  do {
    // Are we done
    if (config.index >= syslogData.length ||
        config.index >= config.endIndex) {
      udpSocket.close();
      return;
    }

    syslogRow = syslogData[config.index];
    config.index++;
  } while (!syslogRow.length)

  // Remove non syslog data
  var tmp = /(.*)\[[^\[]+\] EFW: */.exec(syslogRow);
  if (tmp === null) {
    console.error('ERROR: Unable to parse row %d: "%s%s"', config.index, syslogRow.substring(0, 80), (syslogRow.length > 80 ? "..." : "") );
    process.exit(1);
  }

  // Recreate syslog message
  syslogRow = '<134>' + syslogRow.substring(tmp[1].length);

  // Print logmessage
  console.log('%d: %s%s', config.index, syslogRow.substring(0, 80), (syslogRow.length > 80 ? "..." : "") );

  syslogRow = new Buffer(syslogRow);

  // And send
  udpSocket.send(syslogRow, 0, syslogRow.length, config.port, config.host, function(err/*, bytes*/) {
    if (err)
      throw err;

    // Are we done
    if (config.index >= syslogData.length ||
        config.index >= config.endIndex) {
      udpSocket.close();
      return;
    }

    // Queue next send
    setTimeout(sendSyslogRow, config.delay);
  });
}

// Begin processing
sendSyslogRow();
