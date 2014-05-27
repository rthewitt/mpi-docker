/**
 * Guides student through code lesson
 *
 * @author Ryan Hewitt
 */ 

/**
 * Guides the user through features of the IDE
 *
 * @author Matt Pardee
 * @contributor Garen J. Torikian
 *
 * @copyright 2011, Cloud9 IDE, Inc
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

define(function(require, exports, module) {

var ext = require("core/ext");
var ide = require("core/ide");
var settings = require("core/settings");
var skin = require("text!ext/myelin/tour-skin.xml");
var markup = require("text!ext/myelin/codetour.xml");
var mutil = require("ext/myelin/mutil")
var ideConsole = require("ext/console/console");
var zen = require("ext/zen/zen");
var dockpanel = require("ext/dockpanel/dockpanel");
var editors = require("ext/editors/editors");
var Range = require("ace/range").Range
//var strTour = require("text!ext/myelin/tour.js");
var gotoline = require("ext/gotoline/gotoline");
var fileTree = require("ext/tree/tree"); // may be panel
var tabBehaviors = require("ext/tabbehaviors/tabbehaviors");
var save, hasDeploy = false;
var panels = require("ext/panels/panels");

var wentToZen = false;
var madeDebug = false;
var deletedFile = false;

module.exports = ext.register("ext/myelin/codetour", {
    name: "Code Tour",
    dev: "Myelin Price Interactive",  //Credit goes to: "Cloud9 IDE, Inc." for initial plugin
    alone: true,
    type: ext.GENERAL,
    markup: markup,
    skin    : {
        id   : "codetour",
        data : skin,
        "media-path" : ide.staticPrefix + "/ext/myelin/images/"
    },
    currentStep: -1,
    currentEl: null,
    nodes: [],
    autodisable : ext.ONLINE | ext.LOCAL,

    hook: function() {
        ext.initExtension(gotoline);
        //this.launchGT();
    },

    init: function(amlNode) {
        this.fileMarkers = {}; // will be assoc array
        this.initTour();
//        eval(strTour);

        this.overlay   = document.createElement("div");
        this.hlElement = document.createElement("div");

        this.overlay.setAttribute("style", "display:none;position:fixed;left: 0px;top: 0px;width:100%;height:100%;opacity:0.3;background:#000;opacity:0");
        document.body.appendChild(this.overlay);

        this.hlElement.setAttribute("style", "z-index:9998;display:none;position:absolute;box-shadow:0px 0px 15px #000;");
        document.body.appendChild(this.hlElement);

        winTourGuide.addEventListener("hide", this.shutdown(this.hlElement));
        tourControlsDialog.addEventListener("hide", this.shutdown(this.hlElement));

        this.actionScope = this.getActionTypes();
    },

    loadTour: function(tour) {
        this.tour = tour; 
        var fileTokens = this.tour.fileTokens;
        var _self = this;
        ide.addEventListener('afteropenfile', function(e){
            _self.fileMarkers = {};
            var relPath = tabEditors.activePage.split('/');
            relPath.shift();
            relPath.shift();
            relPath.shift();
            relPath = relPath.join('/');

            var tokenList;
            for(var t in fileTokens) {
                if(fileTokens[t].file === relPath) {
                    tokenList = fileTokens[t].tokens;
                    break;
                }
            }
            if(!tokenList) return;
            for(var tk=0; tk<tokenList.length; tk++){
                var r = tokenList[tk].range;
                var range = new Range(r.startRow, r.startCol, r.endRow, r.endCol);
                var ace = editors.currentEditor.amlEditor.$editor;
                var mClass;
                switch(tokenList[tk].type) {
                    case "bracket":
                    default:
                    mClass = 'ace_bracket'
                    break;
                }
                var m = ace.addMarker(range, mClass+' mpi-token-'+tokenList[tk].id, 'text');
                _self.fileMarkers[tokenList[tk].id] = {marker: m, range: r};
            }
        }, false);
    },

    launchGT: function(){
        // Should have some sort of branch to debug / log
        if(this.tour == null) return;
        ext.initExtension(this);
        this.initTour(); // was separation necessary?
        this.hideMenus();
        wFile = wentToZen = madeDebug = deletedFile = false;
        this.currentStep = -1;

        winTourDesc.setValue(this.tour.initialText);

        winTourGuide.show();
        winTourButtonStart.show();
        winTourButtonClose.show();
        winTourButtonDone.hide();


        //hide the seccond unneeded cover
        var modalBackground = document.getElementsByClassName("bk-window-cover");
        modalBackground[modalBackground.length - 2].style.opacity = "0";
    },

    hideMenus: function(){
        var buttons = dockpanel.getButtons("ext/debugger/debugger");
        if(!buttons)
            return;

        for(var i = 0, button; i < buttons.length; i++) {
            button = buttons[i];
            if(!button.showMenu || !button.cache)
                continue;

            self[button.cache.submenu].hide();
        }
    },

    initTour: function() {
        // Remember the states of everything
        this.cliBoxState = settings.model.queryValue("auto/console/@showinput");
        ideConsole.showInput();

        this.gutterState = settings.model.queryValue("editors/code/@gutter");

        this.statusBarState = settings.model.queryValue("auto/statusbar/@show");

        this.projectFilesState = settings.model.queryValue("auto/panels/@active");
        panels.activate(require("ext/tree/tree"));
    },

    /**
     * Predefined actions
     */
    getActionTypes: function() {
        scp = {};
        scp.none = function(){}
        scp.showOpenFiles = function() {
            panels.activate(require("ext/openfiles/openfiles"));
        };
        scp.showTreePanel = function() {
            panels.activate(fileTree);
        }
        scp.codeBubble = function(tokenId) {
            var r = this.fileMarkers[tokenId].range;
            this.scrollToLine = function(r.start.row, r.start.column, false);
            var amlEditor = require('ext/code/code').amlEditor;
            var markerDiv = (apf.XPath || apf.runXpath() || apf.XPath).selectNodes('DIV[2]/DIV[1]/DIV[2]', amlEditor.$ext);
            markerDiv.getElementsByClassName();
            var tokenDiv = document.getElementsByClassName('mpi-token-'+tokenId)[0]; 
            if(!!tokenDiv) this.currentEl = tokenDiv; // Does this even make sense?
        }
        scp.openFile = function(filePath, active, drill) {
            editors.gotoDocument({path: "/workspace/"+window.courseUUID+filePath, active : active});
            ide.dispatchEvent("track_action", {type: "fileopen"});
            settings.model.setQueryValue("editors/code/@gutter", true); // has to be here to force show when new editor opens
            settings.model.setQueryValue("auto/statusbar/@show", true);
            require("ext/statusbar/statusbar").preinit();
            if(drill)
                tabBehaviors.revealtab(); 
                //tabBehaviors.revealtab(ide.getActivePage, true);// noFocus has no effect?
            editors.currentEditor.amlEditor.focus();
        };
        scp.showSettings = function() {
            require("ext/settings/settings").show();
        };
        scp.closeCurrentTab = function() { // may be extended.  tabEditors is global
            tabBehaviors.closetab(tabEditors.getPage());
        }; 
        scp.scrollToLine = function(line, column, preview){
            // I need to know to handle this
            column = column == "null" ? null : column;
            require("ext/gotoline/gotoline");
            gotoline.execGotoLine(line, column, preview);
        }; 
        scp.addMediaMarkup = function(startPos, endPos, src) {
            var ace = editors.currentEditor.amlEditor.$editor;
            var range = new Range(startPos.row, startPos.col, endPos.row, endPos.col);
            var marker = ace.getSession().addMarker(range,"ace_selection", "text");
            require("ext/myelin/gpanel").instructionFrame.setAttribute('src',src);
            ace.on('click', function(e){
                var pos = e.getDocumentPosition();
                if(range.inside(pos.row, pos.column)) {
                    require("ext/myelin/gpanel").instructionWindow.show();
                }
            });
        };
        return scp;
    },

    /**
     * Play controls
     */
    togglePlay: function(){
        if (this.playing) this.pause();
        else this.play();
    },

    play: function(){
        btnTourPlay.$ext.childNodes[1].style.backgroundPosition = "-28px 3px";
        btnTourPlay.tooltip = "Play";
        this.playing = true;
        this.stepForwardAuto();
    },

    pause: function(){
        btnTourPlay.$ext.childNodes[1].style.backgroundPosition = "14px 4px";
        btnTourPlay.tooltip = "Pause";
        this.playing = false;
        clearTimeout(this.$timerForward);
    },

    end: function(){
        this.pause();
        this.hlElement.style.opacity = "0";
    },

    startTour: function(){
        var _self = this;

        this.currentStep = -1;
        winTourGuide.hide();
        tourControlsDialog.show();
        this.stepForward();

        this.overlay.style = 'block';

        apf.removeEventListener("keyup", _self.keyUpEvent);

        apf.addEventListener("keyup", _self.keyUpEvent = function(e){
            if(e.keyCode == 39)
                _self.stepForward();
            else if(e.keyCode == 37)
                _self.stepBack();
        });

        // remove the modal overlay, but keep it around to block input
        var modalBackground = document.getElementsByClassName("bk-window-cover");
        modalBackground[modalBackground.length - 1].style.opacity = "0";
    },

    stepBack: function(){
        this.currentStep--;

        var step = this.tour.steps[this.currentStep];

        if(!step)
            return;

        if (step.skip !== undefined) { // we're in the zen mode step, go back one more
            this.currentStep--;
            step = this.tour.steps[this.currentStep];
        }

        if (this.currentStep === 0) {
            btnTourStepBack.disable();
            btnTourStepBack.$ext.childNodes[1].style.backgroundPosition = "20px -21px";
        }

        btnTourStepForward.enable();

        this.commonStepOps(step);
    },

    stepForwardAuto: function(){
        var _self = this;
        var timeout = this.currentStep > -1 ? this.tour.steps[this.currentStep].time : 0;

        this.$timerForward = setTimeout(function() {
            _self.stepForward();
            if (_self.tour.steps[_self.currentStep + 1])
                _self.stepForwardAuto();
            else {
                _self.end();
                _self.finalStep();
            }
        }, timeout * 1000);
    },

    stepForward: function(){
        this.currentStep++;
        if (!this.tour.steps[this.currentStep])
            this.finalStep();
        else {
            if (this.currentStep > 0){
                btnTourStepBack.enable();
                btnTourStepBack.$ext.childNodes[1].style.backgroundPosition = "20px 5px";
            }
            if(this.currentStep > 25) {
                btnTourStepBack.disable();
                btnTourStepBack.$ext.childNodes[1].style.backgroundPosition = "20px -21px";
            }
            var step = this.tour.steps[this.currentStep];
            this.commonStepOps(step);
        }
    },

    finalStep: function() {
        winTourText.close();
        tourControlsDialog.hide();
        this.closeTG();
        this.hlElement.style.display = "none";

        winTourGuide.show();
        winTourDesc.setValue(this.tour.finalText);
        this.currentStep = -1;
        winTourButtonStart.hide();
        winTourButtonClose.hide();
        winTourButtonDone.show();
    },

    // These are common operations we do for each step
    // forwards and back, so we DRY
    commonStepOps: function(step){
        function getCurrentEl(){
            var amlEditor = require("ext/code/code").amlEditor;
            // was originally a failsafe. TODO eliminate entirely from JSON if undefined
            if (step.el !== undefined && step.el !== "undefined") {
                if(typeof step.el == "string")
                    step.el = self[step.el];
                else if (typeof step.el == "function")
                    step.el = step.el();
                _self.currentEl = step.el;
            }
            // All of these fix issues with elements not being available when this plugin loads
            else if (step.div == "editor"){
                _self.currentEl = amlEditor;
            }
            else if (step.div == "barIdeStatus") {
                _self.currentEl = barIdeStatus;
            }
            else if (step.div !== undefined) {
                if (step.div.indexOf("navbar") >= 0) {
                    _self.currentEl = eval(step.div);
                }
                else if (step.div == "expandedDbg") {
                    _self.currentEl = expandedDbg;
                }
                else if (step.div == "editorGutter") {
                    _self.currentEl = (apf.XPath || apf.runXpath() || apf.XPath).selectNodes('DIV[2]/DIV[1]/DIV[2]', amlEditor.$ext);
                }
                else if (step.node !== undefined) {
                    _self.currentEl = (apf.XPath || apf.runXpath() || apf.XPath).selectNodes(step.div, apf.document.selectSingleNode(step.node).$ext);
                }
                else {
                    _self.currentEl = (apf.XPath || apf.runXpath() || apf.XPath).selectNodes(step.div, amlEditor.$ext);
                }
            }
            else {
                // fixes issue with no zen button existing
                _self.currentEl = btnZenFullscreen;
            }
        }

        if (this.currentStep > 0) {
            winTourText.hide();
            this.hlElement.style.display = "none";
        }

        var _self = this;
        if(step.notAvailable) {
            this.stepForward();
            return;
        }
/*
        if (step.before)
            step.before();
*/
        if(step.actionType)
            this.actionScope[step.actionType].apply(this, step.args);

        setTimeout(function(){   // the timeout is to allow ui anims to shift
            getCurrentEl();
            if(!_self.currentEl)
                return;

            _self.highlightElement();

            // Reset Position
            winTourText.setAttribute("bottom", "");
            winTourText.setAttribute("top", "");
            winTourText.setAttribute("left", "");
            winTourText.setAttribute("right", "");

            textTourDesc.setValue(apf.escapeXML(step.desc));

            var pos = _self.getElementPosition(_self.currentEl);

            if(!pos)
                return;

            winTourText.setAttribute("class", step.pos);

            _self.setPositions(step.pos, pos, winTourText, step.extra, step.extraTop);

            if(step.pos)
                winTourText.show();

        }, 400);
    },

    setPositions: function(position, posArray, div, extra, extraTop) {
        if (position == "top"){
            div.setAttribute("bottom", (window.innerHeight - posArray[1]) + 25);
            div.setAttribute("left", (posArray[0] + (posArray[2] / 2)) - (div.getWidth() / 2));
        }
        else if (position == "right"){
            if (extra === undefined)
                extra = 0;
            if (extraTop === undefined)
                extraTop = 0;

            div.setAttribute("left", posArray[0] + posArray[2] + 25 + extra);
        }
        else if (position == "bottom"){
            if (extra === undefined)
                extra = 0;
            if (extraTop === undefined)
                extraTop = 0;

            div.setAttribute("top", posArray[3] + 50 + extraTop);
            div.setAttribute("left", posArray[3] + extra);
        }
        else if (position == "left"){
            if (extra === undefined)
                extra = 0;
            if (extraTop === undefined)
                extraTop = 0;

            div.setAttribute("right", (window.innerWidth - posArray[0]) + 15 + extra); // compensation for new file dialog
            div.setAttribute("top", (posArray[1] + (posArray[3] / 2)) - (div.getHeight() / 2) + extraTop);
        }

        return div;
    },

    /**
     * Element methods
     */
    highlightElement: function(){
        this.resizeHighlightedEl();

        var hlZindex = this.hlElement.style.zIndex;
        winTourText.$ext.style.zIndex = hlZindex + 1;
        tourControlsDialog.$ext.style.zIndex = hlZindex + 2;
        this.hlElement.style.display = "block";
    },

    resizeHighlightedEl: function() {
        var pos = this.getElementPosition(this.currentEl);
        this.hlElement.style.left = pos[0] + "px";
        this.hlElement.style.top = pos[1] + "px";
        this.hlElement.style.width = (pos[2] - 4) + "px";
        this.hlElement.style.height = (pos[3] - 4) + "px";
        this.hlElement.style.display = "block";
        this.hlElement.style.border = "solid 2px #bee82c";

        if (this.currentEl.$ext) {
            var zIndex;
            var pNode = this.currentEl;
            if (pNode) {
                while (pNode && pNode.tagName != "body" && (!zIndex || zIndex <= 9998)) {
                    zIndex = pNode.$ext && pNode.$ext.style && parseInt(pNode.$ext.style.zIndex || 9997, 10) + 1;
                    pNode = pNode.parentNode;
                }
            }
            else {
                zIndex = 9998;
            }
        }
        else {
            zIndex = this.currentEl.style && parseInt(this.currentEl.style.zIndex || 9997) + 1;
        }

        this.hlElement.style.zIndex = zIndex;
    },

    getElementPosition: function(el){
        if(!el)
            return [0, 0, 0, 0];

        var elExt = el.$ext;
        if (elExt === undefined) {
            if (el.parentNode !== undefined)
                elExt = el.parentNode;
            else
                elExt = el[0];

            var pos = apf.getAbsolutePosition(elExt);
            return [pos[0], pos[1], elExt.offsetWidth, elExt.offsetHeight];
        }
        else {
            var pos = apf.getAbsolutePosition(elExt);
            var w = el.getWidth();
            var h = el.getHeight();
            return [pos[0], pos[1], w, h];
        }
    },

    closeTG: function() {
        var _self = this;
        winTourGuide.hide();
        apf.removeEventListener("keyup", _self.keyUpEvent);
    },

    shutdown: function(hlElement) {
        var _self = this;

        apf.removeEventListener("keyup", _self.keyUpEvent);
        return function() {
            require("ext/myelin/codetour").pause(); // stop auto-moving
            winTourText.hide();
            tourControlsDialog.hide();
            zen.fadeZenButtonOut(); // in case it's still showing
            (hlElement || _self.hlElement).style.display = "none";
            _self.currentStep = -1;
            _self.overlay.style = 'none';

            // restore setting to what they were before
            settings.model.setQueryValue("auto/console/@showinput", _self.cliBoxState);

            settings.model.setQueryValue("editors/code/@gutter", _self.gutterState);

            settings.model.setQueryValue("auto/statusbar/@show", _self.statusBarState);

            if (_self.projectFilesState === false)
                require("ext/tree/tree").hide();

            require("ext/sidebar/sidebar").animateToDefaultWidth();

        };
    }
});

});
