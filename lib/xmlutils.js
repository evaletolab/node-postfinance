/**
 * # xmlutils
 *
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * Utitilities for parsing Samurai XML responses. These utilities are not 
 * general-purpose XML parsers and generators. Some of them can be quite useful
 * outside the Daimyo context, but there's no guarantee of that.
 *
 * In general, you shouldn't need to touch these methods yoursef ever, unless
 * you are considering developing Daimyo.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var xmlutils = exports;

/**
 * ## getTagRe(tagName)
 * *Generate regex for parsing a single tag*
 *
 * @param {String} tagName The exact tag name as it appears in the XML
 * @returns {RegExp} Regular expresson object that will parse the given tag
 * @private
 */
function getTagRe(tagName) {
  return new RegExp('<' + tagName + '[^>]*>([^<]*)<', 'g');
}

/**
 * # matchAll(s, rxp)
 * *Run a regex multiple times until matches are exhausted*
 *
 * @param {String} s Source string
 * @param {RegExp} rxp RegExp object to run on the source
 * @returns {Array} Array of results
 * @private
 */
function matchAll(s, rxp) {
  var matches = [];
  var match = rxp.exec(s);

  while (match) {
    matches.push(match[1]);
    match = rxp.exec(s);
  }

  return matches;
}

/**
 * ## xmlutils.toInt(s)
 * *Convert a string to integer*
 *
 * @param {String} s String to be parsed
 * @returns {Number} Converted integer
 */
xmlutils.toInt = function(s) {
  return parseInt(s, 10);
};

/**
 * ## xmlutils.toFloat(s)
 * *Convert string to a float*
 *
 * @param {String} s String to convert
 * @returns {Number} Converted float
 */
xmlutils.toFloat = function(s) {
  return parseFloat(s);
};

/**
 * ## xmlutils.toDate(s)
 * *Convert a string to Date object*
 *
 * @param {String} s String to be parsed
 * @returns {Date} Converted date
 */
xmlutils.toDate = function(s) {
  return new Date(s);
};

/**
 * ## xmlutils.toBool(s)
 * *Convert a string to Bool*
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
 * ## xmlutils.toString(s)
 * *Pass-through function that does nothing*
 *
 * @param {String} s Strning to be passed through
 * @returns {String} Same string that came in
 */
xmlutils.toString = function(s) {
  return s;
};

/**
 * ## xmlutils.extractData(xml, recipe)
 * *Extract data from XML string using recipe mappings*
 *
 * Recipe object contains a mapping between tag names and coercion functions
 * like `xmlutils.toInt` and `xmlutils.toDate`. Each key in the recipe object
 * will be treated as a valid tag name, and searched for within the XML. Data
 * found within the XML string will be coerced and assigned to a key in the
 * result object. The key name in the result object will match the key name
 * from the recipe object.
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
 * ## xmlutils.hasMessages(xml)
 * *Checks the XML to see if there is a `<messsages>` block*
 *
 * Returns `true` if there is a `<messages>` block.
 * 
 * @param {String} xml The XML string
 * @returns {Boolean} Whether it found the `<messages>` block
 */
xmlutils.hasMessages = function(xml) {
  return Boolean((/<messages[^>]*>/).exec(xml));
};

/**
 * ##xmlutils.extractMessages(xml)
 * *Extract messages from XML string*
 *
 * The messages can be of the following classes:
 *
 *  + _error_: errors and declines
 *  + _info_: success and other information
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
  var messageRe = /<message ([^>]+)>/g;
  var classRe = /class="([^"]+)"/;
  var contextRe = /context="([^"]+)"/;
  var keyRe = /key="([^"]+)"/;
  var attrs;
  var message;
  var messages = [];
  var match = messageRe.exec(xml);

  while(match) {
    attrs = match[1];
    message = {};
    message.cls = classRe.exec(attrs)[1];
    message.context = contextRe.exec(attrs)[1];
    message.key = keyRe.exec(attrs)[1];
    messages.push(message);
    match = messageRe.exec(xml);
  }

  return messages;
};

/**
 * ## xmlutils.decamelize(s)
 * *Converts 'CamelCase' to 'camel_case'*
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
 * ## xmlutils.toXML(o, [topLevel], [keys])
 * *Shallow conversion of JavaScript object to XML*
 *
 * This method converts each key to a single XML node and converts the contents
 * of the key to a text node by calling `toString` on it.
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

/**
 * ## xmlutils.toSamurai(o, mappings)
 * *Remaps the Daimyo field names to Samurai node names in an object*
 *
 * Given an object with Daimyo field names, this method converts only the 
 * fields found in MAPPINGS and renames the fields to Samurai node names 
 * returning a new object with the renamed fields.
 *
 * Example:
 *
 *     var daimyoObj = {
 *        fullName: 'Foo',
 *        lastName: 'Bar',
 *        year: 2012
 *     }
 *     xmlutils.toSamurai(daimyoObj, daimyo.MAPPINGS);
 *     // returns: 
 *     //   {
 *     //     fullName: 'Foo',
 *     //     lastName: 'Bar',
 *     //     expiry_year: 2012
 *     //   }
 *
 * @param {Object} o Daimyo object
 * @param {Object} mappings The mappings for he field names
 * @returns {Object} Object with remapped fields
 */
xmlutils.toSamurai = function(o) {
  var remapped = {};

  Object.keys(o).forEach(function(key) {
    if (MAPPINGS.hasOwnProperty(key)) {
      remapped[MAPPINGS[key]] = o[key];
    } else {
      remapped[key] = o[key];
    }
  });

  return remapped;
};
