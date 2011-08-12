/**
 * # transaction
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var config = require('./config');
var DaimyoError = require('./error');
var xmlutils = require('./xmlutils');
var settings = config.settings;
var debug = config.debug;
var transaction = exports;

var VALID_TRANSACTIONS = ['purchase', 'authorize', 'capture', 'void', 'credit'];

/**
 * ## getTransactionPath(type, [transactionId])
 * *Builds transaction path*
 *
 * @param {String} subpath Subpath of the transaction
 * @param {String} [transactionId] Transaction ID for capture, void and fetch
 */
function getTransactionPath(type, transactionId) {
  var subpath = '/gateways/';
  if (transactionId) {
    subpath = '/transactions/';
  }
  return '/transactions/' + (transactionId || settings.processorId) + '/' +
    type + '.xml';
}

/**
 * ## transaction.Transaction(opts)
 * *Low-level transaction object*
 * 
 * Options for the transaction object are:
 *
 *  + _type_: Transaction type
 *  + _data_: Transaction data
 *  + _error_: Error handler
 *  + _success_: Success handler
 *
 * Error/success handlers can be attached using the `on()` method as well, or
 * specified as separate arguments. The `errback`, and `callback`, arguments
 * take precendence over the `error`, and `success`, options.
 *
 * @param {Object} opts Transaction options
 * @param {Function} [errback] Error handler
 * @param {Function} [callback] Callback (called on success)
 * @constructor
 */
transaction.Transaction = function(opts, errback, callback) {
  // opts are required
  if (!opts) {
    throw new DaimyoError('system', 'Missing options object', null);
  }
  // opts.type are required
  if (!opts.type || VALID_TRANSACTIONS.indexOf(opts.type) < 0) {
    throw new DaimyoError('system', 'Missing or invalid transaction type', null);
  }
  // opts.data are required
  if (!opts.data) {
    throw new DaimyoError('system', 'Missing payload data');
  }

  callback = callback || opts.success;

  // swap callback and errback if callback is not defined
  if (typeof callback !== 'function' && typeof errback === 'function') {
    callback = errback;
    errback = null;
  }

  // callback is required
  if (typeof callback !== 'function') {
    throw new DaimyoError('system', 'Missing success callback', null);
  }

  errback = errback || opts.error;

  if (callback) {
    this.onSuccess = callback;
  }

  if (errback) {
    this.onError = errback;
  }

  this.data = opts.data;
  this.path = getTransactionPath(opts.type, opts.transactionId);
};

transaction.Transaction.prototype.toXML = function() {
  return xmlutils.toXML(this.data, 'transaction');
};
