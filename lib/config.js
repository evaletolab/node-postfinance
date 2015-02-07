/**
 * #config
 * 
 * Copyright (c)2011, by Branko Vukelic
 *
 * Configuration methods and settings for Postfinance. All startup configuration
 * settings are set using the `config.configure()` and `config.option()`
 * methods. Most options can only be set once, and subsequent attempts to set
 * them will result in an error. To avoid this, pass the
 * `allowMultipleSetOption` option to `config.configure()` and set it to 
 * `true`. (The option has a long name to prevent accidental usage.)
 *
 * Copyright (c)2014, by Olivier Evalet <evaleto@gmail.com>
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under GPL license (see LICENSE)
 */

var config = exports;
var util = require('util');
var PostFinanceError = require('./error');
var samurayKeyRe = /^[0-9a-f]{4}$/;
var isConfigured = false;

config.POSTFINANCE_VERSION = '0.0.1';

/**
 * ## settings
 * *Master configuration settings for Postfinance*
 * 
 * The `settings` object contains all the core configuration options that 
 * affect the way certain things work (or not), and the Postfinance gateway 
 * credentials. You should _not_ access this object directly. The correct way
 * to access and set the settings is through either ``configure()`` or 
 * ``option()`` methods.
 *
 * Settings are expected to contain following keys with their default values:
 *
 *  + _pspid_: Postfinance gateway Merchant Key (default: `''`)
 *  + _apiPassword_: Postfinance gateway API Password (default: `''`)
 *  + _apiUser_: Processor (gateway) ID; be sure to set this to a sandbox
 *    ID for testing (default: `''`)
 *  + _currency_: Default currency for all transactions (can be overriden by
 *    specifying the appropriate options in transaction objects)
 *  + _allowedCurrencies_: Array containing the currencies that can be used
 *    in transactions. (default: ['USD'])
 *  + _sandbox_: All new payment methods will be sandbox payment methods 
 *    (default: false)
 *  + _enabled_: Whether to actually make requests to gateway (default: true)
 *  + _debug_: Whether to log to STDOUT; it is highly recommended that 
 *    you disable this in production, to remain PCI comliant, and to 
 *    avoid performance issues (default: true)
 *
 * Only `currency` option can be set multiple times. All other options can only
 * be set once using the ``config.configure()`` method.
 *
 * The ``apiVersion`` setting is present for conveinence and is should be 
 * treated as a constant (i.e., read-only).
 */
var settings = {};
settings.pmlist=['creditcart','postfinance card','paypal']
settings.pspid = '';
settings.apiPassword = '';
settings.apiUser = '';
settings.currency = 'CHF';
settings.allowedCurrencies = ['CHF'];
settings.shaWithSecret=true; // do not append secret in sha string (this is a postfinance configuration)
settings.operation='RES'
settings.path = {
  ecommerce:'/ncol/test/orderstandard_utf8.asp',
  order:'/ncol/test/orderdirect_utf8.asp',
  maintenance:'/ncol/test/maintenancedirect.asp',
  query:'/ncol/test/querydirect_utf8.asp',
};
settings.host = 'e-payment.postfinance.ch';

settings.allowMaxAmount=400.00; // block payment above
settings.sandbox = false;
settings.enabled = true; // Does not make any actual API calls if false
settings.debug = false; // Enables *blocking* debug output to STDOUT
settings.apiVersion = 1; // Don't change this... unless you need to
settings.allowMultipleSetOption = false;

config.reset=function(){
  if(process.env.NODE_ENV=='test'){
    settings.sandbox = false;
    settings.enabled = true;
    settings.pspid = '';
    settings.apiPassword = '';
    settings.apiUser = '';
    settings.currency = 'CHF';
    settings.allowedCurrencies = ['CHF'];
    settings.shaWithSecret=true;
    settings.operation='RES'
    isConfigured=false;
  }
  else throw new Error('Reset is not possible here')
}
/**
 * ## config.debug(message)
 * *Wrapper around `util.debug` to log items in debug mode*
 *
 * This method is typically used by Postfinance implementation to output debug 
 * messages. There is no need to call this method outside of Postfinance.
 *
 * Note that any debug messages output using this function will block 
 * execution temporarily. It is advised to disable debug setting in production 
 * to prevent this logger from running.
 * 
 * @param {Object} message Object to be output as a message
 * @private
 */
config.debug = debug = function(message) {
  if (settings.debug) {
    util.debug(message);
  }
};

/**
 * ## config.configure(opts)
 * *Set global Postfinance configuration options*
 *
 * This method should be used before using any of the Postfinance's functions. It
 * sets the options in the `settings` object, and performs basic validation 
 * of the options before doing so.
 *
 * Unless you also pass it the `allowMultipleSetOption` option with value set 
 * to `true`, you will only be able to call this method once. This is done to 
 * prevent accidental calls to this method to modify critical options that may
 * affect the security and/or correct operation of your system.
 *
 * This method depends on ``config.option()`` method to set the individual 
 * options.
 *
 * If an invalid option is passed, it will throw an error.
 *
 * @param {Object} Configuration options
 */
config.configure = function(opts) {
  debug('Configuring Postfinance with: \n' + util.inspect(opts));
  if (!opts.pspid || (opts.apiUser&&!opts.apiPassword)) {
    throw new PostFinanceError('system', 'Incomplete Postfinance API credentials', opts);
  }
  Object.keys(opts).forEach(function(key) {
    config.option(key, opts[key]);
  });
  isConfigured = true;

  if(config.option('shaWithSecret'))
    debug("append sha with secret")

  //print settings?
  //debug("settings "+util.inspect(settings))
};

/**
 * ## config.option(name, [value])
 * *Returns or sets a single configuration option*
 *
 * If value is not provided this method returns the value of the named
 * configuration option key. Otherwise, it sets the value and returns it.
 *
 * Setting values can only be set once for most options. An error will be 
 * thrown if you try to set an option more than once. This restriction exist
 * to prevent accidental and/or malicious manipulation of critical Postfinance 
 * configuration options.
 *
 * During testing, you may set the `allowMultipleSetOption` to `true` in order
 * to enable multiple setting of protected options. Note that once this option
 * is set to `false` it can no longer be set to true.
 *
 * Postfinance API credentials are additionally checked for consistency. If they 
 * do not appear to be valid keys, an error will be thrown.
 *
 * @param {String} option Name of the option key
 * @param {Object} value New value of the option
 * @returns {Object} Value of the `option` key
 */
config.option = function(option, value) {
  if (typeof value !== 'undefined') {
    debug('Setting Postfinance key `' + option + '` to `' + value.toString() + '`');
    

    // Do not allow an option to be set twice unless it's `currency`
    if (isConfigured && 
        !settings.allowMultipleSetOption && 
        option !== 'currency') {
      throw new PostFinanceError(
        'system', 
        'Option ' + option + ' is already locked', 
        option);
    }

    switch (option) {
    case 'pspid':
    case 'apiPassword':
    case 'apiUser':
    case 'currency':
    case 'shaSecret':
    case 'host':
    case 'path':
    case 'operation':
    case 'acceptUrl':
    case 'declineUrl':
    case 'exceptionUrl':
    case 'cancelUrl':
    case 'backUrl':
      settings[option] = value;
      break;
    case 'allowMaxAmount':
      settings[option] = parseFloat(value)
      break;
    case 'sandbox':
    case 'enabled':
    case 'debug':
    case 'shaWithSecret':
    case 'allowMultipleSetOption':
      settings[option] = Boolean(value);
      break;
    case 'allowedCurrencies':
      if (!Array.isArray(value)) {
        throw new PostFinanceError('system', 'Allowed currencies must be an array', null);
      }
      if (value.indexOf(settings.currency) < 0) {
        value.push(settings.currency);
      }
      settings.allowedCurrencies = value;
      break;
    default:
      // Do not allow unknown options to be set
      throw new PostFinanceError('system', 'Unrecognized configuration option', option);
    }
  }
  return settings[option];
};

