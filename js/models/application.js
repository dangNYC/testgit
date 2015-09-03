// ---------------------------------------------------------------------
//
//  Application model - holds selected application state 
//
//  This Backbone model stores data that reflects application state   
//  -- not every aspect of state, just some important bits. The value
//  of the currentState attribute is set by the router.
//
//  JSCT is largely driven by changes to application state -- many of
//  its views respond to currentState changes. Basically this
//  implementation uses a crude state machine driven by both URL hashparts 
//  (i.e. routes) and the currentState value of this application model.
//
//  Storing application state in a model also simplifies persisting
//  state between sessions -- if your app is written to reflect app 
//  state then you can restore a previous session simply: just save
//  state data on app exit and then read/restore it on app load. This   
//  demo app saves/restores appState in its application controller.
//
// -------------------------------------------------------------------
/*global Backbone */

var jsct = jsct || {};

(function () {

    'use strict';

    var ApplicationModel = Backbone.Model.extend({

        defaults: {
            // currentState reflects the active primary state (in this app it closely maps
            // to hash routes). State domain is: list, browseEdit, add, options, help.
            currentState: "list",

            // the current screen layout, basically 1-col display v. 2-col display
            currentLayout: "singlePane", // other possible value: dualPane

            // user preferences set thru the options pane, persist across sessions
            useDualPane: true,
            showDiagnostics: false,
            splitterLocation: "5",

            // filter-related
            showFilterBar: true,
            filterIsActive: false,
            // hold the last-applied filter criteria so can restore across sessions
            filterText: "",
            filterType: "",
            filterStar: false,

            // store the last-browsed codeTrack id so next session can pick up at same place
            lastBrowsedModelID: ""
        },
    });

    jsct.application = new ApplicationModel();

})();