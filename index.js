/*
 *  QueueEvents Functions:
 *    setTimeout(5000)
 *    setSeed('allEvents')
 *
 *    newEvent([listener]) => eventHash
 *    getEvent(eventHash)
 *    setEvent(eventHash, listener)
 *    delEvent(eventHash)
 *    timeEvent(listener) => eventHash
 *    
 *    onData(input)
 *    onWrite(listener, encoding) // encoding = 'string' || 'buffer' || 'object'
 *
 *    on('eventName', listener(arg1, arg2, callback(..., callback)))
 *    off('eventName')
 *    emit('eventName', arg1, arg1, callback(..., callback))
 *
 *  QueueEvents Examples:
 *
 * --------------------------------------------------------------------------------
 *
 *    var dgram = require('dgram');
 *    var QueueEvents = require('queue-events');
 *
 *    var events = new QueueEvents();
 *    var socket = dgram.createSocket("udp4");
 *
 *    socket.on('message', function(input, rinfo) {
 *      events.onData(input);
 *    });
 *
 *    events.onWrite(function(out) {
 *      socket.send(out, 0, out.length, 1337, 'localhost', function(error, bytes) {
 *        if (error) {
 *          socket.close();
 *        }
 *      });
 *    }, 'buffer');
 *
 *    socket.bind(1337);
 *
 *    events.on('concat', function(hello, world, num, callback) {
 *      console.log(hello, world, num);
 *
 *      callback(hello + world + num);
 *    });
 *
 *    events.emit('concat', 'hello', 'world', 1234, function(result) {
 *      console.log('CONCAT:', result);
 *      socket.close();
 *    });
 *
 * --------------------------------------------------------------------------------
 *
 *    var events = require('events');
 *    var QueueEvents = require('queue-events');
 *    
 *    var ev = new events.EventEmitter();
 *    var qe = new QueueEvents();
 *    
 *    ev.on('data', function(data) {
 *      qe.onData(data);
 *    });
 *    
 *    qe.onWrite(function(out) {
 *      ev.emit('data', out)
 *    }, 'object');
 *    
 *    qe.on('concat', function(hello, world, num, callback) {
 *      console.log(hello, world, num);
 *    
 *      callback(hello + world + num);
 *    });
 *    
 *    qe.emit('concat', 'hello', 'world', 1234, function(result) {
 *      console.log('CONCAT:', result);
 *    });
 *
 * --------------------------------------------------------------------------------
 *
 *    var cluster = require('cluster');
 *    var QueueEvents = require('queue-events');
 *    
 *    var events = new QueueEvents();
 *    
 *    if (cluster.isMaster) {
 *      var worker = cluster.fork();
 *        
 *      worker.on('online', function() {
 *        events.emit('concat', 'hello', 'world', 1234, function(result) {
 *          console.log('CONCAT:', result);
 *          worker.kill('SIGINT');
 *        });
 *      });
 *    
 *      events.onWrite(function(out) {
 *        worker.send(out);
 *      }, 'object');
 *    
 *      worker.on('message', function(msg) {
 *        events.onData(msg);
 *      });
 *    } else {
 *      process.on('message', function(msg) {
 *        events.onData(msg); 
 *      });
 *    
 *      events.onWrite(function(out) {
 *        process.send(out);
 *      }, 'object');
 *      
 *      events.on('concat', function(hello, world, num, callback) {
 *        console.log(hello, world, num);
 *    
 *        callback(hello + world + num);
 *      });
 *    }
 *
 * --------------------------------------------------------------------------------
 */

var util = require('util');
var MurMurHash3 = require('murmurhash-js');

if (!util.isFunction) {
  util.isFunction = function(callback) {
    return typeof(callback) === 'function';
  }
}

if (!util.isString) {
  util.isString = function(arg) {
    return typeof(arg) === 'string';
  }
}

if (!util.isNumber) {
  util.isNumber = function(arg) {
    return typeof(arg) === 'number';
  }
}

if (!util.arrayToHash) {
  util.arrayToHash = function(array) {
    var hash = {};
    
    if (util.isArray(array)) {
      array.forEach(function(val, idx) {
        hash[val] = true;
      });
    }

    return hash;
  }
}

if (!util.isObject) {
  util.isObject = function(arg) {
    return typeof arg === 'object' && arg !== null;
  }
}

function argsSplit(argu, index, returnTo) {
  var args = null;
  var callback = null;
 
  if (argu.length > index) {
    args = Array.prototype.slice.call(argu, index);
  } else {
    args = [];
  }

  if (args.length && util.isFunction(args[args.length - 1])) {
    callback = args[args.length - 1];
    args.slice(args.length - 1, 1);
  }
  
  if (util.isFunction(returnTo)) {
    return returnTo(args, callback);
  }
}

function QueueEvents() {
  var self = this;
  
  self._qeSeed = '/';
  self._qeSequence = 0 >>> 0;
  self._qeWaitTime = 5000;
  self._qeEncoding = 'string';
  self._qeQueue = {};
  self._qeOnWrite = null;
  self._qeOnEvent = {};
}

QueueEvents.prototype.setTimeout = function(wait) {
  var self = this;
  
  if (util.isNumber(wait)) {
    self._qeWaitTime = wait;
  }
};

QueueEvents.prototype.setSeed = function(seed) {
  var self = this;
  
  if (util.isString(seed)) {
    self._qeSeed = seed;
  }
};

QueueEvents.prototype.newEvent = function(callback) {
  var self = this;
  var qe = self._qeSeed + self._qeSequence++;
  var event = MurMurHash3.murmur3(qe, 0);
  
  if (self._qeQueue[event]) {
    return self.newEvent();
  }
  
  if (util.isFunction(callback)) {
    self._qeQueue[event] = callback;
  }
  
  return event;
};

QueueEvents.prototype.getEvent = function(event) {
  var self = this;
  var retval = null;
  
  if (self._qeQueue[event]) {
    retval = self._qeQueue[event];
  }
  
  return retval;
};

QueueEvents.prototype.setEvent = function(event, callback) {
  var self = this;
  
  if (event) {
    self._qeQueue[event] = callback;
  }
};

QueueEvents.prototype.delEvent = function(event) {
  var self = this;
  
  if (self._qeQueue[event]) {
    delete self._qeQueue[event];
  }
};

QueueEvents.prototype.timeEvent = function(callback) {
  var self = this;
  var event = null;
  
  var timer = setTimeout(function() {
    if (event) {
      self.delEvent(event);
    }
    
    callback(null);
  }, self._qeWaitTime);
  
  event = self.newEvent(function(data) {
    clearTimeout(timer);
    callback(data);
  });
  
  return event;
};

QueueEvents.prototype.onData = function(packet) {
  var self = this;
  var data = null;

  if (!Buffer.isBuffer(packet) && util.isObject(packet)) {
    data = packet;
  } else {
    if (util.isString(packet)) {
      try {
        data = JSON.parse(packet);
      } catch(ignored) { }
    } else {
      if (Buffer.isBuffer(packet)) {    
        try {
          data = JSON.parse(packet.toString('utf8'));
        } catch(ignored) { }
      }
    }
  }
  
  if (data) {
    var args = data._qeArgs;
    
    if (util.isString(data._qeArgs)) {
      try {
        args = JSON.parse(data._qeArgs);
      } catch (ignored) { }
    }
    
    if (!util.isArray(args)) {
      args = [data._qeArgs];
    }
    
    if (data._qeReply) {
      var reply = function() {
        argsSplit(arguments, 0, function(args, callback) {
          var out = {};
          
          if (callback) {
            out._qeReply = self.timeEvent(callback);
          }
          
          out._qEvent = data._qeReply;
          out._qeArgs = args;
          
          switch (self._qeEncoding) {
            case 'string':
              out = JSON.stringify(out);
              break;
            case 'buffer':
              out = new Buffer(JSON.stringify(out));
              break;
            default:
              break;
          }
          
          if (self._qeOnWrite) {
            self._qeOnWrite.call(self, out);
          } else {
            throw new Error('onWrite callback');
          }
        });
      };
      
      if (args.length && args[args.length - 1] == null) {
        args[args.length - 1] = reply;
      } else {
        args.push(reply);
      }
    }
  
    if (data._qEvent) {
      var callback = self.getEvent(data._qEvent);

      if (util.isFunction(callback)) {
        callback.apply(self, args);
      }
    } else if (util.isString(data._qeName) && util.isFunction(self._qeOnEvent[data._qeName])) {
      callback = self._qeOnEvent[data._qeName];        
      callback.apply(self, args);
    }
  }
};

QueueEvents.prototype.onWrite = function(callback, encoding) {
  var self = this;
  
  if (util.isFunction(callback)) {
    self._qeOnWrite = callback;
    
    if (util.isString(encoding)) {
      switch (encoding) {
        case 'string':
        case 'object':
        case 'buffer':
          self._qeEncoding = encoding;
          break;
      }
    }
  }
};

QueueEvents.prototype.on = function(event, callback) {
  var self = this;
  
  if (util.isString(event) && util.isFunction(callback)) {
    self._qeOnEvent[event] = callback;
  }
};

QueueEvents.prototype.off = function(event) {
  var self = this;
  
  if (util.isString(event) && self._qeOnEvent[event]) {
    delete self._qeOnEvent[event];
  }
};

QueueEvents.prototype.emit = function(event) {
  var self = this;
  
  if (util.isString(event)) {
    return argsSplit(arguments, 1, function(args, callback) {
      var out = {};

      if (callback) {
        out._qeReply = self.timeEvent(callback);
      }

      out._qeName = event;
      out._qeArgs = JSON.stringify(args);

      switch (self._qeEncoding) {
        case 'string':
          out = JSON.stringify(out);
          break;
        case 'buffer':
          out = new Buffer(JSON.stringify(out));
          break;
        default:
          break;
      }

      if (self._qeOnWrite) {
        self._qeOnWrite.call(self, out);
      } else {
        throw new Error('onWrite callback');
      }
      
      return out._qeReply;
    });
  }
};

module.exports = QueueEvents;
