(function(M) {
    "use strict";
    M.$ = function(selector, root) {
        return (root || document).querySelector(selector);
    };
    M.$$ = function(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    };
    M.el = function(tag, props, children) {
        var node = document.createElement(tag);
        var key;
        props = props || {};
        for (key in props) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
            if (key === "className") node.className = props[key]; else if (key === "text") node.textContent = props[key]; else if (key === "html") node.innerHTML = props[key]; else if (key === "style") node.setAttribute("style", props[key]); else if (key === "attrs") {
                for (var attr in props[key]) node.setAttribute(attr, props[key][attr]);
            } else if (key === "on") {
                for (var type in props[key]) node.addEventListener(type, props[key][type]);
            } else {
                node[key] = props[key];
            }
        }
        (children || []).forEach(function(child) {
            if (child) node.appendChild(child);
        });
        return node;
    };
    M.pad = function(value) {
        return value < 10 ? "0" + value : String(value);
    };
    M.time = function(date) {
        var now = date || new Date;
        return M.pad(now.getHours()) + ":" + M.pad(now.getMinutes());
    };
    M.PHONE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' + 'stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 ' + "19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 " + "4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 " + '2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
})(window.Tel = window.Tel || {});