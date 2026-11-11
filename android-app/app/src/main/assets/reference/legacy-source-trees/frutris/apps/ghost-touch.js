(function () {
    "use strict";

    var direction = 1;
    var scrollIndex = 0;

    function scrollApp() {
        var nodes = Array.prototype.slice.call(document.querySelectorAll(
            "#list, #view-home, #view, .view, .list, .pane, .grid, main, body *"
        ));
        var scrollables = nodes.filter(function (node) {
            if (!node.clientHeight || node.scrollHeight <= node.clientHeight + 20) return false;
            var overflow = window.getComputedStyle(node).overflowY;
            return overflow === "auto" || overflow === "scroll" || node.scrollHeight > node.clientHeight + 48;
        });
        scrollables.sort(function (a, b) {
            var aPriority = /^(auto|scroll)$/.test(window.getComputedStyle(a).overflowY) ? 1 : 0;
            var bPriority = /^(auto|scroll)$/.test(window.getComputedStyle(b).overflowY) ? 1 : 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight);
        });

        if (!scrollables.length) return;
        var target = scrollables[scrollIndex % scrollables.length];
        scrollIndex += 1;
        var maxScroll = target.scrollHeight - target.clientHeight;
        if (target.scrollTop >= maxScroll - 4) direction = -1;
        else if (target.scrollTop <= 4) direction = 1;
        var amount = Math.max(55, Math.round(target.clientHeight * (0.32 + Math.random() * 0.16)));
        if (Math.random() < 0.28) direction *= -1;
        var nextTop = Math.max(0, Math.min(maxScroll, target.scrollTop + direction * amount));
        if (typeof target.scrollTo === "function") target.scrollTo({ top: nextTop, behavior: "smooth" });
        else target.scrollTop = nextTop;
    }

    window.addEventListener("message", function (event) {
        var message = event.data;
        if (!message || message.from !== "shell" || message.type !== "app:event" || message.name !== "ghost-touch") return;
        scrollApp();
    });
})();
