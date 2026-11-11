(function(C) {
    "use strict";
    var ID = "cobrinha";
    var shell = window.parent;
    var embedded = shell !== window;
    var hostPaused = false;
    C.host = {
        ready: function() {
            if (!embedded) return;
            shell.postMessage({
                v: C.VERSION,
                from: ID,
                type: "app:ready"
            }, "*");
        },
        emit: function(name, payload) {
            if (!embedded) return;
            shell.postMessage({
                v: C.VERSION,
                from: ID,
                type: "app:event",
                name,
                payload: payload === undefined ? null : payload
            }, "*");
        },
        on: function(handler) {
            window.addEventListener("message", function(event) {
                var data = event.data;
                if (!data || typeof data !== "object" || data.v !== C.VERSION) return;
                if (data.from !== "shell") return;
                handler(data);
            });
        },
        isPaused: function() {
            return hostPaused;
        },
        setPaused: function(value) {
            var was = hostPaused;
            hostPaused = !!value;
            if (was === hostPaused) return false;
            if (hostPaused) C.engine.stop(); else C.engine.start();
            return true;
        }
    };
    C.host.on(function(message) {
        if (message.type === "app:state") {
            if (message.name === "paused") {
                if (C.host.setPaused(true)) C.ui.suspend("host");
            } else if (message.name === "open") {
                if (C.host.setPaused(false)) C.ui.restore();
            }
            return;
        }
        if (message.type === "app:event" && message.name === "back") {
            var handled = C.ui.onBack();
            C.host.emit("back-result", {
                handled
            });
            return;
        }
        if (message.type === "app:event" && message.name === "device-audio") {
            C.ui.setDeviceAudio(message.payload.volume, message.payload.muted);
        }
    });
})(window.Cobrinha = window.Cobrinha || {});
