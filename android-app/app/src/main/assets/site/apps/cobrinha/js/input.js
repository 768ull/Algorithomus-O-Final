(function(C) {
    "use strict";
    var s = C.state;
    var KEY_DIR = {
        ArrowUp: "up",
        KeyW: "up",
        ArrowDown: "down",
        KeyS: "down",
        ArrowLeft: "left",
        KeyA: "left",
        ArrowRight: "right",
        KeyD: "right"
    };
    var PREVENTED = [ "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Escape", "Enter" ];
    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var tracking = false;
    C.input = {};
    C.input.bindKeyboard = function() {
        document.addEventListener("keydown", function(event) {
            if (PREVENTED.indexOf(event.key) > -1) event.preventDefault();
            var dir = KEY_DIR[event.key] || KEY_DIR[event.code];
            if (dir) {
                C.turn(dir);
                return;
            }
            if (event.key === "Escape" || event.key === "p" || event.key === "P") {
                C.ui.keyPause();
                return;
            }
            if (event.key === " ") {
                if (s.status === C.STATUS.over) C.newGame(); else C.ui.togglePause();
                return;
            }
            if (event.key === "Enter") {
                if (s.status === C.STATUS.over || s.status === C.STATUS.idle) C.newGame(); else if (s.status === C.STATUS.paused) C.ui.togglePause();
            }
        });
    };
    C.input.bindBoard = function(el) {
        el.addEventListener("pointerdown", function(event) {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            tracking = true;
            if (el.setPointerCapture) {
                try {
                    el.setPointerCapture(event.pointerId);
                } catch (err) {}
            }
        });
        el.addEventListener("pointermove", function(event) {
            if (!tracking || event.pointerId !== pointerId) return;
            if (event.cancelable) event.preventDefault();
            var dx = event.clientX - startX;
            var dy = event.clientY - startY;
            if (Math.abs(dx) < C.INPUT.swipeMin && Math.abs(dy) < C.INPUT.swipeMin) return;
            var r = C.INPUT.axisRatio;
            if (Math.abs(dx) > Math.abs(dy) * r) C.turn(dx > 0 ? "right" : "left"); else if (Math.abs(dy) > Math.abs(dx) * r) C.turn(dy > 0 ? "down" : "up");
            startX = event.clientX;
            startY = event.clientY;
        }, {
            passive: false
        });
        function release(event) {
            if (pointerId !== null && event.pointerId !== pointerId) return;
            tracking = false;
            pointerId = null;
        }
        el.addEventListener("pointerup", release);
        el.addEventListener("pointercancel", release);
    };
    C.input.bindDpad = function() {
        var holdTimer = null;
        var repeatTimer = null;
        function stop() {
            clearTimeout(holdTimer);
            clearInterval(repeatTimer);
            holdTimer = null;
            repeatTimer = null;
        }
        Array.prototype.forEach.call(document.querySelectorAll("[data-dir]"), function(btn) {
            var dir = btn.dataset.dir;
            btn.addEventListener("pointerdown", function(event) {
                event.preventDefault();
                C.turn(dir);
                stop();
                holdTimer = setTimeout(function() {
                    repeatTimer = setInterval(function() {
                        C.turn(dir);
                    }, C.INPUT.dpadRepeatEvery);
                }, C.INPUT.dpadRepeatDelay);
            });
            btn.addEventListener("click", function(event) {
                if (event.detail === 0) C.turn(dir);
            });
            [ "pointerup", "pointerleave", "pointercancel" ].forEach(function(type) {
                btn.addEventListener(type, stop);
            });
        });
        window.addEventListener("blur", stop);
    };
    C.input.bind = function(board) {
        C.input.bindKeyboard();
        C.input.bindBoard(board);
        C.input.bindDpad();
    };
})(window.Cobrinha = window.Cobrinha || {});