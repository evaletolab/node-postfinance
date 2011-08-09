/**
 * Daimyo - unit tests for the main Daimyo module
 * Copyright (c)2011, by Branko Vukelic.
 * Licensed under MIT license (see LICENSE)
 */

var assert = require('assert');
var should = require('should');
var daimyo = require('../lib/daimyo.js');
var test = exports;

var testCard = {
  number: '5555555555554444', // MasterCard
  csc: '111',
  year: '2012',
  month: '11',
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
  year: '2011',
  month: '02'
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
  card.year.should.equal(2012);

  card.should.have.property('month');
  card.month.should.equal(11);

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

