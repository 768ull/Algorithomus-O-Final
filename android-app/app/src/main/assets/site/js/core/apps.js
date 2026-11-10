(function(S) {
    "use strict";
    var layer = null;
    var live = {};
    var preloadPromise = null;
    var retryIds = [];
    var order = [];
    S.apps = {
        init: function() {
            layer = S.$("#appLayer");
        },
        has: function(appId) {
            return !!live[appId];
        },
        get: function(appId) {
            return live[appId] || null;
        },
        recentIds: function() {
            return order.slice().reverse();
        },
        ensure: function(appId, preload) {
            if (live[appId]) return live[appId];
            var app = S.APP[appId];
            if (!app) return null;
            var win = S.el("section", {
                className: "app-window" + (preload ? " is-preloading" : ""),
                dataset: {
                    app: appId
                },
                style: "--app-accent:" + app.accent
            });
            var boot = S.el("div", {
                className: "app-boot"
            }, [ S.el("div", {
                className: "app-boot__bar"
            }), S.el("div", {
                className: "app-boot__ring"
            }), S.el("span", {
                text: "abrindo " + app.name
            }) ]);
            var frame = S.el("iframe", {
                className: "app-frame",
                title: app.name,
                attrs: {
                    scrolling: "no",
                    allow: "autoplay"
                }
            });
            win.appendChild(boot);
            win.appendChild(frame);
            layer.appendChild(win);
            S.bridge.register(appId, frame.contentWindow);
            S.bridge.setState(appId, "paused");
            frame.addEventListener("load", function() {
                win.classList.add("is-ready");
                if (live[appId]) live[appId].loaded = true;
                S.bus.emit("app:frame-loaded", {
                    id: appId
                });
            });
            frame.addEventListener("error", function() {
                S.bus.emit("app:preload-error", {
                    id: appId
                });
            });
            live[appId] = {
                app,
                window: win,
                frame,
                ready: false,
                loaded: false
            };
            frame.src = app.url;
            return live[appId];
        },
        preloadAll: function(onProgress) {
            if (preloadPromise) return preloadPromise;
            retryIds.forEach(function(appId) { S.apps.destroy(appId); });
            retryIds = [];
            var apps = S.APPS.filter(function(app) {
                return app.launchable !== false;
            });
            var pending = {};
            var completed = 0;
            var failed = 0;
            var failedIds = [];
            var timeout = 0;
            var nextAppIndex = 0;
            var activePreloads = 0;
            var maxConcurrentPreloads = 2;
            preloadPromise = new Promise(function(resolve) {
                function report() {
                    if (typeof onProgress === "function") onProgress({
                        percent: completed / Math.max(1, apps.length) * 100,
                        completed,
                        total: apps.length,
                        failed,
                        failedIds: failedIds.slice(),
                        waiting: Object.keys(pending),
                        label: "preparando aplicativos"
                    });
                }
                function settle(appId, success, force) {
                    var state = pending[appId];
                    if (!state) return;
                    if (success && !force && !(state.ready && state.loaded)) return;
                    delete pending[appId];
                    completed++;
                    if (!success) {
                        failed++;
                        failedIds.push(appId);
                        retryIds.push(appId);
                    } else if (live[appId]) {
                        live[appId].window.classList.remove("is-preloading");
                    }
                    report();
                    activePreloads = Math.max(0, activePreloads - 1);
                    if (!Object.keys(pending).length) {
                        clearTimeout(timeout);
                        resolve({
                            completed,
                            total: apps.length,
                            failed,
                            failedIds: failedIds.slice()
                        });
                    } else {
                        startNext();
                    }
                }
                if (!apps.length) {
                    report();
                    resolve({
                        completed: 0,
                        total: 0,
                        failed: 0,
                        failedIds: []
                    });
                    return;
                }
                apps.forEach(function(app) {
                    pending[app.id] = {
                        ready: false,
                        loaded: false
                    };
                });
                S.bus.on("app:ready", function(event) {
                    if (event && pending[event.id]) {
                        var entry = live[event.id];
                        pending[event.id].ready = true;
                        if (entry) entry.ready = true;
                        settle(event.id, true);
                    }
                });
                S.bus.on("app:frame-loaded", function(event) {
                    if (event && pending[event.id]) {
                        pending[event.id].loaded = true;
                        settle(event.id, true);
                    }
                });
                S.bus.on("app:preload-error", function(event) {
                    if (event && pending[event.id]) settle(event.id, false, true);
                });
                timeout = setTimeout(function() {
                    Object.keys(pending).forEach(function(appId) {
                        settle(appId, false, true);
                    });
                }, 45e3);
                report();
                function startNext() {
                    while (activePreloads < maxConcurrentPreloads && nextAppIndex < apps.length) {
                        var app = apps[nextAppIndex++];
                        activePreloads++;
                    if (typeof onProgress === "function") onProgress({
                        percent: completed / Math.max(1, apps.length) * 100,
                        completed,
                        total: apps.length,
                        failed,
                        failedIds: failedIds.slice(),
                        waiting: Object.keys(pending),
                        label: "abrindo " + app.name
                    });
                    var entry = S.apps.ensure(app.id, true);
                    if (!entry) settle(app.id, false, true); else {
                        pending[app.id].ready = S.bridge.isReady(app.id);
                        pending[app.id].loaded = !!entry.loaded;
                        entry.ready = pending[app.id].ready;
                        settle(app.id, true);
                    }
                    }
                }
                startNext();
                report();
            });
            preloadPromise = preloadPromise.then(function(result) {
                if (result.failed) preloadPromise = null;
                return result;
            });
            return preloadPromise;
        },
        setState: function(appId, state) {
            return S.bridge.setState(appId, state);
        },
        freeze: function(appId) {
            var entry = live[appId];
            if (!entry) return;
            entry.window.classList.add("is-frozen");
            S.bridge.setState(appId, "paused");
        },
        unfreeze: function(appId) {
            var entry = live[appId];
            if (!entry) return;
            entry.window.classList.remove("is-frozen");
        },
        touch: function(appId) {
            order = order.filter(function(id) {
                return id !== appId;
            });
            order.push(appId);
        },
        destroy: function(appId) {
            var entry = live[appId];
            if (!entry) return;
            S.bridge.unregister(appId);
            if (entry.frame.parentNode) entry.frame.parentNode.removeChild(entry.frame);
            if (entry.window.parentNode) entry.window.parentNode.removeChild(entry.window);
            delete live[appId];
            order = order.filter(function(id) {
                return id !== appId;
            });
        }
    };
})(window.Celular = window.Celular || {});
