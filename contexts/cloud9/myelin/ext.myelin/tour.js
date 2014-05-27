this.tour = {
    initialText: "This modal window will be tied to a blog entry on Myelin Price Interactive\n\nWhen the student feels he or she understands the overall concept, they move on...",
    finalText: "Notice that the code styles are still present.  What could that mean?  Have you tried clicking it?",
    steps: [
    {
        before: function() {

        },
        el: undefined,
        div: "navbar",
        desc: "Using the underlying APIs, I can highlight any div or element I need to.",
        pos: "bottom",
        time: 4
    }, {
        before: function() {
           panels.activate(require("ext/tree/tree"));
        },
        el: undefined,
        div: "navbar.childNodes[1]",
        desc: "We can easily hook into any HTML element or event.",
        pos: "right",
        time: 4
    }, {
        before: function() {
            panels.activate(require("ext/openfiles/openfiles"));
        },
        el: undefined,
        div: "navbar.childNodes[2]",
        desc: "We can set open files at start to assist students.",
        pos: "right",
        time: 4
    }, {
        before: function() {
            require("ext/settings/settings").show();
        },
        el: undefined,
        div: "navbar.childNodes[navbar.childNodes.length - 2]",
        desc: "Preferences can be set dynamically.",
        pos: "right",
        time: 4
    }, {
        before: function() {
            panels.activate(require("ext/tree/tree"));
        },
        el: "winFilesViewer",
        desc: "The file tree is accessible and addressable.",
        pos: "right",
        time: 4
    }, {
        before: function() {
            if (madeNewFile) {
                madeNewFile = false;
                require("ext/tabbehaviors/tabbehaviors").closetab(tabEditors.getPage());
            }
        },
        el: plus_tab_button,
        desc: "We could open a new file and setup a blank template, or...",
        extraTop: -37,
        pos: "left",
        time: 4
    }, {
        before: function(){
            //require("ext/editors/editors").gotoDocument({path: "/workspace/"+window.courseUUID+"/core/target/classes/com/mpi/playn/core/Beta.java", active : true});
            require("ext/editors/editors").gotoDocument({path: "/workspace/"+window.courseUUID+"/core/src/main/java/com/mpi/playn/core/Beta.java", active : true});
            ide.dispatchEvent("track_action", {type: "fileopen"});
            settings.model.setQueryValue("editors/code/@gutter", true); // has to be here to force show when new editor opens
            settings.model.setQueryValue("auto/statusbar/@show", true);
            require("ext/statusbar/statusbar").preinit();
        },
        el: tabEditors.$buttons,
        desc: "More appropriately we'll jump to the file that needs modified or is of interest.  So much easier than drilling down!",
        extra: 160,
        pos: "bottom",
        time: 4
    },{
        before: function(){
             var gotoline = require("ext/gotoline/gotoline");
             gotoline.execGotoLine(122, null, true);
        },
        desc: "",
        time: 4
    },{
        before: function(){
             var ace = require("ext/editors/editors").currentEditor.amlEditor.$editor;
	         var Range = require("ace/range").Range
             var range = new Range(121, 14, 121, 21);
             var marker = ace.getSession().addMarker(range,"ace_selection", "text");
	     require("ext/myelin/gpanel").instructionFrame.setAttribute('src','http://active.tutsplus.com/tutorials/games/understanding-the-game-loop-basix/');
	     ace.on('click', function(e){
		 var pos = e.getDocumentPosition();
		  if(range.inside(pos.row, pos.column)) {
		     require("ext/myelin/gpanel").instructionWindow.show();
		  }
	     });
        },
        el: undefined,
        div: "editorGutter",
        desc: "And here we can give specific details about the code - this is all done with the authoring tool.",
        extraTop: -40, // test this
        pos: "right",
        time: 4
    }]
}


/*    Working steps, zen no longer used
{
        before: function(){
            wentToZen = true;
            zen.fadeZenButtonIn();
        },
        el: undefined,
        div: undefined,
        desc: "All sorts of intersting UI work has gone into this IDE, the whole things is quite pleasing to the eye.",
        extraTop: -40,
        pos: "left",
        time: 5
    }, {
        before: function() {
            var hlElement = require("ext/myelin/codetour").hlElement;
            hlElement.style.visibility = "hidden";
            winTourText.hide();
            document.getElementsByClassName("tgDialog")[0].style.display = "none";
            zen.fadeZenButtonOut();
            zen.enterIntoZenMode();

            setTimeout(function(){
                zen.escapeFromZenMode();
                zen.fadeZenButtonOut();

                setTimeout(function() {
                    document.getElementsByClassName("tgDialog")[0].style.display = "";
                    hlElement.style.visibility = "visible";
                    winTourText.show();

                    require("ext/myelin/codetour").stepForward();
                }, 250);
            }, 2300);
        },
        time: 4,
        desc: "",
        skip: true
    }, 
*/
