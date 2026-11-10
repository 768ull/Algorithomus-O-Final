(function(W) {
    "use strict";
    var ID = "configuracoes";
    var VERSION = 1;
    var shell = window.parent;
    W.Cfg.host = {
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
                var data = event.data;
                if (event.source !== shell) return;
                if (!data || typeof data !== "object" || data.v !== VERSION) return;
                if (data.from !== "shell") return;
                handler(data);
            });
        }
    };
})(window);