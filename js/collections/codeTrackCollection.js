// --------------------------------------------------------------------------------
//  
//  CodeTrackCollection - Backbone collection of CodeTrack items  
//
//  This just aggregates all of the codeTrack models into a Backbone collection
//  and creates a couple of methods that perform operations across all models.
//
//  NOTE: this collection gets its data from localStorage instead of remote server db.
//  See 'Data' section of JSCT Overview post on why this is done and costs/benefits.
//  Normally you'd have a url property here that points to a backend REST endpoint
//  -- see comment below for a bit more on this topic
//
// --------------------------------------------------------------------------------
/*global Backbone */

(function () {

    'use strict';

    var CodeTrackCollection = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: jsct.CodeTrack,

        // Save all items together in client localStorage using prefix 'jsct'.
        // To view this data in Chrome devtools use: Resources / Local Storage
        // NOTE => localStorage property below is req'd for the localstorage adapter 
        // used by this demo app.  More common is to use a remote db which you'd
        // access via REST and here you'd have a url property pointing to a RESTful 
        // endpoint. Models in the collection would use this url to construct the url 
        // req'd for their REST operations. More: http://backbonejs.org/#Collection-url
        // Also: stackoverflow.com/questions/16862014/backbone-js-models-and-collection-urls 
        localStorage: new Backbone.LocalStorage("jsct"),

        // Return new collection with only tagged codeTrack items
        tagged: function () {
            return this.filter(function (codeTrack) {
                return codeTrack.get('tagged');
            });
        },

        // Return only items that meet the current filter criteria
        satisfyFilter: function () {
            return this.filter(function (codeTrack) {
                return codeTrack.meetsFilterCriteria;
            });
        },

        // Keep the CodeTracks in sequential order, despite being saved by unordered
        // GUID in the database. This generates the next order number for new items.
        nextOrder: function () {
            if (!this.length) return 1;
            return this.last().get('order') + 1;
        },

        // Optional collection property for keeping items in sorted order
        comparator: function (codeTrack) {
            return codeTrack.get('order');
        },

    });

    // Create collection instance in the jsct namespace
    jsct.codeTrackCollection = new CodeTrackCollection();

})();