(function(W) {
    "use strict";
    var ID = "y";
    var VERSION = 1;
    var shell = window.parent;
    W.Y = W.Y || {};
    W.Y.host = {
        ready: function() {
            shell.postMessage({
                v: VERSION,
                from: ID,
                type: "app:ready"
            }, "*");
        },
        emit: function(name, payload) {
            shell.postMessage({
                v: VERSION,
                from: ID,
                type: "app:event",
                name,
                payload: payload === undefined ? null : payload
            }, "*");
        },
        on: function(handler) {
            window.addEventListener("message", function(event) {
                if(event.source!==window.parent||event.origin!==window.location.origin)return;
                var data = event.data;
                if (!data || typeof data !== "object" || data.v !== VERSION) return;
                if (data.from !== "shell") return;
                handler(data);
            });
        }
    };
})(window);