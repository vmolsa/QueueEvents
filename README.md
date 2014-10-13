QueueEvents
===========

NodeJS Events through socket/process/pipe/events, JSONP

# Examples

````
var dgram = require('dgram');
var QueueEvents = require('queue-events');

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

````
var events = require('events');
var QueueEvents = require('queue-events');
  
var ev = new events.EventEmitter();
var qe = new QueueEvents();
  
ev.on('data', function(data) {
  qe.onData(data);
});
  
qe.onWrite(function(out) {
  ev.emit('data', out)
}, 'object');
  
qe.on('concat', function(hello, world, num, callback) {
  console.log(hello, world, num);
  callback(hello + world + num);
});
  
qe.emit('concat', 'hello', 'world', 1234, function(result) {
  console.log('CONCAT:', result);
});
````

````
var cluster = require('cluster');
var QueueEvents = require('queue-events');

var events = new QueueEvents();

if (cluster.isMaster) {
  var worker = cluster.fork();
    
  worker.on('online', function() {
    events.emit('concat', 'hello', 'world', 1234, function(result) {
      console.log('CONCAT:', result);
      worker.kill('SIGINT');
    });
  });

  events.onWrite(function(out) {
    worker.send(out);
  }, 'object');

  worker.on('message', function(msg) {
    events.onData(msg);
  });
} else {
  process.on('message', function(msg) {
    events.onData(msg); 
  });

  events.onWrite(function(out) {
    process.send(out);
  }, 'object');
  
  events.on('concat', function(hello, world, num, callback) {
    console.log(hello, world, num);

    callback(hello + world + num);
  });
}
````

# License

MIT
