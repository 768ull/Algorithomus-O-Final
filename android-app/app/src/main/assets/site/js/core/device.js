(function(S) {
    "use strict";
    var device = null;
    var screenOff = null;
    var offClock = null;
    var hud = null;
    var hudFill = null;
    var hudTimer = 0;
    var clockTimer = 0;
    var volume = S.VOLUME;
    var muted = false;
    var vibration = true;
    var poweredOff = false;
    function savedAudioSettings() {
        try {
            var settings = JSON.parse(localStorage.getItem("cfg:v1") || "null");
            return settings && typeof settings === "object" ? settings : {};
        } catch (error) {
            return {};
        }
    }
    function persistAudioSettings() {
        try {
            var settings = savedAudioSettings();
            settings.volume = volume;
            settings.silencioso = muted;
            localStorage.setItem("cfg:v1", JSON.stringify(settings));
        } catch (error) {}
    }
    function renderAudioState(showHud) {
        var effectiveMute = muted || volume === 0;
        if (window.sound && window.sound.setMaster) window.sound.setMaster(volume, effectiveMute);
        if (S.status && S.status.muted) S.status.muted(effectiveMute);
        if (showHud && hud && hudFill) {
            hudFill.style.width = volume * 100 + "%";
            hudFill.classList.toggle("is-muted", effectiveMute);
            hud.hidden = false;
            hud.classList.remove("is-leaving");
            clearTimeout(hudTimer);
            hudTimer = setTimeout(function() {
                hud.classList.add("is-leaving");
                setTimeout(function() {
                    hud.hidden = true;
                    hud.classList.remove("is-leaving");
                }, 240);
            }, 1200);
        }
        if (S.bridge && S.bridge.broadcast) {
            S.bridge.broadcast("app:event", "device-audio", {
                volume,
                muted: effectiveMute,
                silent: muted
            });
        }
    }
    function stopVisualEffects() {
        if (window.glitch) window.glitch.stop();
        if (window.IntroEffects) window.IntroEffects.stop();
        document.documentElement.classList.remove("is-overload-chaos", "is-site-glitch", "is-chaos", "is-white", "is-whiteout");
        device.classList.remove("is-frying", "is-glitching", "is-severing", "is-sever-strike");
    }
    function showScreenOff(show) {
        clearInterval(clockTimer);
        clockTimer = 0;
        screenOff.hidden = !show;
        S.$("#screen").inert = show;
        if (!show) return;
        stopVisualEffects();
        offClock.textContent = S.time();
        clockTimer = setInterval(function() {
            offClock.textContent = S.time();
        }, 1e3);
    }
    S.device = {
        init: function() {
            var saved = savedAudioSettings();
            if (typeof saved.volume === "number" && isFinite(saved.volume)) volume = S.clamp(saved.volume, 0, 1);
            muted = !!saved.silencioso;
            vibration = typeof saved.vibracao === "boolean" ? saved.vibracao : true;
            device = S.$("#device");
            screenOff = S.$("#screenOff");
            offClock = S.$("#offClock");
            hud = S.$("#volumeHud");
            hudFill = S.$("#volumeFill");
            S.device.fit();
            window.addEventListener("resize", S.device.fit);
            renderAudioState(false);
        },
        fit: function() {
            var height = document.documentElement.classList.contains("is-intro-armed") ? 656 + 200 : 656;
            var scale = Math.min(1, (window.innerHeight - 40) / height, (window.innerWidth - 40) / 336);
            document.documentElement.style.setProperty("--device-scale", String(Math.max(.4, scale)));
        },
        power: function() {
            if (S.overload && S.overload.isRunning()) return;
            if (poweredOff) {
                if (S.overload) S.overload.reset();
                poweredOff = false;
                device.classList.remove("is-shutdown");
                showScreenOff(false);
                if (window.sound && window.sound.setPowered) window.sound.setPowered(true);
                S.bus.emit("device:powered-on");
                return;
            }
            var show = screenOff.hidden;
            if (show) {
                if (S.lock && S.lock.lock) S.lock.lock();
            }
            showScreenOff(show);
        },
        isUnavailable: function() {
            return poweredOff || !!(screenOff && !screenOff.hidden) || !!(S.overload && S.overload.isRunning());
        },
        shutdown: function() {
            if (poweredOff) return;
            try {
                var settings = savedAudioSettings();
                settings.bluetooth = false;
                localStorage.setItem("cfg:v1", JSON.stringify(settings));
            } catch (error) {}
            if (S.bridge && S.bridge.emit) S.bridge.emit("configuracoes", "bluetooth-reset", null);
            clearTimeout(hudTimer);
            hud.hidden = true;
            S.bridge.broadcast("app:state", "paused", {
                state: "paused"
            });
            S.bridge.emit("calculadora", "reset", null);
            S.nav.reset();
            S.lock.lock();
            poweredOff = true;
            device.classList.add("is-shutdown");
            showScreenOff(true);
            if (window.sound && window.sound.setPowered) window.sound.setPowered(false);
            S.bus.emit("device:shutdown");
        },
        volumeUp: function() {
            S.device.setVolume(volume + .15);
        },
        volumeDown: function() {
            S.device.setVolume(volume - .15);
        },
        setVolume: function(value) {
            if (S.device.isUnavailable()) return;
            volume = S.clamp(Math.round(value * 100) / 100, 0, 1);
            persistAudioSettings();
            renderAudioState(true);
            S.haptic(8);
        },
        audioSettings: function(value, isMuted) {
            if (typeof value === "number" && isFinite(value)) volume = S.clamp(value, 0, 1);
            muted = !!isMuted;
            persistAudioSettings();
            renderAudioState(false);
        },
        vibrationSettings: function(enabled) {
            vibration = !!enabled;
            try {
                var settings = savedAudioSettings();
                settings.vibracao = vibration;
                localStorage.setItem("cfg:v1", JSON.stringify(settings));
            } catch (error) {}
            if (!vibration && navigator.vibrate) navigator.vibrate(0);
        },
        volume: function() {
            return volume;
        },
        isMuted: function() {
            return muted || volume === 0;
        },
        isSilent: function() {
            return muted;
        },
        isVibrationEnabled: function() {
            return vibration;
        }
    };
})(window.Celular = window.Celular || {});