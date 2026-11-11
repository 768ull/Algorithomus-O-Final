(function() {
    "use strict";
    var match = window.location.pathname.match(/\/apps\/([^/]+)\//);
    if (!match) return;
    var id = match[1];
    var last = "";
    function send() {
        var root = getComputedStyle(document.documentElement);
        var body = getComputedStyle(document.body);
        var background = root.getPropertyValue("--surface").trim() || root.getPropertyValue("--bg").trim() || root.getPropertyValue("--bg-color").trim() || body.backgroundColor;
        var text = root.getPropertyValue("--text").trim() || root.getPropertyValue("--text-color").trim() || body.color;
        var signature = background + ":" + text;
        if (signature === last) return;
        last = signature;
        window.parent.postMessage({
            v: 1,
            from: id,
            type: "app:event",
            name: "system-bars-theme",
            payload: {
                background,
                text
            }
        }, "*");
    }
    document.addEventListener("DOMContentLoaded", function() {
        send();
        var observer = new MutationObserver(send);
        observer.observe(document.documentElement, {
            attributes: true
        });
        observer.observe(document.body, {
            attributes: true
        });
    });
})();