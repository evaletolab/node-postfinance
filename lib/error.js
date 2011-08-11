/**
 * # error
 *
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * DaimyoError object used as the main error object throughout the Daimyo 
 * implementation.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var util = require('util');

/**
 * ## error.DaimyoError
 * *Daimyo error object*
 * 
 * @constructor
 */
function DaimyoError(category, message, details) {
  this.category = category;
  this.message = message;
  this.details = details;
}

util.inherits(DaimyoError, Error);

DaimyoError.prototype.toString = function() {
  return 'DAIMYO_ERR in ' + this.category + ': ' + this.message + '\n' + 
    util.inspect(details);
};

module.exports = DaimyoError;
