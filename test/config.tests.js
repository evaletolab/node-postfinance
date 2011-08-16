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
  config.should.respondTo('option');
  config.option('merchantKey').should.equal('');
  config.option('apiPassword').should.equal('');
  config.option('processorId').should.equal('');
  config.option('currency').should.equal('USD');
  config.option('enabled').should.equal(true);
  config.option('debug').should.equal(false);
  config.option('sandbox').should.equal(false);
  config.option('allowMultipleSetOption').should.equal(false);
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
  });
  
  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      processorId: testKeys[2]
    });
  });

  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: testKeys[1]
    });
  });
};

test['Configuration fails with invalid-looking keys'] = function(exit) {
  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: testKeys[1],
      processorId: badKeys[0]
    });
  });

  assert.throws(function() {
    config.configure({
      merchantKey: testKeys[0],
      apiPassword: badKeys[0],
      processorId: testKeys[1]
    });
  });
  
  assert.throws(function() {
    config.configure({
      merchantKey: badKeys[0],
      apiPassword: testKeys[0],
      processorId: testKeys[1]
    });
  });
};

test['Proper configuration modifies settings correctly'] = function(exit) {
  config.configure({
    merchantKey: testKeys[0],
    apiPassword: testKeys[1],
    processorId: testKeys[2],
    allowMultipleSetOption: true // to prevent locking up settings
  });
  config.option('merchantKey').should.equal(testKeys[0]);
  config.option('apiPassword').should.equal(testKeys[1]);
  config.option('processorId').should.equal(testKeys[2]);
};

test['Setting individual configuration options'] = function(exit) {
  config.option('merchantKey', testKeys[0]);
  config.option('merchantKey').should.equal(testKeys[0]);

  config.option('apiPassword', testKeys[1]);
  config.option('apiPassword').should.equal(testKeys[1]);

  config.option('processorId', testKeys[2]);
  config.option('processorId').should.equal(testKeys[2]);

  config.option('enabled', false);
  config.option('enabled', true);
  config.option('enabled').should.equal(true);

  config.option('enabled', false);
  config.option('enabled', 2); // truthy
  config.option('enabled').should.equal(true);

  config.option('debug', false);
  config.option('debug', true);
  config.option('debug').should.equal(true);

  config.option('debug', false);
  config.option('debug', 'yes'); // truthy
  config.option('debug').should.equal(true);

  config.option('currency', 'USD');
  config.option('currency', 'JPY');
  config.option('currency').should.equal('JPY');

  config.option('sandbox', false);
  config.option('sandbox', 'yes'); // truthy
  config.option('sandbox').should.equal(true);

  assert.throws(function() {
    config.option('merchantKey', badKeys[0]);
  }, 'Not valid merchantKey');

  assert.throws(function() {
    config.option('apiPassword', badKeys[0]);
  }, 'Not valid apiPassword');

  assert.throws(function() {
    config.option('processorId', badKeys[0]);
  }, 'Not valid processorId');
};
