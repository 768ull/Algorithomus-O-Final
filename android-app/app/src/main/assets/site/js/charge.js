(function(global) {
    "use strict";
    var STEPS = [ {
        at: "white",
        hold: 1250
    }, {
        at: "dead",
        hold: 500
    }, {
        at: "wait",
        hold: 2600
    }, {
        at: "cable",
        hold: 1600
    }, {
        at: "screen",
        hold: 0
    } ];
    var LEVEL = 100;
    var RISE_MS = 2200;
    var RISE_REDUCED_MS = 900;
    var CABLE_OUT_MS = 1e3;
    var root = null;
    var gauge = null;
    var pct = null;
    function easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
    function prefersReducedMotion() {
        return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function paint(progress) {
        var value = Math.round(LEVEL * progress);
        gauge.style.setProperty("--charge-progress", progress.toFixed(4));
        pct.textContent = value + "%";
    }
    function rise(whenDone) {
        var from = null;
        var dur = prefersReducedMotion() ? RISE_REDUCED_MS : RISE_MS;
        function finish() {
            paint(1);
            if (typeof whenDone === "function") whenDone();
        }
        paint(0);
        function tick(now) {
            if (from === null) from = now;
            var t = (now - from) / dur;
            if (t >= 1) {
                finish();
                return;
            }
            paint(easeInOutSine(t));
            global.requestAnimationFrame(tick);
        }
        global.requestAnimationFrame(tick);
    }
    function loaded() {
        if (global.sound && global.sound.charging && global.sound.charging.pause) {
            try {
                global.sound.charging.pause();
            } catch (err) {}
        }
        if (global.glitch && global.glitch.setCalm) global.glitch.setCalm(false);
        if (global.intro && typeof global.intro.storm === "function") global.intro.storm();
        unplug();
        setTimeout(function() {
            if (typeof global.intro.onFull === "function") global.intro.onFull();
        }, CABLE_OUT_MS);
    }
    function unplug() {
        root.classList.remove("is-cabling");
        root.classList.add("is-unplugging");
    }
    function step(where) {
        if (where === "white") {
            root.classList.add("is-white");
            if (global.sound && global.sound.playRiser) global.sound.playRiser();
            setTimeout(function() {
                root.classList.remove("is-white");
            }, 1250);
            return;
        }
        if (where === "cable") {
            root.classList.add("is-cabling");
            setTimeout(function() {
                root.classList.add("is-cabled");
            }, 1e3);
            return;
        }
        if (where === "screen") {
            root.classList.add("is-charging");
            if (global.sound && global.sound.startCharging) global.sound.startCharging();
            if (global.glitch && global.glitch.setCalm) global.glitch.setCalm(true);
            rise(loaded);
        }
    }
    function play() {
        var i = 0;
        (function next() {
            if (i >= STEPS.length) return;
            var s = STEPS[i++];
            step(s.at);
            setTimeout(next, s.hold);
        })();
    }
    function start() {
        root = document.documentElement;
        gauge = document.querySelector(".charge");
        pct = document.getElementById("charge-pct");
        if (!root || !gauge || !pct) return;
        play();
    }
    if (global.intro) global.intro.onDone = start;
    global.charge = {
        onFull: null,
        LEVEL,
        start
    };
})(window);