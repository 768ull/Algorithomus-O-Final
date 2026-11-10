(function(T) {
    var activeKeys = {};
    var moveTimers = {
        left: null,
        right: null,
        down: null
    };
    var moveIntervals = {
        left: null,
        right: null,
        down: null
    };
    var MOVE_BY_KEY = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowDown: "down"
    };
    var MOVE_FUNCTION = {
        left: function() {
            T.input.perform("moveLeft", T.engine.moveLeft);
        },
        right: function() {
            T.input.perform("moveRight", T.engine.moveRight);
        },
        down: function() {
            T.input.perform("softDrop", T.engine.drop);
        }
    };
    T.input = {};
    T.input.perform = function(kind, action) {
        if (T.ui && T.ui.recordCelebrating || T.host.isPaused() || T.state.gameState !== T.GAME_STATE.PLAYING) return;
        if (!T.tutorial.gate(kind)) return;
        action(kind === "softDrop" ? "soft" : undefined);
        T.tutorial.onAction(kind);
    };
    function startContinuousMove(dir) {
        if (T.state.gameState !== T.GAME_STATE.PLAYING) return;
        MOVE_FUNCTION[dir]();
        stopContinuousMove(dir);
        moveTimers[dir] = setTimeout(function() {
            moveIntervals[dir] = setInterval(MOVE_FUNCTION[dir], T.ARR_SPEED);
        }, T.DAS_DELAY);
    }
    function stopContinuousMove(dir) {
        clearTimeout(moveTimers[dir]);
        clearInterval(moveIntervals[dir]);
    }
    var GAME_KEYS = [ "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " " ];
    T.input.bindKeyboard = function() {
        document.addEventListener("keydown", function(e) {
            if (T.ui && T.ui.recordCelebrating) return;
            if (e.key === "Escape" && T.tutorial.isOpen()) {
                T.tutorial.close();
                return;
            }
            if (e.key === "h" || e.key === "H" || e.key === "?") {
                if (T.state.gameState === T.GAME_STATE.GAMEOVER) T.ui.openTutorial();
                return;
            }
            if (GAME_KEYS.indexOf(e.key) > -1) e.preventDefault();
            if (activeKeys[e.key]) return;
            activeKeys[e.key] = true;
            if (MOVE_BY_KEY[e.key]) startContinuousMove(MOVE_BY_KEY[e.key]);
            if (e.key === "ArrowUp") T.input.perform("rotate", T.engine.playerRotate);
            if (e.key === " ") T.input.perform("hardDrop", T.engine.hardDrop);
            if (e.key.toLowerCase() === "c") T.input.perform("hold", T.engine.hold);
        });
        document.addEventListener("keyup", function(e) {
            activeKeys[e.key] = false;
            if (MOVE_BY_KEY[e.key]) stopContinuousMove(MOVE_BY_KEY[e.key]);
        });
    };
    var gesture = null;
    function isInterface(target) {
        return !!(target && target.closest && target.closest("button, .modal-overlay"));
    }
    function cancelGesture() {
        var previous = gesture;
        gesture = null;
        if (previous && previous.target.releasePointerCapture) {
            try {
                previous.target.releasePointerCapture(previous.id);
            } catch (err) {}
        }
    }
    T.input.cancel = function() {
        cancelGesture();
        activeKeys = {};
        Object.keys(moveTimers).forEach(stopContinuousMove);
    };
    function sampleGesture(e) {
        var g = gesture;
        if (!g || e.pointerId !== g.id) return null;
        if (T.host.isPaused() || T.state.gameState !== T.GAME_STATE.PLAYING || T.state.currentPiece !== g.piece) {
            cancelGesture();
            return null;
        }
        var dx = e.clientX - g.startX;
        var dy = e.clientY - g.startY;
        g.maxX = Math.max(g.maxX, Math.abs(dx));
        g.maxY = Math.max(g.maxY, Math.abs(dy));
        if (!g.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= T.GESTURE_AXIS_DISTANCE) {
            if (Math.abs(dx) >= Math.abs(dy) * T.GESTURE_HORIZONTAL_RATIO) g.axis = "horizontal"; else if (Math.abs(dy) >= Math.abs(dx) * T.GESTURE_VERTICAL_RATIO) g.axis = dy < 0 ? "up" : "down";
        }
        var elapsed = performance.now() - g.startTime;
        if (g.axis === "horizontal") {
            var distance = e.clientX - g.anchorX;
            var steps = Math.min(T.COLS, Math.floor(Math.abs(distance) / g.stepX));
            var direction = distance < 0 ? -1 : 1;
            for (var i = 0; i < steps; i++) {
                T.input.perform(direction < 0 ? "moveLeft" : "moveRight", direction < 0 ? T.engine.moveLeft : T.engine.moveRight);
                g.anchorX += direction * g.stepX;
            }
        } else if (g.axis === "down" && elapsed > T.GESTURE_FAST_DROP_TIME) {
            var downSteps = Math.min(T.ROWS, Math.floor((e.clientY - g.anchorY) / g.stepY));
            for (var j = 0; j < downSteps; j++) {
                T.input.perform("softDrop", T.engine.drop);
                g.anchorY += g.stepY;
                g.softDrop = true;
            }
        }
        return {
            gesture: g,
            dx,
            dy,
            elapsed
        };
    }
    T.input.bindGestures = function() {
        document.addEventListener("pointerdown", function(e) {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            if (gesture || e.isPrimary === false || isInterface(e.target) || !e.target.closest || !e.target.closest("#gameArea") || T.ui && T.ui.recordCelebrating || T.host.isPaused() || T.state.gameState !== T.GAME_STATE.PLAYING) return;
            var cellWidth = T.dom.canvas.getBoundingClientRect().width / T.COLS;
            var stepX = Math.max(T.GESTURE_STEP_MIN, Math.min(T.GESTURE_STEP_MAX, cellWidth));
            gesture = {
                id: e.pointerId,
                target: e.target,
                piece: T.state.currentPiece,
                startX: e.clientX,
                startY: e.clientY,
                anchorX: e.clientX,
                anchorY: e.clientY,
                startTime: performance.now(),
                axis: null,
                maxX: 0,
                maxY: 0,
                stepX,
                stepY: stepX * T.GESTURE_VERTICAL_STEP_RATIO,
                swipe: Math.max(T.GESTURE_SWIPE_MIN, stepX * T.GESTURE_SWIPE_STEPS),
                softDrop: false
            };
            if (e.target.setPointerCapture) {
                try {
                    e.target.setPointerCapture(e.pointerId);
                } catch (err) {}
            }
        });
        document.addEventListener("pointermove", function(e) {
            if (!gesture || e.pointerId !== gesture.id) return;
            if (e.cancelable) e.preventDefault();
            if (e.getCoalescedEvents) {
                e.getCoalescedEvents().forEach(function(sample) {
                    sampleGesture(sample);
                });
            }
            sampleGesture(e);
        }, {
            passive: false
        });
        document.addEventListener("pointerup", function(e) {
            var sample = sampleGesture(e);
            if (!sample) return;
            var g = sample.gesture;
            cancelGesture();
            if (!g.axis && g.maxX <= T.GESTURE_DEADZONE && g.maxY <= T.GESTURE_DEADZONE && sample.elapsed <= T.GESTURE_TAP_MAX_TIME) {
                T.input.perform("rotate", T.engine.playerRotate);
                return;
            }
            if (g.axis === "up" && sample.dy <= -g.swipe && Math.abs(sample.dy) >= g.maxX * T.GESTURE_HOLD_RATIO) {
                T.input.perform("hold", T.engine.hold);
            } else if (g.axis === "down" && !g.softDrop && sample.dy >= g.swipe && sample.dy >= g.maxX * T.GESTURE_VERTICAL_RATIO && sample.elapsed <= T.GESTURE_FAST_DROP_TIME) {
                T.input.perform("hardDrop", T.engine.hardDrop);
            }
        });
        document.addEventListener("pointercancel", function(e) {
            if (gesture && e.pointerId === gesture.id) cancelGesture();
        });
        document.addEventListener("lostpointercapture", function(e) {
            if (gesture && e.pointerId === gesture.id) cancelGesture();
        });
        window.addEventListener("blur", T.input.cancel);
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) T.input.cancel();
        });
    };
    T.input.bind = function() {
        T.input.bindKeyboard();
        T.input.bindGestures();
    };
})(window.Tetris = window.Tetris || {});