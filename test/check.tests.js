/**
 * Daimyo - unit tests for check module
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 *
 * Cred card numbers used as fixtures come from these URI:
 * https://www.paypalobjects.com/en_US/vhelp/paypalmanager_help/credit_card_numbers.htm
 *
 * All card numbers are test numbers, and cannot be used to make real-life 
 * purchases. They are only useful for testing.
 */

var assert = require('assert');
var should = require('should');
var check = require('../lib/check');
var test = exports;

var validCardNos = {
  '378282246310005': 'American Express',
  '371449635398431': 'American Express',
  '378734493671000': 'American Express',
  '5610591081018250': 'Unknown', // Australian Bank
  '30569309025904': 'Diners Club',
  '38520000023237': 'Diners Club',
  '6011111111111117': 'Discover',
  '6011000990139424': 'Discover',
  '3530111333300000': 'JCB',
  '3566002020360505': 'JCB',
  '5555555555554444': 'MasterCard',
  '5105105105105100': 'MasterCard',
  '4111111111111111': 'Visa',
  '4012888888881881': 'Visa',
  '4222222222222': 'Visa'
};

test['Issuer check'] = function(exit) {
  Object.keys(validCardNos).forEach(function(card) {
    check.getIssuer(card).should.equal(validCardNos[card]);
  });
};

test['Issuer check with full details'] = function(exit) {
  Object.keys(validCardNos).forEach(function(card) {
    var issuerDetails = check.getIssuer(card, true);
    issuerDetails[0] = validCardNos[card];
    issuerDetails[1].should.be.instanceof(RegExp);
    issuerDetails[2].should.be.instanceof(RegExp);
  });
};

test['Mod-10 test'] = function(exit) {
  // All test cards should pass (they are all valid numbers)
  Object.keys(validCardNos).forEach(function(card) {
    check.mod10check(card).should.equal(card);
  });
};
