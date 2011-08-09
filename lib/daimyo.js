/**
 * Daimyo - core Daimyo functionality
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var settings = require('./config').settings;
var debug = require('./config').debug;
var check = require('./check');
var tokenRe = /^[0-9a-f]{24}$/;
var daimyo = exports;

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
  if (opts) {
    if (opts.token && tokenRe.test(opts.token)) {
      debug('Using payment token instead of credit card details.');
      this.token = opts.token;
    } else {
      debug('No valid token found. Using credit card details.');
      this.number = opts.number;
      this.csc = opts.csc;

      // Card number and CSC are required
      if (!this.number) {
        throw new Error('Card number is required');
      }
      if (!this.csc) {
        throw new Error('CSC is required');
      }

      this.year = parseInt(opts.year, 10) || this.year;
      this.month = parseInt(opts.month, 10) || this.month;
      this.firstName = opts.firstName || this.firstName;
      this.lastName = opts.lastName || this.lastName;
      this.address1 = opts.address1 || this.address1;
      this.address2 = opts.address2 || this.address2;
      this.city = opts.city || this.city;
      this.state = opts.state || this.state;
      this.zip = opts.zip || this.zip;

      // Set card issuer
      this.issuer = check.getIssuer(this.number);
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

daimyo.Card = Card;
