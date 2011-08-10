/**
 * Daimyo - utilities for dealing with XML
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var xmlutils = exports;

/**
 * Generate regex for parsing a single tag
 *
 * @param {String} tagName The exact tag name as it appears in the XML
 * @returns {RegExp} Regular expresson object that will parse the given tag
 * @private
 */
function getTagRe(tagName) {
  return new RegExp('<' + tagName + '[^>]*>([^<]*)<');
}

/**
 * Run a regex multiple times until matches are exhausted
 *
 * @param {String} s Source string
 * @param {RegExp} rxp RegExp object to run on the source
 * @returns {Array} Array of results
 * @private
 */
function matchAll(s, rxp) {
  var firstMatch = rxp.exec(s);
  var matches = [];

  if (!firstMatch) {
    return [];
  }

  matches.push(firstMatch[1]);

  function recurse() {
    var match = rxp.exec(s);
    if (match) {
      matches.push(match[1]);
      recurse();
    } else {
      return;
    }
  }

  return matches;
}

/**
 * Convert a string to integer
 *
 * @param {String} s String to be parsed
 * @returns {Integer} Converted integer
 */
xmlutils.toInt = function(s) {
  return parseInt(s, 10);
};

/**
 * Convert a string to Date object
 *
 * @param {String} s String to be parsed
 * @returns {Date} Converted date
 */
xmlutils.toDate = function(s) {
  return new Date(s);
};

/**
 * Convert a string to Bool
 *
 * This function treats `'true'` as `true`, and everything else as false.
 *
 * @param {String} s String to be parsed
 * @returns {Bool} Converted boolean
 */
xmlutils.toBool = function(s) {
  return s === 'true' ? true : false;
};

/**
 * Pass-through function that does nothing
 *
 * @param {String} s Strning to be passed through
 * @returns {String} Same string that came in
 */
xmlutils.toString = function(s) {
  return s;
};


/**
 * Extract data from XML string using recipe mappings
 *
 * Recipe object contains a mapping between tag names and coercion functions 
 * like `toInt` and `toDate`. Each key in the recipe object will be treated
 * as a valid tag name, and searched for within the XML. Data found within the 
 * XML string will be coerced and assigned to a key in the result object. The
 * key name in the result object will match the key name from the recipe 
 * object.
 *
 * An example recipe object:
 *
 *     {
 *       'payment_method_token': xmlutils.toString,
 *       'created_at': xmlutils.toDate,
 *       ....
 *     }
 *
 * @param {String} xml The source XML string
 * @param {Object} recipe The recipe object
 * @returns {Object} Name-value pairs of extracted data
 */
xmlutils.extractData = function(xml, recipe) {
  var result = {};
  Object.keys(recipe).forEach(function(key) {
    // Get the Regex for the recipe
    var rxp = getTagRe(key);
    var matches = matchAll(xml, rxp);

    if (matches.length === 1) {
      result[key] = recipe[key](matches[0]);
    } else if (matches.length > 1) {
      result[key] = [];
      matches.forEach(function(match) {
        result[key].push(recipe[key](match));
      });
    }
  });

  return result;
};

/**
 * Extract messages from XML string
 *
 * The messages can be of the following classes:
 * - _error_: errors and declines
 * - _info_: success and other information
 * 
 * The messages will also have a context in which it was transmitted, and the 
 * message that describes the details.
 *
 * The return object may look like this:
 *
 *     {
 *       error: [{'input.card_number': 'failed_checksum'}]
 *     }
 *
 * @param {String} xml The XML string to be parsed
 * @returns {Array} Array of error messages.
 */
xmlutils.extractMessages = function(xml) {
  var messageRe = /<messsage([^\/]+)\/>/;
  var classRe = /class="([^"]+)"/;
  var contextRe = /context="([^"]+)"/;
  var keyRe = /key="([^"]+")"/;

  var messages = [];

  function recurse() {
    var match = messageRe.exec(xml);
    var attrs;
    var message = {};
    
    if (!match) {
      return;
    }

    attrs = match[1];
    message.cls = classRe.exec(attrs)[1];
    message.context = contextRe.exec(attrs)[1];
    message.key = keyRe.exec(attrs)[1];
    messages.push(message);
    return recurse();
  }

  return messages;
};

/**
 * Decamelizes a string
 *
 * Converts 'CamelCase' to 'camel_case'.
 *
 * @param {String} s String to convert
 * @returns {String} Decamelized string
 */
xmlutils.decamelize = function(s) {
  s = s.replace(/^[A-Z]/, function(match) {
    return match.toLowerCase();
  });
  s = s.replace(/[A-Z]/g, function(match) {
    return '_' + match.toLowerCase();
  });
  return s;
};

/**
 * Shallow conversion of JavaScript object to XML
 *
 * It converts each key to a single XML node and converts the contents of the 
 * key to a text node by calling `toString` on it.
 *
 * Optionally, the whole XML string can be wrapped in a top-level tag.
 *
 * This function _does not_ care about the order of keys, so if you need the
 * nodes to be in a certain order, you should supply an array of keys.
 *
 * @param {Object} o Object to be converted
 * @param {String} [topLevel] Top level tag
 * @param {Array} [keys] Array of keys to use so that nodes are ordered
 * @returns {String} XML version of the object
 */
xmlutils.toXML = function(o, topLevel, keys) {
  var xml = '';

  // Was topLevel arg skipped?
  if (typeof topLevel != 'string') {
    keys = topLevel;
    topLevel = null;
  } else {
    xml += '<' + xmlutils.decamelize(topLevel) + '>\n';
  }

  keys = keys || Object.keys(o);

  keys.forEach(function(key) {
    var tagName = xmlutils.decamelize(key);
    xml += '<' + tagName + '>' + o[key].toString() + '</' + tagName + '>\n';
  });

  if (topLevel) {
    xml += '</' + xmlutils.decamelize(topLevel) + '>\n';
  }
  
  return xml;
};
