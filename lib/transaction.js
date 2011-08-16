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
var authpost = require('./authpost');
var messages = require('./messages');
var daimyoRecipes = require('./daimyo').recipes;
var settings = config.settings;
var debug = config.debug;
var transaction = exports;

var VALID_TRANSACTIONS = ['purchase', 'authorize', 'capture', 'void', 'credit'];

/**
 * ## MAPPINGS
 * *Mappings between Daimyo fields and Samurai node names*
 */
transaction.MAPPINGS = {
  currency: 'currency_code'
};

/**
 * ## transaction.recipes
 * *Recipes for parsing XML data*
 *
 * Recipes are used to parse XML data returned by the Samurai gateway. For more
 * infomration on parsing recipes, see `xmlutils` documentation.
 *
 * The key name of each recipe corresponds to the XML node name.
 *
 * @private
 */
transaction.recipes = {
  transaction: {
    reference_id: xmlutils.toString,
    transaction_token: xmlutils.toString,
    created_at: xmlutils.toDate,
    descriptor: xmlutils.toString,
    custom: xmlutils.toString,
    transaction_type: xmlutils.toString,
    amount: xmlutils.toFloat,
    currency_code: xmlutils.toString,
    success: xmlutils.toBool
  },
  paymentMethod: daimyoRecipes.paymentMethod
};

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
  return subpath + (transactionId || settings.processorId) + '/' + 
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
 *  + _[transactionId]_: (optional) Transaction ID
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
 * @constructor
 */
transaction.Transaction = function(opts) {
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

  this.data = opts.data;
  
  // Some defaults for complex transactions
  if (!opts.transactionId) {
    this.data.type = opts.type;
    this.data.currency = this.data.currency || settings.currency;
  }
  this.path = getTransactionPath(opts.type, opts.transactionId);
};

/**
 * ## transaction.Transaction.toXML()
 * *Return transaction data to XML format*
 *
 * @private
 */
transaction.Transaction.prototype.toXML = function() {
  var transactionData = xmlutils.toSamurai(this.data, transaction.MAPPINGS);
  if (transactionData && Object.keys(transactionData).length) {
    return xmlutils.toXML(transactionData, 'transaction');
  }
};

/**
 * ## transaction.Transaction._loadFromResponse(xml, token)
 * *Loads transaction and payment details from XML response*
 *
 * This method returns a boolean flag that signifies the success status. 
 * Success means that the returned data matches the one sent out.
 * 
 * @param {String} xml XML response data
 * @param {Object} card Payment method used for this transaction
 * @return {Boolean} Success status
 * @private
 */
transaction.Transaction.prototype._loadFromResponse = function(xml, card) {
  var self = this;
  var transData = xmlutils.extractData(xml, transaction.recipes.transaction);
  var methodData = xmlutils.extractData(xml, transaction.recipes.paymentMethod);
  
  if (methodData.payment_method_token !== card.token) {
    return false;
  }

  if (transData.transaction_type.toLowerCase() !== self.data.type) {
    return false;
  }

  // Load transaction information into receipt property
  self.receipt = {};
  self.receipt.referenceId = transData.reference_id;
  self.receipt.transactionId = transData.transaction_token;
  self.receipt.createdAt = transData.created_at;
  self.receipt.descriptor = transData.descriptor;
  self.receipt.custom = transData.custom;
  self.receipt.type = transData.transaction_type.toLowerCase();
  self.receipt.amount = transData.amount;
  self.receipt.currency = transData.currency_code;
  self.receipt.success = transData.success;

  // Update the card object from payment method response information
  card.method = {};
  card.method.valid = methodData.is_sensitive_data_valid;
  card.method.updatedAt = methodData.updated_at;
  card.method.createdAt = methodData.created_at;
  card.method.retained = methodData.is_retained;
  card.method.redacted = methodData.is_redacted;
  card.last4 = methodData.last_four_digits;
  card.issuer = methodData.card_type;
  card.year = methodData.expiry_year;
  card.month = methodData.expiry_month;
  card.firstName = methodData.first_name;
  card.lastName = methodData.last_name;
  card.address1 = methodData.address_1;
  card.address2 = methodData.address_2;
  card.city = methodData.city;
  card.state = methodData.state;
  card.zip = methodData.zip;
  card.country = methodData.country;

  return true;
};
};
