(function(global) {
    "use strict";
    var steps = global.IntroSteps;
    var effects = global.IntroEffects;
    var root = null;
    var stage = null;
    var warn = null;
    var button = null;
    var retryButton = null;
    var siteTimer = 0;
    var bootTimer = 0;
    var storming = false;
    var whiteoutMs = 1800;
    var CLASS_SITE = "is-site-glitch";
    var CLASS_ARMED = "is-intro-armed";
    var CLASS_LIVE = "is-intro-live";
    var CLASS_WHITE = "is-white";
    var CLASS_WHITEOUT = "is-whiteout";
    var CLASS_BOOTING = "is-booting";
    var CLASS_INIT = "is-initing";
    var WHITE_MS = 1250;
    var WHITE_PEAK = 690;
    var WARN_MS = 460;
    var CHARGE_CLASSES = [ "is-white", "is-cabling", "is-cabled", "is-charging", "is-calm", "is-unplugging" ];
    function readDurations() {
        var cs = global.getComputedStyle ? global.getComputedStyle(document.documentElement) : null;
        if (!cs) return;
        var white = parseFloat(cs.getPropertyValue("--whiteout-ms"));
        if (white > 0) whiteoutMs = white;
    }
    function prefersReducedMotion() {
        return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function motionAllowed() {
        return !prefersReducedMotion();
    }
    function storm(force) {
        if (storming) return;
        storming = true;
        effects.setStorming(true);
        if (!motionAllowed() && !force) return;
        global.glitch.hold(false);
        global.glitch.storm(true);
        effects.siteStrike();
    }
    function flash(done) {
        clearTimeout(bootTimer);
        root.classList.remove(CLASS_WHITE);
        void root.offsetWidth;
        root.classList.add(CLASS_WHITE);
        if (global.sound && global.sound.playRiser) global.sound.playRiser();
        bootTimer = setTimeout(function() {
            if (typeof done === "function") done();
        }, WHITE_PEAK);
        setTimeout(function() {
            root.classList.remove(CLASS_WHITE);
        }, WHITE_MS);
    }
    function chaos(opts) {
        storm();
        if (!motionAllowed()) {
            bootTimer = setTimeout(function() {
                reveal(opts);
            }, 400);
            return;
        }
        root.classList.add(CLASS_WHITEOUT);
        bootTimer = setTimeout(function() {
            reveal(opts);
        }, whiteoutMs + 500);
    }
    function reveal(opts) {
        opts = opts || {};
        clearTimeout(bootTimer);
        clearTimeout(siteTimer);
        if (global.IntroSteps && global.IntroSteps.cancel) global.IntroSteps.cancel();
        storming = false;
        effects.stop();
        root.classList.remove(CLASS_SITE);
        root.classList.remove(CLASS_WHITEOUT);
        if (opts.boot !== false) root.classList.add(CLASS_BOOTING);
        CHARGE_CLASSES.forEach(function(name) {
            root.classList.remove(name);
        });
        global.glitch.stop();
        if (global.Celular && global.Celular.device && global.Celular.device.fit) {
            global.Celular.device.fit();
        }
        if (opts.init === false) {
            if (typeof opts.onReveal === "function") opts.onReveal();
            return;
        }
        initing();
    }
    function initing() {
        var step = document.getElementById("bootStep");
        var fill = document.querySelector(".boot-progress__fill");
        var percent = document.getElementById("bootProgressPct");
        var progressPanel = document.getElementById("bootProgress");
        var track = progressPanel && progressPanel.querySelector("[role='progressbar']");
        var startedAt = Date.now();
        var MIN_DISPLAY_MS = 650;
        var lastAnnouncementAt = 0;
        var lastLabel = "";
        var lastFailed = 0;
        if (progressPanel) progressPanel.setAttribute("aria-hidden", "false");
        if (retryButton) retryButton.hidden = true;
        if (progressPanel) progressPanel.classList.remove("has-error");
        root.classList.add(CLASS_INIT);
        function progress(state) {
            state = state || {};
            var value = Math.max(0, Math.min(100, Number(state.percent) || 0));
            if (fill) fill.style.width = value + "%";
            if (percent) percent.textContent = Math.round(value) + "%";
            if (track) track.setAttribute("aria-valuenow", String(Math.round(value)));
            if (step && state.label) {
                var detail = state.completed !== undefined && state.total !== undefined ? " (" + state.completed + "/" + state.total + ")" : "";
                var announcement = state.label + detail + (state.failed ? " · " + state.failed + " falha(s)" : "");
                var failedCount = Number(state.failed) || 0;
                if (state.label !== lastLabel || failedCount !== lastFailed || Date.now() - lastAnnouncementAt >= 1500) {
                    step.textContent = announcement;
                    lastLabel = state.label;
                    lastFailed = failedCount;
                    lastAnnouncementAt = Date.now();
                }
            }
        }
        var preparation;
        try {
            preparation = global.intro && typeof global.intro.onBooting === "function" ? global.intro.onBooting(progress) : null;
        } catch (error) {
            preparation = Promise.resolve({
                failed: 1
            });
        }
        Promise.resolve(preparation).then(function(result) {
            var remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt));
            setTimeout(function() {
                finishBoot(result);
            }, remaining);
        }, function() {
            var remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt));
            setTimeout(function() {
                finishBoot({
                    failed: 1
                });
            }, remaining);
        });
    }
    function finishBoot(result) {
        if (result && result.failed) {
            var step = document.getElementById("bootStep");
            var panel = document.getElementById("bootProgress");
            var failedUrls = Array.isArray(result.failedUrls) ? result.failedUrls : [];
            var detail = failedUrls.slice(0, 2).map(function(url) {
                return String(url).split("/").pop();
            }).join(", ");
            var more = failedUrls.length > 2 ? " e mais " + (failedUrls.length - 2) : "";
            if (step) step.textContent = result.failed + " recurso(s) não carregaram" + (detail ? ": " + detail + more : ".") + " Verifique a conexão e tente novamente.";
            if (panel) panel.classList.add("has-error");
            if (retryButton) retryButton.hidden = false;
            if (retryButton) retryButton.focus();
            return;
        }
        root.classList.remove(CLASS_INIT);
        root.classList.remove(CLASS_BOOTING);
        var panel = document.getElementById("bootProgress");
        if (panel) panel.setAttribute("aria-hidden", "true");
        if (typeof global.intro.onBooted === "function") global.intro.onBooted(result);
    }
    function confirm(event) {
        if (event) event.preventDefault();
        if (warn.classList.contains("is-gone")) return;
        warn.classList.add("is-gone");
        if (global.sound && global.sound.startAmbient) global.sound.startAmbient();
        setTimeout(function() {
            if (warn.parentNode) warn.parentNode.removeChild(warn);
        }, WARN_MS);
        setTimeout(function() {
            steps.play();
        }, WARN_MS);
    }
    function boot() {
        root = document.documentElement;
        stage = document.querySelector(".stage");
        warn = document.getElementById("intro-warn");
        button = document.getElementById("intro-warn-btn");
        retryButton = document.getElementById("bootRetry");
        if (!root || !stage) return;
        readDurations();
        if (root.classList.contains("is-lock-capture")) {
            reveal({
                boot: false
            });
            return;
        }
        if (!warn || !button) {
            reveal();
            return;
        }
        if (button.addEventListener) button.addEventListener("click", confirm, false); else button.attachEvent("onclick", confirm);
        if (retryButton) retryButton.addEventListener("click", initing, false);
        root.classList.add(CLASS_ARMED);
        try {
            button.focus({
                preventScroll: true
            });
        } catch (err) {
            button.focus();
        }
    }
    (function claim() {
        if (!global.glitch || !global.glitch.hold) return;
        if (global.location && global.location.search.indexOf("glitch") !== -1) return;
        steps.init();
        effects.init();
        global.glitch.hold(true);
        document.addEventListener("DOMContentLoaded", boot);
    })();
    global.intro = {
        onDone: null,
        onBooting: null,
        onBooted: null,
        chaos,
        storm,
        flash,
        reveal
    };
})(window);
