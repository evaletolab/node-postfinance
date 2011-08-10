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
var settings = require('./config').settings;
var debug = require('./config').debug;
var DaimyoError = require('./error');
var API_VER = settings.apiVersion;
var API_HOST = 'samurai.feefighters.com';
var API_URL = '/v' + API_VER;
var DEFAULT_PATH = '/payment_methods';
var DAIMYO_VERSION = require('./config').DAIMYO_VERSION;

/**
 * ## generateCreds()
 * Generate standard HTTP auth credentials for given merchant key and pass
 *
 * @return {String} Base64-encoded credentials with `'Basic'` prefix
 * @private
 */
function generateCreds() {
  var credential = settings.merchantKey + ':' + settings.apiPassword;
  return 'Basic ' + new Buffer(credential).toString('base64');
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

  if (!settings.merchantKey || !settings.apiPassword) {
    callback(new DaimyoError('system', 'Daimyo is not configured', settings));
  }

  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  // Is callback found?
  if (typeof callback !== 'function') {
    throw new Error('Callback function is required');
  }

  path = API_URL + (opts.path || DEFAULT_PATH);
  method = opts.method || 'GET'; // defaults to GET
  payload = opts.payload;

  debug(method + ' ' + path + ' ' + (payload ? 'with' : 'without') + ' payload');
  debug(payload);

  // Set headers
  headers = {
    'Authorization': generateCreds(),
    'User-Agent': 'Daimyo/' + DAIMYO_VERSION + ' Node.js/' + process.version
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
    host: API_HOST,
    path: path,
    method: method,
    headers: headers
  };

  // Initialize the request object
  request = https.request(requestOptions, function(response) {
    var res = {};
  
    res.base = response;
    res.status = response.statusCode;
    res.headers = response.headers;
    res.body = '';

    // response.setEncoding('UTF-8');

    // Buffer the response body
    response.on('data', function(chunk) {
      res.body += chunk;
    });

    response.on('end', function(err) {
      // FIXME: Do proper error handling:
      // - detect if there's a <error> block
      // - extract messages
      // - package a custom error object with messages and status

      debug('Finished request with body: ' + res.body);
      callback(err, res);
    });
  });

  request.on('error', function(err) {
    callback(err);
  });

  if (payload) { request.write(payload); }
  request.end();
};

