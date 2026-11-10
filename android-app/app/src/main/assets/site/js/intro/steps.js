(function(global) {
    "use strict";
    var STEPS = [ {
        scale: null,
        reveal: false,
        glitch: false,
        hold: 1600
    }, {
        scale: .1,
        reveal: true,
        glitch: true,
        hold: 900
    }, {
        scale: .5,
        reveal: false,
        glitch: true,
        hold: 1100
    }, {
        scale: .7,
        reveal: false,
        glitch: true,
        hold: 900
    }, {
        scale: 1,
        reveal: false,
        glitch: true,
        texto: 5,
        hold: 900
    } ];
    var CLASS_SITE = "is-site-glitch";
    var CLASS_ARMED = "is-intro-armed";
    var CLASS_LIVE = "is-intro-live";
    var SITE_GLITCH_MS = 460;
    var root = null;
    var stage = null;
    var timers = [];
    var run = 0;
    function schedule(callback, delay, activeRun) {
        var timer = setTimeout(function() {
            timers = timers.filter(function(entry) {
                return entry !== timer;
            });
            if (activeRun === run) callback();
        }, delay);
        timers.push(timer);
    }
    function placeStage(scale, instant) {
        var props = [ [ "--intro-scale", String(scale) ], [ "--intro-blur", ((1 - scale) * 8).toFixed(2) + "px" ], [ "--intro-dim", (.45 + .55 * scale).toFixed(2) ] ];
        if (instant) stage.style.transition = "none";
        for (var i = 0; i < props.length; i++) {
            stage.style.setProperty(props[i][0], props[i][1]);
        }
        if (instant) {
            void stage.offsetWidth;
            stage.style.transition = "";
        }
    }
    function beat(step) {
        if (step.scale !== null) placeStage(step.scale, step.reveal);
        if (step.reveal) root.classList.add(CLASS_LIVE);
        if (!step.glitch) return;
        root.classList.add(CLASS_SITE);
        global.glitch.strike(step.texto);
        schedule(function() {
            root.classList.remove(CLASS_SITE);
        }, SITE_GLITCH_MS, run);
    }
    function play() {
        var i = 0;
        var activeRun = ++run;
        function next() {
            if (i >= STEPS.length) return finish();
            var step = STEPS[i++];
            beat(step);
            schedule(next, step.hold, activeRun);
        }
        next();
    }
    function cancel() {
        run++;
        timers.forEach(clearTimeout);
        timers = [];
        if (root) root.classList.remove(CLASS_SITE);
        if (stage) placeStage(1, true);
    }
    function finish() {
        placeStage(1, false);
        root.classList.remove(CLASS_ARMED);
        root.classList.add(CLASS_LIVE);
        global.glitch.hold(false);
        if (global.Celular && global.Celular.device && global.Celular.device.fit) {
            global.Celular.device.fit();
        }
        if (typeof global.intro.onDone === "function") global.intro.onDone();
    }
    function init() {
        root = document.documentElement;
        stage = document.querySelector(".stage");
    }
    global.IntroSteps = {
        STEPS,
        play,
        cancel,
        init
    };
})(window);