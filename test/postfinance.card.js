/**
 * Daimyo - unit tests for the main Daimyo module
 * Copyright (c)2011, by Branko Vukelic.
 * Licensed under MIT license (see LICENSE)
 */

var assert = require('assert');
var should = require('should');
var getAdjustedDateparts = require('./fixtures/helpers').getAdjustedDateparts;


describe("postfinance.card", function(){

  var postfinance = require('../index.js');
  var config = require('../lib/config');
  var messages = require('../lib/messages');
  var test = exports;

  var testNonExpiredDate = getAdjustedDateparts(12); // One year in future
  var testExpiredDate = getAdjustedDateparts(-12); // One year ago
  var testSettings = {}


  testSettings.pspid = 'test';
  testSettings.apiUser='test1'
  testSettings.apiPassword = 'testabc';
  testSettings.shaSecret = '2345';
  testSettings.sandbox = false;
  testSettings.enabled = false; // Does not make any actual API calls if false
  testSettings.debug = false; // Enables *blocking* debug output to STDOUT


  before(function(done){    
    config.reset()
    done()
  });
  var card;

  var postfinanceCard = {
    //Credit
    paymentMethod: 'Postfinance card',
    email:'o@o.com',
    firstName: 'Foo',
    lastName: 'Bar',
    address1: '221 Foo st',
    address2: '', // blank
    city: 'genève', // blank
    zip: '1208',
    groupId:'groupXXXXXX', //
    orderId:'oidYYYY1',    // removed fields
    amount:123.00,         //
    custom:'hello world'
  };

  var testCard = {
    number: '5399999999999999', // MasterCard
    csc: '111',
    year: testNonExpiredDate[0].toString(),
    month: testNonExpiredDate[1].toString(),
    firstName: 'Foo',
    lastName: 'Bar',
    address1: '221 Foo st',
    address2: '', // blank
    city: '', // blank
    state: '', // blank
    zip: '1208'
  };

  var sandboxValidCard = {
    number: '4111-1111-1111-1111',
    csc: '123',
    year: testNonExpiredDate[0].toString(),
    month: testNonExpiredDate[1].toString()
    // No other extra data, this is only for testing transactions
  };

  var sandboxInvalidCard = {
    number: '4242-4242-4242-4242',
    csc: '123',
    year: testNonExpiredDate[0].toString(),
    month: testNonExpiredDate[1].toString()
    // No other extra data, this is only for testing transactions
  };

  var bogusCard = {
    number: '2420318231',
    csc: '14111',
    year: testExpiredDate[0].toString(),
    month: testExpiredDate[1].toString()
  };

  var testAlias={
    alias:"test1337895720979712",
    aliasUsage:"karibou payment"
  }


  it("Configure and lock configuration", function(done){
    testSettings.allowMultipleSetOption = false;
    postfinance.configure(testSettings);
    assert.throws(function() {
      postfinance.configure(testSettings);
    });
    assert.throws(function() {
      postfinance.option('debug', false);
    });

    done()
  });

  it("postfinance module has Card constructor", function(done){
    var Card;

    postfinance.should.have.property('Card');
    postfinance.Card.should.type('function');
    Card = postfinance.Card;
    done();
  });

  it("Prepare CC alias for Postfinance online form", function(done){
    this.timeout(20000);
    var Card = postfinance.Card;
    var card = new Card(sandboxValidCard);

    card.should.have.property('publishForEcommerce');

    card.publishForEcommerce(testAlias,function(err,res) {
      should.not.exist(err);
      // console.log('------------------>',res)
      done()
    });
  });

  it("Prepare PFCard alias for Postfinance", function(done){
    this.timeout(20000);
    var Card = postfinance.Card;
    var card = new Card(postfinanceCard);

    card.should.have.property('publishForEcommerce');

    card.publishForEcommerce(testAlias,function(err,res) {
      should.not.exist(err);
      should.not.exist(card.amount);

      res.body.PM.should.equal('Postfinance card')
      res.body.PSPID.should.equal('test')
      res.body.USERID.should.equal('test1')
      res.body.ORDERID.should.containEql('AS')
      res.body.AMOUNT.should.equal(100),
      res.body.EMAIL.should.equal('o@o.com')
      res.body.CN.should.equal('Foo Bar')
      res.body.OWNERADDRESS.should.equal('221 Foo st')
      res.body.OWNERCITY.should.equal('genève')
      res.body.OWNERZIP.should.equal('1208')
      res.body.COMPLUS.should.equal('"hello world"')

      // card format
      card.paymentMethod.should.equal('Postfinance card')
      card.orderId.should.containEql('AS')
      card.email.should.equal('o@o.com')
      card.firstName.should.equal('Foo')
      card.lastName.should.equal('Bar')
      card.address1.should.equal('221 Foo st')
      card.city.should.equal('genève')
      card.zip.should.equal('1208')
      card.custom.should.equal('hello world')


      done()
    });
  });



  it("Creating a new card", function(done){
    var Card = postfinance.Card,
        year=parseInt(testNonExpiredDate[0])-2000;

    card = new Card(testCard);

    card.should.have.property('number');
    card.number.should.equal(testCard.number);

    card.should.have.property('issuer');
    card.issuer.should.equal('MasterCard');

    card.should.have.property('year');
    card.year.should.equal(year);

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
    card.zip.should.equal('1208');

    var payload=card.getPayload()
    payload.PSPID.should.equal('test')
    payload.USERID.should.equal('test1')
    payload.PSWD.should.equal('testabc')
    payload.AMOUNT.should.equal(100)
    // build 3 digits date
    payload.ED.should.containEql((testNonExpiredDate[0]-2000+testNonExpiredDate[1]*100)+''),
    payload.CVC.should.equal('111')
    payload.CARDNO.should.equal('5399999999999999')
    payload.CN.should.equal('Foo Bar')
    payload.OWNERADDRESS.should.equal('221 Foo st')
    payload.OWNERZIP.should.equal('1208')

    done()
  });


  it("Creating a bogus card", function(done){
    var Card = postfinance.Card;

    card = new Card(bogusCard);

    card.should.have.property('number');
    card.number.should.equal(bogusCard.number);

    card.should.have.property('issuer');
    card.issuer.should.equal('Unknown');

    card.should.have.property('csc');
    card.csc.should.equal('14111');
    done()
  });

  it("Card number should be stripped of non-digit elements", function(done){
    card = new postfinance.Card({
      number: '4111-1111-1111-1111',
      csc: '123'
    });
    card.number.should.equal('4111111111111111');
    done()
  });

  it("Creating a card from his short representation", function(done){
    var Card = postfinance.Card;

    card = new Card({
      name:'Foo Bar Joe',
      number:'4111-1111-1111-1111',
      expiry:'0915',
      csc:'123'
    });

    card.should.have.property('number');
    card.number.should.equal('4111111111111111');

    card.should.have.property('issuer');
    card.issuer.should.equal('Visa');

    card.should.have.property('year');
    card.year.should.equal(2015);

    card.should.have.property('month');
    card.month.should.equal(9);

    card.should.have.property('firstName');
    card.firstName.should.equal('Foo');

    card.should.have.property('lastName');
    card.lastName.should.equal('Bar Joe');

    card.isExpired().should.equal(false);

    done()
  });

  it("Card with date as MM/YY", function(done){
    var Card = postfinance.Card;

    card = new Card({
      name:'Foo Bar Joe',
      number:'4111-1111-1111-1111',
      expiry:'09/15',
      csc:'123'
    });
    card.year.should.equal(2015);
    card.month.should.equal(9);
    card.isExpired().should.equal(false);
    done()
  });

  it("Card with date as MM/YYYY", function(done){
    var Card = postfinance.Card;

    card = new Card({
      name:'Foo Bar Joe',
      number:'4111-1111-1111-1111',
      expiry:'09/2015',
      csc:'123'
    });
    card.year.should.equal(15);
    card.month.should.equal(9);
    card.isExpired().should.equal(false);
    done()
  });



  it("Creating card without card number or CSC throws", function(done){
    var Card = postfinance.Card;

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
    done()
  });

  it("2-digit or 1-digit year converts to 4-digits", function(done){
    var Card = postfinance.Card;

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
    done()
  });

  it("Year is normalized with setting year property", function(done){
    var Card = postfinance.Card;
    
    var card = new Card(testCard);
    card.year = '3';
    card.year.should.equal((Math.floor(new Date().getFullYear() / 10) * 10) + 3);
    done()
  });

  it("Cannot set invalid month", function(done){
    var Card = postfinance.Card;

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
    done()
  });

  it("Card validation", function(done){
    var Card = postfinance.Card;

    var card = new Card(testCard);

    card.should.have.property('isValid');
    card.isValid().should.be.ok;

    card = new Card(bogusCard);
    card.isValid().should.not.be.ok;
    done()
  });

  it("Card signature", function(done){
    var Card = postfinance.Card;

    var card = new Card(testCard);

    card.should.have.property('isValid');
    card.getPayload();
    done()
  });


 
  it("Card hidden number VISA", function(done){
    var Card = postfinance.Card;
    card = new Card(sandboxValidCard);
    card.hiddenNumber.should.equal('41xxxxxxxxxx1111')
    done()
  });

  it("Card hidden number MC", function(done){
    var Card = postfinance.Card;
    card = new Card(testCard);
    card.hiddenNumber.should.equal('53xxxxxxxxxx9999')
    done()
  });


  it("Card expiration check", function(done){
    var Card = postfinance.Card;

    card = new Card(testCard);
    card.should.have.property('isExpired');
    card.isExpired().should.not.be.ok;

    card = new Card(bogusCard);
    card.isExpired().should.be.ok;
    done()
  });



});