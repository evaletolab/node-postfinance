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

// Function to reset settings as necessary
function resetConfig() {
  config.settings.merchantKey = '';
  config.settings.apiPassword = '';
  config.settings.processorId = '';
  config.settings.enabled = true;
  config.settings.debug = true;
}

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
  resetConfig();

  assert.throws(function() {
    config.configure({
      apiPassword: testKeys[1],
      processorId: testKeys[2]
    });
  }, 'Incomplete Samurai API credentials');
  resetConfig();

  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      processorId: testKeys[2]
    });
  }, 'Incomplete Samurai API credentials');
  resetConfig();

  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: testKeys[1]
    });
  }, 'Incomplete Samurai API credentials');
  resetConfig();

};

test['Configuration fails with invalid-looking keys'] = function(exit) {
  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: testKeys[1],
      processorId: badKeys[0]
    });
  }, 'Not valid processorId');
  resetConfig();

  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: badKeys[0],
      processorId: testKeys[1]
    });
  }, 'Not valid apiPassword');
  resetConfig();
  
  assert.throws(function() {
    config.configure({
      merchantKey: badKeys[0],
      apiPassword: testKeys[0],
      processorId: testKeys[1]
    });
  }, 'Not valid merchantKey');
  resetConfig();
};

test['Proper configuration modifies settings correctly'] = function(exit) {
  config.configure({
    merchantKey: testKeys[0],
    apiPassword: testKeys[1],
    processorId: testKeys[2]
  });
  config.settings.merchantKey.should.equal(testKeys[0]);
  config.settings.apiPassword.should.equal(testKeys[1]);
  config.settings.processorId.should.equal(testKeys[2]);
  resetConfig();
};
