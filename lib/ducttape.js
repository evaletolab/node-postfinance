/**
 * # ducttape
 * 
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * Miscellaneous helper functions for boring tasks.
 *
 * @author Branko Vukelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

var ducttape = exports;

/**
 * ## ducttape.copyArray(arr)
 * *Deep-copies an array*
 *
 * This method supports clones of simple types only. Objects created with 
 * custom constructors will be treated as normal objects.
 *
 * @param {Array} arr Array to be cloned
 * @returns {Array} Cloned array
 */
ducttape.copyArray = function copyArray(arr) {
  var clone = [];

  // Iterate `arr` and clone members to `clone`
  arr.forEach(function(item) {
    if (typeof item !== 'object') {
      // First take care of simple types
      clone.push(item);
    } else if (Array.isArray(item)) {
      // Take care of arrays
      clone.push(copyArray(item)); // recurse
    } else {
      // Take care of normal objects
      clone.push(ducttape.deepCopy(item));
    }
  });

  return clone;
};

/**
 * ## ducttape.deepCopy(obj)
 * *Deep-copies an object*
 * 
 * This method only supports clones of simple types. Objects created with 
 * custom constructors are not supported.
 *
 * @param {Object} obj Object to clone
 * @returns {Object} The cloned object
 */
ducttape.deepCopy = function deepCopy(obj) {
  var clone = {};

  // Iterate `obj`'s keys and clone them to `clone`
  Object.keys(obj).forEach(function(key) {
    
    // Take care of simple types
    if (typeof obj[key] !== 'object') {
      clone[key] = obj[key];
    } else if (Array.isArray(obj[key])) {
      clone[key] = ducttape.copyArray(obj[key]);
    } else {
      clone[key] = deepCopy(obj[key]);
    }
  });

  return clone;
};

/**
 * addOneTimeAccessor(obj, property, [validator, failSilently])
 * *One-timer accessors with optional validator to an object*
 *
 * The setter function allows setting of a value only once, and it should
 * fail silently on subsequent attempts. Getter works as usual. This gives you 
 * a completely tamper-free property on the given object. Once set, the 
 * property is cemented, and there is no way of modifying the original 
 * value variable from outside.
 *
 * If the value is an object, it is never returned directly. A clone will be 
 * created first. Same applies to arrays. This prevents tampering with the 
 * objects that are used as values.
 *
 * @param {Object} obj Object to which to attach the accessors
 * @param {String} property Name of the property
 * @param {Function} [validator] Optional validator function
 * @param {Boolean} [failSilently] Whether to throw on validation error
 */
ducttape.addOneTimeAccessor = function(obj, property, validator, failSilently) {
  // Protect the original value within the closure
  var val;
  var set = false;

  obj.__defineSetter__(property, function(value) {
    console.log(set);

    // Already set
    if (set) {
      return;
    }

    // Illegal value
    if (typeof validatro === 'function' && !validator(value)) {
      if (failSilently === true) {
        return;
      }
      throw new Error('Illegal value for property ' + property);
    }

  // Set the value and seal it
  val = value;
  set = true;
  });

  obj.__defineGetter__(property, function() {
    if (typeof val !== 'object') {
      return val;
    } else if (Array.isArray(val)) {
      return ducttape.copyArray(val);
    } else {
      return ducttape.deepCopy(val);
    }
  });
};

/**
 * ## ducttape.randomString(len, [pool])
 * *Creates a random string of specified length*
 *
 * This function requires Mersenne Twister random number generator implemented
 * in the [node-mersenne package](http://search.npmjs.org/#/mersenne).
 *
 * @param {Number} len Length of the generated string
 * @param {String} [pool] Pool of characters to use for result string
 * @returns {String} Random string
 */
ducttape.randomString = function(len, pool) {
  var random = require('mersenne');
  var poolLength;
  var output = [];

  pool = pool || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012345' +
    '67890!@#$%^&*()_+{}][;"\'/?.,<>';
  poolLength = pool.length;

  for (var i = poolLength; i; --i) {
    output.push(pool[random.rand(poolLength)]);
  }

  return output.join('');
};

/**
 * ## ducttape.randomHash()
 * *Creates SHA1 hexdigest of a 100-character random string*
 *
 * @returns {String} Random SHA1 hexdigest
 */
ducttape.randomHash = function() {
  var crypto = require('crypto');
  var hash = crypto.createHash('sha1');
  var rstr = ducttape.randomString(100);

  hash.update(rstr);

  return hash.digest('hex');
};
