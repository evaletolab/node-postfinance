/**
 * unit tests for the main postfinance module
 * psp error: http://docs.openstream.ch/payment-provider/postfinance-error-messages/
 */

var assert = require('assert');
var should = require('should');
var getAdjustedDateparts = require('./fixtures/helpers').getAdjustedDateparts;

describe("postfinance.create", function(){
  var postfinance = require('../index.js');
  var messages = require('../lib/messages');
  var config=require('../lib/config')
  var testNonExpiredDate = getAdjustedDateparts(12); // One year in future
  var testExpiredDate = getAdjustedDateparts(-12); // One year ago

  var testSettings;



  before(function(done){
    testSettings = require('../config-pf');
    testSettings.debug = true; // Enables *blocking* debug output to STDOUT
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
    email:'foo@bar.io',
    firstName: 'Foo',
    // firstName: 'Foô',
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
    number: '4242-4242-4242-424',
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


  it("Configure and lock configuration", function(done){
    testSettings.allowMultipleSetOption = false;

    postfinance.configure(testSettings);

    done()
  });





  it("Create an alias", function(done){
    this.timeout(20000);
    var Card = postfinance.Card;
    var card = new Card(testCard);

    card.should.have.property('publish');

    card.publish(testAlias,function(err,res) {
      process.exit(0)
      should.not.exist(err);
      card.alias.should.equal(testAlias.alias);
      card.should.have.property('payId');
      done()
    });
  });


  it.skip("Alias can load payment method", function(done){
    this.timeout(20000);
    var Card = postfinance.Card;
    var card = new Card(testAlias);

    card.should.have.property('load');
    card.load(function(err) {
      should.not.exist(err);
      card.number.should.equal('XXXXXXXXXXXX9999')
      card.issuer.should.equal('MasterCard')
      card.month.should.equal(10)
      card.year.should.equal(2015)
      done()
    });
  });




  it.skip("Card has _dirty property which lists changed fields", function(done){
    // Initially, all fields are dirty
    var Card = postfinance.Card;
    var card = new Card(testCard);
    var alias;

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

    card.createAlias(testAlias,function(err) {
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
    done()
  });

  it.skip("Updating a modified card", function(done){
    var Card = postfinance.Card;
    var card;

    function onUpdate() {
      }

    card = new Card(testCard);
    card.createAlias(testAlias,function() {
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
        card.firstName.should.equal(testCard.firstName);
        card.lastName.should.equal(testCard.lastName);
        card.address1.should.equal(testCard.address1);
      });
    });
    done()
  });

  it.skip("Retain card", function(done){
    var card = new postfinance.Card(testCard);
    done()
  });

  it.skip("Redact card", function(done){
    var card = new postfinance.Card(testCard);
    done()
  });

  it("Creating new transaction object throws if no operation", function(done){
    var transaction;

    assert.throws(function() {
      transaction = new postfinance.Transaction({
        operation: null,
        amount: 10
      });
    });
    done()
  });

  it("Creating new transaction throws with missing orderid", function(done){
    var transaction;

    assert.throws(function() {
      transaction = new postfinance.Transaction({
        operation: 'purchase',
        amount:10
      });
    });
    done()
  });


  it("Maintenance of transaction throws with missing payId", function(done){
    var transaction;
    assert.throws(function() {
      transaction = new postfinance.Transaction({
        operation: 'cancel',
        amount:10
      });
    });
    done()
  });

  it("using wrong serialized string throws an error", function(done){
    this.timeout(20000)
    var transaction, transaction2;
    assert.throws(function() {
      transaction = new postfinance.Transaction("");
    });
    done()
  });

  it("using incomplet serialized string throws an error", function(done){
    this.timeout(20000)
    var transaction, transaction2;
    assert.throws(function() {
      transaction = new postfinance.Transaction("{}");
    });
    done()
  });

  it("payment above the max amount throws an error", function(done){
    this.timeout(20000)
    var transaction, transaction2;
    assert.throws(function() {
      transaction = new postfinance.Transaction({
        operation: 'purchase',
        orderId:'abc',
        amount: 600
      });
    });
    done()
  });



  it("New transaction has a few extra properties", function(done){
    var transaction = new postfinance.Transaction({
      operation: 'purchase',
      orderId:'abc',
      amount: 10
    });

    transaction.should.have.property('operation');
    transaction.operation.should.equal('purchase');
    transaction.should.have.property('data');
    done()
  });

  it("Simple maintenance transactions do not set amount", function(done){
    var transaction = new postfinance.Transaction({
      operation: 'cancel',
      payId:'abc'
    });

    transaction.data.should.not.have.property('currency');
    transaction.data.should.not.have.property('operation');
    done()
  });

  it("Ask authorisation for 130CHF and capture 120CHF get success", function(done){
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
        done()
      });
    });
  });

  it("2 steps payment by using serialized transaction", function(done){
    this.timeout(20000)
    var transaction1, transaction2;


    transaction1 = new postfinance.Transaction({
      operation: 'authorize',
      amount:130.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });

    var card = new postfinance.Card(testAlias);

    transaction1.process(card, function(err,res){
      should.not.exist(err);
      transaction2=new postfinance.Transaction(transaction1.toJSON())
      transaction2.update({
        operation:'capture',
        amount:120.00
      });

      transaction2.process(card, function(err,res){
        should.not.exist(err);
        done()
      });
    });
  });


  it("Ask authorisation for 100CHF and capture 130CHF get an error", function(done){
    this.timeout(20000)
    var transaction;


    transaction = new postfinance.Transaction({
      operation: 'authorize',
      amount:100.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });

    var card = new postfinance.Card(testAlias);

    transaction.process(card, function(err,res){
      should.not.exist(err);

      //
      // update the saved transaction
      transaction.update({
        operation:'capture',
        amount:134.00
      });

      transaction.process(card, function(err,res){
        should.exist(err);
        err.code.should.equal(50001126)
        done()
      });
    });
  });

  it("Execute transaction (purchase) with alias", function(done){
    this.timeout(20000)
    var transaction;


    transaction = new postfinance.Transaction({
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



  it("Execute transaction with bad card", function(done){
    this.timeout(20000)
    var transaction;


    transaction = new postfinance.Transaction({
      operation: 'purchase',
      amount:134.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });

    var card = new postfinance.Card(bogusCard);

    transaction.process(card, function(err,res){
      should.exist(err);
      // Numéro de carte incorrect ou incompatible
      err.code.should.equal(50001111)
      done()
    });
  });

  it("Execute transaction with bogus card", function(done){
    this.timeout(20000)
    var transaction;


    transaction = new postfinance.Transaction({
      operation: 'purchase',
      amount:134.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });

    var card = new postfinance.Card(sandboxInvalidCard);

    transaction.process(card, function(err,res){
      should.exist(err);
      // Numéro de carte incorrect ou incompatible
      err.code.should.equal(50001054)
      done()
    });
  });


  it("Using transactions with wrong currency", function(done){
    var transaction;

    this.timeout(20000)
    var transaction;

    transaction = new postfinance.Transaction({
      operation: 'purchase',
      amount:134.00,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014',
      currency:'USD'
    });

    var card = new postfinance.Card(sandboxValidCard);

    transaction.process(card, function(err,res){
      should.exist(err);
      err.message.should.equal('Currency not allowed')
      done()
    });
  });



  it("Remove an alias", function(done){
    this.timeout(20000);
    // First we need a card
    var card = new postfinance.Card(testAlias);

    card.should.have.property('redact');

    card.redact(function(err,res) {
      // ORDERID="00123"
      // PAYID="35562138"
      // NCSTATUS="0"
      // NCERROR="0"
      // ACCEPTANCE="test123"
      // STATUS="5"
      // IPCTY="99"
      // CCCTY="US"
      // ECI="7"
      // CVCCheck="NO"
      // AAVCheck="NO"
      // VC="NO"
      // amount="1" currency="CHF" PM="CreditCard" BRAND="MasterCard"
      // ALIAS="testalias"
      // NCERRORPLUS="!"
      should.not.exist(err);
      done()
    });
  });

});
