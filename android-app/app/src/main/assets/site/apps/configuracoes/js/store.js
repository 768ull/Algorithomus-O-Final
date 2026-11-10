(function(M) {
    "use strict";
    var KEY = "cfg:v1";
    var DEFAULTS = {
        wifi: true,
        bluetooth: false,
        silencioso: false,
        volume: 1,
        vibracao: true,
        brilho: 1,
        bloqueio: "30s"
    };
    var state = {};
    var key;
    var globals = [];
    var views = [];
    var allowed = {};
    function read() {
        try {
            var raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    }
    function write() {
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
        } catch (err) {}
    }
    function pick(key) {
        return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : DEFAULTS[key];
    }
    M.store = {
        DEFAULTS,
        load: function() {
            state = {};
            var saved = read();
            for (key in DEFAULTS) {
                if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) continue;
                state[key] = saved && typeof saved[key] === typeof DEFAULTS[key] ? saved[key] : DEFAULTS[key];
            }
        },
        get: function(name) {
            return pick(name);
        },
        set: function(name, value) {
            if (state[name] === value) return value;
            state[name] = value;
            write();
            globals.forEach(function(fn) {
                fn(name, value);
            });
            views.forEach(function(fn) {
                fn(name, value);
            });
            return value;
        },
        onChange: function(fn) {
            globals.push(fn);
        },
        onView: function(fn) {
            views.push(fn);
        },
        limitar: function(name, options) {
            allowed[name] = options;
            if (options.indexOf(state[name]) >= 0) return;
            state[name] = options[0];
            write();
        },
        resetViews: function() {
            views = [];
        }
    };
})(window.Cfg = window.Cfg || {});