(function(M) {
    "use strict";
    var NOISE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=/\\<>?@";
    var root = null;
    var names = [];
    var sheetName = null;
    var timer = 0;
    var active = true;
    var reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    function cancel() {
        clearTimeout(timer);
        timer = 0;
    }
    function paint(name) {
        var length = Number(name.getAttribute("data-noise-length")) || name.textContent.length;
        var text = "";
        for (var i = 0; i < length; i++) {
            text += Math.random() < .45 && name.textContent.charAt(i) ? name.textContent.charAt(i) : NOISE.charAt(Math.floor(Math.random() * NOISE.length));
        }
        name.setAttribute("data-noise-length", String(length));
        name.setAttribute("data-noise", text);
        name.textContent = text;
    }
    function tick() {
        cancel();
        if (!active || !names.length && !sheetName) return;
        names.forEach(paint);
        if (sheetName) paint(sheetName);
        var min = reduced && reduced.matches ? M.TIME.noiseReducedMin : M.TIME.noiseMin;
        var max = reduced && reduced.matches ? M.TIME.noiseReducedMax : M.TIME.noiseMax;
        timer = setTimeout(tick, min + Math.random() * (max - min));
    }
    M.wifiNoise = {
        start: function(page) {
            root = page;
            names = M.$$(".net__signal-name", page);
            tick();
        },
        stop: function() {
            cancel();
            root = null;
            names = [];
            sheetName = null;
        },
        sheet: function(name) {
            sheetName = name;
            tick();
        },
        setActive: function(value) {
            active = value;
            document.documentElement.classList.toggle("wifi-noise-paused", !active);
            tick();
        }
    };
    if (reduced && reduced.addEventListener) reduced.addEventListener("change", tick);
})(window.Cfg = window.Cfg || {});