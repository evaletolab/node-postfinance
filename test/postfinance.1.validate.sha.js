/**
 * unit tests for the main postfinance module
 * psp error: http://docs.openstream.ch/payment-provider/postfinance-error-messages/
 */

var assert = require('assert');
var should = require('should');
var getAdjustedDateparts = require('./fixtures/helpers').getAdjustedDateparts;

describe("postfinance.sha", function(){
  var postfinance = require('../index.js');
  var messages = require('../lib/messages');
  var config=require('../lib/config')
  var testNonExpiredDate = getAdjustedDateparts(12); // One year in future
  var testExpiredDate = getAdjustedDateparts(-12); // One year ago

  var testSettings;



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
    // firstName: 'Foô',
    lastName: 'Bar',
    address1: '221 Foo st',
    address2: '', // blank
    city: '', // blank
    state: '', // blank
    zip: '1208'
  };


  var pspWebhook={ 
    orderID: 'AS1422979042226',
    currency: 'CHF',
    amount: '1',
    PM: 'PostFinance Card',
    ACCEPTANCE: 'test123',
    STATUS: '5',
    CARDNO: '**-XXXX-49',
    ALIAS: '1987839941297952',
    ED: '0117',
    CN: 'olivier evalet',
    TRXDATE: '02/03/15',
    PAYID: '39100489',
    NCERROR: '0',
    BRAND: 'PostFinance Card',
    IPCTY: 'CH',
    CCCTY: '99',
    ECI: '7',
    CVCCheck: 'NO',
    AAVCheck: 'NO',
    VC: '',
    AAVADDRESS: 'NO',
    IP: '84.227.169.49',
    SHASIGN: 'B541784E4823892FEB14FB086906A07CD3632CC6D12302BAB9D0CE70276774CF' 
  }

  var utf8hash={
    str:'ALIAS=19878399412979521testpostfinanceALIASUSAGE=Karibou payment1testpostfinanceAMOUNT=1001testpostfinanceBGCOLOR=#F2F4F21testpostfinanceCN=oliviêr evalet1testpostfinanceCURRENCY=CHF1testpostfinanceEMAIL=evaleto@gmail.com1testpostfinanceOPERATION=RES1testpostfinanceORDERID=AS14229784215701testpostfinanceOWNERZIP=12081testpostfinancePM=postfinance card1testpostfinancePSPID=TEMPkaribou1testpostfinanceTITLE=Enregistrement de votre carte chez Postfinance1testpostfinanceTP=http://localhost:4000/v1/psp/std1testpostfinance',
    hash:'24AD4DBE42F8AA52D4DC12B0A8AF7D03E761CD10951A63FAA8578D2A397ED692'
  }
  var hash={
    str:'ALIAS=19878399412979521testpostfinanceALIASUSAGE=Karibou payment1testpostfinanceAMOUNT=1001testpostfinanceBGCOLOR=#F2F4F21testpostfinanceCN=olivier evalet1testpostfinanceCURRENCY=CHF1testpostfinanceEMAIL=evaleto@gmail.com1testpostfinanceOPERATION=RES1testpostfinanceORDERID=AS14229784215701testpostfinanceOWNERZIP=12081testpostfinancePM=postfinance card1testpostfinancePSPID=TEMPkaribou1testpostfinanceTITLE=Enregistrement de votre carte chez Postfinance1testpostfinanceTP=http://localhost:4000/v1/psp/std1testpostfinance',
    hash:'E72EB241416795C9FB53B38329788C98A69C491E5AFBC47180E0B8FFBE9EB03E'    
  }

  it("Configure and lock configuration", function(done){
    testSettings.allowMultipleSetOption = false;

    postfinance.configure(testSettings);

    done()
  });


  it("validate SHASIGN from psp/webhook  ", function(done){
    this.timeout(20000);
    postfinance.isValidSha(pspWebhook).should.be.true
    done()

  });

  it("validate ascii sha  ", function(done){
    var sha=require('crypto').
      createHash('sha256').update(hash.str,'utf8').digest("hex").toUpperCase()    
    sha.should.equal(hash.hash)
    done()
  });

  it("validate utf8 sha  ", function(done){
    var sha=require('crypto').
      createHash('sha256').update(utf8hash.str,'utf8').digest("hex").toUpperCase()    
    sha.should.equal(utf8hash.hash)
    done()
  });


});
