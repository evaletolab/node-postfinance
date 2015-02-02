/**
 * #postfinance
 *
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * Core Daimyo objects and functions. This module contains the core Daimyo API,
 * which is actually used by your application.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var config = require('./config');
var debug = config.debug;
var check = require('./check');
var PostFinanceError = require('./error');
var authpost = require('./authpost');
var xmlutils = require('./xmlutils');
var messages = require('./messages');
var aliasRe = /^[0-9a-f]{24}$/;
var postfinance = exports;




/**
 * ## postfinance.Card(opts)
 * *Creates a new payment method instance*
 *
 * The payment method options can be either a single alias:
 * - _alias_: Payment method alias
 *
 * or full credit card details:
 *
 *  + _number_: Credit card number
 *  + _csc_: Card security code
 *  + _year_: Expiration year
 *  + _month_: Expiration month
 *  + _firstName_: Card holder's first name
 *  + _lastName_: Card holder's last name
 *  + _address1_: Address line 1
 *  + _address2_: Address line 2
 *  + _city_: City
 *  + _state_: State
 *  + _zip_: Zip code
 *  + _custom_: Any custom object (will be stored as JSON, so use
 *    JSON-serializable data)
 *
 * If you supply both alias, and card details, alias will take presedence, and
 * credit card details will be completely ignored.
 *
 * The constructor will refuse to accept credit card details if `number` and/or
 * `csc` properties are missing. An error will be thrown in such cases.
 *
 * @param {Object} opts Payment method options
 * @constructor
 */
function Card(opts) {
  var self = this;

  // Add accessors in a close to prevent tampering
  (function(self) {
    // This property contains the original/initial values of all fields
    // Do not motify this object directly. Use _dirty setter.
    var originalValues = {
      number: undefined,
      csc: undefined,
      year: undefined,
      month: undefined,
      firstName: '',
      lastName: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      paymentMethod:'',
      custom: undefined
    };

    // Update _originalValues keys if matching keys are found in object argument
    self.__defineSetter__('_dirty', function(object) {
      Object.keys(originalValues).forEach(function(field) {
        if (object[field]) { originalValues[field] = object[field]; }
      });
    });

    // Check fields for dirtiness and return the names of dirty fields as Array
    self.__defineGetter__('_dirty', function() {
      var dirtyFields = [];

      // Check all fields in _originalValues and determine the dirty fields
      Object.keys(originalValues).forEach(function(field) {
        if (self[field] !== originalValues[field]) {
          dirtyFields.push(field);
        }
      });

      return dirtyFields;
    });

    // Resets dirty fields
    self._resetDirty = function() {
      var self = this;
      self._dirty = {
        number: self.number,
        csc: self.csc,
        paymentMethod:self.paymentMethod,
        year: self.year,
        month: self.month,
        firstName: self.firstName,
        lastName: self.lastName,
        address1: self.address1,
        address2: self.address2,
        city: self.city,
        state: self.state,
        zip: self.zip
      };
    };

  }(self));

  // Setters and getters for `year`, `month`, and `number` properties
  (function(self, check) {

    // Original values
    var yearVal;
    var monthVal;
    var numberVal;
    var custVal;

    // Helper for year normalization
    function normalizeYear(order, year) {
      return (Math.floor(new Date().getFullYear() / order) * order) + year;
    }

    self.__defineSetter__('year', function(year) {
      if (!year) { return; }

      year = parseInt(year, 10);
      if (year < 10) {
        yearVal = normalizeYear(10, year);
      } else if (year >= 10 && year < 100) {
        yearVal = normalizeYear(100, year);
      } else if (year >= 2000 && year < 2050){
        yearVal = parseInt(year)-2000;
      } else {
        yearVal = year;
      }
    });

    self.__defineGetter__('year', function() {
      return yearVal;
    });

    self.__defineSetter__('month', function(month) {
      month = parseInt(month, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        monthVal = null;
      } else {
        monthVal = month;
      }

    });

    self.__defineGetter__('month', function() {
      return monthVal;
    });

    self.__defineSetter__('number', function(value) {
      if(self.alias){
        numberVal=value;
        return
      }
      numberVal = check.extractDigits(value);
      self.issuer = check.getIssuer(value);
      self.hiddenNumber = check.getHiddenNumber(value);
    });

    self.__defineGetter__('number', function() {
      return numberVal;
    });

    self.__defineSetter__('custom', function(value) {
      if (!value) {
        return;
      }
      try {
        custVal = JSON.stringify(value);
      } catch(e) { /* This always fails silently */ }
    });

    self.__defineGetter__('custom', function() {
      try {
        return JSON.parse(custVal);
      } catch(e) { /* Fail silently */ }
    });

    self.__defineGetter__('customJSON', function() {
      return custVal;
    });

  }(self, check));

  // Process the options
  if (opts) {
    if (typeof opts.alias !== 'undefined') {
      // if (!aliasRe.test(opts.alias)) {
      //   throw new PostFinanceError('system', 'Invalid alias', null);
      // }

      debug('Using payment alias instead of credit card details.');
      self.alias = opts.alias;
      self.aliasUsage = opts.aliasUsage||'';
      self.orderId=opts.orderId||'AS'+Date.now(); // automatic order on alias creation
      self.payId=opts.payId||'';

      //
      // in this case we prepare a payment form
    } else if(opts.paymentMethod){
      debug('Using secure online postfinance form.');
      if(config.option('pmlist').indexOf(opts.paymentMethod.toLowerCase())===-1){
        throw new PostFinanceError('system', 'payment method is not valid', opts.paymentMethod);
      }

      self.paymentMethod=opts.paymentMethod;
      self.issuer=opts.paymentMethod
      // if we have a unique string for names
      if(opts.name){
        var names=opts.name.split(' ');
        self.firstName = names[0];
        self.lastName = names.slice(1,names.length).join(' ');
      }else{
        self.firstName = opts.firstName || '';
        self.lastName = opts.lastName || '';
      }
      self.email=opts.email||'';
      self.address1 = opts.address1 || '';
      self.address2 = opts.address2 || '';
      self.city = opts.city || '';
      self.state = opts.state || '';
      self.zip = opts.zip || '';
      self.custom = opts.custom;

    } else {
      debug('Using credit card details.');
      self.paymentMethod='CreditCard'; //==> config.pmlist[0]
      self.number = opts.number;
      self.csc = opts.csc;

      // Card number and CSC are required
      if (!self.number) {
        throw new PostFinanceError('system', 'Card number is required', null);
      }
      if (!self.csc) {
        throw new PostFinanceError('system', 'CSC is required', null);
      }

      // if we have a unique string for names
      if(opts.name){
        var names=opts.name.split(' ');
        self.firstName = names[0];
        self.lastName = names.slice(1,names.length).join(' ');
      }else{
        self.firstName = opts.firstName || '';
        self.lastName = opts.lastName || '';
      }

      // if we have a unique string for the date
      if(opts.expiry){
        // char split date
        var dates=opts.expiry.trim().split(/[\/ -]/)
        if(dates.length===2){
          self.month=parseInt(dates[0],10)
          self.year=parseInt(dates[1]);
        }else{
        // 4 digits date
          if(opts.expiry.length!==4) throw new PostFinanceError('system', 'Date is not well formed "'+opts.expiry+'"', null);
          self.month=parseInt(opts.expiry.substring(0,2),10)
          self.year=parseInt(opts.expiry.substring(2,4));
        }
      }else {
        self.year = opts.year;
        self.month = parseInt(opts.month, 10);
      }

      self.address1 = opts.address1 || '';
      self.address2 = opts.address2 || '';
      self.city = opts.city || '';
      self.state = opts.state || '';
      self.zip = opts.zip || '';
      self.custom = opts.custom;

      // Set card issuer
      self.issuer = check.getIssuer(self.number) || '';
    }
  }
}

/**
 * ## postfinance.Card.isValid()
 * *Validate the card data*
 *
 * This method validates the correctness of the card number and CSC. It uses
 * the industry-standard Luhn Mod-10 check to ensure that the card number's
 * checksum is correct. It also makes sure that the CSC has the correct number
 * of digits (currently, AMEX cards have 4-digit CSC, while others use 3
 * digits).
 *
 * Note that the card may still fail to clear for any number of reasons. The
 * same check as this one is performed in the Samurai gateway, as well, however
 * if you create payment methods using server-to-server requests, rather than
 * letting Samurai create payment methods by submitting the payment form
 * directly to Samurai, then this can speed up processing as you can trap
 * some common errors without sending a request to Samurai.
 *
 * @returns {Boolean} Validation result
 */
Card.prototype.isValid = function() {
  if (!check.mod10check(this.number)) {
    return false;
  }

  if (!check.cscCheck(this.number, this.csc)) {
    return false;
  }

  return true;f
};

/**
 * ## postfinance.Card.isExpired()
 * Checks the card expiration year/month
 *
 * If the year and month are not specified, the check will return `true`.
 *
 * This method does _not_ correct the expiration year/month.
 *
 * You should be aware that correcting the expiration year/month by setting
 * them to a future date is acceptable practice, and banks will _not_ decline
 * a card based on expiration year/month. If the card fails this test, you
 * should manually forward the expiration date to increase the chance of the
 * transaction succeeding.
 *
 * Note that the same check will be performed in Samurai gateway, but it is
 * more efficient to do it yourself if you are not using the transparent
 * redirect method as it saves at least one request.
 *
 * @returns {Boolean} Check result
 */
Card.prototype.isExpired = function() {
  var expYear = parseInt(new Date().getFullYear())-2000;
  var expMonth = new Date().getMonth() + 1; // 0-indexed

  if (!this.year || !this.month) { return true; }

  // Expired card should not be last month this year or older
  if (this.year < expYear) { return true; }
  if (this.year === expYear && this.month < expMonth) { return true; }

  return false;
};

/**
 * ## postfinance.Card.getPayload()
 * Construct and sign payload data from current Card
 */
Card.prototype.getPayload = function(options, withHmac) {


  var paymentData = {
    /* mandatory fields for api */
    'USERID': config.option('apiUser'),
    'ORDERID':this.orderId||'',
    /* mandatory fields */
    'PSPID': config.option('pspid'),
    'PSWD': config.option('apiPassword'),
    'AMOUNT': (this.amount*100)||100,
    'CURRENCY': config.option('currency'),
    'CARDNO': this.number || '',
    'CVC': this.csc||'',
    'SHASIGN': '',
    'COMPLUS': this.custom&&JSON.stringify(this.custom) || '',
    /*operations
      RES: request auth,
      SAL:riquest direct sale,
      RFD:refund */
    'OPERATION': config.option('operation'),
    'ALIAS':this.alias||undefined,
    'ALIASUSAGE':this.aliasUsage||undefined,
    /* want to create an alias */
    // 'ALIAS': this.alias,
    /*secondary field*/
    'PM':this.paymentMethod||'',
    'LANGUAGE': config.option('lang'),
    'EMAIL':this.email||'',
    'OWNERZIP':this.zip,
    'OWNERCITY':this.city,
    'OWNERADDRESS':this.address1||'',
    'PARAMPLUS':this.paramplus||'',
    'CREDITCODE':this.creditcode||'',
    'GLOBORDERID':this.groupId||'',
    'PAYID':this.payId||''
  };

  // case of name
  if(this.firstName && this.lastName){
    paymentData.CN=this.firstName+' '+this.lastName
  }

  // case of date
  if(this.month && this.year){
    paymentData.ED= (("0" + (this.month)).slice(-2)||'')+''+(this.year||'');
  }

  // merge optional fields
  // constraint authorized fields
  var constraintFields=['orderId','PAYID','payId','GLOBORDERID','email','OPERATION','amount','com','alias','aliasUsage']
  if(options){

    Object.keys(options).forEach(function(key){
      if(constraintFields.indexOf(key)==-1){
        throw new PostFinanceError('system', 'Error preparing payment request', 'unauthorized field :'+key);
      }
      if(key==='amount'){
        paymentData['AMOUNT']=options.amount*100;
        return;
      }

      if(['COM','CUSTOM'].indexOf(key.toUpperCase())!==-1 ){
        paymentData[key.toUpperCase()]=JSON.stringify(options[key])
        return;
      }
      paymentData[key.toUpperCase()]=options[key]
    })
  }


  Object.keys(paymentData).sort().forEach(function(key){
    if(!paymentData[key] || (typeof paymentData[key]==='string' && paymentData[key].length===0))
      delete(paymentData[key])
  })
  // sign the content
  this.signIn(paymentData,withHmac);


  debug("postfinance tx data"+JSON.stringify(paymentData))

  return (paymentData)
}


/**
 * ## postfinance.Card.signIn(paymentData)
 * *to sign postfinance payment with SHA
 * 1) sort paymendData keys (+alpha)
 * 2) stringify with this format KEY=VALUE+SECRET
 * 3) sign
 */
Card.prototype.signIn=function(paymentData,withHmac){
  var postfinanceStr="", secret=config.option('shaSecret'), append=secret;

  // configure sha without secret
  if(!config.option('shaWithSecret'))
    append=''

  Object.keys(paymentData).sort().forEach(function(key){
    if(key.toUpperCase()==='SHASIGN'){
      return;
    }
    postfinanceStr+=key+'='+paymentData[key]+append
  })

  if(withHmac){
    paymentData.SHASIGN=require('crypto').
      createHmac('sha256',secret).update(postfinanceStr).digest("hex").toUpperCase()
  }else{
    paymentData.SHASIGN=require('crypto').
      createHash('sha256').update(postfinanceStr).digest("hex").toUpperCase()    
  }

  debug('SHASTR:'+postfinanceStr)
  debug('SHASIN:'+paymentData.SHASIGN)

  return paymentData;
}

/**
 * ## postfinance.Card.signOut(paymentData)
 * * sign postfinance payment feedback with SHA
 * 1) sort paymendData keys (+alpha)
 * 2) stringify with this format KEY=VALUE+SECRET
 * 3) sign
 */
Card.prototype.signOut=function(paymentData){
  var postfinanceStr="", secret=config.option('shaSecret'), append=secret;

  // configure sha without secret
  if(!config.option('shaWithSecret'))
    append=''

  Object.keys(paymentData).sort().forEach(function(key){
    if(key.toUpperCase()==='SHASIGN'){
      return;
    }
    postfinanceStr+=key+'='+paymentData[key]+append
  })

  paymentData.SHASIGN=require('crypto').
    createHmac('sha256',secret).update(postfinanceStr).digest("hex").toUpperCase()
  debug('SHASTR:'+postfinanceStr)
  debug('SHA:'+paymentData.SHASIGN)
  return paymentData;
}


/**
 * ## postfinance.Card.publish(callback)
 * *Sends a request to create a new payment method*
 *
 * Creates a new payment method in the Postfinance vault, and sets the `payId`
 * property to the received payment method alias.
 *
 * You can instructs Postfinance to retain (save permanently) the payment method by
 * adding the following options *alias* and *aliasusage*
 * This is simple method that makes the payment method permanent on the
 * gateway. The payment method will be stored for future use after this method
 * is called.
 *
 *
 * Example:
 *
 *     var cardData = {...}, opts={...};
 *     var card = new postfinance.Card(cardData);

 *     card.publish(opts,function(err) {
 *       if (err) {
 *         console.log(err);
 *         return;
 *       }
 *       console.log('Payment token: ' + card.token);
 *     });
 *
 * @param {Function} Optional callback function (expects err)
 */
Card.prototype.publish = function(options, callback) {
  var querystring = require('querystring');
  var self = this;


  // transaction should exist
  if (!options.alias &&!this.number&&!this.orderId) {
    callback(new PostFinanceError('system', 'Card is not ready to use', null));
    return;
  }
 

  // using generated orderId when creating alias
  if(options.alias&&(!this.orderId||!options.orderId)){
    this.orderId='AS'+Date.now()
  }

  var paymentDataObj=this.getPayload(options)


  // Reformat our data as required by the API
  var paymentData = querystring.stringify(paymentDataObj);

  var operation={
    'RES':'order', //request for authorisation
    'SAL':'order', //request for direct sale
    //'RFD':'order', //refund, not linked to a previous payment, so not a maintenance operation
    'SAS':'maintenance', // partial or full data capture and closing
    'RFD':'maintenance',// partial refund and closing
    'RFS':'maintenance',// full refund and closing
    'DES':'maintenance', // delete authorisation and closing
    'DEL':'maintenance', // only delete authorisation
    'REN':'maintenance' // renew authorisation
  }

  // validate the cart
  authpost.makeRequest({
    method: 'POST',
    payload: paymentData,
    operation:operation[paymentDataObj.OPERATION]
  }, function(err, res) {
    var errMsg;

    if (err && err instanceof PostFinanceError) {
      return callback(err);
    }
    if (err) {
      return callback(new PostFinanceError('system', 'Error making create payment method request', err));
    }

    // Parse the location header to extract the alias and his id
    res.body.ALIAS&&(self.alias = res.body.ALIAS);
    self.payId = res.body.PAYID;
    self._resetDirty();
    callback(null,res);
  });

};

/**
 * ## postfinance.Card.publishForEcommerce()
 * Prepare data for postfinance ecommerce frontend
 *
 */
Card.prototype.publishForEcommerce = function(options, callback) {
  var querystring = require('querystring');
  var self = this;


  // using generated orderId when creating alias
  if(options.alias&&(!this.orderId||!options.orderId)){
    this.orderId='AS'+Date.now()
  }


  var paymentDataObj=this.getPayload(options,true /*with secret*/)

  //
  // return the prepared data for postfinance ecommerce 
  var result={
    path:config.option('path')['ecommerce'],
    body:paymentDataObj,
    query:querystring.stringify(paymentDataObj)
  }

  return callback(null,result)
};


/**
 * ## postfinance.Card.retain()
 * *Instructs Postfinance to retain (save permanently) the payment method*
 *
 * This is simple method that makes the payment method permanent on the
 * gateway. The payment method will be stored for future use after this method
 * is called.
 * *
 * @param {Function} callback Called with err object
 */
Card.prototype.retain = function(options, callback) {
}

/**
 * ## postfinance.Card.redact()
 * *Instructs ostfinance to redact (delete) the payment method*
 *
 * Note that Postfinance don't allow you to delete an alias with DirectLink (server-to-server).
 * You can only do this operation by using E-commerce pages. We solve the problem by updating
 * an alias with a test visa card that expire a the end of current month.
 *
 * @param {Function} callback Called with err object
 */
Card.prototype.redact = function(callback) {
  // redacting this alias by changing this number
  var querystring = require('querystring');
  var self = this, date=new Date();

  self.number = '4111-1111-1111-1111';
  self.csc = '111';
  self.year = date.getFullYear();
  self.month = ((date.getMonth()+1)%12);
  self.firstName = 'Vault ';
  self.lastName = Date.now();
  self.publish({alias:self.alias},callback)
};





/**
 * ## postfinance.Card.load(callback)
 * *Load payment method data from Samurai server*
 *
 * This method is used to load a created/retained payment method from the
 * Samurai gateway. The returned data immediately updates the fields in the
 * card instance, and also creates a new `method` property, which contains
 * metadata about the payment method.
 *
 * The `method` property has the following properties:
 *
 *  + _valid_: Whether the card has passed Samurai's validation (this is the
 *    same type of validation as those used in `isValid()` method.
 *  + _updatedAt_: The timestamp of payment method's last modification
 *  + _createdAt_: Payment method creation timestamp
 *  + _retained_: Whether payment method is permanent
 *  + _redacted_: Whether payment mehtod was modified
 *  + _custom_: Custom fields (setting them is not yet supported by Daimyo)
 *
 * `load` method also creates a `messages` property which contains any
 * messages that the gateway emitted. These may include validation errors.
 *
 * The callback should expect a single error object.
 *
 * Example:
 *
 *     // E.g., you have a payment alias stored in a database
 *     var userToken = 'xxxxxxxxxxxxxxxxxxxxxxxx';
 *     var card = new postfinance.Card({alias: userToken, payId:aliasid});
 *     card.load(function(err) {
 *        // Now card's fields are populated with billing details
 *     });
 *
 * @param {Function} callback Expects err object
 */
Card.prototype.load = function(callback) {
  var querystring = require('querystring');
  var self = this;


  var paymentData=this.getPayload()
  // Reformat our data as required by the API
  paymentData = querystring.stringify(paymentData);

  // validate the cart
  authpost.makeRequest({
    method: 'POST',
    payload: paymentData,
    operation:'query'
  }, function(err, res) {
    var errMsg;

    if (err && err instanceof PostFinanceError) {
      return callback(err);
    }
    if (err) {
      return callback(new PostFinanceError('system', 'Error making create payment method request', err));
    }

    self.number=res.body.CARDNO;
    self.issuer=res.body.BRAND;
    self.month =parseInt(res.body.ED.substring(0,2),10);
    self.year  =parseInt(res.body.ED.substring(2,4),10);
  // if (data.custom) {
  //   try {
  //     // Parse the JSON and assign an object to `custom` property
  //     self.custom = JSON.parse(data.custom);
  //   } catch(e) { /* Fail silently */ }
  // }
    self._resetDirty();
    callback(null);
  });

};



postfinance.Card = Card;
