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
 * ## getInnerXML(xml, tagName)
 * *Return raw inner XML of a node with a given tag name*
 *
 * This only searches inside the first match.
 *
 * @param {String} xml Source XML
 * @param {String} tagName Name of the tag for which to retrun inner XML
 * @returns {String} Inner XML contents for the first matched tag
 * @private
 */
xmlutils.getInnerXML=function(xml, tagName) {
  var openTagRe = new RegExp('<' + tagName + '[^>]*>');
  var closeTagRe = new RegExp('</' + tagName + '>');
  var closedMatch;
  var startPos = 0;
  var substring;

  // Go to first match
  openTagRe.exec(xml);

  // Remember position and get slice of XML withotu the text before open tag
  startPos = openTagRe.lastIndex;
  substring = xml.slice(startPos);

  // Find closing tag in the substring
  closedMatch = closeTagRe.exec(substring);
  
  return xml.slice(startPos, closedMatch.index);
}



xmlutils.getAttributesXML=function(xml, tagName) {
  var node=this.getInnerXML(xml,tagName).replace(/[\n\r]/g,' ')
  var match, rx = /\b(\S*)\s*=\s*"([^"]*)"/g;
  var result={}
  while (match = rx.exec(node)) {
    if(match[2])
      result[match[1]]=match[2]
  }  

  return result;
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

