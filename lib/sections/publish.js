var utils           = require(__dirname + '/utils.js');
var uuid            = require('uuid');
var os              = require('os');
var system_timezone = require('system-timezone');

var systemTimezone = system_timezone();

var publish = function(eventType, args, callback){
  var self = this;
  var queue = self.options.incomingQueue;
  var klass = self.options.busClassKey;
  var payload = publishMetadata(eventType, args);
  payload.bus_class_proxy  = 'QueueBus::Driver';

  self.enqueue(queue, klass, JSON.stringify(payload), function(err, toRun){
    if(typeof callback === 'function'){ callback(err, toRun); }
  });
};

var publishHeartbeat = function(callback){
  var self = this;
  var queue = self.options.incomingQueue;
  var klass = self.options.busClassKey;
  var payload = publishMetadata('QueueBus::Heartbeat', {});
  payload.bus_class_proxy  = 'QueueBus::Heartbeat';

  self.enqueue(queue, klass, JSON.stringify(payload), function(err, toRun){
    if(typeof callback === 'function'){ callback(err, toRun); }
  });
};

var publishAt = function(timestamp, eventType, args, callback){
  var self    = this;
  var queue   = self.options.incomingQueue;
  var klass   = self.options.busClassKey;
  var payload = publishMetadata(eventType, args);
  payload.bus_class_proxy  = 'QueueBus::Publisher';

  if(payload.bus_delayed_until === undefined){
    payload.bus_delayed_until = Math.floor(timestamp/1000);
  }

  delete payload.bus_published_at; // will get re-added upon re-publish

  self.enqueueAt(timestamp, queue, klass, JSON.stringify(payload), function(err){
    if(typeof callback === 'function'){ callback(err); }
  });
};

var publishIn = function(time, eventType, args, callback){
  var self = this;
  var timestamp = new Date().getTime() + time;
  self.publishAt(timestamp, eventType, args, callback);
};

var publishMetadata = function(eventType, args){
  var payload = {};
  if(eventType){
    payload.bus_event_type = eventType;
  } else {
    payload.bus_event_type = null;
  }
  payload.bus_published_at = utils.timestamp();
  payload.bus_id           = utils.timestamp() + "-" + uuid.v4();
  payload.bus_app_hostname = os.hostname();
  payload.bus_timezone     = systemTimezone;
  try{
    payload.bus_locale     = process.env.LANG.split('.')[0];
  }catch(e){
    payload.bus_locale     = process.env.LANG;
  }

  // overwrite defaults
  for(var i in args){
    payload[i] = args[i];
  }

  return payload;
};

exports.publish          = publish;
exports.publishAt        = publishAt;
exports.publishIn        = publishIn;
exports.publishHeartbeat = publishHeartbeat;