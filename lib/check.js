/**
 * Daimyo - Luhn Mod-10 algorithm implementation and other CC check routines
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var check = exports;
var NON_DIGIT_CHARS = /[^\d]+/;

// Issuer check regexes are currently based on: 
// http://www.merriampark.com/anatomycc.htm
// http://en.wikipedia.org/wiki/Credit_card_numbers //
// These regexes are bound to change as issuers landscape changes over time.
// They are also not meant to be comprehensive Issuer check. They are meant to
// catch major cards for further CVC (CCV) check.
check.issuers = {
  VISA: ['Visa', /^4(\d{12}|\d{15})$/, true],
  MAST: ['MasterCard', /^5[1-5]\d{14}$/, true],
  AMEX: ['American Express', /^3[47]\d{13}$/, true],
  DINA: ['Diners Club', /^3(00|05|6\d|8\d)\d{11}$/, true],
  DISC: ['Discover', /^(622[1-9]|6011|64[4-9]\d|65\d{2})\d{12}$/, true], 
  JCB: ['JCB', /^35(28|29|[3-8]\d)\d{12}$/, true], 
  CHIN: ['China UnionPay', /^62\d{14}/, true]
};

/**
 * Replaces all non-digit strings with an empty string
 *
 * @param {String} s String to operate on
 * @returns {String} String with stripped out non-digit characters
 */
check.extractDigits = function(s) {
  return s.replace(NON_DIGIT_CHARS, '');
};

/**
 * Returns the issuer of the card
 *
 * The card number is stripped of any non-digit characters prior to checking.
 *
 * @param {String} card Card number
 * @returns {String} String representing the issuer name
 */
check.getIssuer = function(card) {
  var lastMatch = 'Unknown';
  card = check.extractDigits(card);
  if (!card) {
    return 'Unknown';
  }
  Object.keys(check.issuers).forEach(function(issuer) {
    if (check.issuers[issuer][1].test(card)) {
      lastMatch = check.issuers[issuer][0];
    }
  });
  return lastMatch;
};

/**
 * Checks the validity of credit card using the Luhn Mod-10 algorithm
 *
 * The card number is checked after all non-digit characters are removed from
 * the original string. If the check succeeds, the sanitized number is 
 * returned. Otherwise, `null` is returned.
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
