(function(S) {
    "use strict";
    var veil = null;
    var DARKEST = .78;
    var KEY = "celular:display:brilho";
    function save(value) {
        try {
            localStorage.setItem(KEY, String(value));
        } catch (err) {}
    }
    function read() {
        try {
            var raw = localStorage.getItem(KEY);
            return raw === null ? 1 : Number(raw);
        } catch (err) {
            return 1;
        }
    }
    S.display = {
        init: function() {
            veil = S.$("#dim");
            S.display.brightness(read());
        },
        brightness: function(value) {
            var level = S.clamp(typeof value === "number" && !isNaN(value) ? value : 1, 0, 1);
            if (veil) veil.style.opacity = (1 - level) * DARKEST;
            save(level);
        }
    };
})(window.Celular = window.Celular || {});