(function(S) {
    "use strict";
    var running = false;
    var initialized = false;
    var timers = [];
    var device = null;
    var screen = null;
    function later(callback, delay) {
        timers.push(setTimeout(callback, delay));
    }
    function stopEffects() {
        if (window.glitch) window.glitch.stop();
        if (window.IntroEffects) window.IntroEffects.stop();
        document.documentElement.classList.remove("is-overload-chaos");
    }
    S.overload = {
        init: function() {
            if (initialized) return;
            initialized = true;
            device = S.$("#device");
            screen = S.$("#screen");
            S.bus.on("app:event", function(event) {
                if (event.id === "calculadora" && event.name === "division-by-zero") {
                    S.overload.start("calculator");
                } else if (event.id === "configuracoes" && event.name === "bluetooth-toggle" && event.payload && event.payload.enabled) {
                    S.overload.start("bluetooth");
                }
            });
            document.addEventListener("keydown", function(event) {
                if (!S.device.isUnavailable()) return;
                if (event.ctrlKey || event.metaKey || event.altKey) return;
                event.preventDefault();
                event.stopImmediatePropagation();
            }, true);
        },
        isRunning: function() {
            return running;
        },
        start: function(source) {
            if (running || S.device.isUnavailable() || S.lock.isLocked()) return false;
            if (source === "bluetooth") {
                if (S.nav.current() !== "configuracoes") return false;
            } else if (S.nav.current() !== "calculadora") return false;
            S.overload.reset();
            running = true;
            screen.inert = true;
            device.classList.add("is-overloading");
            S.bridge.broadcast("app:state", "paused", {
                state: "paused"
            });
            S.haptic([ 60, 80, 120 ]);
            document.documentElement.classList.add("is-overload-chaos");
            if (window.sound) {
                if (window.sound.activate) window.sound.activate();
                if (window.sound.startAmbient) window.sound.startAmbient();
            }
            if (window.glitch) {
                window.glitch.stop();
                window.glitch.storm(true);
                window.glitch.hold(false);
                window.glitch.strike();
            }
            if (window.IntroEffects) {
                window.IntroEffects.setStorming(true);
                window.IntroEffects.siteStrike();
            }
            later(function() {
                device.classList.add("is-smoking");
                S.smoke.start(device, false);
            }, 900);
            later(function() {
                if (window.sound && window.sound.playRiser) window.sound.playRiser();
            }, 3200);
            later(function() {
                stopEffects();
                device.classList.remove("is-overloading");
                S.smoke.stop();
                S.device.shutdown();
                running = false;
            }, 4800);
            later(function() {
                device.classList.remove("is-smoking");
                S.smoke.clear();
                timers = [];
            }, 8e3);
            return true;
        },
        reset: function() {
            timers.forEach(clearTimeout);
            timers = [];
            if (running) stopEffects();
            running = false;
            S.smoke.clear();
            if (device) device.classList.remove("is-overloading", "is-smoking");
        }
    };
})(window.Celular = window.Celular || {});