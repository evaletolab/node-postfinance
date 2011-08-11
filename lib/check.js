/**
 * # check
 *
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * This module contains functions for performing various credit card checks.
 * The checks it performs are:
 *
 *  + Luhn Mod-10 check (verifies if card number is valid)
 *  + CSC check (verifies if the CSC/CVV/CCV number has correct number of 
 *    digits)
 *  + Issuer check (determines the issuer of the card)
 *
 * This module can be converted for use in browsers by using the `checkamd` 
 * target in the makefile:
 *
 *     make checkamd
 *
 * The above command converts this module into an AMD module loadable with
 * AMD-compliant loaders like [RequireJS](http://requirejs.org/).
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var check = exports;
var NON_DIGIT_CHARS = /[^\d]+/;

/**
 * ## check.issuers
 * *Issuer names with regexes for checking the card numbers and CSCs*
 *
 * Issuer check regexes are currently based on the following resources: 
 * 
 *  + [Anatomy of Credit Card Numbers](http://www.merriampark.com/anatomycc.htm)
 *  + [Wikipedia article](http://en.wikipedia.org/wiki/Credit_card_numbers)
 *
 * These regexes are bound to change as issuers landscape changes over time.
 * They are also not meant to be comprehensive Issuer check. They are meant to
 * catch major cards for further CVC (CCV) check.
 *
 * Currently, the following issuers are detected by this module:
 *
 *  + Visa
 *  + MasterCard
 *  + American Express
 *  + Diners Club
 *  + Discover
 *  + JCB (Japan Credit Bureau)
 *  + China UnionPay
 *
 * Note that China UnionPay cards _will_ fail the Luhn Mod-10 check.
 */
check.issuers = {
  VISA: ['Visa', /^4(\d{12}|\d{15})$/, /^\d{3}$/],
  MAST: ['MasterCard', /^5[1-5]\d{14}$/, /^\d{3}$/],
  AMEX: ['American Express', /^3[47]\d{13}$/, /^\d{4}$/],
  DINA: ['Diners Club', /^3(00|05|6\d|8\d)\d{11}$/, /^\d{3}$/],
  DISC: ['Discover', /^(622[1-9]|6011|64[4-9]\d|65\d{2})\d{12}$/, /^\d{3}$/], 
  JCB: ['JCB', /^35(28|29|[3-8]\d)\d{12}$/, /^\d{3}$/], 
  CHIN: ['China UnionPay', /^62\d{14}/, /^\d{3}$/]
};

/**
 * ## check.extractDigits(s)
 * *Removes all non-digit characters from a given string*
 *
 * This function replaces all non-digit strings with an empty string. The 
 * resulting string contains only digits.
 *
 * `check.extractDigits()` is used throughout the `check` module to make sure 
 * that the card numbers and CSCs are parsed correctly.
 *
 * Example:
 *
 *     var n = '1234-5678-1234-5678';
 *     console.log(check.extractDigits(n);
 *     // outputs: '1234567812345678'
 *     n = 'abcd';
 *     console.log(check.extractDigits(n);
 *     // outputs: ''
 *
 * @param {String} s String to operate on
 * @returns {String} String with stripped out non-digit characters
 */
check.extractDigits = function(s) {
  return s.replace(NON_DIGIT_CHARS, '');
};

/**
 * ## check.getIssuer(card, [full])
 * Returns the issuer of the card
 *
 * The card number is stripped of any non-digit characters prior to checking. 
 * The `full` flag can be used to retrieve all issuer detauls (regex for 
 * checking card numbers and CSC) or just the issuer name.
 *
 * Example:
 *
 *     check.getIssuer('4111111111111111');
 *     // returns: 'Visa'
 *     check.getIssuer('4111111111111111', true);
 *     // returns: ['Visa', /^4(\d{12}|\d{15})$/, /^\d{3}$/]
 *
 * @param {String} card Card number
 * @param {Boolean} [full] Whether to return the issuer details instead of name
 * @returns {String} String representing the issuer name
 */
check.getIssuer = function(card, full) {
  var lastMatch = full ? ['Unknown', /^\d{16}$/, /^\d{3}$/] : 'Unknown';
  card = check.extractDigits(card);
  if (!card) {
    return 'Unknown';
  }
  Object.keys(check.issuers).forEach(function(issuer) {
    if (check.issuers[issuer][1].test(card)) {
      lastMatch = full ? check.issuers[issuer] : check.issuers[issuer][0];
    }
  });
  return lastMatch;
};

/**
 * ## check.mod10check(card)
 * *Checks the validity of credit card using the Luhn Mod-10 algorithm*
 *
 * The card number is checked after all non-digit characters are removed from
 * the original string. If the check succeeds, the sanitized number is 
 * returned. Otherwise, `null` is returned.
 *
 * Example:
 *
 *     check.mod10check('4111-1111-1111-1111');
 *     // returns: '4111111111111111'
 *     check.mod10check('123-bogus');
 *     // returns: null
 *     check.mod10check();
 *     // returns: null
 *
 * @param {String} card Card number in string format
 * @return {Object} Sanitized number if valid, otherwise `null`
 */
check.mod10check = function(card) {
    var sum = 0;
    var totalDigits;
    var oddEven;
    var digits;
    var i;
    var current;

    card = check.extractDigits(card);  

    if (!card) {
      // Card number contains no digits
      return null;
    }

    totalDigits = card.length;
    oddEven = totalDigits & 1;
    digits = card.split(''); // Convert to array

    for (i = totalDigits; i; --i) {
      current = totalDigits - i; 
      digit = parseInt(digits[current], 10);

      if (!((current & 1) ^ oddEven)) {
        digit = digit * 2;
      }
      if (digit > 9) {
        digit -= 9;
      }

      sum = sum + digit;
    }

    return (sum % 10) === 0 && card;
};

/**
 * ## check.cscCheck(card, csc)
 * *Checks the card security code (CSC) given card number and the code*
 *
 * Card number is required because the CSC is not the same format for all 
 * issuers. Currently, American Express cards have a 4-digit CSC, while all 
 * other issuers (that we know of) have a 3-digit CSC.
 *
 * Example:
 *
 *     check.cscCheck('4111111111111111', '111');
 *     // returns: true
 *     check.cscCheck('4111111111111111', '11');
 *     // returns: false
 *
 * @param {String} card Credit card number
 * @param {String} csc Card security code
 * @returns {Boolean} Boolean value of the test status
 */
check.cscCheck = function(card, csc) {
  var issuerDetails;

  csc = check.extractDigits(csc);
  if (!csc) { return false; }

  issuerDetails = check.getIssuer(card, true);
  return issuerDetails[2].test(csc);
};
