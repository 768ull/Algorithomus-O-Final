(function(T) {
    "use strict";
    var Context = window.AudioContext || window.webkitAudioContext;
    var context = null;
    var master = null;
    var muted = false;
    var deviceVolume = 1;
    var deviceMuted = false;
    var pendingStart = false;
    var voices = new Set;
    var lastPlayed = {};
    function syncMasterVolume() {
        if (master) master.gain.value = T.AUDIO_VOLUME * deviceVolume * (muted || deviceMuted ? 0 : 1);
    }
    function isPaused() {
        return document.hidden || T.host && T.host.isPaused();
    }
    function createContext() {
        if (context) return true;
        if (!Context) return false;
        try {
            context = new Context;
            master = context.createGain();
            master.gain.value = T.AUDIO_VOLUME;
            var filter = context.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = T.AUDIO_FILTER_FREQUENCY;
            filter.Q.value = .5;
            master.connect(filter);
            filter.connect(context.destination);
            syncMasterVolume();
            return true;
        } catch (err) {
            if (context) {
                context.close().catch(function() {});
                context = null;
            }
            master = null;
            return false;
        }
    }
    function stopAll() {
        voices.forEach(function(oscillator) {
            try {
                oscillator.stop();
            } catch (err) {}
        });
        voices.clear();
    }
    function resume() {
        if (!context || muted || isPaused()) return Promise.resolve(false);
        try {
            return context.resume().then(function() {
                if (muted || isPaused() || context.state !== "running") return false;
                if (pendingStart) {
                    pendingStart = false;
                    if (T.state.gameState === T.GAME_STATE.PLAYING) T.audio.play("start");
                }
                return true;
            }).catch(function() {
                return false;
            });
        } catch (err) {
            return Promise.resolve(false);
        }
    }
    function tone(note) {
        if (voices.size >= T.AUDIO_MAX_VOICES) {
            var oldest = voices.values().next().value;
            try {
                oldest.stop();
            } catch (err) {}
            voices.delete(oldest);
        }
        var oscillator = context.createOscillator();
        var envelope = context.createGain();
        var start = context.currentTime + note[3];
        var end = start + note[2];
        oscillator.type = note[4];
        oscillator.frequency.setValueAtTime(note[0], start);
        oscillator.frequency.exponentialRampToValueAtTime(note[1], end);
        envelope.gain.setValueAtTime(1e-4, start);
        envelope.gain.exponentialRampToValueAtTime(note[5], start + T.AUDIO_ATTACK);
        envelope.gain.exponentialRampToValueAtTime(1e-4, end);
        oscillator.connect(envelope);
        envelope.connect(master);
        voices.add(oscillator);
        oscillator.onended = function() {
            voices.delete(oscillator);
            oscillator.disconnect();
            envelope.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(end + T.AUDIO_RELEASE);
    }
    T.audio = {
        isMuted: function() {
            return muted;
        },
        setDeviceAudio: function(volume, isMuted) {
            deviceVolume = Math.max(0, Math.min(1, Number(volume) || 0));
            deviceMuted = !!isMuted;
            syncMasterVolume();
        },
        unlock: function() {
            if (muted || isPaused() || !createContext()) return Promise.resolve(false);
            return resume();
        },
        play: function(name) {
            if (muted || isPaused() || !Context || !T.SOUND_EFFECTS[name]) return false;
            if (!context || context.state !== "running") {
                if (name === "start") pendingStart = true;
                return false;
            }
            var now = performance.now();
            if (lastPlayed[name] !== undefined && now - lastPlayed[name] < (T.AUDIO_THROTTLE[name] || 0)) return false;
            lastPlayed[name] = now;
            try {
                T.SOUND_EFFECTS[name].forEach(tone);
                return true;
            } catch (err) {
                return false;
            }
        },
        reset: function() {
            stopAll();
            lastPlayed = {};
            pendingStart = false;
        },
        syncPause: function() {
            if (isPaused()) {
                pendingStart = false;
                stopAll();
                if (context) {
                    try {
                        context.suspend().catch(function() {});
                    } catch (err) {}
                }
            } else if (!muted) resume();
        },
        toggle: function() {
            muted = !muted;
            syncMasterVolume();
            pendingStart = false;
            stopAll();
            try {
                localStorage.setItem(T.SOUND_STORAGE_KEY, muted ? "1" : "0");
            } catch (err) {}
            if (!muted) T.audio.unlock().then(function(ready) {
                if (ready) T.audio.play("ui");
            });
        },
        init: function() {
            try {
                muted = localStorage.getItem(T.SOUND_STORAGE_KEY) === "1";
            } catch (err) {
                muted = false;
            }
            function onGesture(event) {
                if (!event.isTrusted) return;
                T.audio.unlock();
            }
            document.addEventListener("pointerdown", onGesture, true);
            document.addEventListener("keydown", onGesture, true);
            document.addEventListener("visibilitychange", T.audio.syncPause);
        }
    };
})(window.Tetris = window.Tetris || {});