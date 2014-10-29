/**
 * Daimyo - unit tests for configuration module
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var config = require('../lib/config');
var PostFinanceError = require('../lib/error');
var helpers = require('./fixtures/helpers');
var assert = require('assert');
var should = require('should');
var test = exports;



describe("error", function(){


  before(function(done){
    done()
  });

  // START TESTING
  it("distant PostFinanceError", function(done){
    var attrs={
      "VERSION":"1.0",
      "ORDERID":"AS1414484067612",
      "PAYID":"0",
      "NCSTATUS":"5",
      "NCERROR":"50001111",
      "STATUS":"0",
      "CURRENCY":"CHF",
      "ALIAS":"1987836748396784",
      "NCERRORPLUS":"The data you entered is not correct. Please retry."
    }
    var error=new PostFinanceError('gateway', attrs.STATUS, attrs.NCERROR, attrs.NCERRORPLUS);
    error.message.should.containEql('The data you entered is not correct. Please retry.')
    done()
  });

  it("local PostFinanceError", function(done){
    var error=new PostFinanceError(
      'system', 
      'Currency not allowed', 
      '$'
    )
    error.message.should.containEql('Currency not allowed')
    done()
  });
});