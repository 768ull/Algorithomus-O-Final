(function(S) {
    "use strict";
    var host = null;
    var track = null;
    var config = null;
    var offset = 0;
    var min = 0;
    var max = 0;
    var points = [];
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startOffset = 0;
    var lastX = 0;
    var lastAt = 0;
    var speed = 0;
    var tappable = false;
    var target = null;
    var moved = false;
    var axis = null;
    var draggingClass = false;
    var SLOP = 6;
    function rubber(value) {
        if (value < min) return min + (value - min) * .32;
        if (value > max) return max + (value - max) * .32;
        return value;
    }
    function paint(value) {
        offset = value;
        track.style.transform = "translate3d(" + -value + "px, 0, 0)";
        if (config.onFrame) config.onFrame(value);
    }
    function measure() {
        min = 0;
        max = Math.max(0, config.content() - config.page());
        points = config.points(offset);
        offset = S.clamp(offset, min, max);
    }
    var settleTimer = 0;
    function settle(target_) {
        setDragging(false);
        paint(S.clamp(target_, min, max));
        if (host) {
            host.classList.add("is-settling");
            clearTimeout(settleTimer);
            settleTimer = setTimeout(function() {
                if (host) host.classList.remove("is-settling");
            }, 520);
        }
        if (config.onSettle) config.onSettle(offset);
    }
    function setDragging(value) {
        if (value && host) {
            host.classList.remove("is-settling");
            clearTimeout(settleTimer);
        }
        if (draggingClass === value) return;
        draggingClass = value;
        host.classList.toggle("is-dragging", value);
        if (config.onDragState) config.onDragState(value);
    }
    function onSwallowed(event) {
        window.removeEventListener("click", onSwallowed, true);
        swallowTimer = 0;
        event.preventDefault();
        event.stopPropagation();
    }
    var swallowTimer = 0;
    function swallowClick() {
        if (swallowTimer) return;
        window.addEventListener("click", onSwallowed, true);
        swallowTimer = setTimeout(function() {
            swallowTimer = 0;
            window.removeEventListener("click", onSwallowed, true);
        }, 400);
    }
    function start(event) {
        if (event.button !== undefined && event.button > 0) return;
        if (dragging) return;
        target = event.target;
        tappable = !(target && target.closest && target.closest("[data-action]"));
        measure();
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startOffset = offset;
        lastX = event.clientX;
        lastAt = Date.now();
        speed = 0;
        moved = false;
        axis = null;
        setDragging(true);
    }
    function move(event) {
        if (!dragging) return;
        var now = Date.now();
        if (now > lastAt) speed = (event.clientX - lastX) / (now - lastAt);
        lastX = event.clientX;
        lastAt = now;
        var dx = event.clientX - startX;
        var dy = event.clientY - startY;
        if (axis === null) {
            if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
            axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
            moved = true;
            swallowClick();
            if (axis === "x") {
                try {
                    host.setPointerCapture(event.pointerId);
                } catch (error) {}
            }
        }
        if (axis === "y") {
            if (config.onVertical) config.onVertical(dy, target, "move");
            event.preventDefault();
            return;
        }
        paint(rubber(startOffset - dx));
        event.preventDefault();
    }
    function nearestIndex(value) {
        var best = 0;
        var distance = Infinity;
        for (var i = 0; i < points.length; i++) {
            var d = Math.abs(points[i] - value);
            if (d < distance) {
                distance = d;
                best = i;
            }
        }
        return best;
    }
    function end(event) {
        if (!dragging) return;
        dragging = false;
        setDragging(false);
        var dy = event && event.clientY !== undefined ? event.clientY - startY : 0;
        if (axis === "y") {
            axis = null;
            if (config.onVertical) config.onVertical(dy, target, "end");
            return;
        }
        axis = null;
        if (moved) {
            var snapped;
            if (Math.abs(speed) > .35 && points.length) {
                var step = speed < 0 ? 1 : -1;
                snapped = points[S.clamp(nearestIndex(offset) + step, 0, points.length - 1)];
            } else {
                snapped = points.length ? points[nearestIndex(offset + speed * 120)] : 0;
            }
            settle(snapped);
            return;
        }
        if (tappable && event) {
            if (config.onTap) config.onTap();
        }
    }
    S.slider = {
        init: function(options) {
            config = options;
            host = options.host;
            track = options.track;
            host.addEventListener("pointerdown", start);
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", end);
            window.addEventListener("pointercancel", end);
            window.addEventListener("blur", function() {
                end(null);
            });
            var wheelLock = 0;
            host.addEventListener("wheel", function(event) {
                if (!config.content()) return;
                var delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
                if (!delta) return;
                event.preventDefault();
                var now = Date.now();
                if (now < wheelLock) return;
                wheelLock = now + 520;
                measure();
                setDragging(false);
                if (!points.length) {
                    settle(0);
                    return;
                }
                var step = delta > 0 ? 1 : -1;
                settle(points[S.clamp(nearestIndex(offset) + step, 0, points.length - 1)]);
            }, {
                passive: false
            });
        },
        reset: function() {
            measure();
            settle(0);
        },
        retarget: function(ideal) {
            measure();
            if (!points.length) {
                settle(0);
                return;
            }
            var clamped = S.clamp(ideal || 0, min, max);
            settle(points[nearestIndex(clamped)]);
        },
        offset: function() {
            return offset;
        },
        refresh: function() {
            measure();
            if (config.onFrame) config.onFrame(offset);
        }
    };
})(window.Celular = window.Celular || {});