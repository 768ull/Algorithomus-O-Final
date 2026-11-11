(function(T) {
    "use strict";
    var VERSION = 1;
    var paused = false;
    var locked = false;
    T.host = {
        ready: function() {
            if (window.parent !== window) window.parent.postMessage({
                v: VERSION,
                from: "tetris",
                type: "app:ready"
            }, "*");
        },
        isPaused: function() {
            return paused;
        },
        isLocked: function() {
            return locked;
        },
        setPaused: function(value, lockToo) {
            locked = !!lockToo;
            if (paused === value) return;
            paused = value;
            if (paused && T.input && T.input.cancel) T.input.cancel();
            T.audio.syncPause();
            if (paused) {
                if (T.engine && T.engine.pause) T.engine.pause();
                if (T.tutorial && T.tutorial.pauseLoop) T.tutorial.pauseLoop();
            } else {
                T.state.lastTime = performance.now();
                if (T.engine && T.engine.resume) T.engine.resume();
                if (T.tutorial && T.tutorial.resumeLoop) T.tutorial.resumeLoop();
            }
        }
    };
    window.addEventListener("message", function(event) {
        var data = event.data;
        if (!data || typeof data !== "object" || data.v !== VERSION || data.from !== "shell") return;
        if (data.type === "app:event") {
            if (data.name === "pause") T.host.setPaused(true, true); else if (data.name === "resume") T.host.setPaused(false); else if (data.name === "device-audio" && T.audio) {
                T.audio.setDeviceAudio(data.payload.volume, data.payload.muted);
            }
            return;
        }
        if (data.type === "app:state" && (data.name === "open" || data.name === "paused")) {
            if (locked) return;
            T.host.setPaused(data.name === "paused");
        }
    });
})(window.Tetris = window.Tetris || {});
