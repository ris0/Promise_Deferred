'use strict';
/*----------------------------------------------------------------
Promises Workshop: build the pledge.js deferral-style promise library
----------------------------------------------------------------*/
// YOUR CODE HERE:

function isFn (maybeFn) { return typeof maybeFn === 'function'; }

function $Promise () {
  this.state = 'pending';
  this.handlerGroups = [];
  this.updateCbs = [];
}

$Promise.prototype.then = function(successCb, errorCb, updateCb) {
  if (isFn(updateCb) && (this.state === 'pending')) this.updateCbs.push(updateCb);
  var newGroup = {
    successCb: isFn(successCb) ? successCb : null,
    errorCb: isFn(errorCb) ? errorCb : null,
    forwarder: new Deferral()
  };
  this.handlerGroups.push(newGroup);
  this.callHandlers();
  return newGroup.forwarder.$promise;
};

$Promise.prototype.catch = function(errorCb) {
  return this.then(null, errorCb);
};

$Promise.prototype.callHandlers = function() {
  if (this.state === 'pending') return;
  var pA = this,
      handler,
      pBdeferral,
      output;
  this.handlerGroups.forEach(function(group){
    pBdeferral = group.forwarder;
    handler = (pA.state === 'resolved')? group.successCb : group.errorCb;
    if (!handler) { // bubbling
      if (pA.state === 'resolved') pBdeferral.resolve(pA.value);
      else pBdeferral.reject(pA.value);
    } else {
      try {
        output = handler(pA.value);
        if (output instanceof $Promise) {
          pBdeferral.assimilate(output);
        } else pBdeferral.resolve(output);
      } catch (err) {
        pBdeferral.reject(err);
      }
    }
  });
  this.handlerGroups = [];
};

function Deferral () {
  this.$promise = new $Promise();
}

function settle (state, value) {
  if (this.$promise.state !== 'pending') return;
  this.$promise.state = state;
  this.$promise.value = value;
  this.$promise.callHandlers();
  this.$promise.updateCbs = [];
}

Deferral.prototype.resolve = function (data) {
  settle.call(this, 'resolved', data);
};

Deferral.prototype.reject = function (reason) {
  settle.call(this, 'rejected', reason);
};

Deferral.prototype.assimilate = function (promise) {
  promise.then(this.resolve.bind(this), this.reject.bind(this));
};

Deferral.prototype.notify = function (val) {
  if (this.$promise.state !== 'pending') return;
  this.$promise.updateCbs.forEach(function(updateCb){
    updateCb(val);
  });
};


function defer () {
  return new Deferral();
}

/*-------------------------------------------------------
The spec was designed to work with Test'Em, so we don't
actually use module.exports. But here it is for reference:

module.exports = {
  defer: defer,
};

So in a Node-based project we could write things like this:

var pledge = require('pledge');
…
var myDeferral = pledge.defer();
var myPromise1 = myDeferral.$promise;
--------------------------------------------------------*/
