(function(global) {
    "use strict";
    var BASE = "assets/audio/";
    var CLIPS = [ BASE + "audio-001.ogg", BASE + "audio-002.ogg", BASE + "audio-003.ogg", BASE + "audio-004.ogg" ];
    var AMBIENT_FILE = BASE + "audio-005.ogg";
    var CHARGING_FILE = BASE + "audio-006.ogg";
    var RISER_FILE = BASE + "audio-007.ogg";
    var RING_FILE = BASE + "audio-008.ogg";
    function url(name) {
        return global.audioSource ? global.audioSource(name) : name;
    }
    var VOL_CLIPPING = .5;
    var VOL_AMBIENT = .12;
    var VOL_CHARGING = .45;
    var phoneVolume = 1;
    var phoneMuted = false;
    function setBaseVolume(audio, value) {
        audio._phoneBaseVolume = value;
        audio.volume = value * phoneVolume;
        audio.muted = phoneMuted;
    }
    var VOL_RISER = .7;
    var RATE_MIN = .82;
    var RATE_MAX = 1.34;
    var clips = [];
    var last = -1;
    (function preload() {
        var i;
        for (i = 0; i < CLIPS.length; i++) {
            var audio = document.createElement("audio");
            audio.src = url(CLIPS[i]);
            audio.preload = "auto";
            setBaseVolume(audio, VOL_CLIPPING);
            audio.addEventListener("ended", forget);
            clips.push(audio);
        }
    })();
    function unpreserve(audio) {
        audio.preservesPitch = false;
        audio.mozPreservesPitch = false;
        audio.webkitPreservesPitch = false;
        audio.oPreservesPitch = false;
    }
    function forget(audio) {
        audio._want = false;
        audio._wasPlaying = false;
        audio._blocked = false;
        audio._playPending = false;
    }
    function release(audio) {
        if (!audio) return;
        try {
            audio.pause();
        } catch (err) {}
        forget(audio);
        try {
            audio.removeAttribute("src");
            audio.load();
        } catch (err) {}
    }
    function requestPlay(audio, restart) {
        if (!audio || powered === false) return;
        audio._want = true;
        if (restart) {
            try {
                audio.currentTime = 0;
            } catch (err) {}
        }
        if (suspended) return;
        if (audio._playPending) return;
        audio._playPending = true;
        try {
            var played = audio.play();
            if (played && played.then) played.then(function() {
                audio._blocked = false;
                audio._playPending = false;
                audio._wasPlaying = true;
            }, function(error) {
                audio._playPending = false;
                audio._blocked = !!(error && error.name === "NotAllowedError");
                if (!audio._blocked) audio._want = false;
            }); else {
                audio._blocked = false;
                audio._playPending = false;
                audio._wasPlaying = true;
            }
        } catch (err) {
            audio._playPending = false;
            audio._blocked = !!(err && err.name === "NotAllowedError");
            if (!audio._blocked) audio._want = false;
        }
    }
    function glitch() {
        if (!clips.length) return;
        var pick = Math.floor(Math.random() * clips.length);
        if (clips.length > 1 && pick === last) pick = (pick + 1) % clips.length;
        var audio = clips[pick];
        last = pick;
        try {
            unpreserve(audio);
            audio.playbackRate = RATE_MIN + Math.random() * (RATE_MAX - RATE_MIN);
            if (audio.duration && isFinite(audio.duration)) {
                audio.currentTime = audio.duration * .5 * Math.random();
            } else {
                audio.currentTime = 0;
            }
            requestPlay(audio);
        } catch (err) {}
    }
    var ambient = null;
    (function preloadAmbient() {
        ambient = document.createElement("audio");
        ambient.src = url(AMBIENT_FILE);
        ambient.preload = "auto";
        ambient.loop = true;
        ambient._loop = true;
        setBaseVolume(ambient, 0);
    })();
    function startAmbient() {
        if (!ambient || ambient.getAttribute("data-on") === "1") return;
        ambient.setAttribute("data-on", "1");
        requestPlay(ambient);
        fadeTo(ambient, VOL_AMBIENT, 1200);
    }
    var charging = null;
    (function preloadCharging() {
        charging = document.createElement("audio");
        charging.src = url(CHARGING_FILE);
        charging.preload = "auto";
        setBaseVolume(charging, 0);
        charging.addEventListener("ended", forget);
    })();
    function startCharging() {
        if (!charging) return;
        requestPlay(charging, true);
        fadeTo(charging, VOL_CHARGING, 700);
    }
    function fadeTo(audio, target, ms) {
        if (powered === false) return;
        audio._fadeTarget = target;
        audio._fadeMs = ms;
        if (suspended) {
            audio._fadeHeld = true;
            return;
        }
        var step = ms / 60;
        if (audio._fade) clearInterval(audio._fade);
        audio._fadeHeld = false;
        audio._fade = setInterval(function() {
            var baseVolume = typeof audio._phoneBaseVolume === "number" ? audio._phoneBaseVolume : audio.volume;
            baseVolume += (audio._fadeTarget - baseVolume) * .18;
            setBaseVolume(audio, baseVolume);
            if (Math.abs(audio._fadeTarget - baseVolume) < .005) {
                setBaseVolume(audio, audio._fadeTarget);
                clearInterval(audio._fade);
                audio._fade = 0;
            }
        }, step);
    }
    var riser = null;
    (function preloadRiser() {
        riser = document.createElement("audio");
        riser.src = url(RISER_FILE);
        riser.preload = "auto";
        setBaseVolume(riser, VOL_RISER);
        riser.addEventListener("ended", forget);
    })();
    function playRiser() {
        if (!riser) return;
        requestPlay(riser, true);
    }
    var DENIAL_FILE = BASE + "audio-009.ogg";
    var VOL_DENIAL = .6;
    var denial = null;
    (function preloadDenial() {
        denial = document.createElement("audio");
        denial.src = url(DENIAL_FILE);
        denial.preload = "auto";
        setBaseVolume(denial, VOL_DENIAL);
        denial.addEventListener("ended", forget);
    })();
    function deny() {
        if (!denial) return;
        try {
            denial.currentTime = 0;
        } catch (err) {}
        requestPlay(denial);
    }
    var audioCtx = null;
    function context() {
        if (audioCtx) return audioCtx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        try {
            audioCtx = new AC;
        } catch (err) {
            audioCtx = null;
        }
        return audioCtx;
    }
    function tone(ctx, freq, start, dur, peak) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(1e-4, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + .012);
        gain.gain.exponentialRampToValueAtTime(1e-4, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + .02);
    }
    function success() {
        var ctx = context();
        if (!ctx) return;
        if (ctx.state === "suspended" && ctx.resume) {
            try {
                ctx.resume();
            } catch (err) {}
        }
        var now = ctx.currentTime + .01;
        tone(ctx, 659.25, now, .13, .18);
        tone(ctx, 830.61, now + .08, .15, .17);
        tone(ctx, 987.77, now + .16, .28, .16);
    }
    function securityComplete() {
        if (phoneMuted || phoneVolume <= 0) return;
        var ctx = context();
        if (!ctx) return;
        if (ctx.state === "suspended" && ctx.resume) {
            try {
                var resumed = ctx.resume();
                if (resumed && resumed.catch) resumed.catch(function() {});
            } catch (err) {}
        }
        var now = ctx.currentTime + .01;
        var volume = phoneVolume;
        tone(ctx, 523.25, now, .14, .11 * volume);
        tone(ctx, 659.25, now + .1, .14, .12 * volume);
        tone(ctx, 783.99, now + .2, .14, .13 * volume);
        tone(ctx, 1046.5, now + .3, .34, .14 * volume);
    }
    var typewriterNote = 0;
    function playTypewriter() {
        if (phoneMuted || phoneVolume <= 0) return;
        var ctx = context();
        if (!ctx) return;
        if (ctx.state === "suspended" && ctx.resume) {
            try {
                var resumed = ctx.resume();
                if (resumed && resumed.catch) resumed.catch(function() {});
            } catch (err) {}
        }
        var now = ctx.currentTime + .001;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var notes = [190, 230, 210, 260];
        osc.type = "triangle";
        osc.frequency.setValueAtTime(notes[typewriterNote % notes.length], now);
        typewriterNote += 1;
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.025 * phoneVolume, now + .003);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .028);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + .035);
    }
    var RING_FROM = .95;
    var RING_TO = 3.1;
    var RING_GAP_MS = 420;
    var VOL_RINGING = .55;
    var ring = null;
    var ringLeft = 0;
    var ringGapTimer = 0;
    var ringEndTimer = 0;
    (function preloadRing() {
        ring = document.createElement("audio");
        ring.src = url(RING_FILE);
        ring.preload = "auto";
        setBaseVolume(ring, VOL_RINGING);
        ring._callAudio = true;
    })();
    function ringTearDown() {
        clearTimeout(ringGapTimer);
        clearTimeout(ringEndTimer);
        ringGapTimer = 0;
        ringEndTimer = 0;
    }
    function ringCut() {
        if (!ring) return;
        try {
            ring.pause();
        } catch (err) {}
        forget(ring);
    }
    function ringBurst() {
        if (ringLeft <= 0 || !ring) return;
        ringLeft--;
        try {
            ring.currentTime = RING_FROM;
        } catch (err) {}
        requestPlay(ring);
        ringEndTimer = setTimeout(function() {
            ringCut();
            if (ringLeft <= 0) return;
            ringGapTimer = setTimeout(ringBurst, RING_GAP_MS);
        }, Math.round((RING_TO - RING_FROM) * 1e3));
    }
    function startRing(times) {
        if (!ring) return;
        ringTearDown();
        ringLeft = Math.max(1, times | 0);
        ringBurst();
    }
    function stopRing() {
        ringTearDown();
        ringLeft = 0;
        ringCut();
    }
    function ringMs(times) {
        var total = 0;
        var i;
        for (i = 0; i < times; i++) {
            total += Math.round((RING_TO - RING_FROM) * 1e3);
            if (i < times - 1) total += RING_GAP_MS;
        }
        return total;
    }
    var VOL_AD = .85;
    function adBase() {
        return global.Celular && global.Celular.AD_BASE || "assets/audio/ad/";
    }
    var ad = null;
    var adDone = null;
    (function preloadAd() {
        ad = document.createElement("audio");
        ad.preload = "auto";
        setBaseVolume(ad, VOL_AD);
        ad._callAudio = true;
        ad.addEventListener("ended", function() {
            var done = adDone;
            adDone = null;
            release(ad);
            if (done) done();
        });
    })();
    function adUrl(file) {
        return file.indexOf('/api/media?')===0?url(file):url(adBase()+file);
    }
    function playAd(file, whenDone) {
        if (!ad || !file) {
            if (whenDone) whenDone();
            return;
        }
        adDone = whenDone;
        try {
            ad.src = adUrl(file);
            ad.currentTime = 0;
        } catch (err) {}
        requestPlay(ad, true);
    }
    function stopAd() {
        if (!ad) return;
        adDone = null;
        release(ad);
    }
    var beep = null;
    (function preloadBeep() {
        beep = document.createElement("audio");
        beep.preload = "auto";
        setBaseVolume(beep, VOL_AD);
        beep._callAudio = true;
        beep.addEventListener("ended", function() {
            release(beep);
        });
    })();
    function playBeep() {
        if (!beep) return;
        var file = global.Celular && global.Celular.AD_BEEP || "audio-025.ogg";
        try {
            beep.src = url(adBase() + file);
            beep.currentTime = 0;
        } catch (err) {}
        requestPlay(beep, true);
    }
    function stopBeep() {
        if (!beep) return;
        release(beep);
    }
    var suspended = false;
    var powered = true;
    function pool() {
        var list = clips.slice();
        if (ambient) list.push(ambient);
        if (charging) list.push(charging);
        if (riser) list.push(riser);
        if (ring) list.push(ring);
        if (denial) list.push(denial);
        if (ad) list.push(ad);
        if (beep) list.push(beep);
        return list;
    }
    function isForeground() {
        return powered && !document.hidden && document.visibilityState !== "hidden";
    }
    function resumable(audio) {
        return !!(audio._loop || audio._callAudio);
    }
    function suspend() {
        if (suspended) return;
        suspended = true;
        var list = pool();
        var i, audio;
        for (i = 0; i < list.length; i++) {
            audio = list[i];
            audio._wasPlaying = !audio.paused && !audio.ended;
            if (audio._fade) {
                audio._fadeHeld = true;
                clearInterval(audio._fade);
                audio._fade = 0;
            }
            try {
                audio.pause();
            } catch (err) {}
            if (!resumable(audio)) forget(audio);
        }
    }
    function resume() {
        if (!suspended) return;
        if (!isForeground()) return;
        suspended = false;
        var list = pool();
        var i, audio;
        for (i = 0; i < list.length; i++) {
            audio = list[i];
            if (audio._fadeHeld) {
                audio._fadeHeld = false;
                fadeTo(audio, audio._fadeTarget, audio._fadeMs);
            }
            if (!resumable(audio)) continue;
            if (!audio._wasPlaying && !audio._want) continue;
            requestPlay(audio);
        }
    }
    function activate() {
        if (!isForeground()) return;
        var ctx = context();
        if (ctx && ctx.state === "suspended" && ctx.resume) {
            try {
                var resumed = ctx.resume();
                if (resumed && resumed.catch) resumed.catch(function() {});
            } catch (err) {}
        }
        if (suspended) resume();
        pool().forEach(function(audio) {
            if (audio._blocked && audio._want) requestPlay(audio);
        });
    }
    if (document.addEventListener) {
        function onGesture(event) {
            if (event.isTrusted) activate();
        }
        document.addEventListener("pointerdown", onGesture, true);
        document.addEventListener("keydown", onGesture, true);
        document.addEventListener("visibilitychange", function() {
            if (isForeground()) {
                resume();
            } else {
                suspend();
            }
        });
        window.addEventListener("blur", suspend);
        window.addEventListener("pagehide", suspend);
        window.addEventListener("freeze", suspend);
        window.addEventListener("pageshow", resume);
        window.addEventListener("focus", function() {
            if (isForeground()) resume();
        });
    }
    if (!isForeground()) suspend();
    function suspendNative() {
        if (!suspended) suspend();
        if (audioCtx && audioCtx.state !== "suspended" && audioCtx.suspend) {
            try {
                var stopped = audioCtx.suspend();
                if (stopped && stopped.catch) stopped.catch(function() {});
            } catch (err) {}
        }
    }
    function resumeNative() {
        if (!isForeground()) return;
        if (audioCtx && audioCtx.state === "suspended" && audioCtx.resume) {
            try {
                var started = audioCtx.resume();
                if (started && started.catch) started.catch(function() {});
            } catch (err) {}
        }
        if (suspended) resume();
    }
    global.sound = {
        suspendNative,
        resumeNative,
        setMaster: function(volume, muted) {
            phoneVolume = Math.max(0, Math.min(1, Number(volume) || 0));
            phoneMuted = !!muted;
            pool().forEach(function(audio) {
                var base = typeof audio._phoneBaseVolume === "number" ? audio._phoneBaseVolume : audio.volume;
                audio.volume = base * phoneVolume;
                audio.muted = phoneMuted;
            });
        },
        activate,
        setPowered: function(on) {
            powered = !!on;
            if (!powered) {
                suspend();
                pool().forEach(function(audio) {
                    clearInterval(audio._fade);
                    audio._fade = 0;
                    audio._fadeHeld = false;
                    forget(audio);
                    try {
                        audio.pause();
                    } catch (err) {}
                });
            } else {
                resume();
                if (ambient) ambient.removeAttribute("data-on");
                startAmbient();
            }
        },
        glitch,
        startAmbient,
        startCharging,
        playRiser,
        deny,
        success,
        securityComplete,
        startRing,
        stopRing,
        ringMs,
        playAd,
        stopAd,
        playBeep,
        stopBeep,
        typewriter: playTypewriter,
        VOL_CLIPPING,
        VOL_AMBIENT,
        VOL_CHARGING,
        VOL_RISER,
        clips,
        ambient,
        charging,
        riser,
        ring,
        denial,
        ad,
        beep,
        lastIndex: function() {
            return last;
        },
        isSuspended: function() {
            return suspended;
        }
    };
})(window);
