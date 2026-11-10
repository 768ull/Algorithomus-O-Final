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
            var value = props[key];
            if (key === "className") node.className = value; else if (key === "text") node.textContent = value; else if (key === "html") node.innerHTML = value; else if (key === "style") node.setAttribute("style", value); else if (key === "dataset") {
                for (var d in value) node.dataset[d] = value[d];
            } else if (key === "on") {
                for (var t in value) node.addEventListener(t, value[t]);
            } else if (value === true) node.setAttribute(key, ""); else if (value === false || value === null || value === undefined) {} else node.setAttribute(key, value);
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
    M.avatar = function(src, extraClass) {
        var holder = M.el("span", {
            className: "avatar" + (extraClass ? " " + extraClass : "")
        });
        M.paintAvatar(holder, src);
        return holder;
    };
    M.paintAvatar = function(holder, src) {
        if (!holder) return;
        holder.textContent = "";
        holder.classList.add("has-img");
        holder.appendChild(M.el("img", {
            className: "avatar__img",
            alt: "",
            src: src || "",
            draggable: "false"
        }));
    };
    M.ICONS = {
        heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
        repost: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
        reply: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
        share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
        bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
        user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
        calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        verified: '<path d="m12 2 2.3 2 3-.4 1.1 2.8 2.8 1.1-.4 3L23 12l-2 2.3.4 3-2.8 1.1-1.1 2.8-3-.4L12 23l-2.3-2-3 .4-1.1-2.8L2.8 17.4l.4-3L1 12l2-2.3-.4-3 2.8-1.1L6.5 2.8l3 .4z"/><path d="m9 12 2 2 4-4"/>'
    };
    M.svg = function(name, extraClass) {
        var body = M.ICONS[name];
        if (!body) return "";
        return '<svg class="' + (extraClass || "") + '" viewBox="0 0 24 24" fill="none" ' + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' + 'stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + "</svg>";
    };
})(window.Y = window.Y || {});