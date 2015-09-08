// --------------------------------------------------------------------------
//
//  JSCT application controller -- setup/manage global aspects of the app
// 
//  This controller's responsibilities (mapped to application lifecycle) are: 
//  - BIRTH - set up the environment
//    - PRE-INIT: create app namespace, bootstrap data, load user preferences 
//    - INIT: create app-global views (e.g. the commandBar at top of screen),
//      create router and start Backbone.history, restore prev session state,
//      establish initial global layout (dualPane or singlePane), define  
//      app-global listeners like $(window).resize         
//  - LIFE: manage layout of primary views, adjusting to available space;
//          rspond to changes in user preferences related to layout 
//  - DEATH: for session persistence save application state to localStorage
//
//   Yep, that's a lot of responsibilities for a single module, but I don't 
//   want to decompose things too much, want to keep this demo app easy to   
//   read, remember that this is targeted to SPA/Backbone noobs. Also,
//   keep in mind that application controllers generally have more   
//   responsibilities and also dependencies than most other modules (so 
//   this "knows" more about the app's environment, such as some div ID's). 
//
//   This application is largely driven by application-level state. This 
//   state is stored in the Backbone model: js/models/application.js.
//   At app init previous state is read from localStorage and used to 
//   populate the appState model, restoring the previous session's state
//   (exception: if URL has parms then these "win" over state restoration)
//   
//   This is just a demo app, not a model or reference app. It lacks things
//   you might want in a real app - e.g. you might like to have app lifecyle 
//   events (e.g. init, preinit), also might need more sophisticated cleanup  
//   processing for subviews, etc. For this sort of robust application-level 
//   functionality you should check out Backbone Marionette, Chaplin, etc. 
//
//   As with all my demo apps this code is freighted with comments. These  
//   comments are pretty informal, may even still include some notes to
//   myself (hopefully I've removed all the curse words)
//
//   For more info on JSCT application architecture and Backbone fundamentals  
//   see my JSCT Overview post at: 
//   http://www.dlgsoftware.com/primers/JSCT_SPA_Backbone_demo_app.php
//
//   Dan - March 2015
// ----------------------------------------------------------------------------
/*global $, Backbone, _, jQuery, FastClick */

// First task: create application namespace 
var jsct = jsct || {};

// TIP: when memory profiling use below cacheLength assignment to reduce the number 
// of detached DOM Trees caused by jQuery sizzle selector caching (can create a lot 
// of DDTs which will appear in devtools Retainers view with reference to 'sizzle'). 
// $.expr.cacheLength=1; 

// Note that this function is immediately self-invoked
(function ($) {

    'use strict';

    var filterWasActive = false,
        appInitMsgText = "(triggered by $(document).ready)",
        logCSS = " color:blue";

    //===============================================================================
    // PRE-INIT TASKS: run on <script> load, before DOM is ready. Sets up environment
    //===============================================================================
    if (!supportsLocalStorage()) {
        return; // Note: *not* using a localStorage polyfill
    }

    // IE console patch: this demo app writes diagnostics to console and below handles 
    // older IE which errors if the console is referenced when its devtools aren't open
    /*if (typeof console === "undefined") {
        console = {
            log: function () {},
            info: function () {},
            warn: function () {},
            error: function () {}
        };
    }*/

    // Get user prefs early since they affect layout, writing of diagnostics to console, etc. 
    restoreUserPrefs();

    // Set up pubsub object for loose coupling: event publishers and subscribers don't need to
    // know about each other they just need to know about this global pubsub intermediary (and 
    // yes I could just use the Backbone object for this but I like a dedicated pubsub object)
    jsct.pubsub = _.extend({}, Backbone.Events);

    // Bootstrap data early. NOTE: this approach is NON_STANDARD!!! In general you should NOT 
    // use fetch() for your intial db load.  Generally you have the server generate data into 
    // the initial page. However, this demo uses localStorage so data isn't coming from server.  
    // Also, because data is local latency isn't an issue. More info: see JSCT Overview post.
    if (jsct.showDiags) console.log("%cAPP CONTROLLER(PRE-INIT): loading JSCT dataset from localStorage into collection", logCSS);
    jsct.codeTrackCollection.fetch({
        success: fetchSuccess,
        error: fetchFailure
    });

    function fetchSuccess() {
        // If there's no jsct localStorage data then create the db w/some sample entries.
        // IMPORTANT! ==> this uses localStorage for all data. Good for a demo app, keeps 
        // things simple but has drawbacks. See JSCT Overview post for benefits/drawbacks
        if (jsct.codeTrackCollection.length === 0) {
            if (jsct.showDiags) console.log("%cAPP CONTROLLER(PRE-INIT): dataset does NOT exist, creating sample data", logCSS);
            createSampleDB();
        }
        else {
            if (jsct.showDiags) console.log("%cAPP CONTROLLER(PRE-INIT): collection populated with # of items=" 
               + jsct.codeTrackCollection.length, logCSS);
        }
    }

    function fetchFailure() {
        console.error("APP CONTROLLER(PRE-INIT): uh-oh, db load FAILURE!");
        alert("ERROR: damn, at app init got FAIL on db load!");
    }


    //==============================================================================================
    // INIT TASKS: run on jQuery document.ready (i.e. only when the DOM is ready to be manipulated).
    // NOTE: on 1st use appInit is re-called after sample db has been created/loaded into collection
    //==============================================================================================
    $(document).ready(appInit);

    function appInit() {

        // CHEAT ALERT: jsct.showDiags conditionals use single line for code readability but NOT a best practice  
        if (jsct.showDiags) console.log("%cAPP CONTROLLER(INIT): starting application " + appInitMsgText, logCSS);

        // On first use DOM may be ready before sample db has been created (an async process). In this    
        // case bailout, the routine that creates sample db will call appInit again when data is ready 
        if (jsct.codeTrackCollection.length === 0) {
            if (jsct.showDiags) console.log("%cAPP CONTROLLER(INIT): bailing out of init on 'no data' condition", logCSS);
            return;
        }

        $("#loadingMsg").remove();

        if (!supportsLocalStorage()) {
            $("#primaryPane").html("<h1>Sorry, this application requires a browser that supports localStorage</h1>");
            return;
        }

        // Kill the 300ms delay in dispatching click events still common in mobile browsers - avoids that laggy feel...
        FastClick.attach(document.body);

        // Setup and housekeeping are done at this point, now can start doing real work...
        if (jsct.showDiags) console.log("%cAPP CONTROLLER(INIT): creating router instance, starting Backbone.history", logCSS);
        jsct.router = new jsct.Router();
        Backbone.history.start();

        // This controller is responsible for app-global layout so listen for app state related to layout 
        jsct.application.on('change:currentLayout', updateMainLayout);
        jsct.application.on('change:useDualPane', setMainLayout);
        // Handle change to relative widths of dualPane DIVs (a user pref set via global options)  
        jsct.pubsub.on('splitterLocationChange', setSplitterLocation);

        // Run this AFTER history has been started since session restore may navigate to a Browse/Edit state 
        restoreSession();

        // Now we can start building up some UI.
        if (jsct.showDiags) console.log("%cAPP CONTROLLER(INIT): executing one-time creation of commandBar and filterBar", logCSS);
        new jsct.FilterBar( {initFilter: filterWasActive} );
        new jsct.CommandBar();
        setMainLayout();

        // Listen for browser resize (also handles mobile device rotation)
        $(window).resize(setMainLayout);

        // On exit save session-related data to localStorage to allow restore of session when user returns.
        // CAUTION: this works because saveSession() writes to localStorage and localStorage ops are
        // synchronous. Writes to a backend datastore are more problematic since those ops are async
        $(window).on("unload", saveSession);
        // ...and as usual iOS has to 'think different' and only partially supports unload, so:
        $(window).on("pagehide", saveSession);

        // EXPLORATION: you can ignore the commandButton stuff below, just exploring, looking to enhance mobile  
        // tap feedback -- I find most mobile default feedback to be insufficient, not good UI. LATER: decided to 
        // add mouse listeners for events so this effect also appears in desktop browsers.  NOTE: this push-down   
        // effect on these link-buttons works -- and causes no reflow -- because they have position:absolute.
        // LATER: mobile browsers required special handling, was getting alignment problems with cmdButtons on 
        // mobile due to firing of both mouse/touch events, even seeing cross-browser differences. Solution is hacky,
        // at init store preferred TOP position (works well enough for these absolute positioned command buttons).
        var cmdBtnTop = {} ;
        // at startup store the preferred CSS 'top' value for these absolutely positioned anchor buttons
        $(".commandButton").each(  
            function() { cmdBtnTop[this.id] =  parseInt($(this).css('top'), 10); } 
          ) ;

        // to give a push-down effect just modify value of top -- down by 2px
        $(".commandButton").on("touchstart mousedown", function(ev) { 
            $(this).css('top',cmdBtnTop[this.id]+2).addClass("mobileTapFeedback") ;
        });

        // restore button position to original position
        $(".commandButton").on("touchend touchcancel mouseup mouseout",clearTapFeedback);
        function clearTapFeedback() {
            /*jshint validthis:true */
            $(this).css('top',cmdBtnTop[this.id]).removeClass("mobileTapFeedback") ;
        }
    }

    //=================================================================================================
    // RUNTIME ("life") TASKS: mostly overall application layout handling, e.g., handle browser resize
    //=================================================================================================
    // MAIN APPLICATION LAYOUT: *determine* the layout to use based on available width and user prefs. If 
    // this changes the value of currentLayout then resulting change event will trigger updateMainLayout() 
    function setMainLayout() {
        
        var currentWidth = $("body").width(),
            currentLayout = jsct.application.get("currentLayout"),
            useDualPane = jsct.application.get("useDualPane");

        // first check user preference (useDualPane) - user can force singlePane at any screen width
        if (currentLayout === "dualPane" && !useDualPane) {
            if (jsct.showDiags) console.log("%cAPP CONTROLLER: setMainLayout() setting currentLayout to singlePane", logCSS);
            jsct.application.set("currentLayout", "singlePane");
        }
        else if (currentWidth >= 700 && useDualPane && currentLayout === "singlePane") {
            if (jsct.showDiags) console.log("%cAPP CONTROLLER: setMainLayout() setting currentLayout to dualPane", logCSS);
            jsct.application.set("currentLayout", "dualPane");
        }
        else if (currentWidth < 700 && currentLayout === "dualPane") {
            if (jsct.showDiags) console.log("%cAPP CONTROLLER: setMainLayout() forcing singlePane layout for small screen", logCSS);
            jsct.application.set("currentLayout", "singlePane");
        }
    }

    // MAIN APPLICATION LAYOUT: *apply* layout to use, either 1-pane or 2-pane global layout used for primary views 
    function updateMainLayout() {

        if (jsct.showDiags) console.log("%cAPP CONTROLLER: executing updateMainLayout() to update app global layout", logCSS);

        // DualPane layout: 2 side-by-side divs, primaryPane on right, secondaryPane on left
        if (jsct.application.get("currentLayout") === "dualPane") {

            if (jsct.showDiags) console.log("%cAPP CONTROLLER: updateMainLayout() changing main layout to: dualPane ", logCSS);

            $("#secondaryPane").addClass("dualPaneLeft");
            $("#primaryPane").addClass("dualPaneRight");

            // Handle special case of app init where router hasn't created a list-based SummaryView
            if (!jsct.summary) {
                if (jsct.showDiags) console.log(
                    "%cAPP CONTROLLER(INIT): appController (not router) is creating jsct.summary view (list view)", logCSS);
                jsct.summary = new jsct.SummaryView();
                jsct.summary.render();
            }

            // In dualPane layout the list-based Summary view is always displayed in secondary (left) pane
            if (jsct.showDiags) console.log("%cAPP CONTROLLER: appending Summary (list) view to secondary (left) pane", logCSS);
            $("#secondaryPane").append(jsct.summary.$el);

            // CASE: switching from singlePane to dualPane, and SummaryView was previously active
            // in primaryPane. In that case when we move SummaryView to secondaryPane we get empty 
            // primaryPane. When this happens just fill the primaryPane with the Help view.
            if (jsct.application.get("currentState") === "list") {
                if (jsct.showDiags) console.log("%cAPP CONTROLLER: navigating to Help route to fill primary (right) pane", logCSS);
                jsct.router.navigate("#help", {trigger:true});
                jsct.pubsub.trigger("setMsg", '');
            }

            // for dualPane layout must always set relative pane widths to the user preference
            setSplitterLocation();

        }
        // Use SinglePane layout: always used if width LT 700px, and user can force use of this layout via preferences 
        else {
            if (jsct.showDiags) console.log("%cAPP CONTROLLER: updateMainLayout() changing main layout to: singlePane ", logCSS);

            $("#secondaryPane").removeClass("dualPaneLeft");
            $("#primaryPane").removeClass("dualPaneRight");

            // On user's first access of this demo app we force display of Help content
            if (jsct.firstUse) {
                jsct.router.navigate("#help", {trigger:true});
            }
            // when thunking over from dualPane to singlePane may need to reparent Summary view
            else if (jsct.application.get("currentState") === "list") {
                jsct.router.navigate("#list", {trigger:true});
            }
        }
    }

    // this (very crudely) sets the relative widths of the 2 panes of dualPane layout
    function setSplitterLocation() {

        var leftWidth = parseInt(jsct.application.get("splitterLocation"),10);
        // Validate. For bad data just force a default of flex:5/width:50%
        leftWidth = (0 < leftWidth && leftWidth < 10) ? leftWidth : 5;
        // final values must be char else CSS will be very unhappy    
        var rightWidth = "" + (10 - leftWidth);
        leftWidth = "" + leftWidth;
        // Cheat alert: just using brute force here
        $(".dualPaneRight").css({
            "width": rightWidth + "0%",
            "-webkit-box-flex": rightWidth,
            "-moz-flex": rightWidth,
            "-webkit-flex": rightWidth,
            "-ms-flex": rightWidth,
            "flex": rightWidth
        });
        $(".dualPaneLeft").css({
            "width": leftWidth + "0%",
            "-webkit-box-flex": leftWidth,
            "-moz-flex": leftWidth,
            "-webkit-flex": leftWidth,
            "-ms-flex": leftWidth,
            "flex": leftWidth
        });
    }

    //===================================================================================
    // EXIT ("death") TASKS: save application state so it can be restored in next session
    //===================================================================================
    // Save state. Another cheat alert: just quick hardcoding here, crude but readable
    function saveSession() {
        if (jsct.showDiags) console.log("%cAPP CONTROLLER: saveSession: storing session state into localStorage", logCSS);
        localStorage.setItem("jsctLastCurrentState", jsct.application.get("currentState"));
        localStorage.setItem("jsctUseDualPane", jsct.application.get("useDualPane"));
        localStorage.setItem("jsctLastModelID", jsct.application.get("lastBrowsedModelID"));
        localStorage.setItem("jsctShowDiagnostics", jsct.application.get("showDiagnostics"));
        localStorage.setItem("jsctSplitterLocation", jsct.application.get("splitterLocation"));
        localStorage.setItem("jsctFilterWasActive", jsct.application.get("filterIsActive"));
        localStorage.setItem("jsctShowFilterBar", jsct.application.get("showFilterBar"));
        localStorage.setItem("jsctFilterText", jsct.application.get("filterText"));
        localStorage.setItem("jsctFilterType", jsct.application.get("filterType"));
        localStorage.setItem("jsctFilterStar", jsct.application.get("filterStar"));
    }

    //==========================================================================
    // UTILITY METHODS (and some that are called by init and preinit processing)
    //==========================================================================
    // Not bothering to load Modernizr here, this check is straight from DiveIntoHTML5 
    function supportsLocalStorage() {
        try {
            ///yeeeesh jshint can be such a nitpicker sometimes....
            ///return 'localStorage' in window && window['localStorage'] !== null;
            return 'localStorage' in window && window.localStorage !== null;
        }
        catch (e) {
            return false;
        }
    }

    // Seed the db with some initial data on first use of the application. NOTE: this demo app
    // uses localStorage to keep things simple but that means the db is both  device- and
    // browser-specific (e.g. you get different db for Chrome v. Firefox v. Safari...)
    function createSampleDB() {

        if (jsct.showDiags) console.log("%cAPP CONTROLLER(PRE-INIT): running first-use setup, creating sample db", logCSS);
        // CHEAT ALERT: using an app-global flag here rather than passing around a firstUse=true
        // value. This flag is used by HelpView to trigger showing 'Welcome' content to new user
        jsct.firstUse = true;
        // important to kill caching for dev work
        $.ajax(
            { url: "seedData.txt" ,
              dataType: "json" , 
              cache: false 
            }).done(function (data, i) {

              $.each(data, function (i, item) {
                  jsct.codeTrackCollection.create(item);
              });

              if (jsct.showDiags) console.log("%cAPP CONTROLLER(PRE-INIT): sample db created, calling app init", logCSS);
              appInitMsgText = "(called by createSampleDB after db setup complete)";
              appInit();
        });
    }

    // Restore user preferences. Session state is restored later in restoreSession()
    function restoreUserPrefs() {
        // localStorage stores char-only values so need to translate Bool-as-char to true Boolean
        jsct.application.set("useDualPane", (localStorage.getItem("jsctUseDualPane") === "false") ? false : true);
        jsct.application.set("splitterLocation", localStorage.getItem("jsctSplitterLocation"));
        // Special handling for the developer option that writes diagnostic messages to console.
        // Save in the Application model but also store in an app-global var, allows enable/disable
        // through simple boolean assignment (doesn't require knowledge of Backbone model's setter).
        jsct.showDiags = localStorage.getItem("jsctShowDiagnostics") === "true" ? true : false;
        jsct.application.set("showDiagnostics", jsct.showDiags);
        if (jsct.showDiags) {
            console.log("\n%cAPP CONTROLLER(PRE-INIT): ***** STARTING JSCT APPLICATION LOAD *****", logCSS);
            console.log("%cAPP CONTROLLER(PRE-INIT): user preferences loaded from localStorage (if exist)", logCSS);
        }
    }

    // Conditionally restore any filter and/or edit/browse state from their previous session
    function restoreSession() {
        var urlHashVal = decodeURIComponent(window.location.hash.slice(1)),
            currentState , 
            lastBrowsedModelID ,
            tempTxt ;

        if (urlHashVal !== "") {
            // must honor URL parms else they can't bookmark
            if (jsct.showDiags) console.log("%cAPP CONTROLLER(INIT): NOT restoring session, URL hash value 'wins'"  +
                " (hash value was: " + urlHashVal + ")", logCSS);
        }
        else {
            currentState = localStorage.getItem("jsctLastCurrentState");
            lastBrowsedModelID = localStorage.getItem("jsctLastModelID");
            tempTxt = (currentState==='globalOptions' || currentState==='add')?" ":" restoring " ; 
            if (jsct.showDiags) {
                console.log("%cAPP CONTROLLER(INIT):" + tempTxt + "previous application state: " + currentState, logCSS);
                console.info("%cNote: re above, application state domain is ->" + 
                     " list, browseEdit, add, globalOptions, help","color:#407cc9;font-weight:bold");
                console.info("%cNote: but this version of the demo app restores only application states: list, browseEdit", 
                     "color:#407cc9;font-weight:bold");
            }

            // If filter was active fetch its criteria so it's available to FilterBar initialization.
            // LocalStorage stores char-only values so need to translate Bool-as-char to true Boolean  
            filterWasActive = localStorage.getItem("jsctFilterWasActive") === "true" ? true : false;
            if (filterWasActive) {
                if (jsct.showDiags) console.log("%cAPP CONTROLLER(INIT): restoring previous session's filter", logCSS);
                jsct.application.set("filterText", localStorage.getItem("jsctFilterText"));
                jsct.application.set("filterType", localStorage.getItem("jsctFilterType"));
                jsct.application.set("filterStar", (localStorage.getItem("jsctFilterStar") === "true") ? true : false);
            }
            else {
                // only restore filterBar 'hidden' state if there's no filter active (avoids confusion)
                jsct.application.set("showFilterBar", (localStorage.getItem("jsctShowFilterBar") === "false") ? false : true);
            }

            // Note: only restoring Browse/Edit state now, not bothering w/other states (AddNew, Help, Options, etc.)
            if (currentState === "browseEdit" && lastBrowsedModelID) {
                if (jsct.showDiags) console.log("%cAPP CONTROLLER(INIT): restoring prev session's Browse/Edit of " +
                    lastBrowsedModelID, logCSS);
                jsct.router.navigate("edit/" + lastBrowsedModelID, {trigger:true});
            }
        }
    }

    // a little explanatory text for when jsct object is dumped in the console
    jsct.AA_info = "NOTE: all functions in the jsct namespace that start with an upcase character are class definitions.";
    jsct.AB_info = "Other children are instances of classes (here for app-global access) or utils (e.g. pub/sub object).";

    // For dev work and quick mobile debugging 
    // $(window).on("error", function (e) {
    //    alert("DAMN, caught an error:\n\n" + e.originalEvent.message);
    // });
    // can test above by enabling the assignment below - the "use strict" will trigger an error on implied global
    // globalVar = 1 ; 

})(jQuery);