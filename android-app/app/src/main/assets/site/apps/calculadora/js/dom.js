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
            if (key === "className") node.className = props[key]; else if (key === "text") node.textContent = props[key]; else if (key === "style") node.setAttribute("style", props[key]); else if (key === "on") {
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
})(window.Cal = window.Cal || {});