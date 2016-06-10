/* eslint no-process-exit: 0 */

'use strict';
var Dgram = require('dgram');
var dgramserver = Dgram.createSocket('udp4');
var http = require('http');
var tool = require('./parseMessage.js');
var host = '127.0.0.1';
var Datastore = require('nedb');
var logdb = new Datastore({ filename: './logdb.json', autoload: true });
var syslogID;
var malformed = 0;
var messageCount = 0;

function start (syslogPort, restPort, callback) {
  dgramserver.bind(syslogPort, host);
  var firstMessage = [];
  dgramserver.on('message', function (message) {
    var thisData = tool.parseM(message, malformed);
    if (typeof firstMessage !== 'undefined' && firstMessage.length > 0) {
    } else {
      firstMessage.push(thisData);
    }
    logdb.count({}, function (err, count) {
      if (err) {
        console.log(err);
      } else {
        addNumToObj(thisData, count);
      }
    });
    messageCount++;
  });

  var server = http.createServer(function (request, response) {
    try {
      var part = require('url').parse(request.url, true);
    } catch (e) {
      console.log(e);
    }
    if (request.url === '/favicon.ico') {
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end();
      return;
    }
    // var part = require('url').parse(request.url, true);
    var pathName = (part.pathname).toString();
    switch (pathName) {
      case '/logs':
        var search = JSON.stringify(part.query);
        if (search === '{}') {
          logdb.find({}).sort({num: -1}).exec(function (err, data) {
            if (err) {
              response.writeHead(200, {'Content-Type': 'text/plain'});
              response.end(JSON.stringify(data));
            } else {
              response.writeHead(200, {'Content-Type': 'text/plain'});
              response.end(JSON.stringify(data));
            }
          });
        } else {
          var searchItem = part.query;
          handleSearch(searchItem, response);
        }
        break;
      case '/GET/logs':
        logdb.find({}).sort({num: -1}).exec(function (err, data) {
          if (err) {
            console.log(err);
          } else {
            if (data.length <= 20) {
              logdb.find({'num': {$lte: data.length}}, function (err, data) {
                if (err) {
                  console.log(err);
                } else {
                  if (data.length === 0) {
                    response.writeHead(404, {'Content-Type': 'text/plain'});
                    response.end('The server has not found anything matching the URI given');
                  } else {
                    response.writeHead(200, {'Content-Type': 'text/plain'});
                    response.end(JSON.stringify(data));
                  }
                }
              });
            } else {
              logdb.find({'num': {$gt: data.length - 20}}, function (err, data) {
                if (err) {
                  console.log(err);
                } else {
                  response.writeHead(200, {'Content-Type': 'text/plain'});
                  response.end(JSON.stringify(data));
                }
              });
            }
          }
        });
        break;
      case '/stats':
        var stats = {};
        if (firstMessage.length === 0) {
          response.writeHead(404, {'Content-Type': 'text/plain'});
          response.end('ERROR 404: not found anything matching item');
        } else {
          stats.first = firstMessage[0].time;
          stats.received = messageCount;
          stats.malformed = malformed;
          logdb.find({}, function (err, data) {
            if (err) {
              console.log(err);
            } else {
              if (data.length === 0) {
                response.writeHead(404, {'Content-Type': 'text/plain'});
                response.end('ERROR 404: The server has not found anything matching the URI given');
              } else {
                logdb.find({'num': data.length}, function (err, item) {
                  if (err) {
                    console.log(err);
                  }
                  getLastTime(stats, item[0].time, response);
                });
              }
            }
          });
        }
        break;
      default:
    }
  });

  server.listen(restPort, host, function (error) {
    if (error) {
      console.log(error);
    } else {
      console.log('Server running at http://%s:%s/', host, restPort);
    }
  });
}

function addNumToObj (thisData, count) {
  if (count === 0) {
    syslogID = 1;
  } else {
    syslogID = count + 1;
  }
  thisData.num = syslogID;
  logdb.insert(thisData, function (err, newDoc) {
    if (err) {
      console.log(err);
    }
  });
}

function getLastTime (rawData, raw, response) {
  rawData.last = raw;
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end(JSON.stringify(rawData));
}
function handleResponse (err, data, response) {
  if (err) {
    console.log(err);
  } else {
    if (data.length === 0) {
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.end('ERROR 404: The server has not found anything matching the URI given');
    } else {
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end(JSON.stringify(data));
    }
  }
}
function handleSearch (search, response) {
  if (search.num !== undefined) {
    if (search.num.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({'num': {$lte: Number(search.num)}}).sort({num: -1}).exec(function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.ip !== undefined) {
    if (search.ip.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({'ip': JSON.parse(search.ip)}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.cat !== undefined) {
    if (search.cat.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({'cat': JSON.parse(search.cat)}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.event !== undefined) {
    if (search.event.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({'event': JSON.parse(search.event)}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.action !== undefined) {
    if (search.action.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({'action': JSON.parse(search.action)}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.startTime !== undefined) {
    if (search.startTime.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({'time': {$gte: JSON.parse(search.startTime)}}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.endTime !== undefined) {
    if (search.endTime.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({'time': {$lte: JSON.parse(search.endTime)}}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.ip !== undefined && search.action !== undefined) {
    if (search.ip.length === 0 || search.action.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({$and: [{'ip': JSON.parse(search.ip)}, {'action': JSON.parse(search.action)}]}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.startTime !== undefined && search.endTime !== undefined) {
    if (search.startTime.length === 0 || search.endTime.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({$and: [{'time': {$gte: JSON.parse(search.startTime)}}, {'time': {$lte: JSON.parse(search.endTime)}}]}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.cat !== undefined && search.action !== undefined) {
    if (search.cat.length === 0 || search.action.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({$and: [{'cat': JSON.parse(search.cat)}, {'action': JSON.parse(search.action)}]}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else if (search.ip !== undefined && search.cat !== undefined && search.action !== undefined) {
    if (search.ip.length === 0 || search.cat.length === 0 || search.action.length === 0) {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('Bad request 400');
    } else {
      logdb.find({$and: [{'ip': JSON.parse(search.ip)}, {'cat': JSON.parse(search.cat)}, {'action': JSON.parse(search.action)}]}, function (err, data) {
        handleResponse(err, data, response);
      });
    }
  } else {
    response.writeHead(501, {'Content-Type': 'text/plain'});
    response.end('ERROR 501: The server does not support the facility required');
  }
}

function stop (callback) {
  process.on('SIGINT', function () {
    var result = callback;
    result();
    process.exit();
  });
}

exports.start = start;
exports.stop = stop;
