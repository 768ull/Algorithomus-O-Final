(function(global) {
    "use strict";
    var CLASS_SITE = "is-site-glitch";
    var SITE_GLITCH_MS = 460;
    var SITE_GAP_MIN = 70;
    var SITE_GAP_MAX = 190;
    var root = null;
    var siteTimer = 0;
    var storming = false;
    function siteStrike() {
        if (!root) root = document.documentElement;
        root.classList.add(CLASS_SITE);
        clearTimeout(siteTimer);
        siteTimer = setTimeout(function() {
            root.classList.remove(CLASS_SITE);
            if (!storming) return;
            siteTimer = setTimeout(siteStrike, SITE_GAP_MIN + Math.random() * (SITE_GAP_MAX - SITE_GAP_MIN));
        }, SITE_GLITCH_MS);
    }
    function setStorming(value) {
        storming = value;
    }
    function stop() {
        storming = false;
        clearTimeout(siteTimer);
        siteTimer = 0;
        if (root) root.classList.remove(CLASS_SITE);
    }
    function init() {
        root = document.documentElement;
    }
    global.IntroEffects = {
        siteStrike,
        setStorming,
        stop,
        init
    };
})(window);