(function(M) {
    "use strict";
    var ROOT = "menu";
    var pages = {};
    var stack = [];
    var view = null;
    var titleEl = null;
    var subEl = null;
    var backBtn = null;
    var painted = null;
    function paint(backwards) {
        if (painted && painted.onLeave) painted.onLeave();
        var id = stack[stack.length - 1];
        var page = pages[id];
        painted = page;
        M.store.resetViews();
        titleEl.textContent = page.titulo;
        subEl.textContent = typeof page.sub === "function" ? page.sub() : page.sub || "";
        backBtn.hidden = stack.length <= 1;
        view.innerHTML = "";
        view.scrollTop = 0;
        var node = page.render();
        if (backwards) node.classList.add("page--back");
        view.appendChild(node);
        if (page.onEnter) page.onEnter(node);
    }
    M.router = {
        init: function() {
            view = M.$("#view");
            titleEl = M.$("#barTitle");
            subEl = M.$("#barSub");
            backBtn = M.$("#barBack");
        },
        register: function(id, page) {
            pages[id] = page;
        },
        current: function() {
            return stack[stack.length - 1] || ROOT;
        },
        open: function(id) {
            if (!pages[id]) return false;
            if (M.router.current() === id) return false;
            stack.push(id);
            paint(false);
            return true;
        },
        back: function() {
            if (stack.length <= 1) return false;
            stack.pop();
            paint(true);
            return true;
        },
        refresh: function() {
            paint(false);
        },
        reset: function() {
            stack = [ ROOT ];
            paint(false);
        }
    };
})(window.Cfg = window.Cfg || {});