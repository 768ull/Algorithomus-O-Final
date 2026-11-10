(function(global) {
    "use strict";
    var S = global.Celular;
    var GLITCH_MIN = 420;
    var GLITCH_MAX = 900;
    var SEVER_MS = 3200;
    var SEVER_TICK = 60;
    var SEVER_FADE_MS = 900;
    var sever = 0;
    var severTimer = 0;
    var glitchTimer = 0;
    var calling = null;
    function setSever(value) {
        var device = global.document.getElementById("device");
        sever = S.clamp(value, 0, 1);
        if (device) device.style.setProperty("--sever", sever.toFixed(3));
    }
    function playGlitchSound() {
        var sound = global.sound;
        if (sound && sound.glitch) sound.glitch();
    }
    function strikeGlitch() {
        var device = global.document.getElementById("device");
        var screen = global.document.getElementById("screen");
        var callBox = global.document.querySelector(".call--sos");
        playGlitchSound();
        if (device) {
            device.style.setProperty("--glitch-burst", "160ms");
            device.style.setProperty("--glitch-speed", "1.1");
            device.style.setProperty("--glitch-roll-h", "calc(41 * var(--px))");
            device.classList.add("is-severing");
            device.classList.remove("is-sever-strike");
            void device.offsetWidth;
            device.classList.add("is-sever-strike");
        }
        if (screen) {
            screen.classList.remove("is-corrupted");
            void screen.offsetWidth;
            screen.classList.add("is-corrupted");
        }
        if (callBox) callBox.classList.add("is-corrupted");
    }
    function glitchGap() {
        var slow = GLITCH_MAX + 180;
        var fast = 260;
        var base = slow - (slow - fast) * sever;
        return base + Math.random() * (GLITCH_MAX - GLITCH_MIN);
    }
    function tickGlitch() {
        glitchTimer = setTimeout(function() {
            if (!calling) return;
            strikeGlitch();
            tickGlitch();
        }, glitchGap());
    }
    function startGlitch() {
        stopGlitch();
        setSever(0);
        severTimer = setInterval(function() {
            if (!calling) return;
            setSever(sever + SEVER_TICK / SEVER_MS);
        }, SEVER_TICK);
        glitchTimer = setTimeout(function() {
            if (!calling) return;
            strikeGlitch();
            tickGlitch();
        }, glitchGap());
    }
    function stopGlitch(keepCall) {
        clearTimeout(glitchTimer);
        clearInterval(severTimer);
        glitchTimer = 0;
        severTimer = 0;
        var device = global.document.getElementById("device");
        var screen = global.document.getElementById("screen");
        var callBox = global.document.querySelector(".call--sos");
        setSever(0);
        if (device) device.classList.remove("is-frying", "is-severing", "is-sever-strike");
        if (screen) screen.classList.remove("is-corrupted");
        if (callBox && !keepCall) callBox.classList.remove("is-corrupted");
    }
    function fadeGlitch() {
        clearTimeout(glitchTimer);
        clearInterval(severTimer);
        glitchTimer = 0;
        severTimer = 0;
        var device = global.document.getElementById("device");
        var screen = global.document.getElementById("screen");
        var start = sever;
        var from = Date.now();
        severTimer = setInterval(function() {
            var t = S.clamp((Date.now() - from) / SEVER_FADE_MS, 0, 1);
            setSever(start * (1 - t));
            if (t < 1) return;
            clearInterval(severTimer);
            severTimer = 0;
            if (device) device.classList.remove("is-frying", "is-severing", "is-sever-strike");
            if (screen) screen.classList.remove("is-corrupted");
        }, SEVER_TICK);
    }
    function syncGlitch() {
        var decoder = global.CallsDecoder;
        if (decoder && decoder.isSecret()) startGlitch(); else stopGlitch();
    }
    function setCalling(value) {
        calling = value;
    }
    global.CallsEffects = {
        startGlitch,
        stopGlitch,
        fadeGlitch,
        syncGlitch,
        setCalling
    };
})(window);