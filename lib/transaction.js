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
var ducttape = require('./ducttape');
var daimyoRecipes = require('./daimyo').recipes;
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
    '@': 'transaction',
    reference_id: xmlutils.toString,
    transaction_token: xmlutils.toString,
    created_at: xmlutils.toDate,
    descriptor: xmlutils.toString,
    custom: xmlutils.toString,
    billing_reference: xmlutils.toString,
    customer_reference: xmlutils.toString,
    transaction_type: xmlutils.toString,
    amount: xmlutils.toFloat,
    currency_code: xmlutils.toString,
    processor_token: xmlutils.toString,
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
  return subpath + (transactionId || config.option('processorId')) + '/' + 
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

  // Make data and path tamper-free properties
  ducttape.addOneTimeAccessor(this, 'data');
  ducttape.addOneTimeAccessor(this, 'type');
  ducttape.addOneTimeAccessor(this, 'path');
  ducttape.addOneTimeAccessor(this, 'useToken');

  this.type = opts.type;

  this.useToken = ['credit', 'void'].indexOf(this.type) === -1;
    
  // Some defaults for complex transactions
  if (!opts.transactionId) {
    opts.data.type = opts.type;
    opts.data.currency = opts.data.currency || config.option('currency');
  }

  this.data = opts.data;
  this.path = getTransactionPath(opts.type, opts.transactionId);

  // Add methods to remember and check the response validation hash
  (function(self, ducttape) {
    var hash;

    // Remember the hash (works only the first time)
    self.rememberHash = function(val) {
      if (!hash) {
        hash = val;
      }
    };

    // Compare given value to the remembered hash
    self.checkHash = function(val) {

      // Always fail if no hash is remembered
      if (!hash) { return false; }

      return val === hash;
    };

  }(this, ducttape));

};

/**
 * ## transaction.Transaction._loadFromResponse(xml, token)
 * *Loads transaction and payment details from XML response*
 *
 * This method returns a boolean flag that signifies the success status. 
 * This method will return `false` for any sort of integrity check. It 
 * basically means that the gateway's response is invalid. In 100% of cases,
 * this should indicate that the data has been tampered with (unless there
 * is an undiscovered flaw in Daimyo itself).
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
  var customData;

  if (this.useToken && methodData.payment_method_token !== card.token) {
    debug('Unmatched payment token');
    return false;
  }

  if (transData.transaction_type.toLowerCase() !== self.type) {
    debug('Unmatched transaction type');
    return false;
  }

  // Load transaction information into receipt property
  self.receipt = {};

  // Parse custom data (it should be a JSON string)
  if (transData.custom) {
    debug(transData.custom);
    try {
      // Parse custom data and remove the check token
      customData = JSON.parse(transData.custom);

      // Return early if response validation fails
      if (!customData._check || !self.checkHash(customData._check)) {
        debug('_check token failure');
        return false;
      }

      if (customData.hasOwnProperty('_check')) {
        delete customData._check;
      }

      // Assign custom data to receipt.custom
      self.receipt.custom = customData;

    } catch(err1) { /* Fail silently */ }
  }

  self.receipt.referenceId = transData.reference_id;
  self.receipt.transactionId = transData.transaction_token;
  self.receipt.createdAt = transData.created_at;
  self.receipt.descriptor = transData.descriptor;
  self.receipt.type = transData.transaction_type.toLowerCase();
  self.receipt.amount = transData.amount;
  self.receipt.currency = transData.currency_code;
  self.receipt.customerReference = transData.customer_reference;
  self.receipt.billingReference = transData.billing_reference;
  self.receipt.success = transData.success;

  // Update the card object from payment method response information
  if (self.useToken) {
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
  }

  // Parse card's custom data
  if (methodData.custom) {
    try {
      card.custom = JSON.parse(methodData.custom);
    } catch (err2) { /* Fail silently */ }
  }

  return true;
};

/**
 * ## transaction.Transaction.process([card], callback)
 * *Process the transaction using the given card*
 *
 * After a transaction is processed, the transaction object gains one new 
 * property, `receipt`, which contains useful details on the status of the
 * transaction:
 *
 *  + _referenceId_: reference ID (this is not the transaction ID)
 *  + _transactionId_: this token can be used later to void or credit
 *  + _cretedAt_: time the transaction took place
 *  + _descriptor_: if gateway supports descriptors, it will be given here
 *  + _custom_: any custom fields you have set
 *  + _type_: transaction type (this should match the original transaction 
 *    type)
 *  + _amount_: amount in the transaction (this may differ from original
 *    amount due to rounding errors; you should make sure this is correct)
 *  + _currency_: currency used in the transaction
 *  + _success_: boolean success flag (`true` if all went well)
 *
 * The transaction object will also gain a property `messages` which will 
 * contain any messages generated by the gateway. In case of a successful 
 * transaction, A message will be returned for the field 'transaction', which
 * will read 'Success'. Other messages are assigned to individual fields for 
 * which there were any errors.
 *
 * The card object used for the transaction will also be update after 
 * processing a transaction. The card will gain the method property, and
 * have all its fields populated with data from the gateway. This is 
 * effectively like doing a ``card.load()``. Refer to documentaiton for the 
 * ``daimyo.Card.load()`` method.
 *
 * The card object is not required for _credit_ and _void_ transactions. For 
 * those transactions, you can safely pass null as the first argument, or just 
 * omit the first argument.
 *
 * @param {daimyo.Card} [card] Payment method to use for the transaction
 * @param {Function} callback Callback function
 */
transaction.Transaction.prototype.process = function(card, callback) {
  var self = this;
  var transactionData;
  
  if (typeof card === 'function') {
    callback = card;
    card = null;
  }

  if (self.useToken && (!card || !card.token)) {
    callback(new DaimyoError('system', 'Card has no token', null));
    return;
  }

  // Augment transaction data with token
  transactionData = self.data;

  // Currency check
  if (transactionData.currency &&
      config.option('allowedCurrencies').indexOf(transactionData.currency) < 0) {
    
    callback(new DaimyoError(
      'system', 
      'Currency not allowed', 
      transactionData.currency
    ));
    return;

  }


  if (!transactionData.custom) {
    transactionData.custom = {};
  }

  // Add response validation hash and remember it
  transactionData.custom._check = ducttape.randomHash();
  self.rememberHash(transactionData.custom._check);

  // JSONify custom field
  try {
    transactionData.custom = JSON.stringify(transactionData.custom);
  } catch(e) {
    // If JSONification failes, remove the custom data completely
    delete transactionData.custom;
  }

  if (self.useToken) {
    transactionData.paymentMethodToken = card.token;
  }

  transactionData = xmlutils.toSamurai(transactionData, transaction.MAPPINGS);

  authpost.makeRequest({
    path: self.path,
    payload: xmlutils.toXML(transactionData, 'transaction'),
    method: 'POST'
  }, function(err, res) {
    // Error handling

    if (err && err.category === 'system') {
      callback(err);
      return;
    }

    if (res.status !== 200) {
      callback(new DaimyoError(
        'system',
        'Gateway responded with non-200 status',
        {status: res.status, body: res.body, messages: messages.translateAll(err.details)}
      ));
      return;
    }

    // This should always be true unless there were system errors
    if (err && err.category == 'gateway') {
      self.messages = messages.translateAll(err.details, 'en_US');
    }

    // Load transaction data and payment method data
    if (!self._loadFromResponse(res.body, card)) {
      callback(new DaimyoError(
        'transaction',
        'Request data does not match the response data',
        null
      ));
    }

    // Exit with no error
    callback(null);
  });

};
