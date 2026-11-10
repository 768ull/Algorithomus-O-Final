(function(S) {
    "use strict";
    var layer = null;
    var rail = null;
    var railLayer = null;
    var shots = {};
    var box = {};
    var layerWidth = 0;
    var pageWidth = 0;
    var contentWidth = 0;
    function deviceScale() {
        var value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--device-scale"));
        return value > 0 ? value : 1;
    }
    function apply(appId, x, y, scale, radius) {
        var entry = S.apps.get(appId);
        if (!entry) return;
        entry.window.style.setProperty("--sx", x + "px");
        entry.window.style.setProperty("--sy", y + "px");
        entry.window.style.setProperty("--ss", scale);
        entry.window.style.setProperty("--snap-radius", radius);
    }
    function reset(appId) {
        var entry = S.apps.get(appId);
        if (!entry) {
            delete box[appId];
            return;
        }
        var node = entry.window;
        node.classList.remove("is-snapshot", "is-snapshot-out", "is-silent", "is-frozen");
        node.style.removeProperty("--sx");
        node.style.removeProperty("--sy");
        node.style.removeProperty("--ss");
        node.style.removeProperty("--snap-radius");
        node.style.removeProperty("--shot-blur");
        node.style.removeProperty("--shot-dim");
        node.style.removeProperty("--lift-y");
        node.style.removeProperty("--lift-a");
        node.classList.remove("is-lifting", "is-returning", "is-flinging");
        delete box[appId];
    }
    function measure() {
        box = {};
        layerWidth = 0;
        pageWidth = 0;
        contentWidth = 0;
        if (!railLayer) return;
        var previous = rail.style.transform;
        var prevTransition = rail.style.transition;
        rail.style.transition = "none";
        rail.style.transform = "none";
        void rail.offsetWidth;
        var k = deviceScale();
        var layerBox = layer.getBoundingClientRect();
        pageWidth = railLayer.clientWidth;
        layerWidth = layerBox.width / k;
        for (var appId in shots) {
            if (!Object.prototype.hasOwnProperty.call(shots, appId)) continue;
            var slot = shots[appId];
            if (!slot || !S.apps.get(appId)) continue;
            var rect = slot.getBoundingClientRect();
            if (!rect.width) continue;
            var w = rect.width / k;
            box[appId] = {
                x: (rect.left - layerBox.left) / k,
                y: (rect.top - layerBox.top) / k,
                w
            };
            var right = box[appId].x + w + (pageWidth - w) / 2;
            if (right > contentWidth) contentWidth = right;
        }
        rail.style.transform = previous;
        rail.style.transition = prevTransition;
        void rail.offsetWidth;
    }
    S.snapshot = {
        init: function() {
            layer = S.$("#appLayer");
            rail = S.$("#recentsRail");
            railLayer = S.$("#recentsRailLayer");
            S.slider.init({
                host: railLayer,
                track: rail,
                content: function() {
                    return contentWidth;
                },
                page: function() {
                    return railLayer.clientWidth;
                },
                points: function() {
                    return Object.keys(box).map(function(appId) {
                        return box[appId].x + box[appId].w / 2 - pageWidth / 2;
                    });
                },
                onFrame: S.snapshot.place,
                onDragState: function(active) {
                    document.body.classList.toggle("is-rail-drag", active);
                },
                onVertical: function(dy, target, phase) {
                    S.nav.lift(dy, target, phase);
                },
                onTap: function() {
                    S.nav.closeRecents();
                }
            });
            window.addEventListener("resize", function() {
                S.snapshot.measure();
                S.snapshot.place(S.slider.offset());
            });
        },
        has: function(appId) {
            return !!shots[appId];
        },
        measure,
        enter: function(appId, slot) {
            var entry = S.apps.get(appId);
            if (!entry || !slot) return;
            shots[appId] = slot;
            entry.window.classList.remove("is-open", "is-closing", "is-silent");
            entry.window.classList.add("is-snapshot", "is-frozen");
            if (S.apps.freeze) S.apps.freeze(appId); else S.bridge.setState(appId, "paused");
        },
        place: function(slide) {
            var offset = slide || 0;
            if (!layerWidth) return;
            var middle = pageWidth / 2;
            for (var appId in box) {
                if (!Object.prototype.hasOwnProperty.call(box, appId)) continue;
                var entry = S.apps.get(appId);
                if (!entry) continue;
                var item = box[appId];
                var scale = item.w / layerWidth;
                apply(appId, item.x - offset, item.y, scale, 18 / scale + "px");
                var distance = Math.abs(item.x - offset + item.w / 2 - middle);
                var ratio = S.clamp(distance / (middle || 1), 0, 1);
                entry.window.style.setProperty("--shot-dim", ratio.toFixed(3));
                entry.window.style.removeProperty("--shot-blur");
            }
        },
        reset: function() {
            measure();
            S.snapshot.place(0);
            S.slider.reset();
        },
        retarget: function(idealOffset) {
            measure();
            S.snapshot.place(S.clamp(idealOffset || 0, 0, Math.max(0, contentWidth - pageWidth)));
            S.slider.retarget(idealOffset || 0);
        },
        release: function(appId, done) {
            var entry = S.apps.get(appId);
            if (!entry) {
                if (done) done();
                return;
            }
            if (!shots[appId]) {
                reset(appId);
                if (done) done();
                return;
            }
            entry.window.classList.add("is-snapshot-out");
            apply(appId, 0, 0, 1, "0px");
            setTimeout(function() {
                reset(appId);
                if (S.apps.unfreeze) S.apps.unfreeze(appId);
                entry.window.classList.add("is-open", "is-silent");
                if (done) done();
            }, S.TIMING.appIn);
        },
        dropAll: function() {
            for (var appId in shots) {
                if (Object.prototype.hasOwnProperty.call(shots, appId)) reset(appId);
            }
            shots = {};
            box = {};
        },
        dropOthers: function(keepAppId) {
            for (var appId in shots) {
                if (!Object.prototype.hasOwnProperty.call(shots, appId)) continue;
                if (appId === keepAppId) continue;
                reset(appId);
                delete shots[appId];
                delete box[appId];
            }
        },
        forget: function(appId) {
            reset(appId);
            delete shots[appId];
            delete box[appId];
        }
    };
})(window.Celular = window.Celular || {});