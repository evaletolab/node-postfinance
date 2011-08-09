/**
 * Daimyo - unit tests for the main Daimyo module
 * Copyright (c)2011, by Branko Vukelic.
 * Licensed under MIT license (see LICENSE)
 */

var assert = require('assert');
var should = require('should');
var getAdjustedDateparts = require('./helpers').getAdjustedDateparts;
var daimyo = require('../lib/daimyo.js');
var test = exports;
var testNonExpiredDate = getAdjustedDateparts(12); // One year in future
var testExpiredDate = getAdjustedDateparts(-12); // One year ago

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

  card.should.not.have.property('address2');
  card.should.not.have.property('city');
  card.should.not.have.property('state');

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

test['Card validation'] = function(exit) {
  var Card = daimyo.Card;

  card = new Card(testCard);

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
