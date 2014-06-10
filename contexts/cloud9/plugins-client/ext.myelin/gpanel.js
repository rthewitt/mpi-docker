/**
 * Myelin G-panel (to be renamed) is a temporary control panel
 * to the functions of the website.  Originally this was for demo
 * purposes only.  Then it was migrated to Astrocyte/Glial
 * Now we are repurposing this once again for the new product.
 */

define(function(require, exports, module) {

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

var ide = require('core/ide'),
    ext = require('core/ext'),
    util = require('core/util'),
    rutil = require("ext/githistory/util"),
    editors = require('ext/editors/editors'),
    markup = require('text!ext/myelin/gpanel.xml'),
    logger = require("ext/console/logger"),
    Noderunner = require('ext/noderunner/noderunner'),
    css = require("text!ext/myelin/mpi-console.css"),
    codeTour = require('ext/myelin/codetour'),
    videoZen = require('ext/myelin/zen'),
    menus = require("ext/menus/menus"),
    ideConsole = require("ext/console/console"),
    commands = require("ext/commands/commands"),
    tabBehaviors = require('ext/tabbehaviors/tabbehaviors'),
    tabSessions = require('ext/tabsessions/tabsessions');

var dom = require("ace/lib/dom");
var event = require("ace/lib/event");
var Range = require("ace/range").Range

module.exports = ext.register('ext/myelin/gpanel', {
    name    : 'G-Control Panel',
    dev     : 'Myelin Price',
    type    : ext.GENERAL,
    alone   : true,
    markup  : markup,
    css     : util.replaceStaticPrefix(css),
    command_id_tracer : 1,

    commands: { 
        'gpanel': { 
            hint: 'Show the gpanel' 
        }
    },

    hotitems: {},
    nodes: [],
    totalScratchpads: 0,
    currentScratch: null,

    hook: function() {
        var mnuView = menus.addItemByPath("View");

        this.nodes.push(mnuView.appendChild(new apf.item({
            caption: 'GPanel',
            onclick: __bind(function() {
                this.gpanel();
            }, this)
        })));

        // Trying this location as well
        commands.addCommand({
            name: "gpanelShow",
            bindKey : { mac : "Ctrl-Shift-G", win : "Ctrl-Shift-G" },
            exec: function(e){
                gpanelWindow.show();
            }
        });
        commands.addCommand({
            name: "studentBuild",
            exec: __bind(function() {
                this.nativeCompile();
            }, this)
        });

        ext.initExtension(this);
    },

    gpanel: function() { 
        ext.initExtension(this); 
        this.gpanelWindow.show();
    },

    init: function() {

    var _self = this;
    this.MYELIN_TAB_SESSION = 'myelin-update';

    apf.importCssString(this.css);

    this.projectInit = projectInit;
    this.projectNext = projectNext;
    this.projectCompile = projectCompile;
    this.gpanelClose = gpanelClose;
    this.gpanelWindow = gpanelWindow;
    this.instructionWindow = instructionWindow; // will contain iframe
    this.lessonInstructions = lessonInstructions; // button
    this.instructionFrame = instructionFrame;
    this.addCodeStep = addCodeStep;
    this.addMarkup = addMarkup;
    this.addMarkupGrp = addMarkupGrp;
    this.launchVideoBtn = launchVideo;

    // author specific variables
    this.$timer = null;
    this.$editor = null;
    this.authorSteps = new Array(); // will be loaded if partially completed
    this.authorToken = { range: new Range() };

    this.gpanelClose.addEventListener('click', __bind(function() {
        return this.gpanelWindow.close();
    }, this));

    this.lessonInstructions.addEventListener('click', __bind(function() { 
        return this.instructionWindow.show();
    }, this));

    this.projectInit.addEventListener('click', __bind(function() {
        var url = '/myelin/show';
        var self = this;
        this.sendAjaxRequest({
            method: 'GET',
            url: url,
            params: null, 
            success: function(data) {
            var message = 'Myelin responded with: '+data;
                if(message) {
                    self.alertStudent(message)
                }
            }
        });
    }, this));

    this.projectNext.addEventListener('click', __bind(function() {
        //var stubbedSolution = 'this.doMeSolid = function (name) { var predefVar = "done solid"; return (!!name) ? (name+" "+predefVar) : predefVar; };';
        var openEditor = editors.currentEditor.amlEditor.$editor;
        var codeDoc = openEditor.session.getDocument();
        var solution = codeDoc.getValue();
        // TODO where to get id?  Easy if we use ajax, but preloading gives no opportunity
        // Redis?  That seems fragile.  Cookie?  That seems ugly.
      return this.ajaxSubmitHandler('id=greetings&solution='+encodeURIComponent(solution), 'Submitting, please wait...');
    }, this));

    // will need to add arguments, etc
    this.launchVideoBtn.addEventListener('click', __bind(function() {
      return this.launchVideo();
    }, this));


    this.addCodeStep.addEventListener('click', __bind(function(){ return this.launchAuthorStep()}, this));
    this.confirmationStepClick = __bind(function(e){ return this.onMouseClick(e)}, this);
    this.onAuthorMouseMove = __bind(function(e){ return this.authorMouseMove(e)}, this);
    this.onAuthorMouseOut = __bind(function(e){ return this.authorMouseOut(e)}, this);

    var authorMode = __bind(function(action) { return this.launchAuthorStep(action); }, this);

    this.addMarkup.addEventListener('click', authorMode('markup'));
    this.addMarkupGrp.addEventListener('click', authorMode('group'));

    this.projectCompile.addEventListener('click', __bind(function() {
        ideConsole.evalInputCommand('studentBuild');
    }, this));

    // Removed this.  This entire module will be gutted
    //setTimeout(function(){return _self.getStudentFromGlial();}, 1000);
    },

    enable: function() {
        this.nodes.each(function(item) {
          item.enable();
        });
    },

    disable: function() {
        this.nodes.each(function(item) {
          item.disable();
        });
    },

    destroy: function() {
        this.nodes.each(function(item) { 
            item.destroy(true, true);
        });

        this.nodes = [];
        this.gpanelClose.removeEventListener('click');
        this.projectInit.removeEventListener('click');
        this.projectNext.removeEventListener('click');
        this.projectCompile.removeEventListener('click');
        this.projectInit.destroy(true, true);
        this.gpanelClose.destroy(true, true);
        this.gpanelWindow.destroy(true, true);
        this.instructionWindow.destroy(true, true);
    },

    lessonMedia: function(callback) {
        var url="http://50.112.183.184:8080/delegate/bridge";

        var _self = this;
        var attachMedia = __bind(function(payload){
            var primaryMedia = JSON.parse(payload).primaryMedia;
            var walkthrough = JSON.parse(payload).tour;
            if(primaryMedia) 
                this.instructionFrame.setAttribute('src',primaryMedia);
            if(walkthrough)
                codeTour.loadTour(walkthrough)
            setTimeout(function(){return _self.statusPoll();}, 5000);
        }, this);

        var mediaSuccess = callback == undefined ? attachMedia : function() {
            callback();
            attachMedia();
        }

        this.sendAjaxRequest({
            method: 'GET',
            url: url,
            params: 'return=lessonMedia&student='+studentId+'&courseId='+encodeURIComponent(window.courseUUID),
            success: mediaSuccess
        });
    },
    statusPoll: function () {

        if(!window.studentId) // global on purpose.
            window.getStudentInformation();
        else {
            var url="http://50.112.183.184:8080/delegate/bridge";
            var _self = this;
            this.sendAjaxRequest({
                method: 'GET',
                url: url,
                params: 'return=status&student='+window.studentId+'&courseUUID='+encodeURIComponent(window.courseUUID),
                success: function(data){
                    var lessonAvailable = JSON.parse(data).lessonAvailable;
                    if(lessonAvailable) {
                        _self.alertStudent("Lesson Available!", 'return require(\'ext/myelin/gpanel\').updateHandler()');
                    } else setTimeout(function(){return _self.statusPoll();}, 5000);
                 },
                failure: function() {
                      setTimeout(function(){return _self.statusPoll();}, 5000);
                 }
            });
        }
    },

    sendAjaxRequest: function(ajax) {
        var xmlHttp = new XMLHttpRequest();
        ajax.isPOST = (ajax.method.toUpperCase() == 'POST' && ajax.params);
        ajax.params = ajax.params || '';

        if(ajax.method.toUpperCase() == 'GET')
            ajax.url += '?'+ajax.params;
        else if(!ajax.isPOST)
            return; 

        xmlHttp.open(ajax.method, ajax.url, true);

        if(ajax.isPOST) {
            xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
          }

        xmlHttp.onreadystatechange = function() {
            if(xmlHttp.readyState == 4) {
                if(xmlHttp.status == 200) {
                    if(ajax.success) 
                        ajax.success(xmlHttp.responseText);
                } else if(ajax.failure) ajax.failure();
            } 
        }
        if(ajax.isPOST) xmlHttp.send(ajax.params);
        else xmlHttp.send(); // may be redundant
    },

    ajaxSubmitHandler: function (params, message) {
        var url = '/myelin/submit'
        var self = this;
        self.alertStudent(message);
        this.sendAjaxRequest({
            method: 'POST',
            url: url,
            params: params,
            success: function(data) {
                window.myResults = data; // XXX
                var tmpResults = JSON.parse(data).results;
                var testResults = JSON.parse(tmpResults);
                for(var p = 0; p < testResults.passes.length; p++) {
                    var pass = 'Pass: '+testResults.passes[p].title;
                    self.alertStudent(pass);
                }
                for(var f = 0; f < testResults.failures.length; f++) {
                    var fail = 'FAIL: '+testResults.failures[f].title;
                    self.alertStudent(fail);
                }
                //self.instructionFrame.$ext.contentDocument.write(testResults);
                //self.instructionWindow.show();
            }
        });
    },

    // This will change when I more fully develop my code / tutorial runners
    ajaxCompileHandler: function intermediaryCompileHandler(params, message) {
        var port = '8080'
        var url = 'http://'+window.location.hostname+':'+port+'/glial/proj'
        var _self = this;
        this.sendAjaxRequest({
            method: 'GET',
            url: url,
            params: params,
            success: function(data) {
                var response = JSON.parse(data);
                if(response.status == 'true' && message) {
                    _self.alertStudent(message)
                } else if(response.status == 'false' && !!response.status.message) {
                    _self.alertStudent(response.status.message);
                }
            }
        });
    },

    // No quotes!
    delayedNotify: function(message, callbackStr, showLoading) {
       showLoading = !!showLoading;
       callbackStr = (!!callbackStr && callbackStr.indexOf('"') == -1) ? callbackStr : '';

       var current_tracer_id = "MPI-" + this.command_id_tracer;

       var pre = showLoading ? ['<div class="prompt_spinner"', ' id="spinner', current_id_tracer,
           '" onclick="return require(\'ext/myelin/gpanel\').handleFoldClick(event)"></div>'].join("") : '';

       var mpiCmdId = "console_section" + current_tracer_id;
       var post = !!callbackStr ? '<div class="c9-icon student_run" onclick="'+callbackStr+'"></div><div class="prompt_spacer"></div>' : '';
       var broadcast = function() {
           setTimeout(function(){
                logger.log(message, 'prompt', pre, post, false, mpiCmdId);
                var mpiCmdEl = document.getElementById(mpiCmdId);
                ideConsole.collapseOutputBlock(mpiCmdEl);
                apf.setStyleClass(mpiCmdEl, (showLoading ? 'loading' : 'loaded'));
           }, 500);
       }
       this.command_id_tracer++;
       return broadcast;
    },

    alertStudent: function(message, callbackStr) {
        ideConsole.show();
        if(!tabConsole || !pgConsole) alert('globals not available');
        tabConsole.set(pgConsole, this.delayedNotify(message, callbackStr));
    },

    nativeCompile: function() {

        ideConsole.show();
        tabConsole.set(pgConsole);

        ideConsole.$cwd = ('/workspace/'+window.courseUUID);
        var line = 'mvn -Duser.home=/home/myelin -Phtml clean integration-test';
        //var line = 'mvn -Duser.home=/home/myelin clean';

        if (txtConsolePrompt.visible) {
            var htmlPage = tabConsole.getPage().$ext;
            var loadingBlocks = htmlPage.getElementsByClassName("loading");
            var outputBlockEl = loadingBlocks[loadingBlocks.length - 1];
            if (outputBlockEl)
                outputBlockEl.lastChild.innerHTML += line;

            // Notes mention potential change from uniqueId -> id
            var pageId = tabConsole.getPage().$uniqueId;

            var data = {
                command: "npm-module-stdin",
                line: line,
                pid: ideConsole.pageIdToPidMap[pageId].pid
            };
            ide.send(data);
            return;
        }

        if (tabConsole.activepage === "output" || tabConsole.activepage === "pgSFResults")
        tabConsole.set("console");

        parseLine = require("ext/console/parser");
        var argv = parseLine(line);
        if (!argv || argv.length === 0) {
            return;
        }

        // Replace any quotes in the command
        argv[0] = argv[0].replace(/["'`]/g, "");

        var unique_id_tracer = "MPI-" + this.command_id_tracer;

        var spinnerBtn = ['<div class="prompt_spinner"', ' id="spinner', unique_id_tracer,
            '" onclick="return require(\'ext/myelin/gpanel\').handleFoldClick(event)"></div>']
            .join("");
        var outputId = "console_section" + unique_id_tracer;
        useOutput = {
            $ext : tabConsole.getPage().childNodes[0].$ext,
            id : outputId
        };

        logger.log("Building Student Project", "prompt", spinnerBtn, '<div class="c9-icon student_run" onclick="return require(\'ext/myelin/gpanel\').'+
            'handleNodeRunnerClick(event)"></div><div class="prompt_spacer"></div>',
            useOutput, outputId);

        var outputEl = document.getElementById(outputId);
        //apf.setStyleClass(outputEl, "myelin_alert");

        ideConsole.collapseOutputBlock(outputEl);
        apf.setStyleClass(outputEl, "loading");

        // This may be the original show flag for studentBuild, in which case I say hide it.
        var showConsole = true;
        var cmd = argv[0];

            var data = {
                command: cmd,
                argv: argv,
                line: line,
                cwd: ideConsole.getCwd(),
                requireshandling: !commands.commands[cmd],
                tracer_id: unique_id_tracer,
                extra : {
                    command_id : unique_id_tracer
                }
            };

            ide.dispatchEvent("track_action", {
                type: "console",
                cmd: cmd,
                argv: data.argv
            });

         // Send server side
        // Not handling anything here...
        var commandEvt = "consolecommand." + cmd;
        var consoleEvt = "consolecommand";
        var commandEvResult = ide.dispatchEvent(commandEvt, { data: data });
        var consoleEvResult = ide.dispatchEvent(consoleEvt, { data: data });
             if (commandEvResult !== false && consoleEvResult !== false) {
            if (!ide.onLine) {
                ideConsole.write("Cannot send command to server. You are currently offline.", {
                    tracer_id : unique_id_tracer
                });
            }
            else {
                data.extra = {
                    command_id : unique_id_tracer,
                    original_line : data.line,
                    page_id : tabConsole.getPage().$uniqueId
                };
                ide.send(data);
                this.command_id_tracer++;
            }
        }
        else { return false; } // does this signify an error?

        this.command_id_tracer++;

        return false;
    },

    handleNodeRunnerClick: function(e) {
        var pNode = e.target.parentNode;

        if (pNode.className.indexOf("loaded") !== -1) {
            ideConsole.$cwd = '/workspace';
            // TODO test with module name only.  Pass in arguments.
            Noderunner.run('../student_node_modules/myelin-runner/runner.js', [], false, '', '');
        }
        e.stopPropagation();
    },

    handleFoldClick: function(e) {
        var pNode = e.target.parentNode;

        if (pNode.className.indexOf("loaded") !== -1) {
            if (pNode.className.indexOf("collapsed") !== -1) {
                ideConsole.expandOutputBlock(pNode);
            } else {
                ideConsole.collapseOutputBlock(pNode);
            }
        } else ideConsole.collapseOutputBlock(pNode);
    },

    // Make this more advanced, so that the alert is "loading" and the success method changes existing item.
    // Perhaps wait until these actions are all commands
    updateHandler: function() {
        var _self = this;
        this.ajaxActionHandler('action=update'); // no such function any longer

        tabSessions.removeSession(this.MYELIN_TAB_SESSION);
        tabSessions.saveSession(this.MYELIN_TAB_SESSION);
        // TODO When tutorials are not read-only we'll need to save files
        tabBehaviors.closealltabs();
        // Direct notify instead!
        this.alertStudent('Updating project, please wait...');
        var url="http://50.112.183.184:8080/delegate/bridge";
        var finishUp = function(){
            tabSessions.loadSession(_self.MYELIN_TAB_SESSION);
            tabSessions.removeSession(_self.MYELIN_TAB_SESSION);
            _self.alertStudent('Project updated');
        }
        var notificationSuccess = function(data){
            _self.lessonMedia(finishUp);
        }
        this.sendAjaxRequest({
            method: 'GET',
            url: url,
            params: 'return=status&notified=true&student='+window.studentId+'&courseUUID='+encodeURIComponent(window.courseUUID),
            success: notificationSuccess,
            failure: function() {
                // Use error function and styling.
                _self.alertStudent('There was a problem with the update.  Please refresh');
             }
        });
    },
    launchVideo: function() {
        if(!videoZen.inited)
            ext.initExtension(videoZen);
        videoZen.zen();
    },
    bubbleAccept: function() {
        var editor = this.$editor || editors.currentEditor.amlEditor.$editor;
    },
    closeBubble: function() {
        var editor = this.$editor || editors.currentEditor.amlEditor.$editor;
        editor.renderer.content.style.cursor = "text";
        editor.setReadOnly(false);

        // remove bubble and clean markup
        winTourText.close();
        winTourText.setAttribute('draggable', 'false');
        var btns = winTourText.$ext.getElementsByClassName('step-close');
        btns = Array.prototype.slice.call(btns,0);
        var acc = winTourText.$ext.getElementsByClassName('step-accept');
        btns = btns.concat(Array.prototype.slice.call(acc,0));
        var pEl = winTourText.$ext.getElementsByClassName('text')[0].parentElement;
        var tmps = winTourText.$ext.getElementsByClassName('step-input');
        tmps = Array.prototype.slice.call(tmps,0);
        var editMarkup = [].concat(tmps,btns);
        
        var contentDiv = winTourText.$ext.getElementsByClassName('text')[0].parentElement;
        for(var cw=0; cw<editMarkup.length; cw++) {
            try { winTourText.$ext.removeChild(editMarkup[cw]); } catch(e){ }
            try { contentDiv.removeChild(editMarkup[cw]); } catch(e){ }
        }
        if(winTourText.$tmpVal) delete winTourText.$tmpVal;
        textTourDesc.$ext.innerHTML = ""; // trace where this went wrong!!
        editor.session.removeMarker(this.editStepMarker);
    },
    summonBubble:  function(e){
        if(!winTourText) {
            var _self = this;
            setTimeout(function(){return _self.summonBubble.call(_self, e)}, 300);
        } else {

            if(!this.$editor) return; // could have switch or closed during timeout
            this.$editor.removeListener('click', this.confirmationStepClick);
            this.$editor.renderer.content.style.cursor = "default";

            if(winTourText.$ext.getElementsByClassName('step-close').length < 1) {
                // create close button
                var stepClose = document.createElement('div');
                stepClose.classList.add('step-close');
                stepClose.setAttribute("onclick", "require('ext/myelin/gpanel').closeBubble();");
                winTourText.$ext.appendChild(stepClose);
            }
            if(winTourText.$ext.getElementsByClassName('step-accept').length < 1) {
                // create accept button
                var stepAccept = document.createElement('div');
                stepAccept.classList.add('step-accept');
                stepAccept.setAttribute("onclick", "require('ext/myelin/gpanel').bubbleAccept();");
                winTourText.$ext.appendChild(stepAccept);
            }
            winTourText.$ext.style.cursor = "move";
            winTourText.setAttribute('draggable', 'true');

            if(e.pageX) console.log(e.pageX);
            winTourText.setAttribute('left', e.clientX+50);
            winTourText.setAttribute('top', e.clientY-50);
            winTourText.$ext.classList.add('right');
            winTourText.show();
            var tmp = document.createElement('textarea');
            tmp.classList.add('text');
            tmp.classList.add('step-input');
            tmp.onkeypress = function(e) {
                var key;
                if(window.event)
                     key = window.event.keyCode;     //IE
                else
                     key = e.which;     //firefox
                if(key == 13) {
                    e.target.blur(); 
                return false;
                } else
                     return true;
            }
            tmp.onblur = function(e) {
                var tmpVal = winTourText.$tmpVal;
            if(!tmpVal) return;
                textTourDesc.setValue(tmpVal.value);
                tmpVal.value = '';
            winTourText.removeChild(tmpVal);
            }
            winTourText.$tmpVal = tmp;
            winTourText.$ext.getElementsByClassName('text')[0].parentElement.appendChild(tmp);
             textTourDesc.$ext.style.cursor = "text";
            textTourDesc.$ext.onclick = function(e){
                var tmpVal = winTourText.$tmpVal;
                if(!tmpVal) return;
                tmpVal.value = textTourDesc.getValue();
                textTourDesc.setValue('');
                textTourDesc.$ext.parentElement.appendChild(tmpVal);
                tmpVal.focus();
            }
            //var posArray = codeTour.getElementPositions();
        }
    },
    launchAuthorStep: function(authorAction) {
        if(!this.authorSteps) this.authorSteps = [];
        if(!editors.currentEditor) return; // TODO make this impossible by disabling buttons
        var editor = this.$editor || (this.$editor = editors.currentEditor.amlEditor.$editor);
        editor.setReadOnly(true);
        editor.renderer.content.style.cursor = "crosshair";
        editor.on('click', this.confirmationStepClick); 

        event.addListener(editor.renderer.scroller, "mousemove", this.onAuthorMouseMove);
        event.addListener(editor.renderer.content, "mouseout", this.onAuthorMouseMouseOut);
    },
    bubbleFloat: function() {
    },
    // clicked on token with hover marker
    onMouseClick:  function(e){
        var _self = this;
        var pos = e.getDocumentPosition();
        var r = this.authorToken.range;
        var editor = this.$editor;
        editor.renderer.content.style.cursor = "pointer";
        if(r.inside(pos.row, pos.column)) {
            // Are we protected from tab switching?
            editor.session.removeMarker(this.authorHoverMarker);
            // This marker will be more obvious than ace_selection
            this.editStepMarker = editor.session.addMarker(r, "ace_selection", "text");
            event.removeListener(editor.renderer.scroller, "mousemove", this.onAuthorMouseMove);
            event.removeListener(editor.renderer.content, "mouseout", this.onAuthorMouseOut);
            if(!codeTour.winTourText) {
                ext.initExtension(codeTour);
                setTimeout(function(){return _self.summonBubble.call(_self, e)}, 300);
            } else this.summonBubble(e);
        }
    },

    // loop when hovering over markers during author mode
    authorModeUpdate: function() {
        this.$timer = null;

        // Leaving focus causes a reset on this
        this.$editor.renderer.content.style.cursor = "crosshair";
        // Switching tabs will be very problematic
        var r = this.$editor.renderer;
        if (this.lastT - (r.timeStamp || 0) > 1000) {
            r.rect = null;
            r.timeStamp = this.lastT;
            this.maxHeight = innerHeight;
            this.maxWidth = innerWidth;
        }

        var canvasPos = r.rect || (r.rect = r.scroller.getBoundingClientRect());
        var offset = (this.x + r.scrollLeft - canvasPos.left - r.$padding) / r.characterWidth;
        var row = Math.floor((this.y + r.scrollTop - canvasPos.top) / r.lineHeight);
        var col = Math.round(offset);

        var screenPos = {row: row, column: col, side: offset - col > 0 ? 1 : -1};
        // Switching tabs will be very problematic
        var session = this.$editor.session;
        var docPos = session.screenToDocumentPosition(screenPos.row, screenPos.column);
        var token = session.getTokenAt(docPos.row, docPos.column);

        if (!token && !session.getLine(docPos.row)) {
            token = {
                type: "",
                value: "",
                state: session.bgTokenizer.getState(0)
            };
        }
        if (!token) {
            session.removeMarker(this.authorHoverMarker);
            return;
        }

        this.authorToken.token = token;
        this.authorToken.range = new Range(docPos.row, token.start, docPos.row, token.start + token.value.length);
        session.removeMarker(this.authorHoverMarker);
        this.authorHoverMarker = session.addMarker(this.authorToken.range, "ace_bracket", "text");
    },
    authorMouseMove: function(e) {
        this.x = e.clientX;
        this.y = e.clientY;
        this.lastT = e.timeStamp;

        if (!this.$timer) {
            var _self = this;
            this.$timer = setTimeout(function(){return _self.authorModeUpdate()}, 100);
        } 
    },
    authorMouseOut: function(e) {
        var t = e && e.relatedTarget;
        var ct = e &&  e.currentTarget;
        while(t && (t = t.parentNode)) {
            if (t == ct)
                return;
        }
        this.$editor.session.removeMarker(this.authorHoverMarker);
        this.$timer = clearTimeout(this.$timer);
    }
});

});
