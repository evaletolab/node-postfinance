/**
 * Daimyo - unit tests for the main Daimyo module
 * Copyright (c)2011, by Branko Vukelic.
 * Licensed under MIT license (see LICENSE)
 */

var assert = require('assert');
var should = require('should');
var getAdjustedDateparts = require('./fixtures/helpers').getAdjustedDateparts;

describe("postfinance.cancel", function(){
  var postfinance = require('../index.js');
  var messages = require('../lib/messages');
  var config=require('../lib/config')
  var testNonExpiredDate = getAdjustedDateparts(12); // One year in future
  var testExpiredDate = getAdjustedDateparts(-12); // One year ago
  var testSettings


  before(function(done){
    testSettings = require('../config-pf');
    testSettings.debug = false; // Enables *blocking* debug output to STDOUT
    config.reset()
    done()
  });
  var card;

  var testAlias={
    alias:"test1337895720979712",
    aliasUsage:"karibou payment"
  }


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

  it("Configure and lock configuration", function(done){
    testSettings.allowMultipleSetOption = false;

    postfinance.configure(testSettings);

    done()
  });


  it("Create alias", function(done){
    this.timeout(20000);
    var Card = postfinance.Card;
    var card = new Card(testCard);//sandboxValidCard

    card.should.have.property('publish');

    card.publish(testAlias,function(err,res) {
      should.not.exist(err);
      card.alias.should.equal(testAlias.alias);
      card.should.have.property('payId');
      done()
    });
  });


  it("cancel transaction is not possible on transaction with status payed", function(done){
    this.timeout(20000)
    var transaction;


    var transaction = new postfinance.Transaction({
      operation: 'purchase',
      amount:134.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });


    // First we need a card
    var card = new postfinance.Card(testAlias);

    transaction.process(card, function(err,res){
      should.not.exist(err);
      transaction.cancel(card, function(err,res){
        should.exist(err);
        err.code.should.equal(50001127)
        done()
      });
    });


  });

  it("Refund transaction with status purchase (9 ask payment) ", function(done){
    this.timeout(20000)
    var transaction;


    var transaction = new postfinance.Transaction({
      operation: 'purchase',
      amount:134.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });

    // First we need a card
    var card = new postfinance.Card(testAlias);

    transaction.process(card, function(err,res){
      should.not.exist(err);
      transaction.refund(card, function(err,res){
        should.not.exist(err);
        //  paiem. ID
        //    Réf march, Statut, Autorisation, Date paiement, Total, Fichier / ligne, NCID,
        //    Erreur,  Action,  Accept in, Méth paiement, num card/cpt
        // check BRAND
        // check CARDNO OR ALIAS
        // check transaction.date
        // check STATUS
        // check ACCEPTANCE
        // check ECI (7)
        done()
      });
    });


  });

it("Ask authorisation for 130CHF, capture 120CHF and refund 120CHF", function(done){
    this.timeout(20000)
    var transaction;


    transaction = new postfinance.Transaction({
      operation: 'authorize',
      amount:130.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });

    var card = new postfinance.Card(testAlias);

    transaction.process(card, function(err,res){
      should.not.exist(err);
      transaction.update({
        operation:'capture',
        amount:120.00
      });

      transaction.process(card, function(err,res){
        should.not.exist(err);
        // console.log('-------------- capture',res.body)
        transaction.refund(card, function(err,res){
          should.not.exist(err);        
          // console.log('-------------- refund',res.body)
          done()
        });

      });
    });
  });


  it.skip("Refund transaction with alias", function(done){
    this.timeout(20000)
    var transaction;


    var transaction = new postfinance.Transaction({
      operation: 'purchase',
      amount:134.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });

    // First we need a card
    var card = new postfinance.Card(testAlias);

    transaction.process(card, function(err,res){
      should.not.exist(err);
      transaction.cancel(card, function(err,res){
        console.log("debug",err)
        should.not.exist(err);
        done()
      });
    });


  });

  it.skip("Remove an alias", function(done){
    this.timeout(20000);
    // First we need a card
    var card = new postfinance.Card(testAlias);

    card.should.have.property('redact');

    card.redact(function(err,res) {
      should.not.exist(err);
      done()
    });
  });

});
