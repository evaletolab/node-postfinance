/**
 * Daimyo - core Daimyo functionality
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var settings = require('./config').settings;
var debug = require('./config').debug;
var check = require('./check');
var DaimyoError = require('./error');
var authpost = require('./authpost');
var xmlutils = require('./xmlutils');
var tokenRe = /^[0-9a-f]{24}$/;
var daimyo = exports;

function normalizeYear(order, year) {
  return (Math.floor(new Date().getFullYear() / order) * order) + year;
}

/**
 * Creates a new payment method instance
 *
 * The payment method options can be either a single token:
 * - _token_: Payment method token
 *
 * or full credit card details:
 * - _number_: Credit card number
 * - _csc_: Card security code
 * - _year_: Expiration year
 * - _month_: Expiration month
 * - _firstName_: Card holder's first name
 * - _lastName_: Card holder's last name
 * - _address1_: Address line 1
 * - _address2_: Address line 2
 * - _city_: City
 * - _state_: State
 * - _zip_: Zip code
 *
 * If you supply both token, and card details, token will take presedence, and 
 * credit card details will be completely ignored.
 *
 * @param {Object} opts Payment method options
 * @constructor
 */
function Card(opts) {
  var self = this;
  // Setters and getters

  self.__defineSetter__('year', function(year) {
    if (!year) {
      return;
    }

    year = parseInt(year, 10);
    if (year < 10) {
      self._year = normalizeYear(10, year);
    } else if (year >= 10 && year < 100) {
      self._year = normalizeYear(100, year);
    } else {
      self._year = year;
    }
  });

  self.__defineGetter__('year', function() {
    return self._year;
  });

  self.__defineSetter__('month', function(month) {
    month = parseInt(month, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      self._month = null;
    } else {
      self._month = month;
    }
  });

  self.__defineGetter__('month', function() {
    return self._month;
  });

  self.__defineSetter__('number', function(value) {
    self._number = check.extractDigits(value);
    self.issuer = check.getIssuer(value);
  });

  self.__defineGetter__('number', function() {
    return self._number;
  });

  if (opts) {
    if (opts.token && tokenRe.test(opts.token)) {
      debug('Using payment token instead of credit card details.');
      self.token = opts.token;
    } else {
      debug('No valid token found. Using credit card details.');
      self.number = opts.number;
      self.csc = opts.csc;

      // Card number and CSC are required
      if (!self.number) {
        throw new Error('Card number is required');
      }
      if (!self.csc) {
        throw new Error('CSC is required');
      }

      self.year = opts.year;
      self.month = parseInt(opts.month, 10);
      self.firstName = opts.firstName || '';
      self.lastName = opts.lastName || '';
      self.address1 = opts.address1 || '';
      self.address2 = opts.address2 || '';
      self.city = opts.city || '';
      self.state = opts.state || '';
      self.zip = opts.zip || '';

      // Set card issuer
      self.issuer = check.getIssuer(self.number) || '';
    }
  }
}

/**
 * Validate the card data
 *
 * Note that this only validates the correctness of the card number and CSC. 
 * The card may still fail to clear for any number of reasons.
 *
 * @returns {Boolean} Validation result
 */
Card.prototype.isValid = function() {
  if (!check.mod10check(this.number)) {
    return false;
  }

  if (!check.cscCheck(this.number, this.csc)) {
    return false;
  }

  return true;
};

/**
 * Checks the card expiration year/month
 *
 * If the year and month are not specified, the check will succeed.
 *
 * @returns {Boolean} Check result
 */
Card.prototype.isExpired = function() {
  var expYear = new Date().getFullYear();
  var expMonth = new Date().getMonth() + 1; // 0-indexed

  if (!this.year || !this.month) { return true; }

  // Expired card should not be last month this year or older
  if (this.year < expYear) { return true; }
  if (this.year === expYear && this.month < expMonth) { return true; }

  return false;
};

/**
 * Sends a request to create a new payment method
 *
 * Once the asynchronous request is done, it will call the callback with a 
 * single error object.
 *
 * @param {Function} Optional callback function (expects err)
 */
Card.prototype.create = function(callback) {
  var querystring = require('querystring');
  var self = this;
  var paymentTokenRe = /payment_method_token=([0-9a-f]{24})/;
  var msgRe = /<message[^>]*>([^<]*)<\/message>/;

  if (this.token) {
    callback(null, this.token);
    return;
  }

  // Reformat our data as required by the API
  paymentData = querystring.stringify({
    'redirect_url': 'http://example.com', // Bogus URL, required by API
    'merchant_key': settings.merchantKey,
    'credit_card[first_name]': this.firstName || '',
    'credit_card[last_name]': this.lastName || '',
    'credit_card[address_1]': this.address1 || '',
    'credit_card[address_2]': this.address2 || '',
    'credit_card[city]': this.city || '',
    'credit_card[state]': this.state || '',
    'credit_card[zip]': this.zip || '',
    'credit_card[card_type]':  this.issuer || '',
    'credit_card[card_number]': this.number || '',
    'credit_card[cvv]': this.csc || '',
    'credit_card[expiry_month]': this.month || '',
    'credit_card[expiry_year]': this.year || ''
  });

  authpost.makeRequest({
    method: 'POST',
    payload: paymentData
  }, function(err, res) {
    var errMsg;

    if (err && err instanceof DaimyoError) {
      callback(err);
    }
    if (err) {
      callback(new DaimyoError('system', 'Error making create payment method request', err));
      return;
    }
    if (res.status !== 302) {
      // Parse the body to find the error
      errMsg = msgRe.exec(res.body)[1];
      callback(new DaimyoError('system', 'Gateway responded with non-302 status', {status: res.status, message: errMsg}));
      return;
    }
    if (!res.headers.location) {
      callback(new DaimyoError('system', 'Gateway failed to send the location header', res.headers));
      return;
    }

    // Parse the location header to extract the token
    self.token = paymentTokenRe.exec(res.headers.location)[1];
    callback(null);
  });
 
};

/**
 * Returns the token URL based on the token assigned to the instance
 *
 * @returns {String} URL that represents the payment method
 * @private
 */
Card.prototype._getTokenPath = function() {
  if (!this.token) {
    return '';
  }
  return '/payment_methods/' + this.token + '.xml';
}

/**
 * Load payment method data from Samurai server
 *
 * @param {Function} callback Expects err object
 */
Card.prototype.load = function(callback) {
  var self = this;
  var loadRecipes = {
    'payment_method_token': xmlutils.toString,
    'created_at': xmlutils.toDate,
    'updated_at': xmlutils.toDate,
    'is_retained': xmlutils.toBool,
    'is_redacted': xmlutils.toBool,
    'is_sensitive_data_valid': xmlutils.toBool,
    'last_four_digits': xmlutils.toString,
    'card_type': xmlutils.toString,
    'first_name': xmlutils.toString,
    'last_name': xmlutils.toString,
    'expiry_month': xmlutils.toInt,
    'expiry_year': xmlutils.toInt,
    'address_1': xmlutils.toString,
    'address_2': xmlutils.toString,
    'city': xmlutils.toString,
    'state': xmlutils.toString,
    'zip': xmlutils.toString,
    'country': xmlutils.toString
  };

  if (!this.token) {
    throw new DaimyoError('system', 'Cannot load payment method without token', null);
  }

  authpost.makeRequest({
    path: self._getTokenPath()
  }, function(err, res) {
    var data;
    var messages;

    if (err) {
      callback(new DaimyoError('system', 'Error during load request', err));
    }
    if (res.status !== 200) {
      callback(new DaimyoError(
        'system', 
        'Gateway responded with non-200 status', 
        {status: res.status, message: res.body}
      ));
    }
    
    data = xmlutils.extractData(res.body, loadRecipes);

    if (data.payment_method_token !== self.token) {
      callback(new DaimyoError(
        'method',  
    -   'Loaded token does not equal the token that was requested', 
        {requested: self.token, got: data.payment_method_token}
      ));
    }

    self.method = {};
    self.method.valid = data.is_sensitive_data_valid;
    self.method.updatedAt = data.updated_at;
    self.method.createdAt = data.created_at;
    self.method.retained = data.is_retained;
    self.method.redacted = data.is_redacted;
    self.method.custom = {};
    self.last4 = data.last_four_digits;
    self.issuer = data.card_type;
    self.year = data.expiry_year;
    self.month = data.expiry_month;
    self.firstName = data.first_name;
    self.lastName = data.last_name;
    self.address1 = data.address_1;
    self.address2 = data.address_2;
    self.city = data.cityl
    self.state = data.state;
    self.zip = data.zip;
    self.country = data.country;

    self.messages = xmlutils.extractMessages(res.body);

    callback(null);

  });

};

daimyo.Card = Card;
