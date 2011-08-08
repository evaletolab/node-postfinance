/**
 * Daimyo - test helpers
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var helpers = exports;
var createHash = require('crypto').createHash;

/**
 * Creates a SHA1 hash truncated to 24 characters from a given base
 *
 * This function is used by tests to generate fake keys. `base` can be any 
 * valid JavaScript object. It will be converted to a string using `toString` 
 * method.
 * 
 * @param {Object} base Any valid JavaScript object
 * @returns {String} SHA1 hexdigest of the base 
 */
helpers.generateKey = function(base) {
  var sha1 = createHash('sha1');
  sha1.update(base.toString());
  return sha1.digest('hex').slice(0, 24);
};
