/**
 * #config
 * 
 * Copyright (c)2011, by Branko Vukelic
 *
 * Configuration methods and settings for Daimyo. The three main objects a 
 * typical integration requires from this module are the `configure()` and 
 * `option()` methods, and the `settings` object.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var config = exports;
var util = require('util');
var samurayKeyRe = /^[0-9a-f]{24}$/;

config.DAIMYO_VERSION = '0.0.1';

/**
 * ## config.settings
 * *Master configuration settings for Daimyo*
 * 
 * The `conifig.settings` contain all the code configuration options that 
 * affect the way certain things work (or not), and the Samurai gateway 
 * credentials. You should _not_ access this object directly. The correct way
 * to access and set the settings is through either ``configure()`` or 
 * ``option()`` methods.
 *
 * Settings are expected to contain following keys with their default values:
 *
 *  + _merchantKey_: Samurai gateway Merchant Key (default: `''`)
 *  + _apiPassword_: Samurai gateway API Password (default: `''`)
 *  + _processorId_: Processor (gateway) ID; be sure to set this to a sandbox
 *    ID for testing(default: `''`)
 *  + _enabled_: Whether to actually make requests to gateway (default: true)
 *  + _debug_: Whether to log to STDOUT; it is highly recommended that 
 *    you disable this in production, to remain PCI comliant, and to 
 *    avoid performance issues (default: true)
 *
 * The ``apiVersion`` setting is present for conveinence and is should be 
 * treated as a constant (i.e., read-only).
 */
config.settings = {};
config.settings.merchantKey = '';
config.settings.apiPassword = '';
config.settings.processorId = '';
config.settings.enabled = true; // Does not make any actual API calls if false
config.settings.debug = false; // Enables *blocking* debug output to STDOUT
config.settings.apiVersion = 1; // Don't change this... unless you need to

/**
 * ## config.debug(message)
 * *Wrapper around `util.debug` to log items in debug mode*
 *
 * This method is typically used by Daimyo implementation to output debug 
 * messages. There is no need to call this method outside of Daimyo.
 *
 * Note that any debug messages output using this function will block 
 * execution temporarily. It is advised to disable debug setting in production 
 * to prevent this logger from running.
 * 
 * @param {Object} message Object to be output as a message
 * @private
 */
config.debug = debug = function(message) {
  if (config.settings.debug) {
    util.debug(message);
  }
};

/**
 * ## config.configure(opts)
 * *Set global Daimyo configuration options*
 *
 * This method should be used before using any of the Daimyo's functions. It
 * sets the options in the `config.settings` object, and performs basic 
 * validation of the options before doing so.
 *
 * This method depends on ``config.option()`` method to set the individual 
 * options.
 *
 * If an invalid option is passed, it will throw an error.
 *
 * @param {Object} Configuration options
 */
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
 * ## config.option(name, [value])
 * *Returns or sets a single configuration option*
 *
 * If value is not provided this method returns the value of the named
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

