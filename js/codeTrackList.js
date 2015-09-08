// --------------------------------------------------------------------------------
//  
//  CodeTrackList view - displays all codeTrack items in a <ul> list 
//
//  This is a list view (note the => tagName:"ul") whose <li> children are 
//  codeTrackListItem views. These codeTrackListItem children are initially created 
//  in render() -- the view's initial (in fact only) render execution loops through 
//  the CodeTrackCollection, creating a codeTrackListItem instance for each model
//  and appending these <li>-based views as children to its own <ul> el. 
//
//  Like its parent (Summary view) this view is never remove()'d or re-rendered
//  after it has been created, its parent is just hidden or reparented. That's a 
//  bit unusual for Backbone views, but I wanted the list-based view persistent
//  since it's so often displayed (100% of the time in dualPane layout). 
//  
//  Having this view persist simplifies its code, eliminating the need to keep 
//  track of its child views (codeTrackListItems).  If this view was remove()'d
//  then it would need to track its children and run remove() on them before its
//  own remove() was run -- without that you'd get memory leaks. However, that's
//  not an issue here since this CodeTrackList view persists for the life of the app.
//  This approach can be useful but in most cases keeping views around and trying to
//  reuse them is probably more trouble than it's worth. For more info on memory 
//  management especially for lists see JSCT Overview post section on Zombies.  
//
// ---------------------------------------------------------------------------------  
/*global Backbone, jQuery */

(function ($) {

    'use strict';

    jsct.CodeTrackList = Backbone.View.extend({

        // assigning tagname property tells Backbone to create an element
        // of this type and assign that to the view's el property
        tagName: "ul",

        id: "codeTracks-list",

        // events:  CodeTrackList sets no DOM event listeners. However, if you had a large list you  
        // might want to redesign this to make greater use of event delegation (handling <li>'s DOM 
        // events in this parent would be more efficent than setting listeners in every <li> child
        // view). See JSCT Overview post Events section for info on this alternate list architecture

        initialize: function () {

            if (jsct.showDiags) console.log("VIEW: CodeTrackList INITIALIZE() executing");

            // Render populates list with all models, after that we just need to listen for collection adds. 
            // For this app no need to listen for collection reset. Deletes are handled in codeTrackListItem
            this.listenTo(jsct.codeTrackCollection, 'add', this.addOne);

            // Hilite the row for item being browsed (i.e. that's currently being displayed in Detail view)
            this.listenTo(jsct.application, 'change:lastBrowsedModelID', this.setBrowsedItemCue);
            this.listenTo(jsct.application, 'change:currentState', this.setBrowsedItemCue);
            // if the "active" model's <li> isn't visible then scroll the list to bring it into view
            this.listenTo(jsct.application, 'change:lastBrowsedModelID', this.scrollToActive);
            // The summaryAdded event is fired whenever the list is added to DOM (happens only once  
            // for dualPane layout but constantly in singlePane layout). This summaryAdded event is  
            // fired by the router. Allows scrolling the list to the <li> for the last selected model  
            this.listenTo(jsct.pubsub, 'summaryAdded', this.scrollToActive);
        },

        // This view's render is called only once, when this view is created. Rendering and append of 
        // its childviews is all done while off-DOM to avoid the cost of multiple repaints/reflows.
        render: function () {

            if (jsct.showDiags) console.log("VIEW: CodeTrackList RENDER() executing");
            jsct.pubsub.trigger("setMsg", '');

            // populate this <ul>-based view with <li>-based child views 
            this.addAll();

            return this;
        },

        // Add a single item to the list. When the view is render()'d this method is called once 
        // for each model in collection. Also called whenever a new model is added to collection 
        addOne: function (codeTrack) {

            var codeTrackListItem = new jsct.CodeTrackListItem({model: codeTrack});
            if (this.addingAll) {
                this.docFragment.appendChild(codeTrackListItem.render().el);
            }
            else {
                if (jsct.showDiags) console.log("VIEW: CodeTrackList ADDONE() adding a single codeTrack item to list");
                this.$el.append(codeTrackListItem.render().el);
            }
        },

        addAll: function () {

            if (jsct.showDiags) console.log("VIEW: CodeTrackList ADDALL() adding all codeTrack items to list");
            // When building a list you want to avoid appending your <li> children to an element that's on the 
            // DOM, that's very inefficient, results in multiple repaints/reflows, can be a big performance hit.
            // More efficient is to do as much as possible off-DOM and only parent to an on-DOM elemnt when all
            // your rendering is complete. One approach to this is working through a documentFragment as below. 
            // Note that this isn't truly required here because CodeTrackList is itself off the DOM at this point
            // (its parent puts it on DOM only after render completes) but it's worth showing how it can be done.
            this.docFragment = document.createDocumentFragment();
            this.addingAll = true;
            // call addOne() for each model in the collection  
            jsct.codeTrackCollection.each(this.addOne, this);
            this.$el.append(this.docFragment);
            this.docFragment = null;
            this.addingAll = false;

            // Next call is for when they access the application with a URL that includes a model ID as   
            // a parm. In that case after building the list we want to highlight the <li> for that model
            this.setBrowsedItemCue();
        },

        // Set visual cue on CodeTrackList <li> child when <li>'s data is being displayed in Detail view.  
        // BUT we can't just listen for a click event on a list item to drive this highlighting since
        // Detail view can be populated in other ways (e.g. bookmarked URL, or the browser Back button). 
        // Solution: since detail view sets jsct.application.lastBrowsedModelID whenever it displays
        // a model just have CodeTrackList view listen for change events on lastBrowsedModelID. The 
        // event handler below will itself trigger an event on the model which in turn is caught by the 
        // codeTrack view (the <li>) displaying that model, and that handler sets visual cue on self.
        // Example of pros/cons of events: allows looser coupling but sometimes w/more complex design.
        setBrowsedItemCue: function () {

            var model ;

            // Start by clearing any existing row highlight
            this.$("li").removeClass("browsedRowIndicator");

            // Hilite model's <li> only when the model is concurrently being displayed in Detail view 
            if ( jsct.application.get("currentState") !== "browseEdit" ) {    
               return;
            }

            // Detail view's initialize always assigns the ID of the model it's displaying to the
            // application model's lastBrowsedModelID attrib. This is the item we want to highlight
            model = jsct.codeTrackCollection.get(jsct.application.get("lastBrowsedModelID"));

            // Handle case where detail view was told to display an invalid model ID
            // (e.g., browser Back button took them to a model that's been deleted).
            if (!model) {
                return;
            }

            // CodeTrack views (<li>'s) listen for event fired below, event handler sets visual cue on self
            model.trigger("activeInBrowsePane");
        } ,

        // When a model is made "active" (e.g. thru browser Back button) this 
        // scrolls the list so that the <li> for the selected model is visible
        scrollToActive: function () {
 
           var model ,
               $scrollableParent ,
               scrollableParentHeight ,
               $targetListItem ,
               targetListItemScrollPos ,
               listOffset ,
               rowOffset ,
               selectedOffset ,
               scrollToPos ; 

           // below can happen in singlePane layout... 
           if ( !this.$el.is(":visible") ) {
              return ;  
           }
		   
           model = jsct.codeTrackCollection.get(jsct.application.get("lastBrowsedModelID"));
           //...and of course if no model is active then we have no model <li> to scroll to
           if (!model) {
              return;
           }

           // A small dependency here: this assumes the UL's parent is a scrollable container.
           // Note that it doesn't reference its parent <div> by ID (#listMain) - best to keep 
           // views ignorant of 'outsiders' details as much as possible, minimize dependencies
           $scrollableParent = this.$el.parent() ;
           scrollableParentHeight = $scrollableParent.innerHeight() ;

           // <li>'s are linked to their model via element ID (set thru listItem template when rendered)
           $targetListItem	= this.$("#ct-"+model.id) ; 

           // ok, need these offsets, so pay the price now of the repaint/reflow cost they incur
           rowOffset  = $targetListItem.offset() ;  
           listOffset = $scrollableParent.offset() ;
           targetListItemScrollPos = rowOffset.top - listOffset.top ;

           // if <li> is already visible then once again we have no work to do, bail out
           if ( (scrollableParentHeight>(targetListItemScrollPos+$targetListItem.outerHeight() )) 
                 && (targetListItemScrollPos>=0) ) {
              return ;
           }

           // ok, now just scroll the <ul>'s parent container so active model's <li> is visible
		   
           $scrollableParent.scrollTop(0) ;
           // for some reason having problems with $.position on mobile so just use $.offset
           rowOffset = $targetListItem.offset() ;
           // don't want <li> locked at very top, give small offset, constant of 40px good for now
           selectedOffset = 40; //CENTER: (scrollableParentHeight/2) - $targetListItem.innerHeight()
           // Firefox can return fractional number, want int here
           scrollToPos = parseInt((rowOffset.top - listOffset.top - selectedOffset),10) ; 
           ////jsct.pubsub.trigger("setMsg", "div.scrollTop(" + scrollToPos + ")" ) ;
           $scrollableParent.scrollTop(scrollToPos) ;
       } 

    });
})(jQuery);
