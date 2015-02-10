## Main usage
The purpose of this project is to provide a simple and intiutive API to handle the postfinance gateway. This API mainly focus on the [DirectLink](docs/PostFinance_DirectLink_EN.pdf) and [Alias](docs/PostFinance_Alias_FR.pdf) modules. It has bean designed to work on server side.

Node postfinance API is based on the original idea from [Daimyo](https://github.com/HerdHound/Daimyo).

## Installation
From github,    

    git clone https://github.com/evaletolab/node-postfinance
    cd node-postfinance

Easiest way to install node-postfinance is by using npm *(not yet ready)*:

    npm install --save node-postfinance

Since node-postfinance is currently still very beta, if you wish to get a newer version
with more features (please don't do this in production, though), you can add it
as a dependency to your packages.json like this:

    npm install --save https://github.com/evaletolab/node-postfinance/tarball/master

## Running unit tests

To run unit tests you need [Mocha](https://github.com/visionmedia/mocha),
and [should.js](https://github.com/visionmedia/should.js). You also need to
create a file called `config-pf.js`, and add your keys there:

    exports.pspid = 'xxxxxxxxxxxxxxxxxxxxxxxx';
    exports.apiUser = 'xxxxxxxxxxxxxxxxxxxxxxxx';
    exports.apiPassword = 'xxxxxxxxxxxxxxxxxxxxxxxx';
    exports.shaSecret = 'xxxxxxxxxxxxxxxxxxxxxxxx';

The tests are run simply by simply typing:

    NODE_ENV=test ./node_modules/.bin/mocha /test/file-to-test.js 
    NODE_ENV=test ./node_modules/.bin/mocha

Do not run tests with your live processor. Make sure you are running in a
sandbox.


##Overview
When using the node-postfinance api, you basically deal with two separate concepts: 
payment methods (cards) and transactions (making/loosing money).
node-postfinance's API provides two main constructors that you
will use most of the time: `Card` and `Transaction`.

Once created the card objects have the following methods:

 + `card.publish()`      : publish a payment methods

```javascript
var cardData = {..card detail..}, 
    opts={alias:'testalias'};
     
var card = new postfinance.Card(cardData);
 
//Instructs Postfinance to retain (save permanently) the payment method
//opts describe the name of the alias 
card.publish(opts,function(err) {
  if (err) {
     console.log(err);
     return;
  }
  console.log('Payment alias: ' + card.alias);
});
```
 + `card.redact()`       : instructs postfinance to redact (delete) the payment method
*Note that Postfinance don't allow you to delete an alias with DirectLink (server-to-server). You can only do this operation by using E-commerce pages. We solve the problem by updating an alias with a test visa card that expire a the end of current month.*

```javascript
var card = new postfinance.Card({alias:'testalias'}); // alias name of the saved card

card.redact(function(err,res) {
  if(err){...}
});
```
 
The transaction object is constructed using the `Transaction` constructor. The
transaction object only has one method:

 + `transaction.process()`
 + `transaction.cancel()`
 + `transaction.refund()`

This method takes a card object as its argument, and runs a transaction against
the payment method associated with the card.


## Basic usage
```javascript
    var postfinance = require('postfinance');

    // Configure node-postfinance
    postfinance.configure({
      pspid: 'xxxxxxxxxxxxxxxxxxxxxxxx',
      apiUser: 'xxxxxxxxxxxxxxxxxxxxxxxx',
      apiPassword: 'xxxxxxxxxxxxxxxxxxxxxxxx',
      withAlias:true, // default
      currency: 'CHF',// default
      debug: false, // default, should stay off in production at all costs
      enabled: true,// default
    });

    // Using transparent redirect with Express
    app.get('/order/card', function(req, res, next) {
        var alias = req.body.alias, usage = req.body.aliasUsage ;
        var card = new postfinance.Card({alias: alias, aliasUsage:usage});

        // Create a new transaction
        var transactionData = {
          operation: 'purchase', // available actions: purchase, authorize, capture, cancel, refund
          amount:134.00,  
          email:'test@hoho.ch', 
        }

        // Process the transaction using the card object
        transaction.process(card, function(err) {

           if (err) {
             // Handle error and return error page
             res.render('sorry', {error:err});
             return;
           }


           // Ah, finally! All ur moneys are belong to us!
           res.render('thks', {});

           // Don't forget to Email receipt!
           emailReceipt({});
        });
    });
```
#Configuration Back-End (PostFinance)
 You must use your account details, which you have received from PostFinance in order to log into http://e-payment.postfinance.ch
##Global transaction parameter
* create an API user
* cehck SHA256
* check UTF-8
* update the ECI value for your usage
* use same password for all the SHA-SIGN

##Data and origin verification
* ...

##Transaction feedback
* ...

###Direct HTTP-server-to-server request
* ...

## Using the ``check`` as AMD module in browsers

The `lib/check.js`` module contains generic functions for performing various
checks on credit cards. It performs Luhn Mod-10 check to ensure that the card
number is valid (although the card itself may not be valid), get the name of
the issuer, or make sure that the CSC (also called CVV, CVC, or CCV) has the
right number of digits, etc. It is always a good idea to perform this check
browser-side to ensure that obviously invalid cards do not make it to the
system, or that any typing errors are caught early on.

This module can be used in browsers with minimal modifications. For
convenience, the ``checkamd`` target is provided in the makefile, which builds
an AMD module compatible with loaders like [RequireJS](http://requirejs.org/).

To build the AMD version of check, simply type:

    make checkamd

This will result in creation of a new file called ``check.js`` in the project
directory. The file is not minified. If you want to minify it, you can use
tools such as [UglifyJS](https://github.com/mishoo/UglifyJS).

To use it, simply require it from your module as usual:

    // mymodule.js
    define(['jquery', 'check'], function($, check) {
        var cardNumber = $('input[name=card]).val();
        var csc = $('input[name=csc]').val();
        
        var isVaild = check.mod10check(cardNumber) ? true : false;
        var isValid = isValid && check.cscCheck(cardNumber, csc) ? true : false
        
        var issuer = check.getIssuer(cardNumber);
        alert('Your card was issued by ' + issuer);
    });



## Known issues and solutions

### RangeError: Maximum call stack size exceeded

In some cases, you may see this error when trying to process a transaction.
This is a known issue when any of the options passed to the 
``postfinance.Transaction`` constructor is a Mongoose document key (or
similar complex type). Mongoose document keys are not simple types (String,
Number, etc) and they have to be converted first. Simple way to do it is to
call ``valueOf()`` or ``toString()`` on the key first:

    var transaction == new postfinance.Transaction({
      type: 'purchase',
      billingReference: myMongooseDocument.someKey.valueOf(),
      customerReference: myMongooseDocument.id.toString()
    });

This also applies to situations where you are passing values that are not
simple types (String, Number), Object, or Array instances.

## License
The API is available under AGPL V3 to protect the long term interests of the community – you are free to use it with no restrictions but if you change the server code, then those code changes must be contributed back.

> Copyright (c) 2014 Olivier Evalet (http://evaletolab.ch/)<br/>
> Copyright (c) 2011, by Branko Vukelic <branko@herdhound.com>
> <br/><br/>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the “Software”), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
> <br/>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
> <br/>
> THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.
