(function(M) {
    "use strict";
    M.$ = function(selector, root) {
        return (root || document).querySelector(selector);
    };
    M.el = function(tag, props, children) {
        var node = document.createElement(tag);
        var key;
        props = props || {};
        for (key in props) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
            if (key === "className") node.className = props[key]; else if (key === "text") node.textContent = props[key]; else if (key === "html") node.innerHTML = props[key]; else if (key === "style") node.setAttribute("style", props[key]); else if (key === "on") {
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
})(window.Msg = window.Msg || {});