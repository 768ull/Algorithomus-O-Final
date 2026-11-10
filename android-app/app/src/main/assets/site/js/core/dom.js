(function(S) {
    "use strict";
    S.$ = function(selector, root) {
        return (root || document).querySelector(selector);
    };
    S.$$ = function(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    };
    S.el = function(tag, props, children) {
        var node = document.createElement(tag);
        var key;
        props = props || {};
        for (key in props) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
            if (key === "className") node.className = props[key]; else if (key === "text") node.textContent = props[key]; else if (key === "html") node.innerHTML = props[key]; else if (key === "style") node.setAttribute("style", props[key]); else if (key === "dataset") {
                for (var data in props[key]) node.dataset[data] = props[key][data];
            } else if (key === "on") {
                for (var type in props[key]) node.addEventListener(type, props[key][type]);
            } else if (key === "attrs") {
                for (var attr in props[key]) node.setAttribute(attr, props[key][attr]);
            } else {
                node[key] = props[key];
            }
        }
        (children || []).forEach(function(child) {
            if (child) node.appendChild(child);
        });
        return node;
    };
    S.pad = function(value) {
        return value < 10 ? "0" + value : String(value);
    };
    S.time = function(date) {
        var now = date || new Date;
        return S.pad(now.getHours()) + ":" + S.pad(now.getMinutes());
    };
    S.clockText = function(date) {
        var now = date || new Date;
        return S.pad(now.getHours()) + '<span class="status-bar__clock-sep">:</span>' + S.pad(now.getMinutes());
    };
    S.duration = function(ms) {
        var total = Math.floor(ms / 1e3);
        return S.pad(Math.floor(total / 60)) + ":" + S.pad(total % 60);
    };
    S.clamp = function(value, min, max) {
        return value < min ? min : value > max ? max : value;
    };
    S.haptic = function(ms) {
        if (navigator.vibrate && (!S.device || !S.device.isVibrationEnabled || S.device.isVibrationEnabled())) {
            navigator.vibrate(ms || 12);
        }
    };
    var handlers = {};
    S.bus = {
        on: function(name, handler) {
            (handlers[name] = handlers[name] || []).push(handler);
        },
        once: function(name, handler) {
            var off = function(payload) {
                var list = handlers[name] || [];
                var at = list.indexOf(off);
                if (at >= 0) list.splice(at, 1);
                handler(payload);
            };
            this.on(name, off);
        },
        emit: function(name, payload) {
            (handlers[name] || []).slice().forEach(function(handler) {
                handler(payload);
            });
        }
    };
    S.bindActions = function(actions) {
        document.addEventListener("click", function(event) {
            var target = event.target.closest ? event.target.closest("[data-action]") : null;
            if (!target) return;
            var handler = actions[target.dataset.action];
            if (!handler) return;
            target.classList.add("is-tapped");
            setTimeout(function() {
                target.classList.remove("is-tapped");
            }, 520);
            S.haptic(10);
            handler(target, event);
        });
    };
})(window.Celular = window.Celular || {});