/**
 * # Ashigaru
 *
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 *
 * jQuery plugin for making requests to Samurai payment gateway via a hidden 
 * iframe.
 *
 * Ashigaru is part of Daimyo (https//github.com/HerdHound/Daimyo).
 *
 * ## About the JSON parser
 *
 * Ashigaru requires either a native JSON parser, or a 3rd party solution.
 *
 * If your environment (browser(s) you intend to support) does not provide the
 * native JSON object, you can use the Crockford's implementation found on
 * [on Github](https://github.com/douglascrockford/JSON-js/blob/master/json2.js).
 *
 * ## Preparing the server
 *
 * Before you can use this plugin, you must make sure that a valid redirect URL
 * is handled on your server. Once Samurai gateway receives data from this 
 * plugin, it will redirect the user to the redirect URL. The redirect URL will
 * have an URL parameter called `payment_method_token` which should be a 
 * 24-digit hexdigest. That token identifies the payment method created by the
 * user. (See the documentation for the `daimyo` module for more information
 * on how to use this token.)
 *
 * Once you have performed any operations you want, you can respond to the 
 * request that was made to the redirect URL. The response should be text/html,
 * and it should contain at least the `<body>` tag, and a single `<script>` tag
 * that contains the JSON response. A typical success response may look like 
 * this:
 *
 *     <body><script>({"status": "ok"})</script></body>
 *
 * Note that the JSON is wrapped in brackets to make it a valid object 
 * expression. Otherwise, the browsers will complain.
 *
 * There is no need to add standard HTML markup because this response will
 * never be rendered. Once you have set up the server-side handler to work this
 * way, you are ready to start using Ashigaru.
 *
 * ## Basic usage
 *
 * Generally, it is expected that you will take care of the user-facing form
 * yourself, validate the input, and extract the data into an object. The 
 * object should have the following properties:
 *
 *  + _firstName_: cardholder's first name (optional)
 *  + _lastName_: cardholder's last name (optional)
 *  + _address1_: cardholder's address line 1 (optional)
 *  + _address2_: cardholder's address line 2 (optional)
 *  + _city_: city (optional)
 *  + _state_: state or region (optional)
 *  + _country_: country (optional)
 *  + _zip_: zip/postal code (optional)
 *  + _number_: card number (required)
 *  + _csc_: card security code, CCV, CVV, CVC, etc (required)
 *  + _year_: expiration year (optional)
 *  + _month_: expiration month (optional)
 *
 * As you can see, only card number and CSC (a.k.a CCV, CVC, CVV) are required,
 * and other fields are optional. To increase the chance of transactions 
 * actually clearing, and minimize your liability in case of trouble, you 
 * should try to collect as much data as possible, but cardholder name, zip, 
 * and address line 1 are probably bare minimum.
 *
 * Once you have created the object containing the cardholder data, you can 
 * call Ashigaru like this:
 *
 *     $.ashigaru(cardData, merchantKey, redirectURL, function(err, data) {
 *       // err means there was an error parsing the JSON or no data
 *       // was ever returned. If all went fine, err should be null.
 *       // data will contain a fully parsed JSON response.
 *     });
 *
 * Ashigaru currently has no mechanisms for retrying a failed connection. You 
 * should make sure you handle such unforeseen problems yourself.
 *
 * @version 0.0.1
 * @author Branko Vurkelic <branko@herdhound.com>
 * @license MIT (see LICENSE)
 */

(function($, window) {

  var originalDomain = window.document.domain;
  var samuraiURI = 'https://samurai.feefighters.com/v1/payment_methods';
  var timeoutLabel;
  var timedOut = false;
  var timeoutInterval = 3000;

  /**
   * ## Remove the hidden form
   */
  function removeForm() {
    $('#samurai-form').remove();
    removeIframe();
  }

  /**
   * ## onResultLoad(iFrame, callback)
   * *Processes data loaded into the iframe*
   *
   * This is triggered when iFrame is loadded with results. This method will
   * use the JSON object to parse the loaded JSON data. If such an object is 
   * not available in your environment, you can load Crockfords json2.js
   * found [on Github](https://github.com/douglascrockford/JSON-js/blob/master/json2.js).
   *
   * @param {jQuery} iFrame The iframe that contians the loaded data
   * @param {Function} callback Callback function that will handle the data
   * @private
   */
  function onResultLoad(iFrame, callback) {
    var resultDocument = $(iFrame).contents();
    var jsonData;

    // Remove the form
    removeForm();

    // The result document should contain JSON data in a <script> tag
    jsonData = $.trim(resultDocument.find('body script').text());

    if (jsonData.slice(0,2) !== '({' && jsonData.slice(-2) !== '})') {
      // No JSON here!
      callback('Could not find JSON data');
      return;
    }

    // Remove the brackets ( and )
    jsonData = jsonData.slice(1, -1);

    try {
      callback(null, JSON.parse(jsonData));
    } catch (e) {
      callback(e);
    }
  }

  /**
   * ## createIframe(callback)
   * *Create an emty hidden iframe to receive response*
   *
   * @param {Function} callback Callback that will be called when data is 
   * loaded into the iframe.
   * @private
   */
  function createIframe(callback) {
    var iFrame = $('<iframe src="" name="samurai-iframe" '+
                   'style="display:none">' +
                   '</iframe>');
    // Attach iframe to <body>
    iFrame.appendTo('body');
    // Do the right thing when iframe loads
    iFrame.load(function() {

      // Did we time out?
      if (timeout) {
        return;
      }

      // Clear the timeout clock
      clearTimeout(timeoutLabel);

      // Load the results and remove the form
      onResultLoad(this, callback);
      removeForm();
    });
    return true;
  }

  /**
   * ## removeIframe()
   * *Remove the hidden iframe*
   *
   * @private
   */
  function removeIframe() {
    setTimeout(function() {
      $('iframe[name=samurai-iframe]').remove();
    }, 1);
  }


  /**
   * ## jQuery.ashigaru(data, merchantKey, redirectURI, callback)
   * *Create and submit hidden form to make request with*
   *
   * The data argument is used to populate form with data. It can have any of 
   * the following fields:
   *
   *  + _firstName_
   *  + _lastName_
   *  + _address1_
   *  + _address2_
   *  + _city_
   *  + _state_
   *  + _zip_
   *  + _number_
   *  + _csc_
   *  + _year_
   *  + _month_
   *
   * The callback is called from the load event handler on the iframe. See the
   * details of the ``onResultLoad`` function in this module.
   *
   * @param {Object} data Object containing the data for the form
   * @param {String} merchantKey Samurai gateway merchant key
   * @param {String} redirectURI URI of the transparent redirect handler
   * @param {Function} callback Called with error and results
   */
  $.ashigaru = function(data, merchantKey, redirectURI, callback) {
    var form;

    if (!data || !merchantKey || !redirectURI || !callback) {
      throw ('All arguments are required');
    }

    var fullData = {
      firstName: '',
      lastName: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      number: '',
      csc: '',
      year: '',
      month: ''
    };

    $.extend(fullData, data);

    var formHTML = '<form id="samurai-form" style="display:none" ' +
      'action="$requestURI" method="POST" target="samurai-iframe">' + 
      '<input type="hidden" name="merchant_key" value="$merchantkey">'+
      '<input type="hidden" name="redirect_url" value="$redirecturl">' +
      '<input type="hidden" name="credit_card[first_name]" value="$firstName">'+
      '<input type="hidden" name="credit_card[last_name]" value="$lastName">' +
      '<input type="hidden" name="credit_card[address_1]" value="$address1">' +
      '<input type="hidden" name="credit_card[address_2]" value="$address2">' +
      '<input type="hidden" name="credit_card[city]" value="$city">' +
      '<input type="hidden" name="credit_card[state]" value="$state">' +
      '<input type="hidden" name="credit_card[zip]" value="$zip">' +
      '<input type="hidden" name="credit_card[card_number]" value="$number">' +
      '<input type="hidden" name="credit_card[card_type]" value="$issuer">' +
      '<input type="hidden" name="credit_card[cvv]" value="$csc">' +
      '<input type="hidden" name="credit_card[expiry_year]" value="$year">' +
      '<input type="hidden" name="credit_card[expiry_month]" value="$month">' +
      '</form>';

    // Replace non-data field placeholders and form attribute placeholders
    formHTML = formHTML.replace('$requestURI', samuraiURI);
    formHTML = formHTML.replace('$merchantkey', merchantKey);
    formHTML = formHTML.replace('$redirecturl', redirectURI);

    // Replace placeholders in form HTML with real data
    for (var key in fullData) {
      if (fullData.hasOwnProperty(key)) {
        formHTML = formHTML.replace('$' + key, fullData[key]);
      }
    }

    // Inject this into DOM
    form = $(formHTML);

    // Sanity check
    if (form.attr('action') === '$requestURI') { 
      throw 'Form error'; 
    }

    // Attach the form to body
    form.appendTo('body');

    // Submit the form
    form.unbind('submit');
    form.submit(function(e) {
      e.stopPropagation();
      return createIframe(callback);
    });

    // Fire the timout clock at 3 seconds
    timeoutLabel = setTimeout(function() {

      // Set the timeout flag
      timedOut = true;

      // Execute callback with error message
      callback('Connection timed out');

    }, timeoutInterval);

    form.submit();
  };
 
}(jQuery, this));

