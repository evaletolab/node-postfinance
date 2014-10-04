/**
 * Daimyo - unit tests for the main Daimyo module
 * Copyright (c)2011, by Branko Vukelic.
 * Licensed under MIT license (see LICENSE)
 */

var assert = require('assert');
var should = require('should');
var xmlutils = require('../lib/xmlutils');
var messages = require('../lib/messages');

describe("postfinance.xmlutil", function(){


  before(function(done){
    done()
  });

  var queryResponse='<?xml version="1.0"?>\
<ncresponse      \
orderID="" \
PAYID="0" \
NCSTATUS="5" \
NCERROR="50001111" \
ACCEPTANCE="" \
STATUS="0" \
amount="" \
currency="CHF" \
PM="" \
BRAND="" \
ALIAS="testalias" \
NCERRORPLUS=" no orderid"> \
</ncresponse>'


  it("parse query queryResponse", function(done){
    var body=xmlutils.getAttributesXML(queryResponse,'ncresponse');

    body.should.not.have.property('orderID');
    body.PAYID.should.equal('0')
    body.NCERROR.should.equal('50001111')

    done();
  });
});