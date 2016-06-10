function parseM (message, malformed) {
  var a = JSON.parse(JSON.stringify(message));
  var b = new Buffer(a.data);
  var subA = b.toString().split(' ');

  var thisistest = subA[0] + ' ' + subA[1];
  var eventTimestring = thisistest.substring(6, 24);
  var eventTime = dateTransfer(eventTimestring);
  var sourceIP, cat, action, evenT, fullMessage;
  cat = subA[3];
  if (cat.substring(0, 4) === 'CONN') {
    cat = cat.substring(0, 5);
    if (subA[12].substring(0, 9) === 'connsrcip') {
      sourceIP = subA[12].substring(10);
    } else {
      malformed++;
    }
  } else if (cat.substring(0, 4) === 'APPC') {
    cat = cat.toString(0, 10);
    if (subA[10].substring(0, 9) === 'connsrcip') {
      sourceIP = subA[10].substring(10);
    } else {
      malformed++;
    }
  } else if (cat.substring(0, 4) === 'SYST') {
    cat = cat.toString(0, 6);
  } else {
    malformed++;
  }
  for (var i = 0; i < subA.length; i++) {
    if (subA[i].indexOf('action') > -1) {
      action = subA[i].substring(7);
    } else {
      action = '';
    }
  }

  if (subA[7].substring(0, 5) === 'event') {
    evenT = subA[7].substring(6);
  } else {
    malformed++;
  }
  fullMessage = b.toString();
  return {time: eventTime, ip: sourceIP, cat: cat, event: evenT, action: action, fullMessage: fullMessage};
}
function dateTransfer (date) {
  var dateObj = new Date(Date.parse(date));
  return dateObj.toISOString();
}
exports.parseM = parseM;
