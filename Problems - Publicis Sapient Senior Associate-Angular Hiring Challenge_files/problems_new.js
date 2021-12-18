/* global ID_CLICK_BY_HISTORY: true */
/* global G_SCRIPTS_LOADED, mcq_timers */

// copied from base1.0.1.js - Start
var AJAX_OK = 'OK';
var AJAX_ERROR = 'ERROR';
// copied from base1.0.1.js - End
// this will store list of all the problems
var PROBLEM_LIST = [];
var $testExperienceApp = $("#testExperienceApp")
// jQuery DOM selectors cache
var jq_cache = {};

/*jshint strict:false */

// Global variable for the test timer
var CLOSE_BROWSER = false;
var isTestFinished = false;


function $$(selector) {
  /*
   * EXPERIMENTAL - Use it at your own risk, no warranty!
   * If selector present in cache, return from cache.
   * else, do a lookup and store in cache for future use.
   */
  var key;
  if (jq_cache.hasOwnProperty(key)) {
    return jq_cache[key];
  } else {
    var el = $(selector);
    jq_cache[selector] = el;
    return el;
  }
}

var moveToNextQuestion = function() {
  // click the load-next-question
  // link on the page to jump to the
  // next problem
  $(".load-next-question").click();
};

var disable_submit_button = function() {
  /*
   * Disable any submit button in question.
   */
  var $problem_detail = $$("#problem-detail");
  var $submit = $problem_detail.find("input[type=submit]");
  if ($submit.length > 0) {
    $submit.attr("disabled", "disabled");
  }
};

var enable_submit_button = function() {
  /*
   * Enable any submit button in question.
   */
  var $problem_detail = $$("#problem-detail");
  var $submit = $problem_detail.find("input[type=submit]");
  if ($submit.length > 0) {
    $submit.removeAttr("disabled");
  }
};

var reset_mcq_answer = function() {
  // Works, if answer has not been set on the backend.
  $("#problem-detail")
    .find("input[type=radio]:checked")
    .removeAttr("checked");
};

// TODO remove the global variable in future
// used in ProblemTitleList.js
window.attemptedHashes = [];
var markAttempted = function(hash) {
  if (window.attemptedHashes.indexOf(hash) === -1 && hash ) {
    window.attemptedHashes.push(hash);
    window.addAttemptedProblems(hash);
  }
  if(!window.showNewNavigation){
    // TOREMOVE when done fully in react
    $("#"+hash).addClass('attempted');
  }
}

var markUnAttempted = function(hash) {
  if (window.attemptedHashes.indexOf(hash) > -1 ) {
    window.attemptedHashes.splice(window.attemptedHashes.indexOf(hash), 1);
    window.removeAttemptedProblems(hash);
  }
  if(!window.showNewNavigation){
    // TOREMOVE when done fully in react
    $("#"+hash).removeClass('attempted');
  }
}

var initAttempted = function() {
  var arr = [];
  var problems;
  try {
    var problems = JSON.parse($("#attempted-problems").val());
  } catch (e) {
    var problems = {};
  }
  var keys = Object.keys(problems);
  keys.forEach(function(item)  {
      arr = arr.concat(problems[item]);
  });

  arr.forEach(function(pid) {
    var $elem = $("[problem-id="+pid+"]");
    if($elem.length) {
      $elem.addClass('attempted');
      markAttempted($elem.attr('id'));
    }
  })
}

$(document).ready(function() {
  // For automatically reporting AJAX errors from jQuery using Sentry
  $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    if (typeof Sentry !== 'undefined'){
      Sentry.withScope(function(scope) {
        var extras = {
          type: ajaxSettings.type,
          url: ajaxSettings.url,
          data: ajaxSettings.data,
          status: jqXHR.status,
          error: thrownError || jqXHR.statusText,
          response: jqXHR.responseText && jqXHR.responseText.substring(0, 100),
        };
        for (var key in extras) scope.setExtra(key, extras[key]);
        Sentry.captureMessage("message", thrownError || jqXHR.statusText);
      });
    }
  });

  initLoadExternalURL();
  registerEvents();
  hideAlertContainer();
});

function registerEvents() {
  $testExperienceApp.delegate(
    "input[type=submit], button:not(.compile-test-button)",
    "click",
    function(event) {
      // Change state of attempted circle
      var problem_hash = $(this)
        .parent()
        .attr("private-url-hash");
      var $problem_detail = $(".mcq-options-" + problem_hash);
      var radio_buttons = $problem_detail.find("input[type=radio]");
      if (radio_buttons.length > 0) {
        // Check if any radio button is selected.
        if (!radio_buttons.is(":checked")) {
          return;
        }
      } else {
        // mark_attempted(problem_hash);
        markAttempted(problem_hash);
      }
    }
  );

  $testExperienceApp.on("click", "input[type=radio]", enable_submit_button);

  $testExperienceApp.on("click", ".reset-answer-js-only", reset_mcq_answer);

  $testExperienceApp.on("click", ".reset-answer", function() {
    var problem_hash = $(this)
      .parent()
      .attr("private-url-hash");
    // mark_unattempted(problem_hash);
    markUnAttempted(problem_hash);
  });

  $testExperienceApp.on("input propertychange", "#wmd-input", function() {
    var wmd_preview_container = $(".wmd-preview-container");
    if (wmd_preview_container.hasClass("hidden")) {
      wmd_preview_container.removeClass("hidden");
    }
  });

  // make a list of problems that have been
  // sent
  $(".question-item").each(function() {
    PROBLEM_LIST.push($(this));
  });

  $("#end-test-click").live("click", function() {
    CLOSE_BROWSER = true;
  });


  $('.alert-message').live('click', '.close-icon', function() {
    var $this = $(this);
    if($this.hasClass('alert-message')) {
      $this.remove();
    } else {
      var $prnt = $this.closest('.alert-message');
      if ($prnt.length) {
        $prnt.remove();
      } else {
        $("#alert-message-holder").find('.alert-message').not('.hidden').remove();
      }
    }
  });

  // Automatically resize text area depending on length of input
  $(".right-pane")
    .on("keyup input", ".wmd-input", function() {
      var offset = this.offsetHeight - this.clientHeight;
      var scroll = $(".right-pane").scrollTop();
      $(this)
        .css("height", "auto")
        .css("height", this.scrollHeight + offset);
      $(".right-pane").scrollTop(scroll);
    })
    .removeAttr("data-autoresize");

  // copied from base1.0.1.js - Start
  // show a div and hide another div
  $('body').on('click', '.show-hide', function(event) {
      event.preventDefault();
      var $this = $(this);
      var hide_id = $this.attr('hide');
      var hide = $('#'+hide_id);
      var show_id = $this.attr('show');
      var show = $('#'+show_id);
      hide.hide();
      show.show();
  });
  // end show-hide
  // copied from base1.0.1.js - End
}

// lazy-load(templates and assests) during assessment
function lazyLoadAssessment() {
  $.ajax({
    type: 'GET',
    // TODO keep url in some constants
    url: '/AJAX/'+window.headerObj.eventSlug+'/problems-lazy-load/',
    success: function(resp) {
        $('body').append(resp);
    },
    error: function() {
      // TODO register sentry event
      $('.flow-help').closest('.tool-tip').remove()
    }
  })
}

// This function initilizes all the timers on page load for
// attempted timed MCQ questions
function startInititalTimers(problem_times) {
  for (var problem in problem_times) {
    if (problem_times.hasOwnProperty(problem)) {
      startTimer(parseInt(problem), parseInt(problem_times[problem]));
    }
  }
}

// This is a generic function to start the timer with a particular time
function startTimer(problem_id, remaining_time, problem_hash) {
  // if `mcq_timers` list already available then do not create
  // `mcq_timers` list contains the problem IDs for which the timer
  // started
  if (!window.mcq_timers) {
    window.mcq_timers = [];
  }
  var interval;

  if (mcq_timers.indexOf(problem_id) === -1) {
    mcq_timers.push(parseInt(problem_id));
    if (remaining_time >= 0) {
      interval = setInterval(updateCountdown, 1000);
    } else {
      disableComponent();
    }
  }

  function updateCountdown() {
    $(".countdown-left-" + problem_id).show();
    var cd_element = $(".countdown-" + problem_id);
    var cd_element_left = $(".countdown-left-" + problem_id);

    if (cd_element.length > 0 && cd_element_left.length > 0) {
      var mins = Math.floor(remaining_time / 60);
      if (mins < 10) {
        mins = "0" + mins;
      }
      var secs = remaining_time - mins * 60;
      if (secs < 10) {
        secs = "0" + secs;
      }
      cd_element.html(mins + ":" + secs);
      cd_element_left.html(
        "<i class='float-left fa-clock-o fa timer-icon margin-left-12 margin-right-12'></i>" +
          mins +
          ":" +
          secs
      );
    }

    // If remaining_time is zero then stop the timer and show `Time up!`
    if (remaining_time === 0) {
      // Disable the buttons and everything
      clearInterval(interval);
      var que = $("#question-" + problem_id);
      que.html(
        "<i class='float-left fa-clock-o fa timer-icon margin-left-12 margin-right-12'></i> " +
          TIME_UP_MESSAGE
      );
      // var que_countdown = $("#countdown-" + problem_id);
      // que_countdown.html('<i class="fa fa-info-circle fa-red"></i> ' + TIME_OVER_MESSAGE_1);
      var que_answer = $(".answer-" + problem_id);
      // If user is attempting a question and allowed time for that question
      // is over we load the next question
      if (que_answer.length > 0) {
        que_answer.find(".load-next-question").trigger("click");
      }
      // Disable the problem node.
      disableComponent();
    }

    remaining_time -= 1;
  }

  function disableComponent() {
    // Disable the submit button
    if (!problem_hash) return;

    // Remove the DOM of the problem node
    $(".problem-" + problem_hash)
      .children()
      .not(".next-button-banner, .disabled-mcq")
      .detach();
  }
}

// This function disables input fields for a timed out MCQ question
function disableInputs() {
  var inputs = document.getElementsByTagName("input");
  if (inputs) {
    for (var index = 0; index < inputs.length; ++index) {
      inputs[index].disabled = true;
    }
  }
}

$testExperienceApp.on("click", ".android-submit-button", function() {
  $(".android-start-flow").removeClass("android-start-flow");
});

$("body").on("keyup", ".test-input", function() {
  var length = $(this).val().length;
  var remaining = 1024 - length;
  $(".test-input-remaining").html(remaining);
  if (remaining === 0) {
    $(".test-error").addClass("red-text");
  } else {
    $(".test-error").removeClass("red-text");
  }
});

// Log question was viewed by candidate
function log_question_viewed_activity(element) {
  if(!element) {
    return;
  }
  $this = $(element);
  private_url_hash = $this.attr("id");
  url = window.getCurrentLanguageCodeURL()+'/AJAX/log/problem/viewed/';
  event_id = window.headerObj.eventId;
  p_type_v = $this.attr("p-type");
  data = {
    event_id: event_id,
    p_type_v: p_type_v,
    private_url_hash: private_url_hash,
  };

  $.ajax({
    url: url,
    type: "POST",
    data: data,
  });
}

function closeDropDown() {
  $(".expand-box").hide();
}

// Change tabs in programming questions
$("body").on("click", ".tab-container:not(.tab-selected)", function(e) {
  $this = $(this);
  $sibling = $($this.siblings(".tab-selected"));

  // Change selected tab
  $sibling.removeClass("tab-selected");
  $this.addClass("tab-selected");

  // Change tab content
  visible_content = $sibling.attr("data-container");
  $("." + visible_content).hide();

  hidden_content = $this.attr("data-container");
  $("." + hidden_content).show();
});


function hide(selector) {
  $(selector).addClass("hidden");
}
function show(selector) {
  $(selector).removeClass("hidden");
}

// copied from base.1.0.1.js, for showing front-end problems - Start
/*
  Definition of Generic Loader Starts here

  updateAncestorsOnLoaderMount,
  updateAncestorsOnLoaderUnmount,
  insertLoader,
  removeLoader,

*/

/*
  updateAncestorsOnLoaderMount
    Called when a loader is mounted on its parent
    Arguments:
      startNode i.e ParentNode of the loader
      The level upto which no-scroll class should be applied for ancestors of the startNode
*/

function updateAncestorsOnLoaderMount(startNode, level) {
    if(level <= 0) {
        return;
    } else {
        var parents = startNode.parents();
        for (var i = 0;
            (i < parents.length && i < level); i++) {
            $(parents[i]).addClass("no-scroll");
        }
    }
}

/*
  updateAncestorsOnLoaderUnmount
    Called when A Loader is unmounted from its parent
    Arguments:
        startNode i.e ParentNode of the loader
        The level upto which no-scroll class should be removed from ancestors of the startNode
*/

function updateAncestorsOnLoaderUnmount(startNode, level) {
    if (level <= 0) {
        return;
    } else {
        var parents = startNode.parents();
        for (var i = 0;
            (i < parents.length && i < level); i++) {
            $(parents[i]).removeClass("no-scroll");
        }
    }
}

/*
  insertLoader
    Called when a loader is required to cover its parent
    Arguments:
        parentJqueryObj i.e Parent Jquery Object which the loader is going to cover
        config:
        {
            loaderText: <string>; // used as the display text above the dots loader

            fontSize: <string>; // defaults to 20px (inherited from CSS Class 'large-20') eg 2px, 2em, 2%, etc

            isOpaque: <boolean>; // used to make the bg of loader opaque or translucent.

            noScrollParentsLevel: <number> // The level upto which no-scroll class should be applied to ancestors of the parent.
        }
*/

function insertLoader(parentJqueryObj, config) {
    if(typeof config === 'undefined' || config === null) {
        config = {};
    }
    var forRender = '<div class="generic-loader-wrapper';
    if (config.isOpaque) {
        forRender += ' white-background';
        // hide all siblings from view but don't remove them
        parentJqueryObj.children().addClass('forced-not-visible');
    }
    forRender += '">';
    if (config.loaderText) {
        forRender += '<div class="loading-heading align-center standard-margin larger dark weight-700 large-20"';
        if (config.fontSize) {
            forRender += 'style="font-size: ' + config.fontSize + '"';
        }
        forRender += ">" + config.loaderText + "</div>";
    }
    forRender +=
        '<div class="nuskha-dots-loader-container dots-loader-container body-font-12 brand-gray align-center full-width"><div class="nuskha-dots-loader"><span></span><span></span><span></span></div></div></div>';
    // make parentJqueryObj relative if no position is set; for position absolute and fixed, we got no problem
    if (parentJqueryObj.css("position") === "static") {
        parentJqueryObj.css("position", "relative").data("setInitialPos", "static");
    }
    parentJqueryObj.addClass("no-scroll full-height");
    if (config.noScrollParentsLevel === undefined) {
        config.noScrollParentsLevel = 0;
    }
    updateAncestorsOnLoaderMount(parentJqueryObj, config.noScrollParentsLevel);
    parentJqueryObj.data("noScrollParentsLevel", config.noScrollParentsLevel).append(forRender);
}

function removeLoader(parentJqueryObj) {
    updateAncestorsOnLoaderUnmount(parentJqueryObj, parentJqueryObj.data("noScrollParentsLevel"));
    parentJqueryObj.removeClass("no-scroll full-height");
    parentJqueryObj.children().removeClass('forced-not-visible');
    if (parentJqueryObj.data("setInitialPos") === "static") {
        parentJqueryObj.css("position", "static");
    }
    parentJqueryObj.children(".generic-loader-wrapper").remove();
}
/**
  Definition of Generic Loader Ends here
**/
// Load script dynamically and then use callback to perform some operation
function loadScripts(array, callback, error_callback){

    // if no error_callback provided
    if(typeof error_callback != "undefined") {
        var _continue = false;
        var _started = false;

        // set timeout for scripts loading - 40s
        var scripts_watcher = function() {
            error_callback && error_callback();
            return false;
        };
        var _scripts_loading_tracker = setTimeout(scripts_watcher, 40*1000);
    }

    var loader = function(src, handler) {
        if(typeof error_callback != "undefined") {
            _continue = false;
            _started = true;
        }

        var script = document.createElement("script");
        script.src = src;

        //To log errors for dynamically added scripts
        script.crossOrigin = 'anonymous';

        // Other browsers
        script.onload = function(){
            if(typeof error_callback != "undefined") {
                _continue = true;
                clearTimeout(_scripts_loading_tracker);
            }
            handler();

        }

        // MSIE browser
        script.onreadystatechange = function() {
            if (this.readyState == 'complete') {
                if(typeof error_callback != "undefined") {
                    _continue = true;
                    clearTimeout(_scripts_loading_tracker);
                }
                handler();
            }
        }

        // on error
        if(typeof error_callback != "undefined") {
            script.addEventListener('error', function(){
                _continue = false;
                 clearTimeout(_scripts_loading_tracker);
                 handler();

            }, true);
        }

        var head = document.getElementsByTagName("head")[0];
        (head || document.body).appendChild( script );
    };
    (function(){

        // error in loading one of the scripts
        if(typeof error_callback != "undefined") {
            if(_continue == false && _started == true) {
                error_callback && error_callback();
                return false;
            }
        }

        // no error
        if(array.length!=0){
            loader(array.shift(),arguments.callee);
        }else {
            callback && callback();
            return false;
        }
    })();
}

function getBrowserInfo() {
    navigator.sayswho= (function(){
        var ua= navigator.userAgent,
            N= navigator.appName, tem,
            M= ua.match(/(opera|chrome|safari|firefox|msie|trident)\/?\s*([\d\.]+)/i) || [];
        M= M[2]? [M[1], M[2]]:[N, navigator.appVersion, '-?'];
        if(M && (tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
        return M.join(' ');
    })();

    var browser = navigator.sayswho;
    var parts = browser.split(" ");
    browser = parts[0].toLowerCase();
    version = parts[1];
    var version_parts = version.split(".");
    version = parseInt(version_parts[0]);
    return {
        name: browser,
        version: version
    }
}

// copied from base.1.0.1.js, for showing front-end problems - Start

// copied from base.1.0.1.js for showing alerts - Start
var MESSAGE_FADEOUT_TIME = 5000;
function hideAlertContainer() {
    var messageHolder = $('#alert-message-holder');
    if(messageHolder.length == 0) {
        messageHolder = $("#fancy-alert-message-holder");
    }
    var messages = messageHolder.find('.alert-message');

    // assuming there is always a message on the page
    var message = messages.first();

    // make a clone, there should always be
    // an element which we can override for adding
    // a new message
    var clone = message.clone();
    clone.addClass('hidden');

    messages.each(function() {
        var message = $(this);
        if (message.hasClass('hidden')) {
            message.remove();
        } else {
            if (!message.hasClass('permanent')) {
                if (message.hasClass('fancy-alert-message')) {
                    setTimeout(function() {
                        message.slideUp(1000);
                    }, 2000);
                }
                else {
                    // fade out the element and then remove it
                    setTimeout(function(){
                        message.fadeOut(function() {
                            message.remove();
                        })
                    }, MESSAGE_FADEOUT_TIME);
                }
            }
        }
    });

    // after all the messages have been removed or
    // faded out append the final message
    messageHolder.append(clone);
}

// add an alert in the alert placeholder
function addAlert(message_text, permanent) {
    var messageHolder = $('#alert-message-holder');
    if (messageHolder.length == 0) {
        messageHolder = $('#fancy-alert-message-holder');
    }
    var messages = messageHolder.find('.alert-message');

    // there will always be one message
    var message = messages.first();
    var clone = message.clone();
    clone.find('.message').text(message_text);

    // blindly remove the permanent and
    // hidden class
    clone.removeClass('permanent');
    clone.removeClass('hidden');

    // add the permanent class if required
    if (typeof permanent != undefined) {
        if (permanent == true) {
            clone.addClass('permanent');
        }
    }
    messageHolder.append(clone);
    hideAlertContainer();
}

// copied from base.1.0.1.js for showing alerts - End
// copied from base.1.0.1.js for cookies - Start
function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}
// copied from base.1.0.1.js for cookies - End
// copied from base.1.0.1.js for FE-add-library - Start
 // to show a modal window
$('body').on('click', '.show-modal', function() {
    var target_id = $(this).attr('target');
    var target = $('#'+target_id);

    // show the modal window
    target.show();
    target.modal({
        onClose: function(dialog){
            dialog.data.fadeOut(300);
            dialog.container.fadeOut(300, function () {
                dialog.overlay.hide();
                $.modal.close();
                $('.modal-window').hide();
            });
        },
        onOpen: function(dialog){
            dialog.overlay.fadeIn(300);
            dialog.data.show();
            dialog.container.fadeIn(300);
        },
        onShow: function(dialog){
            var execute = target.attr('execute-on-show');
            if (execute) {
                execute_commands = execute.split(" ");
                for (var i=0; i<execute_commands.length; i++) {
                    window[execute_commands[i]]();
                }
            }
        }
    });
    return false;
});
// copied from base.1.0.1.js for FE-add-library - End
// copied from base.1.0.1.js for Showing loader incase of view all-submissions - Start
var LOADER_HTML = '<div class="nuskha-dots-loader-container dots-loader-container body-font-12 brand-gray align-center full-width"><div class="nuskha-dots-loader"><span></span><span></span><span></span></div></div>';
var HORIZONTAL_LOADER_HTML = '<div class="horizontal-loader"></div>';
var LOADER_HTML_NO_MARGIN = '<div class="dots-loader-no-margin nuskha-dots-loader-container dots-loader-container body-font-12 brand-gray align-center full-width"><div class="nuskha-dots-loader"><span></span><span></span><span></span></div></div>';
var LOADER_HTML_WITH_MARGIN = '<div class="dots-loader" style="margin: 30px 0 30px 0";></div>';
// copied from base.1.0.1.js for Showing loader incase of view all-submissions - End

// copied from base1.0.1.js for submission-table log column modal display - Start
function init_sticky() {
  $('.sticky-item').each(function(index) {
    var $this = $(this);

    // check if this is already sticky
    var is_sticky = $this.attr('is-sticky');
    if (is_sticky !== undefined) {
      return;
    }

    var options = {};

    var top_spacing = $this.attr('sticky-top');
    if (top_spacing === undefined) {
      top_spacing = 0;
    } else {
      top_spacing = parseInt(top_spacing);
    }
    options['topSpacing'] = top_spacing;

    var bottom_spacing = $this.attr('sticky-bottom');
    if (bottom_spacing === undefined) {
      bottom_spacing = 0;
    } else {
      bottom_spacing = parseInt(bottom_spacing);
    }

    options['bottomSpacing'] = bottom_spacing;
    options['responsiveWidth'] = true;

    $this.sticky(options);
    $this.attr('is-sticky', 'true');
    $this.width($this.width() + 'px');
    // Set height auto for the sticky wrapper added automatically, this
    // keeps the HTML sane.
    $this.parent().css('height', 'auto');
  });
}


function domElementLive() {

  try {
    // process tool-tip class if any such element was loaded
    $('.tool-tip').tipTip({
      defaultPosition: 'top'
    });
    $('.no-escape-tool-tip').tipTip({
      defaultPosition: 'top',
      noEscape: true
    });
  } catch (err) {
    if (debug)
      console.log(err.message);
  }

  try {
    // add custom scroll-bar if any such element was loaded
    $('.nice-scrollbar').niceScroll(niceScrollArgs);
    var niceScrollObj = $('.nice-scrollbar').getNiceScroll();
    niceScrollObj.resize();
  } catch (err) {
    if (debug)
      console.log(err.message);
  }

  try {
    $('.custom-scrollbar').mCustomScrollbar(customScrollbarArgs);
  } catch (err) {
    if (debug)
      console.log(err.message);
  }

  /*
   * nicescroll is not working in modal window.
  try {
      $('.nice-scrollbar-modal').niceScroll(niceScrollArgs);
  } catch(err) {
      if (debug)
          console.log(err.message);
  }
  */

  try {
    // add custom scroll-bar if any such element was loaded
    $('.nice-scrollbar-dark').niceScroll(niceScrollArgs);
    var niceScrollObj = $('.nice-scrollbar-dark').getNiceScroll();
    niceScrollObj.resize();
  } catch (err) {
    if (debug)
      console.log(err.message);
  }

  try {
    styleCode();
  } catch (err) {
    if (debug)
      console.log(err.message);
  }

  // disable all input fields of a form
  // which has the class disabled
  $('form.disabled').each(function() {
    $(this).find('input').each(function() {
      $(this).attr('disabled', 'disabled');
    });
  });

  init_sticky();
}


$('.ajax-modal').live('click', function() {
  var url = $(this).attr('ajax');
  var target_id = $(this).attr('target');
  var target = $('#' + target_id);
  var method = $(this).attr('method')
  if (!method) {
    method = 'POST'
  }
  // show the div and then attach the modal window to it
  target.show();
  if (target.hasClass('large-modal')) {
    target.modal({
      onClose: function(dialog) {
        $.modal.close();
        $('.modal-window').hide();
      },
      minHeight: 600,
      minWidth: 830,
    });
  } else if (target.hasClass('very-large-modal')) {

    target.modal({
      onClose: function(dialog) {
        $.modal.close();
        $('.modal-window').hide();
      },
      minHeight: 600,
      minWidth: 960,
    });

  } else if (target.hasClass('fix-modal-top')) {
    // for ajax modal as the content is loaded later,
    // top align of the modal is not appropriate. So min
    // height is being set.
    target.modal({
      onClose: function(dialog) {
        $.modal.close();
        $('.modal-window').hide();
      },
      minHeight: 450,
    });

  } else {

    target.modal({
      onClose: function(dialog) {
        $.modal.close();
        $('.modal-window').hide();
      },
    });

  }
  // add the ajax loader to the modal window
  target.find('.modal-content').prepend(LOADER_HTML);

  $.ajax({
    type: method,
    url: url,
    dataType: 'json',
    success: function(response) {
      if (response['status'] == AJAX_OK) {
        target.html(response['data']);
        var url = response['url'];
        if (url) {
          window.open(url, '_blank');
        }
        if (response['alert_message']) {
          addAlert(response['alert_message']);
        }
      } else {
        $.modal.close();
        $('.modal-window').hide();
      }
      domElementLive();

    },
    error: function(response) {

      $.modal.close();
      $('.modal-window').hide();
    },
    statusCode: {
      404: function() {
        alert("There was some error in accessing the resource, re-loading the page.");
        window.location.reload();
      },
      403: function() {
        window.location.reload();
      }
    }
  });
  return false;
});

$('.close-modal-window').live('click', function() {
  $.modal.close();
  $('.modal-window').hide();
});
// copied from base1.0.1.js for submission-table log column modal display - End

/* copied from base1.0.1.js for external link preview modal starts here */
function readAndLoadExternalLinkInModal(fileURL) {
  var externalContentWrapper = $("#external-link-content-wrapper > pre");
  externalContentWrapper.html(LOADER_HTML);

  $.ajax({
      url: fileURL,
      type: 'GET',
      crossDomain: true,
      success: function(data) {
          externalContentWrapper.text(data);
      },
      error: function(error) {
          externalContentWrapper.text(SOMETHING_WENT_WRONG_ERROR_TEXT);
      }
  });
}

function initLoadExternalURL() {
  $("body").on('click', '.load-external-url', function() {
      var url = $(this).attr('href');

      if (!url) {
          return false;
      }

      readAndLoadExternalLinkInModal(url);
  });
}
/*copied from base1.0.1.js for external link preview modal ends here */
