//require('sslkeylog').hookAll();

function preReq(req, context, events, next){
  const currTime = new Date().toISOString()
  context.vars.currentTime = currTime
  context.vars._startTime = Date.now()
  context.vars.dpID = currTime
  context.vars.transID = `art-id-${Math.random().toString(36).substr(2, 10)}`
  return next();
}

function postHandle(req, response, context, ee, next) {
  if (context.vars._startTime) {
      var delta = Date.now() - context.vars._startTime;
      if (delta > 1000) {
          console.error(`{ X-DP-Transit-ID:${context.vars.dpID}, x-global-transID:${context.vars.transID}, latency: ${delta}, high-latency: true}`)
        ee.emit('counter', "slowerThan1sec", 1);
      }
  }
  return next();
}


module.exports = {
  preReq: preReq,
  postHandle: postHandle
}