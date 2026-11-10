                                                  

(function (global) {
    'use strict';

    var S = global.Celular;

    var NOISE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=/\\<>?@';
    var NOISE_MIN = 70;
    var NOISE_MAX = 150;
    var DECODE_SPAN = 0.34;
    var DECODE_STAGGER = 0.66;
    var SECRET_PROGRESS = 0.34;

    var noiseTimer = 0;
    var noiseFrom = 0;
    var noiseTotal = 0;
    var noiseName = '';
    var noiseInitial = '';
    var noiseSecret = false;
    var lockedChars = [];
    var nameEl = null;
    var initialEl = null;
    var calling = null;



    function whoIs(number) { return (S.discoveredContacts || {})[number] || null; }

    function noiseChar() {
        return NOISE.charAt(Math.floor(Math.random() * NOISE.length));
    }

    function charProgress(overall, index, total) {
        var delay = DECODE_STAGGER * (total > 1 ? index / (total - 1) : 0);
        return S.clamp((overall - delay) / DECODE_SPAN, 0, 1);
    }

    function decodeInto(el, target, overall) {
        var text = '';
        for (var i = 0; i < target.length; i++) {
            var p = charProgress(overall, i, target.length);
            if (!lockedChars[i] && Math.random() < p) lockedChars[i] = true;
            text += lockedChars[i] ? target.charAt(i) : noiseChar();
        }
        el.textContent = text;
    }

    function paintNoise() {
        var elapsed = Date.now() - noiseFrom;
        var overall = noiseTotal > 0 ? S.clamp(elapsed / noiseTotal, 0, 1) : 1;

        if (noiseSecret) {
            lockedChars = [];
            overall = SECRET_PROGRESS;
        }

        decodeInto(nameEl, noiseName, overall);
        initialEl.textContent = Math.random() < overall ? noiseInitial : noiseChar();
    }

    function startNoise(who, total) {
        stopNoise();
        noiseName = who.name;
        noiseInitial = who.initial;
        noiseSecret = !!who.secret;
        noiseTotal = total;
        noiseFrom = Date.now();
        lockedChars = [];

        paintNoise();
        noiseTimer = setInterval(function () {
            if (!calling) return;
            paintNoise();
        }, NOISE_MIN + Math.random() * (NOISE_MAX - NOISE_MIN));
    }

    function stopNoise() {
        clearInterval(noiseTimer);
        noiseTimer = 0;
    }

    function isSecret() {
        return noiseSecret;
    }

    function init(elements) {
        nameEl = elements.nameEl;
        initialEl = elements.initialEl;
    }

    function setCalling(value) {
        calling = value;
    }

    global.CallsDecoder = {
        whoIs: whoIs,
        startNoise: startNoise,
        stopNoise: stopNoise,
        isSecret: isSecret,
        init: init,
        setCalling: setCalling
    };

})(window);
