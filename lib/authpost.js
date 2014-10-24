/**
 * # authpost
 *
 * Copyright (c)2011, by Branko Vukelic
 *
 * This library contains low-level methods for communicating with the Samurai
 * payment gateway. You should never need to access these methods directly.
 *
 * The `makeRequest` method is used to send requests to the gateway using the 
 * credentials that have been set using the `config.configure()` and 
 * `config.option()` methods.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var http = require('http');
var config = require('./config');
var debug = config.debug;
var xmlutils = require('./xmlutils');
var PostFinanceError = require('./error');
var POSTFINANCE_VERSION = require('./config').POSTFINANCE_VERSION;

/**
 * ## parseMessages(xml)
 * *Parse error messages and return a PostFinanceError object*
 * 
 * This function extracts the error block from the Postfinance's response XML, and
 * parses the error messages into PostFinanceError object with individual messages
 * attached. It is a job of the caller to determine what the messages mean.
 *
 * If no error messages are found, `null` is returned.
 *
 * @param {String} xml The original XML response
 * @returns {PostFinanceError[]} Array of postfinance error objects
 * @private
 */
function parseMessages(xml) {
  var messages = [], attrs=xmlutils.getAttributesXML(xml,'ncresponse');


  if(!attrs.NCERROR || parseInt(attrs.NCERROR)===0 || attrs.NCERROR==="0")
    return;


  return new PostFinanceError('gateway', attrs.STATUS, attrs.NCERROR, attrs.NCERRORPLUS);
}

/**
 * ## authpost.makeRequest([opts], callback)
 * *Low-level abstraction of http client functionality*
 *
 * All options are optional (no pun intended):
 *
 *  + _path_: Path under the main gateway URL
 *  + _method_: Either 'POST' or 'GET'
 *  + _payload_: XML or urlencoded payload to send
 *  + _headers_: Custom headers
 *
 * An example usage:
 *
 *     authpost.makeRequest({
 *       path: '/payment_methods/xxxxxxxxxxxxxxxxxxxxxxxx.xml',
 *       method: 'PUT',
 *       payload: xmlData
 *     }, function(err, res) {
 *       if (err) {
 *         // There was an error with the gateway
 *         console.log(err);
 *         return;
 *       }
 *       if (res.status !== 200) {
 *         // Bad status code
 *       }
 *       // etc...
 *     });
 *
 * If the options are not provided, the request path will default to 
 * `/payment_methods`, and the request method will default to 'GET'. There is
 * no data that you can get from the default request, though, but it can be 
 * used to test the connection in general.
 *
 * This method automatically sets the appropritate `Content-Length` and 
 * `Content-Type` headers. `Content-Type` can be either `text/xml` or 
 * `application/x-www-form-urlencoded`. The `Content-Type` is set based on the 
 * first character of the payload: if it is an lesser-than (`<`) character, it
 * is set to `text/xml`.
 *
 * @param {Object} [opts] Request options
 * @param {Function} callback Callback that will be called with err and res
 */
exports.makeRequest = function(opts, callback) {
  var https = require('https');
  var path;
  var method;
  var payload;
  var headers;
  var requestOptions;
  var request;

  // if (!config.option('pspid') || !config.option('apiPassword')) {
  //   callback(new PostFinanceError('system', 'Daimyo is not configured', null));
  // }

  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  // Is callback found?
  if (typeof callback !== 'function') {
    throw new Error('Callback function is required');
  }

  if(!opts.operation){
    return callback(new PostFinanceError('system','You have to define an operation for a request'))
  }

  //
  // the operation(order,maintain,query) define the path
  path = config.option('path')[opts.operation];
  method = opts.method || 'GET'; // defaults to GET
  payload = opts.payload;

  debug(method + ' ' + path + ' ' + (payload ? 'with' : 'without') + ' payload');
  // debug(payload);

  // Set headers
  headers = {
    'User-Agent': 'OpenPostFinance/' + POSTFINANCE_VERSION + ' Node.js/' + process.version,
    'Accepts': 'text/plain; q=0.5, text/xml; q=0.8, text/html',
    'Date': new Date().toString(),
    'Content-Length': 0
  };

  if (payload) {
    headers['Content-Length'] = payload.length;

    if (payload[0] === '<') {
      headers['Content-Type'] = 'text/xml';
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }

  // Set request options
  requestOptions = {
    host: config.option('host'),
    path: path,
    method: method,
    headers: headers
  };

  if(config.option('enabled')===false){
    var res = {};
    res.base = {};
    res.status = 200;
    res.headers = "ok";
    res.text = "";
    res.body = {PAYID:'111111',ORDERID:'111111',ACCEPTANCE:'111111',NCERROR:'0',NCSTATUS:'0',ALIAS:'FAKE'};
    return callback(null,res)
  }

  // Initialize the request object
  request = https.request(requestOptions, function(response) {
    var res = {};
    res.base = response;
    res.status = response.statusCode;
    res.headers = response.headers;
    res.text = "";
    res.body = {};

    // response.setEncoding('UTF-8');

    // Buffer the response body
    response.on('data', function(chunk) {
      res.text += chunk;
    });

    response.on('end', function(err) {
      var error;

      // System error
      if (err) {
        error = new PostFinanceError('system', 'There was an error with the request', err);
      } else {
        error = parseMessages(res.text);
      }
      

      //
      // deserialize postfinance data
      res.body = xmlutils.getAttributesXML(res.text,'ncresponse')


      debug('Finished request to ' + path + ' with body: ' + JSON.stringify(res.body));
      callback(error, res);
    });
  });

  request.on('error', function(err) {
    callback(new PostFinanceError('system', 'There was an error with the request', err));
  });

  if (payload) { 
    request.write(payload); 
  }
  request.end();
};

