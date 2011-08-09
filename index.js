/**
 * Daimyo - main module
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var daimyo = require('./lib/daimyo');
var config = require('./lib/config');

exports.settings = config.settings;
exports.configure = config.configure;
exports.option = config.option;
exports.Card = daimyo.Card;
