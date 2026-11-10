(function() {
    "use strict";
    var VERSION = 1;
    var ID = "sem-nome";
    if (window.parent === window) return;
    window.DiaryBridge = {
        emit: function(name, payload) {
            window.parent.postMessage({
                v: VERSION,
                from: ID,
                type: "app:event",
                name: name,
                payload: payload || null
            }, "*");
        }
    };
    window.addEventListener("message", function(event) {
        if(event.source!==window.parent||event.origin!==window.location.origin)return;
        var message = event.data;
        if (!message || message.v !== VERSION || message.from !== "shell") return;
        if (message.type === "app:event" && message.name === "back") {
            window.parent.postMessage({
                v: VERSION,
                from: ID,
                type: "app:event",
                name: "back-result",
                payload: {
                    handled: false
                }
            }, "*");
        }
    });
    window.parent.postMessage({
        v: VERSION,
        from: ID,
        type: "app:ready"
    }, "*");
})();
