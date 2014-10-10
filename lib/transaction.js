/**
 * # transaction
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var config = require('./config');
var PostFinanceError = require('./error');
var xmlutils = require('./xmlutils');
var authpost = require('./authpost');
var messages = require('./messages');
var ducttape = require('./ducttape');
var debug = config.debug;
var transaction = exports;

var VALID_TRANSACTIONS = [
    'authorize', 
    'purchase', 
    'cancel', 
    'refund'
];


var MAP_PROCESS={
  authorize:'RES',//order request for authorisation
  capture:'SAL',  //order request for direct sale
  purchase:'SAL', 
  refund:'RFD',// maintenance partial refund and closing
  cancel:'SAS' // maintenance partial or full data capture and closing
}

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
  if (!opts.operation || VALID_TRANSACTIONS.indexOf(opts.operation) < 0) {
    throw new PostFinanceError('system', 'Missing or invalid transaction operation', null);
  }

  var maintenance=(['cancel','refund'].indexOf(opts.operation)!=-1);
  if(maintenance && !opts.payId){
    throw new PostFinanceError('system', 'Missing payId for maintenance operation', null);
  }
  if (!maintenance && !opts.amount) {
    throw new PostFinanceError('system', 'Missing amount value');
  }
  if (!maintenance && !opts.orderId) {
    throw new PostFinanceError('system', 'Missing order identifier');
  }

  this.data={};
  this.operation = opts.operation;
  this.data.orderId = opts.orderId;
  this.data.payId = opts.payId||undefined;
  this.data.GLOBORDERID = opts.groupId||undefined;
  opts.email&&(this.data.email=opts.email);
  this.data.amount = opts.amount;
  opts.currency&&(this.data.currency = opts.currency);

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
  

  // if (!card || (!card.paidId)) {
  //   callback(new PostFinanceError('system', 'Card has no token', null));
  //   return;
  // }

  // Augment transaction data with token
  transactionData = self.data;

  // transaction operation 
  transactionData.OPERATION=MAP_PROCESS[this.operation];

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

  if (!transactionData.com) {
    transactionData.com = {};
  }

  //options:
  // orderId*
  // amount*
  // groupId
  // email
  // * mandatory


  card.publish(transactionData,function(err, res){
    if(err){
      return callback(err)
    }    
    self.payId=res.body.PAYID;
    self.orderId=res.body.ORDERID;
    self.acceptance=res.body.ACCEPTANCE;
    self.status=res.body.STATUS;

    return callback(null,res)
  })
};

/**
 * ## transaction.Transaction.cancel([card], callback)
 * *Cancel an existing transaction using the given card*
 *
 * @param {postfinance.Card} [card] Payment method to use for the transaction
 * @param {Function} callback Callback function
 */

transaction.Transaction.prototype.cancel = function(card, callback) {
  var self = this;
  var querystring = require('querystring');
  var transactionData;


  // transaction should exist
  if (!this.payId || !this.orderId) {
    callback(new PostFinanceError('system', 'Transaction is not valid', null));
    return;
  }

  // Augment transaction data with token
  transactionData = self.data;

  // transaction operation 
  transactionData.OPERATION=MAP_PROCESS['cancel'];
  // transactionData.custom='deleted'

  // transaction handle
  if(self.payId){
    transactionData.payId=self.payId;
  }

  card.publish(transactionData,function(err, res){
    if(err){
      return callback(err)
    }    
    self.payId=res.body.PAYID;
    self.orderId=res.body.ORDERID;
    self.acceptance=res.body.ACCEPTANCE;
    self.status=res.body.STATUS;

    return callback(null,res)
  })
};

/**
 * ## transaction.Transaction.cancel([card], callback)
 * *Cancel an existing transaction using the given card*
 *
 * @param {postfinance.Card} [card] Payment method to use for the transaction
 * @param {Function} callback Callback function
 */

transaction.Transaction.prototype.refund = function(card, callback) {
  var self = this;
  var querystring = require('querystring');
  var transactionData;


  // transaction should exist
  if (!this.payId || !this.orderId) {
    callback(new PostFinanceError('system', 'Transaction is not valid', null));
    return;
  }

  // Augment transaction data with token
  transactionData = self.data;

  // transaction operation 
  transactionData.OPERATION=MAP_PROCESS['refund'];
  // transactionData.custom='deleted'

  // transaction handle
  if(self.payId){
    transactionData.PAYID=self.payId;
  }


  card.publish(transactionData,function(err, res){
    if(err){
      return callback(err)
    }    
    self.payId=res.body.PAYID;
    self.orderId=res.body.ORDERID;
    self.acceptance=res.body.ACCEPTANCE;
    self.status=res.body.STATUS;

    return callback(null,res)
  })
};
