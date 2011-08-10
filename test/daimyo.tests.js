/**
 * Daimyo - unit tests for the main Daimyo module
 * Copyright (c)2011, by Branko Vukelic.
 * Licensed under MIT license (see LICENSE)
 */

var assert = require('assert');
var should = require('should');
var getAdjustedDateparts = require('./helpers').getAdjustedDateparts;
var daimyo = require('../index.js');
var test = exports;

var testNonExpiredDate = getAdjustedDateparts(12); // One year in future
var testExpiredDate = getAdjustedDateparts(-12); // One year ago
var testSettings = require('./config');

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

var bogusCard = {
  number: '2420318231',
  csc: '111',
  year: testExpiredDate[0].toString(),
  month: testExpiredDate[1].toString()
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
  card.csc.should.equal('111');

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

  var card = new Card({
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
    month: '123',
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

  // Configure with test configuration
  // YOU NEED TO MODIFY/CREATE test/config.js (SEE README.mkd)
  daimyo.configure(testSettings);
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
      card1.should.have.property('messages');
      card1.firstName.should.equal(testCard.firstName);
      card1.lastName.should.equal(testCard.lastName);
      card1.address1.should.equal(testCard.address1);
    });
  });
};

test['Card has _dirty property which lists changed fields'] = function(exit) {
  // Initially, all fields are dirty
  var Card = daimyo.Card;
  var card = new Card(testCard);
  var token;

  console.log(card.month, testCard.month);

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

