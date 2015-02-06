/**
 * # transaction
 *
 * @author Olivier Evalet <evaleto@gmail.com>
 * @license GPL3 (see LICENSE)
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
    'capture', 
    'cancel', 
    'refund'
];


var MAP_PROCESS={
  authorize:'RES',// order request for authorization
  purchase:'SAL', // order request for direct sale
  refund:'RFD',   // maintenance partial refund and closing
  cancel:'SAS',   // maintenance partial or full data capture and closing
  capture:'SAS'
}

/**
 * ## transaction.Transaction(opts)
 * *Low-level transaction object*
 * 
 * Options for the transaction object are:
 *
 *  + operation: Transaction operation
 *  + orderId: Transaction id
 *  + email: Transaction owner
 *  + groupId : Transaction group
 *  + _[payId]_: (optional) Transaction ID
 * 
 * @param {Object} opts Transaction options
 * @constructor
 */
transaction.Transaction = function(opts) {
  function isFloat(n) {
    return n === +n && n !== (n|0);
  }

  // opts are required
  if (!opts) {
    throw new PostFinanceError('system', 'Missing options object', null);
  }

  // opts can be serialized
  if(typeof opts==='string' ){
    var input=JSON.parse(opts)
    if(!input){
      throw new PostFinanceError('system', 'Missing options object', null);   
    }
    opts=input;
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

  if(opts.amount>config.option('allowMaxAmount')){
    throw new PostFinanceError('system', 'Payment amount is limited to maximum '+config.option('allowMaxAmount')+' CHF');    
  }

  // 3 digits is not compatible XX.XXX
  if(isFloat(Math.round(opts.amount*1000)/10)){
    throw new PostFinanceError('system', 'Payment amount format is not compatible '+opts.amount+' CHF');        
  }

  this.data={};
  this.operation = opts.operation;
  this.data.orderId = opts.orderId;
  this.data.amount = opts.amount;
  opts.payId&&(this.data.payId = opts.payId);
  opts.groupId&&(this.data.GLOBORDERID = opts.groupId);
  opts.email&&(this.data.email=opts.email);
  opts.currency&&(this.data.currency = opts.currency);

};


/**
 * ## transaction.Transaction.toJSON()
 * *Serialize the transaction for later usage*
 */
transaction.Transaction.prototype.toJSON = function() {  
  var self=this, out={
    operation:this.operation,
    payId:this.payId,
    orderId:this.orderId
  }
  Object.keys(this.data).sort().forEach(function(key){
    out[key]=self.data[key]
  });

  return JSON.stringify(out);
}

/**
 * ## transaction.Transaction.update(opts)
 * *Update the transaction in state of authorization*
 * Options for the transaction object are:
 *
 *  + operation: Transaction type
 *  + amount: Transaction amount
 * 
 * @param {Object} opts Transaction options
 */

transaction.Transaction.prototype.update = function(opts) {
  function isFloat(n) {
    return n === +n && n !== (n|0);
  }

  // Only an authorization for this transaction can be updated
  if(this.operation!=='authorize'){
    throw new PostFinanceError('system', 'Only authorization operation can be updated', this.operation);    
  }

  // Only a purchase operation can be accepted
  if(['capture'].indexOf(opts.operation)==-1){
    throw new PostFinanceError('system', 'Only a capture operation can be applied with an authorization', null);    
  }


  if(opts.amount>config.option('allowMaxAmount')){
    throw new PostFinanceError('system', 'Payment amount is limited to maximum '+config.option('allowMaxAmount')+' CHF');    
  }

  // 3 digits is not compatible XX.XXX
  if(isFloat(opts.amount*100)){
    throw new PostFinanceError('system', 'Payment amount format is not compatible '+opts.amount+' CHF');        
  }

  this.operation = opts.operation;
  this.data.amount = opts.amount;

}

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
