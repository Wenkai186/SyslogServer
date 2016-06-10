1. In order to start the server, the syslogPort and restPort need to be set. '127.0.0.1' is choosed to be the default host address.
 The command that used to start server:

    node app.js -s 514 -r xxxx

  if you have "permission denied" or "bind EACCES 127.0.0.1:514" problems, Please execute the command as a super user.

2. /stats
   When the server is running, the syslogserver can handle 'stats' request.
   Open a web browser, enter this address http://127.0.0.1:xxxx/stats will send a request to the server. The server reply looks like below:

   {
     first: "2014-09-01T11:05:04.000Z",
     received: 16,
     malformed: 0,
     last: "2014-09-01T11:05:04.000Z"
   }

3. /logs
   Here list the search request.
   (1). request for all the syslog messages in the logdb.json file:
       http://127.0.0.1:1234/logs

   (2). Num of logs request:
       http://127.0.0.1:1234/logs?num=3

   (3). start request. server reply syslog messages which is received late         than startTime:
        http://127.0.0.1:1234/logs?startTime="2014-09-01T11:05:00.000Z"

    (4). endTime request. server reply syslog messages which is received    early than endTime:
        http://127.0.0.1:1234/logs?endTime="2014-09-01T11:05:00.000Z"

    (5). Combine of startTime and endTime rquest:
        http://127.0.0.1:1234/logs?startTime="2014-09-01T11:05:00.000Z"&endTime="2014-09-01T11:05:00.000Z"

    (6). request messages from specify ip address:
        http://127.0.0.1:1234/logs?ip="10.0.66.201"

    (7). request messages with specify event.
    (8). request messages with specify cat.
           cat included: "APPCONTROL:", "CONN:", "SYSTEM:"
    (9). request messages with specify action
    (10). combine of ip and action search
    (11). combine of cat and action search
    (12). combine of ip, action and cat search

   When send a request which is not included in the list, the server will reply "ERROR 501: The server does not support the facility required"


4. /GET/logs
   User can send a request to server, which is asks for the latest 20 syslog messages.

   enter this address http://127.0.0.1:1238/GET/logs will send a request to the server. The server will reply an array which contains the latest 20 syslog messages. The format of each messages looks like below:
