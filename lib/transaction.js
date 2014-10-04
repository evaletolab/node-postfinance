/**
 * # transaction
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var config = require('../config');
var PostFinanceError = require('./error');
var xmlutils = require('./xmlutils');
var authpost = require('./authpost');
var messages = require('./messages');
var ducttape = require('./ducttape');
var debug = config.debug;
var transaction = exports;

var VALID_TRANSACTIONS = [
    'authorize', 
    'capture', 
    'cancel', 
    'refund'
];


/**
 * ## transaction.Transaction(opts)
 * *Low-level transaction object*
 * 
 * Options for the transaction object are:
 *
 *  + _type_: Transaction type
 *  + _data_: Transaction data
 *  + _[payId]_: (optional) Transaction ID
 * 
 * @param {Object} opts Transaction options
 * @constructor
 */
transaction.Transaction = function(opts) {
  // opts are required
  if (!opts) {
    throw new PostFinanceError('system', 'Missing options object', null);
  }
  if (!opts.type || VALID_TRANSACTIONS.indexOf(opts.type) < 0) {
    throw new PostFinanceError('system', 'Missing or invalid transaction type', null);
  }
  if (!opts.amount) {
    throw new PostFinanceError('system', 'Missing amount value');
  }
  if (!opts.payId && !opts.orderId) {
    throw new PostFinanceError('system', 'Missing order identifier');
  }
  this.data={};
  this.type = opts.type;
  this.data.orderId = opts.orderId;
  this.data.groupId = opts.groupId;
  this.data.amount = opts.amount;

};

/**
 * ## transaction.Transaction.process([card], callback)
 * *Process the transaction using the given card*
 *
 * @param {postfinance.Card} [card] Payment method to use for the transaction
 * @param {Function} callback Callback function
 */

transaction.Transaction.prototype.process = function(card, callback) {
  var self = this;
  var querystring = require('querystring');
  var transactionData;
  

  if (!card || (!card.paidId)) {
    callback(new PostFinanceError('system', 'Card has no token', null));
    return;
  }

  // transaction type self.type

  // Augment transaction data with token
  transactionData = self.data;

  // Currency check
  if (transactionData.currency &&
      config.option('allowedCurrencies').indexOf(transactionData.currency) < 0) {
    
    callback(new PostFinanceError(
      'system', 
      'Currency not allowed', 
      transactionData.currency
    ));
    return;

  }

  if (!transactionData.custom) {
    transactionData.custom = {};
  }

  //options:
  // orderId*
  // amount*
  // groupId
  // email
  // * mandatory

  var paymentDataObj=this.getPayload(transactionData)


  // Reformat our data as required by the API
  var paymentData = querystring.stringify(paymentDataObj);

  // validate the cart
  authpost.makeRequest({
    method: 'POST',
    payload: paymentData,
    operation:'order'
  }, function(err, res) {
    var errMsg;

    if (err && err instanceof PostFinanceError) {
      return callback(err);
    }
    if (err) {
      return callback(new PostFinanceError('system', 'Error making create payment method request', err));      
    }



    // Parse the location header to extract the alias and his id
    // self.alias = res.body.ALIAS;
    // self.payId = res.body.PAYID;
    self._resetDirty();
    callback(null);
  });


};
