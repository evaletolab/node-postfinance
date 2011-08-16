/**
 * #daimyo
 *
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * Core Daimyo objects and functions. This module contains the core Daimyo API,
 * which is actually used by your application.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var settings = require('./config').settings;
var debug = require('./config').debug;
var check = require('./check');
var DaimyoError = require('./error');
var authpost = require('./authpost');
var xmlutils = require('./xmlutils');
var messages = require('./messages');
var tokenRe = /^[0-9a-f]{24}$/;
var daimyo = exports;

/**
 * ## daimyo.recipes
 * *Recipes for parsing XML data*
 *
 * This recipes are used to parse out fields from XML responses and coerce the 
 * field values into JavaScript types. The coercion methods are defined in the
 * `xmlutils` module. Look up the `xmlutils` documentation for more details.
 *
 * The key name in each recipe represents the XML node name. The value of the 
 * key represents the coercion method. See the documentation for 
 * `xmlutils.extractData` method for more details.
 *
 * @private
 */
daimyo.recipes = {
  paymentMethod: {
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
  }
};

/**
 * ## normalizeYear(order, year)
 * *Normalize year to 4-digit full year*
 * 
 * Normalize year expressed as a year of current decade (1 digit), century (2 
 * digits) or millenia (3 digits), to a 4-digit year.
 * 
 * @param {Integer} order The order of magnitude (10, 100, etc) of the source
 * @param {Integer} year The source year
 * @returns {Integer} Normalized 4-digit year
 * @private
 */
function normalizeYear(order, year) {
  return (Math.floor(new Date().getFullYear() / order) * order) + year;
}

/**
 * ## MAPPINGS
 * *Mappings between between Daimyo field names and Samurai node names*
 *
 * @private
 */
daimyo.MAPPINGS = {
  number: 'card_number',
  csc: 'cvv',
  year: 'expiry_year',
  month: 'expiry_month',
  issuer: 'card_type'
};

/**
 * ## daimyo.toSamurai(o)
 * *Remaps the Daimyo field names to Samurai node names in an object*
 *
 * Given an object with Daimyo field names, this method converts only the 
 * fields found in MAPPINGS and renames the fields to Samurai node names 
 * returning a new object with the renamed fields.
 *
 * Example:
 *
 *     var daimyoObj = {
 *        fullName: 'Foo',
 *        lastName: 'Bar',
 *        year: 2012
 *     }
 *     daimyo.toSamurai(daimyoObj);
 *     // returns: 
 *     //   {
 *     //     fullName: 'Foo',
 *     //     lastName: 'Bar',
 *     //     expiry_year: 2012
 *     //   }
 *
 * @param {Object} o Daimyo object
 * @returns {Object} Object with remapped fields
 * @private
 */
daimyo.toSamurai = function(o) {
  var remapped = {};

  Object.keys(o).forEach(function(key) {
    if (MAPPINGS.hasOwnProperty(key)) {
      remapped[MAPPINGS[key]] = o[key];
    } else {
      remapped[key] = o[key];
    }
  });

  return remapped;
};

/**
 * ## daimyo.Card(opts)
 * *Creates a new payment method instance*
 *
 * The payment method options can be either a single token:
 * - _token_: Payment method token
 *
 * or full credit card details:
 *
 *  + _number_: Credit card number
 *  + _csc_: Card security code
 *  + _year_: Expiration year
 *  + _month_: Expiration month
 *  + _firstName_: Card holder's first name
 *  + _lastName_: Card holder's last name
 *  + _address1_: Address line 1
 *  + _address2_: Address line 2
 *  + _city_: City
 *  + _state_: State
 *  + _zip_: Zip code
 *
 * If you supply both token, and card details, token will take presedence, and 
 * credit card details will be completely ignored.
 *
 * The constructor will refuse to accept credit card details if `number` and/or
 * `csc` properties are missing. An error will be thrown in such cases.
 *
 * @param {Object} opts Payment method options
 * @constructor
 */
function Card(opts) {
  var self = this;

  // This property contains the original/initial values of all fields
  // Do not motify this object directly. Use _dirty setter.
  self._originalValues = {
    number: undefined,
    csc: undefined,
    year: undefined,
    month: undefined,
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: ''
  };

  // Update _originalValues keys if matching keys are found in object argument
  self.__defineSetter__('_dirty', function(object) {
    Object.keys(self._originalValues).forEach(function(field) {
      if (object[field]) {
        self._originalValues[field] = object[field];
      }
    });
  });

  // Check fields for dirtiness and return the names of dirty fields as Array
  self.__defineGetter__('_dirty', function() {
    var dirtyFields = [];
   
    // Check all fields in _originalValues and determine the dirty fields
    Object.keys(self._originalValues).forEach(function(field) {
      if (self[field] !== self._originalValues[field]) {
        dirtyFields.push(field);
      }
    });

    return dirtyFields;
  });

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
 * ## daimyo.Card._resetDirty()
 * *Removes dirty state from all fields*
 *
 * This method is used internally, and it should not be used randomly. What it 
 * does is, it resets the `Card.prototype._originalValues` to current values
 * used in the card object. Because of this, you loose track of any dirty 
 * fields (all fields become clean).
 *
 * @private
 */
Card.prototype._resetDirty = function() {
  var self = this;
  self._dirty = {
    number: self.number,
    csc: self.csc,
    year: self.year,
    month: self.month,
    firstName: self.firstName,
    lastName: self.lastName,
    address1: self.address1,
    address2: self.address2,
    city: self.city,
    state: self.state,
    zip: self.zip
  };
};

/**
 * ## daimyo.Card.isValid()
 * *Validate the card data*
 *
 * This method validates the correctness of the card number and CSC. It uses
 * the industry-standard Luhn Mod-10 check to ensure that the card number's 
 * checksum is correct. It also makes sure that the CSC has the correct number 
 * of digits (currently, AMEX cards have 4-digit CSC, while others use 3 
 * digits). 
 *
 * Note that the card may still fail to clear for any number of reasons. The
 * same check as this one is performed in the Samurai gateway, as well, however
 * if you create payment methods using server-to-server requests, rather than
 * letting Samurai create payment methods by submitting the payment form 
 * directly to Samurai, then this can speed up processing as you can trap
 * some common errors without sending a request to Samurai.
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
 * ## daimyo.Card.isExpired()
 * Checks the card expiration year/month
 *
 * If the year and month are not specified, the check will return `true`. 
 *
 * This method does _not_ correct the expiration year/month.
 *
 * You should be aware that correcting the expiration year/month by setting 
 * them to a future date is acceptable practice, and banks will _not_ decline
 * a card based on expiration year/month. If the card fails this test, you 
 * should manually forward the expiration date to increase the chance of the
 * transaction succeeding.
 *
 * Note that the same check will be performed in Samurai gateway, but it is 
 * more efficient to do it yourself if you are not using the transparent 
 * redirect method as it saves at least one request.
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
 * ## daimyo.Card.create(callback)
 * *Sends a request to create a new payment method*
 *
 * Creates a new payment method in the Samurai vault, and sets the `token` 
 * property to the received payment method token.
 *
 * The callback should accept a single error object that is `null` if 
 * no error occured.
 *
 * Example:
 *
 *     var cardData = {...};
 *     var card = new daimyo.Card(cardData);
 *     card.create(function(err) {
 *       if (err) {
 *         console.log(err);
 *         return;
 *       }
 *       console.log('Payment token: ' + card.token);
 *     });
 *
 * @param {Function} Optional callback function (expects err)
 */
Card.prototype.create = function(callback) {
  var querystring = require('querystring');
  var self = this;
  var paymentTokenRe = /payment_method_token=([0-9a-f]{24})/;

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
      callback(new DaimyoError('system', 'Gateway responded with non-302 status', 
                               {status: res.status, messages: messages.translateAll(err.details)}));
      return;
    }
    if (!res.headers.location) {
      callback(new DaimyoError('system', 'Gateway failed to send the location header', res.headers));
      return;
    }

    // Parse the location header to extract the token
    self.token = paymentTokenRe.exec(res.headers.location)[1];
    self._resetDirty();
    callback(null);
  });
 
};

/**
 * ## daimyo.Card._rejectNoToken()
 * *Quck way to throw when token is not found*
 *
 * @private
 */
Card.prototype._rejectNoToken = function() {
  if (!this.token) {
    throw new DaimyoError('system', 'Cannot update payment method without token', null);
  }
};

/**
 * ## daimyo.Card._executeRequest(opts, callback)
 * *Executes payment gateway request given options*
 *
 * @param {Object} opts Options and payload for making a request
 * @param {Function} callback Called with err object
 * @private
 */
Card.prototype._executeRequest = function(opts, callback) {
  var self = this;

  authpost.makeRequest(opts, function(err, res) {

    // Error handling

    if (err && err.category === 'system') {
      callback(err);
      return;
    }

    if (err && err.category == 'gateway') {
      self.messages = messages.translateAll(err.details, 'en_US');
    }

    if (res.status !== 200) {
      callback(new DaimyoError(
        'system', 
        'Gateway responded with non-200 status', 
        {status: res.status, body: res.body, messages: messages.translateAll(err.details)}
      ));
      return;
    }

    // Load payment method data from response

    if (!self._loadFromResponse(res.body)) {
      callback(new DaimyoError(
        'method',  
        'Loaded token does not equal the token that was requested', 
        null
      ));
      return;
    }

    // Exit with no error

    callback(null);

  });
};

/**
 * ## daimyo.Card._getTokenPath([subpath])
 * *Returns the token URL based on the token assigned to the instance*
 *
 * The token path is only returned if the instance has the `token` field (e.g, 
 * it was initialized with one, or it was loaded/creted). Otherwise, an empty
 * string is returned.
 *
 * @param {String} [subpath] Token subpath (like `/redact` or `/retain`)
 * @returns {String} URL that represents the payment method
 * @private
 */
Card.prototype._getTokenPath = function(subpath) {
  subpath = subpath || '';
  if (!this.token) {
    return '';
  }
  return '/payment_methods/' + this.token + subpath + '.xml';
};

/**
 * ## daimyo.Card._loadFromResponse(xml)
 * *Loads the payment method data from XML response*
 *
 * The method returns a boolean flag that signifies the success status. It 
 * boils down to whether the returned token matches the token that is currently
 * set for the card.
 *
 * @param {String} xml XML response data
 * @return {Boolean} Success status (`true` if all went well, `false` on errors)
 * @private
 */
Card.prototype._loadFromResponse = function(xml) {
  var self = this;
  var data = xmlutils.extractData(xml, daimyo.recipes.paymentMethod);

  if (data.payment_method_token !== self.token) {
    return false;
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
  self.city = data.city;
  self.state = data.state;
  self.zip = data.zip;
  self.country = data.country;

  self._resetDirty();

  return true;
};

/**
 * ## daimyo.Card.load(callback)
 * *Load payment method data from Samurai server*
 *
 * This method is used to load a created/retained payment method from the 
 * Samurai gateway. The returned data immediately updates the fields in the
 * card instance, and also creates a new `method` property, which contains 
 * metadata about the payment method.
 *
 * The `method` property has the following properties:
 *
 *  + _valid_: Whether the card has passed Samurai's validation (this is the 
 *    same type of validation as those used in `isValid()` method.
 *  + _updatedAt_: The timestamp of payment method's last modification
 *  + _createdAt_: Payment method creation timestamp
 *  + _retained_: Whether payment method is permanent
 *  + _redacted_: Whether payment mehtod was modified
 *  + _custom_: Custom fields (setting them is not yet supported by Daimyo)
 *
 * `load` method also creates a `messages` property which contains any 
 * messages that the gateway emitted. These may include validation errors. 
 *
 * The callback should expect a single error object.
 *
 * Example:
 *
 *     // E.g., you have a payment token stored in a database
 *     var userToken = 'xxxxxxxxxxxxxxxxxxxxxxxx';
 *     var card = new daimyo.Card({token: userToken});
 *     card.load(function(err) {
 *        // Now card's fields are populated with billing details
 *     });
 *
 * @param {Function} callback Expects err object
 */
Card.prototype.load = function(callback) {
  var self = this;

  self._rejectNoToken();

  self._executeRequest({
    path: self._getTokenPath()
  }, callback);

};

/**
 * ## daimyo.Card.update(callback)
 * *Update payment method with modified data*
 *
 * After changing the properties of a card object, you can call this method
 * to sync the data with the Samurai gateway. This method is 'smart' enough
 * to not waste bandwidth when there are no changed properties, so if the 
 * if you allow users to edit the data, you don't need to check if they have
 * entered anything new. It also sends only the changed fields.
 *
 * Once the update is complete, all fields will be marked as clean.
 *
 * The callback should expect a single error object.
 *
 * Example:
 *
 *     // You load the card from Samurai using the load() method
 *     var loadedCard;
 *     // User makes modification to data
 *     loadedCard.firstName = 'Foo';
 *     // Now you can update it
 *     loadedCard.update(function(err) {
 *        // The payment method is now updated
 *     });
 *
 * @param {Function} callback Called with err object
 */
Card.prototype.update = function(callback) {
  var updatedFields = {};
  var payload = '';
  var self = this;

  self._rejectNoToken();

  // If nothing was updated, just call the callback and pretend it was updated
  if (!self._dirty.length) {
    callback(null);
    return;
  }

  // Get all dirty fields
  self._dirty.forEach(function(field) {
    updatedFields[field] = self[field];
  });

  // We have to rename a few fields
  updatedFields = xmlutils.toSamurai(updatedFields, daimyo.MAPPINGS);

  // Construct the XML payload
  payload = xmlutils.toXML(updatedFields, 'payment_method');

  self._executeRequest({
    path: self._getTokenPath(),
    method: 'PUT',
    payload: payload
  }, callback);

};

/**
 * ## daimyo.Card.retain()
 * *Instructs Samurai to ratain (save permanently) the payment method*
 *
 * This is simple method that makes the payment method permanent on the 
 * gateway. The payment method will be stored for future use after this method
 * is called.
 *
 * By default, payment method that hasn't been retained will be deleted after
 * 48 hours. You can delete a payment method (redact in Samurai parlance) at 
 * any time by calling the `redact()` method.
 *
 * @param {Function} callback Called with err object
 */
Card.prototype.retain = function(callback) {
  var self = this;

  self._rejectNoToken();

  self._executeRequest({
    path: self._getTokenPath('/retain'),
    method: 'POST'
  }, callback);

};

/**
 * ## daimyo.Card.redact()
 * *Instructs Samurai to redact (delete) the payment method*
 *
 * When a user wants to use a new card, you should always redact (delete) the
 * existing payment method before accepting the new card. An alternative way is 
 * to update the existing card by modifying the billing/card data using the
 * `update()` method.
 *
 * Updating a card is usually more efficient, as it requires only one request.
 *
 * Note that the card that is redacted will still have the `retained` flag 
 * set to true in the `method` property. You should not, and cannot keep 
 * using the redacted payment method for transactions.
 *
 * @param {Function} callback Called with err object
 */
Card.prototype.redact = function(callback) {
  var self = this;

  self._rejectNoToken();

  self._executeRequest({
    path: self._getTokenPath('/redact'),
    method: 'POST'
  }, callback);

};

daimyo.Card = Card;
