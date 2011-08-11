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
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.category = category;
  this.message = message;
  this.details = details;
  this.name = this.constructor.name;
}

util.inherits(DaimyoError, Error);

DaimyoError.prototype.toString = function() {
  return this.category + ': ' + this.message + ': ' +
    util.inspect(this.details);
};

module.exports = DaimyoError;
