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
    M.percent = function(value) {
        return Math.round(value * 100) + "%";
    };
    M.plural = function(total, one, many) {
        return total + " " + (total === 1 ? one : many || one + "s");
    };
    M.extend = function(target, source, extra) {
        var key;
        target = target || {};
        for (key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
            target[key] = source[key];
        }
        for (key in extra) {
            if (!Object.prototype.hasOwnProperty.call(extra, key)) continue;
            target[key] = extra[key];
        }
        return target;
    };
})(window.Cfg = window.Cfg || {});