/**
 * # error
 *
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * PostFinanceError object used as the main error object throughout the Daimyo 
 * implementation.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var util = require('util');
var messages = require('./messages');

/**
 * ## error.PostFinanceError
 * *Daimyo error object*
 * 
 * @constructor
 */
function PostFinanceError(category, message, details, more) {
  more=more||''
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  var status=parseInt(message),code=parseInt(details)
  this.category = category;
  this.code=code||undefined
  this.message = status&&messages.getStatus(status)+':'+more;
  this.details = code&&messages.getDescription(code)||details;
  this.name = this.constructor.name;
}

util.inherits(PostFinanceError, Error);

PostFinanceError.prototype.toString = function() {
  return this.category + ': ' + this.message + ': ' +
    util.inspect(this.details);
};

module.exports = PostFinanceError;
