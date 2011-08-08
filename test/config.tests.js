/**
 * Daimyo - unit tests for configuration module
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var config = require('../lib/config');
var helpers = require('./helpers');
var assert = require('assert');
var should = require('should');
var test = exports;

// Set up fixtures
var testKeyBases = ['key1', 'key2', 'key3'];
var testKeys = [];
var badKeys = ['bogus', 'foo', '123'];

// Generate some dummy keys
testKeyBases.forEach(function(base) {
  testKeys.push(helpers.generateKey(base));
});

// START TESTING

test['Initial state'] = function(exit) {
  config.should.have.property('settings');
  config.settings.merchantKey.should.equal('');
  config.settings.apiPassword.should.equal('');
  config.settings.processorId.should.equal('');
  config.settings.enabled.should.be.ok;
  config.settings.debug.should.be.ok;
};

test['Configuration requires all three keys'] = function(exit) {
  assert.throws(function() {
    config.configure({});
  });

  assert.throws(function() {
    config.configure({
      apiPassword: testKeys[1],
      processorId: testKeys[2]
    });
  }, 'Incomplete Samurai API credentials');

  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      processorId: testKeys[2]
    });
  }, 'Incomplete Samurai API credentials');

  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: testKeys[1]
    });
  }, 'Incomplete Samurai API credentials');

};

test['Configuration fails with invalid-looking keys'] = function(exit) {
  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: testKeys[1],
      processorId: badKeys[0]
    });
  }, 'Not valid processorId');

  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: badKeys[0],
      processorId: testKeys[1]
    });
  }, 'Not valid apiPassword');
  
  assert.throws(function() {
    config.configure({
      merchantKey: badKeys[0],
      apiPassword: testKeys[0],
      processorId: testKeys[1]
    });
  }, 'Not valid merchantKey');
};
