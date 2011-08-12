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
 *  + _[transactionId]_: (optional) Transaction ID
 * 
 * Error and success handlers can be specified by two optional arguments 
 * `errback` and `callback`. These arguments will override `error` and 
 * `success` options, so you need not specify both, and there is no difference
 * between them.
 *
 * After the object is created, you can access and set these callbacks using 
 * the `onError` and `onSuccess` methods. There is no validation involved
 * when doing so, however, so you should be mindful not to set these values
 * to non-functions.
 *
 * The error callback will receive a single `err` object, which contains the
 * usual `DaimyoError` instance. The success callback will either receive a
 * `null` or messages if the gateway returns any.
 *
 * Note that the `Transaction` constructor is not meant to be used directly. 
 * However, if you find that other higher-level specialized constructors do 
 * not perform the kind of transaction you are looking for, you can use the
 * generic `Transaction` constructor to make the transactions.
 *
 * To use the generic constructor, supply the type of the transaction (it 
 * should be named after the request URI component that identifies the 
 * transaction type (e.g, if the URI ends in `/credit.xml`, the transaction
 * type is `credit`), and the `transactionId` option as necessary. The data 
 * option should be an object that contains key-value mappings such that 
 * each key corresponds to an XML node of the request payload. 
 *
 * When naming the keys, feel free to use camel-case names, as those will get
 * decamelized prior to XML conversion. For example if the node is called
 * `payment_method_token`, you may call it either that, or 
 * `paymentMethodToken`. Either way will work just fine (if it doesn't, file 
 * a bug, please).
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
  this.data.type = opts.type;
  this.path = getTransactionPath(opts.type, opts.transactionId);
};

transaction.Transaction.prototype.toXML = function() {
  return xmlutils.toXML(this.data, 'transaction');
};
