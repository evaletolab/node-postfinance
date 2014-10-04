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

/**
 * Get date with specified number of months added
 *
 * @param {Number} months Number of months to add (positive or negative)
 * @returns {Date} A new `Date` object
 */
helpers.getAdjustedDate = function(months) {
  var today = new Date();
  var newMonth;
  var addYears;

  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  today.setMilliseconds(0);

  newMonth = today.getMonth() + months;
  if (newMonth > 11 || newMonth < 0) {
    // Convert surplus months to years
    addYears = Math.floor(newMonth / 12);
    newMonth = newMonth % 12;
  }
  if (addYears) {
    today.setYear(today.getFullYear() + addYears);
  }
  today.setMonth(newMonth);
  return today;
};

/**
 * Wrapper for getAdjustedDate that returns year and month
 *
 * @param {Number} months Number of months to add (positive or negative)
 * @returns {Array} Array containing year and month
 */
helpers.getAdjustedDateparts = function(months) {
  var newDate = helpers.getAdjustedDate(months);
  return [newDate.getFullYear(), newDate.getMonth() + 1];
};
