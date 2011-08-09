/**
 * Daimyo - error object
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var util = require('util');

/**
 * Daimyo error object
 * 
 * @private
 */
function DaimyoError(category, message, details) {
  this.category = category;
  this.message = message;
  this.details = details;
}
DaimyoError.prototype.toString = function() {
  return 'DAIMYO_ERR in ' + this.category + ': ' + this.message + '\n' + 
    util.inspect(details);
};
DaimyoError.prototype = Error;

module.exports = DaimyoError;
