/**
 * Daimyo - very think wrapper for HTTP authenticated POST requests
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var http = require('http');
var settings = require('./config').settings;
var debug = require('./config').debug;
var DaimyoError = require('./error');
var API_VER = settings.apiVersion;
var API_HOST = 'samurai.feefighters.com';
var API_URL = '/v' + API_VER;
var DEFAULT_PATH = '/payment_methods';

/**
 * Generate standard HTTP auth credentials for given merchant key and API pass
 *
 * @return {String} Base64-encoded credentials with `'Basic'` prefix
 * @private
 */
function generateCreds() {
  var credential = settings.merchantKey + ':' + settings.apiPassword;
  return 'Basic ' + new Buffer(credential).toString('base64');
}

/**
 * Low-level abstraction of http client functionality 
 *
 * All options are optional (no pun intended):
 * - _path_: Path under the main gateway URL
 * - _method_: Either 'POST' or 'GET'
 * - _payload_: XML or urlencoded payload to send
 * - _headers_: Custom headers
 *
 * @param {Object} opts Request options
 * @param {Function} callback Callback that will be called with err and res
 * @private
 */
function makeRequest(opts, callback) {
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
  method = opts.method === 'POST' ? 'POST' : 'GET'; // defaults to GET
  payload = opts.payload;

  debug(method + ' ' + path + ' ' + (payload ? 'with' : 'without') + ' payload');
  debug(payload);

  // Set request options
  requestOptions = {
    host: API_HOST,
    path: path,
    method: method,
    headers: {
      'Authorization': generateCreds()
    }
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
      callback(err, res);
    });
  });

  request.on('error', function(err) {
    callback(err);
  });

  if (payload) { request.write(payload); }
  request.end();
}

// FIXME: temporary exposure, this should be a private low-level func
exports.makeRequest = makeRequest;



