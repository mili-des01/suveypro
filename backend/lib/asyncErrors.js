'use strict';

/**
 * Express 4 shim: forwards errors thrown/rejected inside async route
 * handlers to the error middleware, instead of crashing the process.
 * (Equivalent to express-async-errors — kept dependency-free.)
 */

const Layer = require('express/lib/router/layer');
const Router = require('express/lib/router');

Layer.prototype.handle_request = function handle_request(req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) return next();

  try {
    Promise.resolve(fn.call(this, req, res, next)).catch(next);
  } catch (err) {
    next(err);
  }
};

Router.prototype.handle = (function wrap(superHandle) {
  return function handle(req, res, next) {
    try {
      return superHandle.call(this, req, res, next);
    } catch (err) {
      next(err);
    }
  };
})(Router.prototype.handle);
