/**
 * Zen mode - Modified for Video Player by Myelin Price Interactive
 *
 * @TODO
 * - Disabling the extension doesn't call the disable() function
 * - While animating, disable ability to toggle zen mode (better: cancel and reverse the operation)
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

/*global Firmin vbZenVideo tabEditors btnVideoFullscreen vbMain */

define(function(require, exports, module) {

var ext = require("core/ext");
var ide = require("core/ide");
var editors = require("ext/editors/editors");
var settings = require("ext/settings/settings");
var markup = require("text!ext/myelin/zen.xml");
var skin = require("text!ext/myelin/zen-skin.xml");
var menus = require("ext/menus/menus");
var commands = require("ext/commands/commands");


var vbZenVideo;

module.exports = ext.register("ext/myelin/zen", {
    name     : "Zen Video",
    dev      : "Myelin Price",
    alone    : true,
    type     : ext.GENERAL,
    markup   : markup,
    skin     : {
        id   : "zen",
        data : skin,
        "media-path" : ide.staticPrefix + "/ext/main/style/images/",
        "icon-path"  : ide.staticPrefix + "/ext/main/style/icons/"
    },
    isFocused : false,
    neverShown : true,

    defaultOffset : 11,
    offsetWidth : 11,
    initialWidth : 0.70,

    entered: false,

    nodes : [],

    hook : function(){
        var _self = this;

        ide.addEventListener("settings.load", function(e){
            var strSettings = e.model.queryValue("auto/zen");
            if (strSettings)
                _self.initialWidth = strSettings;
        });

        ide.addEventListener("minimap.visibility", function(e) {
            if (e.visibility === "shown")
                _self.offsetWidth = _self.defaultOffset + e.width;
            else
                _self.offsetWidth = _self.defaultOffset;

            _self.updateButtonPosition();
        });

        ide.addEventListener("ext.revisions.show", function(e) {
            _self.offsetWidth = _self.defaultOffset + e.barWidth;
            _self.updateButtonPosition();
        });

        ide.addEventListener("ext.revisions.hide", function(e) {
            _self.offsetWidth = _self.defaultOffset;
            _self.updateButtonPosition();
        });

        // Page must be loaded, visit this
        //ext.initExtension(this); // unlike zen, this only needs to happen on load
    },

    init : function(){
        var _self = this;

        // Create all the elements used here
        this.zenVideoAnimate = document.createElement("div");
        this.zenVideoAnimate.setAttribute("id", "zenVideoAnimate");
        this.zenVideoAnimate.setAttribute("style", "display: none; background-color:black; opacity: 0;");
        this.zenVideoAnimate.classList.add("video-container");
        document.body.appendChild(this.zenVideoAnimate);

/*
        this.videoHack = document.createElement("div");
        this.videoHack.classList.add("video-hack");
        this.zenVideoAnimate.appendChild(this.videoHack);
        */

        this.zenVideoAnimatePosition = document.createElement("div");
        this.zenVideoAnimatePosition.setAttribute("id", "zenVideoAnimatePosition");
        this.zenVideoAnimatePosition.setAttribute("style", "display: none");
        document.body.appendChild(this.zenVideoAnimatePosition);

        var button = btnZenFullscreen;
        var page = tabEditors && ide.getActivePage();
        if (page.fake)
            page = page.relPage;
        page.appendChild(button);
        ide.addEventListener("tab.afterswitch", function(e) {
            var page = e.nextPage ? e.nextPage.fake ? e.nextPage.relPage : e.nextPage : null;
            if (page && button.parentNode != page)
                page.appendChild(button);
        });

        if (!_self.entered) {
            _self.entered = true;
            vbZenVideo = new apf.vbox({
                anchors: "0 0 0 0",
                id: "vbZenVideo",
                "class": "vbZenVideo",
                visible: false
            });
            vbMain.parentNode.appendChild(vbZenVideo);

/*
            vbZenVideo.addEventListener("resize", function(e) {
                if (_self.isFocused) {
                    _self.calculatePositions();
                }
            }); */
        }

        //ide.addEventListener("enterzen", function() {
            // originally created vbZenVideo dynamically
        //});

        setTimeout(function() {
            _self.updateButtonPosition();
        });

        this.zenVideoAnimate = document.getElementById("zenVideoAnimate");
        this.zenVideoAnimatePosition = document.getElementById("zenVideoAnimatePosition");

        ide.addEventListener("exitfullscreen", function() {
            _self.escapeFromZenMode(true);
        });
    },

    updateButtonPosition : function() {
        if (!window.btnZenFullscreen)
            return;

        // Extra safe default width
        var sbWidth = 20;
        if (editors.currentEditor.name === "Code Editor")
            sbWidth = editors.currentEditor.amlEditor.$editor.renderer.scrollBar.width;

        btnZenFullscreen.setAttribute("right", sbWidth + this.offsetWidth);
    },

    calculatePositions : function() {
        // Calculate the position
        var _self = this;
        _self.zenVideoAnimate.style.height = window.innerHeight + "px";
        var width = window.innerWidth * _self.initialWidth;
        var widthDiff = (window.innerWidth - width) / 2;
        _self.zenVideoAnimate.style.width = _self.zenVideoAnimate.style.width = width + "px";
        _self.zenVideoAnimate.style.left = widthDiff + "px";
    },

    /**
     * Method attached to key combination (Cmd/Ctrl + E)
     */
    zen : function() {
        this.toggleFullscreenZen();
    },

    /**
     * Method invoked to do the actual toggling of zen mode
     * Detects if zened or not
     *
     * @param {amlEvent} e Event from click
     */
    toggleFullscreenZen : function(e) {
        var shiftKey = false;
        if (e)
            shiftKey = e.htmlEvent.shiftKey;

        if (this.isFocused)
            this.escapeFromZenMode();
        else 
            this.fadeZenVideoAnimateIn(shiftKey);
    },

    enterIntoZenMode : function(activeElement) {
        ide.dispatchEvent("enterzen");

        var _self = this;
        // Calculates the destination position and dimensions of
        // the animated container
        var afHeight = apf.getHtmlInnerHeight(this.zenVideoAnimate);
        var browserWidth = window.innerWidth;
        var afWidth = browserWidth - 400;
        var finalW = 700;
        var leftOffset = (browserWidth-afWidth)/2;
        var finalOffset = (browserWidth-finalW)/2;
        var afHeight = 500;
        var topOffset = (window.innerHeight-afHeight)/2;

        Firmin.animate(this.zenVideoAnimate, {
            backgroundColor: "#000000", // testing
            opacity: "1",
            height: afHeight + "px",
            left: leftOffset + "px",
            top: topOffset + "px",
            width: afWidth + "px",
            timingFunction: "ease-in-out"
        }, 0.7,
        function() {
            _self.isFocused = true;

            // temporary example video
            _self.zenVideoAnimate.innerHTML = '<iframe width="640" style="opacity:0;" height="480" src="http://www.youtube.com/embed/hQVTIJBZook" frameborder="0" allowfullscreen></iframe>';

            Firmin.animate(_self.zenVideoAnimate.firstElementChild, {
                opacity: "1",
                timingFunction: "ease-in-out"
            }, 1.8, function() {});

            setTimeout(function() {
                Firmin.animate(_self.zenVideoAnimate, {
                    width: finalW + "px",
                    left: finalOffset + "px",
                    timingFunction: "ease-in-out"
                }, 0.6, function() {
                    setTimeout(function() {
                        if (activeElement && activeElement.$focus
                          && activeElement.getHeight())
                            activeElement.$focus();
                    }, 100);
                });
            }, 750);
                
        });
    },

    /**
     * Returns the editor to its original, non-zen,
     * non-fullscreen state
     *
     * @param {boolean} fromExitEvent Whether the call came from an "exitfullscreen" event
     */
    escapeFromZenMode : function(fromExitEvent) {
        if (this.isFocused === false)
            return;

        ide.dispatchEvent("escapezen");

        var _self = this;

        var activeElement = apf.document.activeElement;

        btnZenFullscreen.setAttribute("class", "notfull");
        this.isFocused = false;

        // Set the width to its actual width instead of "85%"
        var afWidth = apf.getHtmlInnerWidth(this.zenVideoAnimate);
        this.zenVideoAnimate.style.width = afWidth + "px";
        var afHeight = apf.getHtmlInnerHeight(this.zenVideoAnimate);
        this.zenVideoAnimate.style.height = afHeight + "px";

        Firmin.animate(this.zenVideoAnimate, {
            //height: height + "px",
            //width: width + "px",
            opacity: 0, 
            timingFunction: "ease-in-out"
        }, 0.7, function() {
            _self.zenVideoAnimate.style.display = "none";
            _self.zenVideoAnimate.setAttribute("style", "display: none; background-color:black; opacity: 0;");

            //apf.layout.forceResize(tabEditors.parentNode.$ext);

            setTimeout(function() {
                if (activeElement && activeElement.getHeight()
                  && fromExitEvent === false)
                    activeElement.$focus();
            }, 100);
        });

        Firmin.animate(vbZenVideo.$ext, {
            opacity: "0"
        }, 0.8, function() {
            vbZenVideo.hide();
        });

    },

    /**
     * Gets the position and dimensions of tabEditors.parentNode
     * and applies those values to the window that temporarily
     * holds tabEditors.parentNode during the animation
     */
    matchAnimationWindowPosition : function() {
        var tePos = apf.getAbsolutePosition(tabEditors.parentNode.$ext);
        var teWidth = tabEditors.parentNode.getWidth();
        var teHeight = tabEditors.parentNode.getHeight();

        this.zenVideoAnimate.style.left = tePos[0] + "px";
        this.zenVideoAnimate.style.top = tePos[1] + "px";
        this.zenVideoAnimate.style.width = teWidth + "px";
        this.zenVideoAnimate.style.height = teHeight + "px";
        this.zenVideoAnimate.style.display = "block";
    },

    /**
     * Gets the class selectors from the ace_editor element and
     * gets the corresponding bg color for the theme. Then it
     * applies that bg color to the scroller element
     *
     * Otherwise the default background color is grayish and the
     * animation exposes that bg color - making it look bad
     *
     * This is hacked and should probably be in Ace already
     */
    setAceThemeBackground : function() {
        // Set the background color so animating doesn't show a dumb gray background
        var ace_editor = document.getElementsByClassName("ace_editor")[0];
        if (!ace_editor)
            return;

        var classNames = ace_editor.getAttribute("class").split(" ");
        for (var cn = 0; cn < classNames.length; cn++) {
            if (classNames[cn].indexOf("ace-") === 0) {
                var selectorString = "." + classNames[cn] + " .ace_scroller";
                var bgColor = apf.getStyleRule(selectorString, "background-color");
                if (!bgColor)
                    bgColor = apf.getStyleRule(".ace_scroller", "background-color");
                ace_editor.style.backgroundColor = bgColor;
                break;
            }
        }
    },

    fadeZenVideoAnimateIn: function(shiftKey) {
        var _self = this;
        var activeElement = apf.document.activeElement;

        // Do fancy animation
        this.matchAnimationWindowPosition();
        this.setAceThemeBackground();

        if(vbZenVideo) {
            vbZenVideo.show();
            Firmin.animate(vbZenVideo.$ext, {
                opacity: "1"
            }, 1.4);
        } else console.log('still missing');

        Firmin.animate(this.zenVideoAnimate, {
            opacity: "1",
            timingFunction: "ease-in-out"
        }, 0.8,
        function() {
            _self.isFocused = true;


//            apf.layout.forceResize();

            setTimeout(function() {
                if (activeElement && activeElement.$focus
                  && activeElement.getHeight())
                    activeElement.$focus();
               _self.enterIntoZenMode(activeElement, shiftKey); // no genuine reason for double embedding
            }, 100);
        });
    },

    fadeZenVideoAnimateOut: function() {
        var _self = this;
        apf.tween.single(_self.zenVideoAnimate, {
            type     : "opacity",
            anim     : apf.tween.easeInOutCubic,
            from     : 0,
            to       : 1,
            steps    : 8,
            interval : 20,
            control  : (this.control = {}),
            onfinish : function(){
                vbZenVideo.hide();
            }
        });
    },

    /**
     * Called during the onmouseover event from the zen button
     */
    fadeZenButtonIn : function() {
        apf.tween.single(btnZenFullscreen, {
            type     : "opacity",
            anim     : apf.tween.easeInOutCubic,
            from     : 0,
            to       : 1,
            steps    : 8,
            interval : 20,
            control  : (this.control = {}),
            onfinish : function(){
            }
        });
    },

    enable : function(){
        btnZenFullscreen.show();
        this.$enable();
    },

    disable : function(){
        if (this.isFocused)
            this.escapeFromZenMode(false);
        btnZenFullscreen.hide();
        this.$disable();
    },

    destroy : function(){
        menus.remove("View/Zen");
        commands.removeCommandsByName(["zen"]);
        this.$destroy();
    }
});

});
