/**
 * # messages
 *
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * Translation of various gateway error messages to human-readable format.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var msg = exports;

/**
 * #messages.str
 * *Individual localized strings*
 * @private
 */
msg.str = {};
msg.str.en_US = {
  INVALID_NUMBER: 'Card number is invalid',
  INVALID_CSC: 'Card security code is invalid'
};

/**
 * #getStr(key)
 * *Returns a function that yields the localized string for given key*
 *
 * @param {String} key
 * @returns {Function} Returns a translation function that accepts lang argument
 * @private
 */
function getStr(key) {
  return function(lang) {
    return msg.str[lang][key];
  };
}

/**
 * #messages.mappings
 * *Maps Samurai error messages to human-readable strings*
 *
 * This mapping maps class, context, and key to an object that contains the 
 * Daimyp field name, and translation function which returns the human-readable 
 * string given a language code.
 *
 * @private
 */
msg.mappings = {
  error: {
    'input.card_number': {
      too_short: ['number', getStr('INVALID_NUMBER')],
      too_long: ['number', getStr('INVALID_NUMBER')],
      failed_checksum: ['number', getStr('INVALID_NUMBER')]
    },
    'input.cvv': {
      too_long: ['csc', getStr('INVALID_CSC')],
      too_short: ['csc', getStr('INVALID_CSC')]
    }
  }
};

/**
 * #messages.translate(message, lang)
 * *Returns a human readable string in given language*
 *
 * The return value is an object that maps a Daimyo field name to 
 * human-readable translation. The field name can be a virtual field like 
 * 'system' or 'gateway', which indicates the error pretains to components of 
 * payment processing workflow, rather than a field.
 *
 * @param {Object} message Message object to be translated
 * @param {String} [lang] Optional language code (defaults to `en_US`)
 * @returns {Object} Object containing the field name, and human readable string
 */
msg.translate = function(message, lang) {
  var mapping = msg.mappings[message.cls][message.context][message.key];
  lang = lang || 'en_US';
  return {
    field: mapping[0],
    message: mapping[1](lang)
  };
};

/**
 * #messages.translateAll(messages, lang)
 * *Translate multiple messages, and return a single field-message mapping*
 *
 * @param {Array} messages Array of message objects
 * @param {String} [lang] Optional language code (defaults to `en_US`);
 * @returns {Object} Object containing the field names, and human readable strings
 */
msg.translateAll = function(messages, lang) {
  var translated = messages.map(function(message) {
    return msg.translate(message, lang);
  });
  var translations = {};
  translated.forEach(function(message) {
    if (translations.hasOwnProperty(message.field) && 
        translations[message.field].indexOf(message.message) < 0) {
      translations[message.field].push(message.message);
    } else {
      translations[message.field] = [message.message];
    }
  });
  return translations;
};
