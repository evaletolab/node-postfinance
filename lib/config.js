/**
 * Daimyo - configuration module
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var config = exports;
var util = require('util');
var samurayKeyRe = /^[0-9a-f]{24}$/;

// Initial options
config.settings = {};
config.settings.merchantKey = '';
config.settings.apiPassword = '';
config.settings.processorId = '';
config.settings.enabled = true; // Does not make any actual API calls if false
config.settings.debug = true; // Enables *blocking* debug output to STDOUT
config.settings.apiVersion = 1; // Don't change this... unless you need to

/**
 * Wrapper around util debug to log items in debug mode
 *
 * Note that any debug messages output using this function will block 
 * execution temporarily. It is advised to disable debug setting in production 
 * to prevent this logger from running.
 * 
 * @param {Object} message Object to be output as a message
 */
function debug(message) {
  if (config.settings.debug) {
    util.debug(message);
  }
}

config.debug = debug;

config.configure = function(opts) {
  debug('Configuring Daimyo with: \n' + util.inspect(opts));
  if (!opts.merchantKey || !opts.apiPassword || !opts.processorId) {
    throw new Error('Incomplete Samurai API credentials');
  }
  Object.keys(opts).forEach(function(key) {
    config.option(key, opts[key]);
  });
};

/**
 * Returns or sets a single configuration option
 *
 * If value is not provided `option` method returns the value of the named
 * configuration option key. Otherwise, it sets the value and returns it.
 *
 * Samurai API credentials are additionally checked for consistency. If they 
 * do not appear to be valid keys, an error will be thrown.
 *
 * @param {String} option Name of the option key
 * @param {Object} value New value of the option
 * @returns {Object} Value of the `option` key
 */
config.option = function(option, value) {
  if (value) {
    debug('Setting Daimyo key `' + option + '` to `' + value.toString() + '`');
  }
  switch (option) {
  case 'merchantKey':
  case 'apiPassword':
  case 'processorId':
    // Throw if doesn't look like valid key
    if (value && !samurayKeyRe.exec(value)) {
      throw new Error('Not a valid ' + option);  
    } else if (value) {
      config.settings[option] = value;
    }
    break;
  case 'enabled':
  case 'debug':
    if (value) {
      config.settings[option] = Boolean(value);
    }
    break;
  default:
    if (value) {
      config.settings[option] = value;
    }
    break;
  }
  return config.settings[option];
};
