// ---------------------------------------------------------------------
//
//  CodeTrack Model - Backbone model for a single codeTrack's data 
//
//  Model's data attributes are defined in the model's defaults property. 
//  The values for these attribs will be handled by Backbone through its 
//  setters and getters. Values can be written to your datastore using 
//  Backbone save(), etc. 
//
//  In addition to the properties handled by Backbone this demo app 
//  defines a meetsFilterCriteria property which is NOT included in the
//  defaults property (i.e., it's just a regular object property). This  
//  prop is used to store model-related info that doesn't need to persist 
//  across sessions.  In this case it holds a Boolean value that tells 
//  whether the item meets the current filter criteria.  This simplifies 
//  enabling/disabling filter, counting items that meet filter criteria,
//  creating a subset of item that meet criteria, etc. Because this prop
//  isn't handled by Backbone it doesn't have a BB setter and that means 
//  that changes to the meetsFilterCriteria value will not result in a 
//  BB-fired change event -- instead, a change event is fired 'manually'  
//  by the custom setter method setMeetsFilterCriteria() below 
//
//  This model includes a very simple example of using Backbone validation,
//  see also js/view/detail.js for handling of the model's invalid event. 
//
// ------------------------------------------------------------------------
/*global Backbone, jQuery*/

var jsct = jsct || {};

(function ($) {

    'use strict';

    jsct.CodeTrack = Backbone.Model.extend({

        // Default attributes for the codeTrack item. Usually an object literal is used to set defaults 
        // but you can use a function (done here) to put logic in your object creation (not done here).
        defaults: function () {
            return {
                title: "",
                descrip: "",
                type: "tip",
                url: "",
                order: jsct.codeTrackCollection.nextOrder(),
                tagged: false
            };
        },

        // Toggle the tagged state of this codeTrack item. Save() runs setter (so change event 
        // is fired) and then commits the value to whatever you've defined as your data store. 
        toggleTagged: function () {
            this.save({
                tagged: !this.get("tagged")
            });
        },

        // Property below is a normal object property, NOT a Backbone Model class attribute that's 
        // watched/saved by Backbone.  That's because there's no need to persist this info across  
        // sessions. JSCT uses this property as a temporary store for Boolean that indicates whether 
        // model meets current filter criteria (user can filter the collection through filterBar UI).
        // The Boolean is assigned when filter is applied/cleared and persists only for the session. 
        meetsFilterCriteria: true,
        // the filterBar class is responsible for evaluating filter criteria and running this setter
        setMeetsFilterCriteria: function (satisfiedCriteria) {      
            // this conditional just avoids unnecessary renders -- if no change then do nothing
            if (this.meetsFilterCriteria !== satisfiedCriteria) {
                this.meetsFilterCriteria = satisfiedCriteria;
                // As noted above, this isn't an attribute managed by Backbone. However, 
                // since it's not managed by BB its change events must be fired 'manually'.
                this.trigger("meetsFilterCriteriaChange", satisfiedCriteria);
            }
        },

        // Simple example of using Backbone's validation feature: return a value when validation fails,
        // this will result in an invalid event being fired with that return value in the event payload
        validate: function (attrs) {

            if (attrs.title.trim() === "") {
                return "<em>Title</em> &nbsp;value is required";
            }
            if (attrs.url.trim() !== "") {
                // If they enter URL attempt to validate it. For this demo app am embedding the check here but in a real 
                // app you'd want this in a util lib OR you'd use a BB validation plugin. The regexp below is from the lib  
                // backbone-validation (github.com/thedersen/backbone.validation/blob/master/src/backbone-validation.js)  
                var regexp =
                    /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
                var isValidURL = regexp.test(attrs.url.trim());
                if (!isValidURL) {
                    return "URL value invalid";
                }
            }
        }
    });

})(jQuery);