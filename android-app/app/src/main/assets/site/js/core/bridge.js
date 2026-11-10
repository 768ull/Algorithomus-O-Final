(function(S) {
    "use strict";
    var windows = {};
    var ready = {};
    var queued = {};
    function envelope(type, name, payload) {
        return {
            v: S.VERSION,
            from: "shell",
            type,
            name: name || null,
            payload: payload === undefined ? null : payload
        };
    }
    S.bridge = {
        register: function(appId, win) {
            windows[appId] = win;
            ready[appId] = false;
            queued[appId] = [];
        },
        unregister: function(appId) {
            delete windows[appId];
            delete ready[appId];
            delete queued[appId];
        },
        isReady: function(appId) {
            return !!ready[appId];
        },
        markReady: function(appId) {
            ready[appId] = true;
            var waiting = queued[appId] || [];
            queued[appId] = [];
            waiting.forEach(function(message) {
                windows[appId].postMessage(message, "*");
            });
        },
        appIdFor: function(source) {
            var id;
            for (id in windows) {
                if (windows[id] === source) return id;
            }
            return null;
        },
        send: function(appId, type, name, payload) {
            if (!windows[appId]) return false;
            var message = envelope(type, name, payload);
            if (ready[appId]) windows[appId].postMessage(message, "*"); else queued[appId].push(message);
            return true;
        },
        setState: function(appId, state) {
            return this.send(appId, "app:state", state, {
                state
            });
        },
        emit: function(appId, name, payload) {
            return this.send(appId, "app:event", name, payload);
        },
        broadcast: function(type, name, payload) {
            var id;
            for (id in windows) windows[id].postMessage(envelope(type, name, payload), "*");
        },
        bind: function() {
            window.addEventListener("message", function(event) {
                var appId = S.bridge.appIdFor(event.source);
                if (!appId) return;
                var data = event.data;
                if (!data || typeof data !== "object" || data.v !== S.VERSION) return;
                if (data.from === "shell") return;
                if (data.type === "app:ready") {
                    S.bridge.markReady(appId);
                    S.bus.emit("app:ready", {
                        id: appId
                    });
                } else if (data.type === "app:event") {
                    S.bus.emit("app:event", {
                        id: appId,
                        name: data.name,
                        payload: data.payload
                    });
                }
            });
        }
    };
})(window.Celular = window.Celular || {});