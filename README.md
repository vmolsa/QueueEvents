QueueEvents
===========

NodeJS Events through socket/process/pipe/events, JSONP

# Examples

````
var dgram = require('dgram');
var QueueEvents = require('QueueEvents');

var events = new QueueEvents();
var socket = dgram.createSocket("udp4");

socket.on('message', function(input, rinfo) {
  events.onData(input);
});

events.onWrite(function(out) {
  socket.send(out, 0, out.length, 1337, 'localhost', function(error, bytes) {
    if (error) {
      socket.close();
    }
  });
}, 'buffer');

socket.bind(1337);

events.on('concat', function(hello, world, num, callback) {
  console.log(hello, world, num);
  callback(hello + world + num);
});

events.emit('concat', 'hello', 'world', 1234, function(result) {
  console.log('CONCAT:', result);
  socket.close();
});
````
