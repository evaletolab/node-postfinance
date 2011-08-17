/**
 * Daimyo - unit tests for the main Daimyo module
 * Copyright (c)2011, by Branko Vukelic.
 * Licensed under MIT license (see LICENSE)
 */

var assert = require('assert');
var should = require('should');
var getAdjustedDateparts = require('./helpers').getAdjustedDateparts;
var daimyo = require('../index.js');
var messages = require('../lib/messages');
var test = exports;

var testNonExpiredDate = getAdjustedDateparts(12); // One year in future
var testExpiredDate = getAdjustedDateparts(-12); // One year ago
var testSettings = require('./config');

// Enable sandbox, and debug
daimyo.option('sandbox', true);
daimyo.option('debug', true);

var testCard = {
  number: '5555555555554444', // MasterCard
  csc: '111',
  year: testNonExpiredDate[0].toString(),
  month: testNonExpiredDate[1].toString(),
  firstName: 'Foo',
  lastName: 'Bar',
  address1: '221 Foo st',
  address2: '', // blank
  city: '', // blank
  state: '', // blank
  zip: '99561'
};

var sandboxValidCard = {
  number: '4111-1111-1111-1111',
  csc: '123'
  // No other extra data, this is only for testing transactions
};

var sandboxInvalidCard = {
  number: '4242-4242-4242-4242',
  csc: '123'
  // No other extra data, this is only for testing transactions
};

var bogusCard = {
  number: '2420318231',
  csc: '14111',
  year: testExpiredDate[0].toString(),
  month: testExpiredDate[1].toString()
};

test['Configure and lock configuration'] = function(exit) {
  testSettings.allowMultipleSetOption = false;
  daimyo.configure(testSettings);
  assert.throws(function() {
    daimyo.configure(testSettings);
  });
  assert.throws(function() {
    daimyo.option('debug', false);
  });
};

test['daimyo module has Card constructor'] = function(exit) {
  var Card;
  var card;

  daimyo.should.have.property('Card');
  daimyo.Card.should.be.a('function');
  Card = daimyo.Card;
};

test['Creating a new card'] = function(exit) {
  var Card = daimyo.Card;

  card = new Card(testCard);

  card.should.have.property('number');
  card.number.should.equal(testCard.number);

  card.should.have.property('issuer');
  card.issuer.should.equal('MasterCard');

  card.should.have.property('year');
  card.year.should.equal(testNonExpiredDate[0]);

  card.should.have.property('month');
  card.month.should.equal(testNonExpiredDate[1]);

  card.should.have.property('firstName');
  card.firstName.should.equal('Foo');

  card.should.have.property('lastName');
  card.lastName.should.equal('Bar');

  card.should.have.property('address1');
  card.address1.should.equal('221 Foo st');

  card.should.have.property('address2');
  card.address2.should.equal('');

  card.should.have.property('city');
  card.city.should.equal('');

  card.should.have.property('state');
  card.state.should.equal('');

  card.should.have.property('zip');
  card.zip.should.equal('99561');
};

test['Creating a bogus card'] = function(exit) {
  var Card = daimyo.Card;

  card = new Card(bogusCard);

  card.should.have.property('number');
  card.number.should.equal(bogusCard.number);

  card.should.have.property('issuer');
  card.issuer.should.equal('Unknown');

  card.should.have.property('csc');
  card.csc.should.equal('14111');
};

// GH: #1
test['Card number should be stripped of non-digit elements'] = function(exit) {
  card = new daimyo.Card({
    number: '4111-1111-1111-1111',
    csc: '123'
  });
  card.number.should.equal('4111111111111111');
};

test['Creating card without card number or CSC throws'] = function(exit) {
  var Card = daimyo.Card;

  assert.throws(function() {
    card = new Card({});
  }, 'Card number is required');

  assert.throws(function() {
    card = new Card({
      number: testCard.number
    });
  }, 'CSC is required');

  assert.throws(function() {
    card = new Card({
      csc: testCard.csc
    });
  }, 'Card number is required');

};

test['2-digit or 1-digit year converts to 4-digits'] = function(exit) {
  var Card = daimyo.Card;

  var card = new Card({
    number: testCard.number,
    csc: testCard.csc,
    year: '2' // Should convert to 2nd year of this decade
  });
  card.year.should.equal((Math.floor(new Date().getFullYear() / 10) * 10) + 2);

  card = new Card({
    number: testCard.number,
    csc: testCard.csc,
    year: '15' // Should convert to year 15 of current century
  });

  card.year.should.equal((Math.floor(new Date().getFullYear() / 100) * 100) + 15);
};

test['Year is normalized with setting year property'] = function(exit) {
  var Card = daimyo.Card;
  
  var card = new Card(testCard);
  card.year = '3';
  card.year.should.equal((Math.floor(new Date().getFullYear() / 10) * 10) + 3);
};

test['Cannot set invalid month'] = function(exit) {
  var Card = daimyo.Card;

  var card = new Card({
    number: testCard.number,
    csc: testCard.csc,
    month: '123'
  });
  should.not.exist(card.month);

  card.month = 'foo';
  should.not.exist(card.month);

  card.month = '13';
  should.not.exist(card.month);
};

test['Card validation'] = function(exit) {
  var Card = daimyo.Card;

  var card = new Card(testCard);

  card.should.respondTo('isValid');
  card.isValid().should.be.ok;

  card = new Card(bogusCard);
  card.isValid().should.not.be.ok;
};

test['Card expiration check'] = function(exit) {
  var Card = daimyo.Card;

  card = new Card(testCard);
  card.should.respondTo('isExpired');
  card.isExpired().should.not.be.ok;

  card = new Card(bogusCard);
  card.isExpired().should.be.ok;
};

test['Create method sets a token'] = function(exit) {
  var Card = daimyo.Card;
  var card = new Card(testCard);
  
  card.should.respondTo('create');

  card.create(function(err) {
    should.not.exist(err);
    card.token.should.match(/^[0-9a-f]{24}$/);
  });
};

test['Created card can load payment method data'] = function(exit) {
  var Card = daimyo.Card;
  var card = new Card(testCard);
  var card1;
  var token;
  
  card.should.respondTo('load');
  assert.throws(function() {
    card.load();
  }, 'Cannot load payment method without token');
  card.create(function(err) {
    token = card.token;
    card1 = new Card({token: token});
    card1.load(function(err) {
      should.not.exist(err);
      card1.should.have.property('method');
      card1.method.should.have.property('createdAt');
      card1.method.createdAt.should.be.instanceof(Date);
      card1.method.should.have.property('updatedAt');
      card1.method.updatedAt.should.be.instanceof(Date);
      card1.method.should.have.property('retained');
      card1.method.retained.should.equal(false);
      card1.method.should.have.property('redacted');
      card1.method.redacted.should.equal(false);
      card1.method.should.have.property('custom');
      card1.firstName.should.equal(testCard.firstName);
      card1.lastName.should.equal(testCard.lastName);
      card1.address1.should.equal(testCard.address1);
    });
  });
};

test['Create a bad payment method'] = function(exit) {
  var card = new daimyo.Card(bogusCard);

  function onLoad(err) {
    card.should.have.property('messages');
    card.messages.should.have.property('errors');
    card.messages.errors.should.have.property('number');
    card.messages.errors.number.should.contain(messages.str.en_US.INVALID_NUMBER);
    card.messages.errors.should.have.property('csc');
    card.messages.errors.csc.should.contain(messages.str.en_US.INVALID_CSC);
  }

  card.create(function(err) {
    card.load(onLoad);
  });
};

test['Card has _dirty property which lists changed fields'] = function(exit) {
  // Initially, all fields are dirty
  var Card = daimyo.Card;
  var card = new Card(testCard);
  var token;

  card.should.have.property('_dirty');
  card._dirty.should.not.be.empty;
  card._dirty.should.contain('number');
  card._dirty.should.contain('csc');
  card._dirty.should.contain('year');
  card._dirty.should.contain('month');
  card._dirty.should.contain('firstName');
  card._dirty.should.contain('lastName');
  card._dirty.should.contain('address1');
  card._dirty.should.contain('zip');

  card.create(function(err) {
    should.not.exist(err);
    card._dirty.should.be.empty;
    card.load(function(err) {
      should.not.exist(err);
      card._dirty.should.be.empty;
      card.year = '17';
      card._dirty.should.contain('year');
      card.month = '10';
      card._dirty.should.contain('month');
      card.firstName = 'Foom';
      card._dirty.should.contain('firstName');
    });
  });
};

test['Updating a modified card'] = function(exit) {
  var Card = daimyo.Card;
  var card;

  function onUpdate() {
    }

  card = new Card(testCard);
  card.create(function() {
    card.city.should.not.equal('Smallville');
    card.city = 'Smallville';
    card.month = '12';
    card._dirty.should.contain('city');
    card._dirty.should.contain('month');
    card.update(function(err) {
      card._dirty.should.be.empty;
      card.city.should.equal('Smallville');
      card.month.should.equal(12);
      card.should.have.property('method');
      card.method.should.have.property('createdAt');
      card.method.createdAt.should.be.instanceof(Date);
      card.method.should.have.property('updatedAt');
      card.method.updatedAt.should.be.instanceof(Date);
      card.method.should.have.property('retained');
      card.method.retained.should.equal(false);
      card.method.should.have.property('redacted');
      card.method.redacted.should.equal(false);
      card.method.should.have.property('custom');
      card.firstName.should.equal(testCard.firstName);
      card.lastName.should.equal(testCard.lastName);
      card.address1.should.equal(testCard.address1);
    });
  });
};

test['Retain card'] = function(exit) {
  var card = new daimyo.Card(testCard);

  card.create(function(err) {
    card.retain(function(err) {
      card.should.have.property('method');
      card.method.should.have.property('createdAt');
      card.method.createdAt.should.be.instanceof(Date);
      card.method.should.have.property('updatedAt');
      card.method.updatedAt.should.be.instanceof(Date);
      card.method.should.have.property('retained');
      card.method.retained.should.equal(true);
      card.method.should.have.property('redacted');
      card.method.redacted.should.equal(false);
      card.method.should.have.property('custom');
      card.firstName.should.equal(testCard.firstName);
      card.lastName.should.equal(testCard.lastName);
      card.address1.should.equal(testCard.address1);
    });
  });

};

test['Redact card'] = function(exit) {
  var card = new daimyo.Card(testCard);

  card.create(function(err) {
    card.retain(function(err) {
      card.method.retained.should.equal(true);
      card.method.redacted.should.equal(false);
      card.redact(function(err) {
        card.method.retained.should.equal(true);
        card.method.redacted.should.equal(true);
      });
    });
  });

};

test['Creating new transaction object throws if no type'] = function(exit) {
  var transaction;

  assert.throws(function() {
    transaction = new daimyo.Transaction({
      type: null, 
      data: {amount: 10}
    });
  });
};

test['Creating new transaction throws with missing data'] = function(exit) {
  var transaction;

  assert.throws(function() {
    transaction = new daimyo.Transaction({
      type: 'purchase',
      data: null
    });
  });
};

test['New transaction has a few extra properties'] = function(exit) {
  var transaction = new daimyo.Transaction({
    type: 'purchase',
    data: {amount: 10}
  });

  transaction.should.have.property('data');
  transaction.data.should.have.keys(['amount', 'type', 'currency']);
  transaction.data.type.should.equal('purchase');
  transaction.data.currency.should.equal(daimyo.option('currency'));
  transaction.should.have.property('path');
  transaction.should.respondTo('toXML');
  transaction.toXML().should.include.string('<amount>10</amount>');
};

test['Simple transactions do not set type and currency'] = function(exit) {
  var transaction = new daimyo.Transaction({
    type: 'void',
    transactionId: '111111111111111111111111',
    data: {}
  });

  transaction.data.should.not.have.property('currency');
  transaction.data.should.not.have.property('type');
};

test['Execute transaction'] = function(exit) {
  var transaction;

  function callback(err) {
    should.not.exist(err);
    transaction.should.have.property('receipt');
    transaction.receipt.should.have.property('success');
    transaction.receipt.success.should.equal(true);
    transaction.should.have.property('messages');
    transaction.messages.should.have.property('info');
    transaction.messages.info.should.have.property('transaction'); transaction.messages.info.transaction.should.contain('Success');
  }
  
  transaction = new daimyo.Transaction({
    type: 'purchase',
    data: {
      billingReference: '123',
      customerReference: '123',
      amount: 10
    }
  });

  // First we need a card
  var card = new daimyo.Card(sandboxValidCard);

  card.create(function(err) {
    // We have the token now.
    card.should.have.property('token');
    transaction.process(card, callback);
  });

};

test['Execute transaction with bad card'] = function(exit) {
  var transaction;

  function callback(err) {
    should.not.exist(err); // Failed transaction is not an error
    transaction.should.have.property('receipt');
    transaction.receipt.should.have.property('success');
    transaction.receipt.success.should.equal(false);
    transaction.should.have.property('messages');
    transaction.messages.should.have.property('errors');
    transaction.messages.errors.should.have.property('transaction');
    transaction.messages.errors.transaction.should.contain('Declined');
  }

  transaction = new daimyo.Transaction({
    type: 'purchase',
    data: {
      billingReference: '123',
      customerReference: '123',
      amount: 10
    }
  });
  
  var card = new daimyo.Card(sandboxInvalidCard);

  card.create(function(err) {
    // We have the token now.
    card.should.have.property('token');
    transaction.process(card, callback);
  });

};
