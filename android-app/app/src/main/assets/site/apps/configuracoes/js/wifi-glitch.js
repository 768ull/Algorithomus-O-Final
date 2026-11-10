(function(M) {
    "use strict";
    var rows = [];
    var active = true;
    var timer = 0;
    var strikeTimer = 0;
    var clips = [];
    var blockedClips = [];
    var last = -1;
    var deviceMuted = false;
    var KINDS = [ {
        dur: 320,
        speed: 1.15,
        weight: 5
    }, {
        dur: 620,
        speed: .95,
        weight: 3
    }, {
        dur: 1200,
        speed: .6,
        weight: 1
    } ];
    function stopSound() {
        clips.forEach(function(audio) {
            audio._wantPlayback = false;
            audio.pause();
            try {
                audio.currentTime = 0;
            } catch (error) {}
        });
    }
    function playClip(audio) {
        audio._wantPlayback = true;
        try {
            var playback = audio.play();
            if (playback && playback.then) playback.then(function() {
                audio._wantPlayback = false;
                var index = blockedClips.indexOf(audio);
                if (index !== -1) blockedClips.splice(index, 1);
            }, function(error) {
                if (audio._wantPlayback && error && error.name === "NotAllowedError" && blockedClips.indexOf(audio) === -1) blockedClips.push(audio);
            });
        } catch (error) {
            if (audio._wantPlayback && error && error.name === "NotAllowedError" && blockedClips.indexOf(audio) === -1) blockedClips.push(audio);
        }
    }
    function retryBlockedClips(event) {
        if (!event.isTrusted || deviceMuted || !active || !rows.length) return;
        blockedClips.slice().forEach(function(audio) {
            if (audio._wantPlayback) playClip(audio);
        });
    }
    document.addEventListener("pointerdown", retryBlockedClips, true);
    document.addEventListener("keydown", retryBlockedClips, true);
    function sound() {
        stopSound();
        if (M.store.get("silencioso")) return;
        if (!clips.length) {
            for (var i = 1; i <= 4; i++) {
                var source = "../../assets/audio/audio-00" + i + ".ogg";
                var audio = new Audio(window.audioSource ? window.audioSource(source) : source);
                audio.preload = "auto";
                clips.push(audio);
            }
        }
        var pick = Math.floor(Math.random() * clips.length);
        if (pick === last) pick = (pick + 1) % clips.length;
        last = pick;
        var clip = clips[pick];
        var volume = Number(M.store.get("volume"));
        clip.volume = .5 * (isFinite(volume) ? Math.max(0, Math.min(1, volume)) : .7);
        clip.muted = deviceMuted;
        clip.preservesPitch = false;
        clip.playbackRate = .82 + Math.random() * (1.34 - .82);
        try {
            clip.currentTime = isFinite(clip.duration) ? clip.duration * .5 * Math.random() : 0;
            playClip(clip);
        } catch (error) {}
    }
    function clear() {
        clearTimeout(timer);
        clearTimeout(strikeTimer);
        timer = strikeTimer = 0;
        rows.forEach(function(row) {
            row.classList.remove("is-frying");
        });
        stopSound();
    }
    function strike() {
        clear();
        if (!active || !rows.length) return;
        var dice = Math.random() * 9;
        var kind = KINDS[0];
        for (var i = 0; i < KINDS.length; i++) {
            dice -= KINDS[i].weight;
            if (dice <= 0) {
                kind = KINDS[i];
                break;
            }
        }
        rows.forEach(function(row) {
            row.style.setProperty("--glitch-burst", kind.dur + "ms");
            row.style.setProperty("--glitch-speed", String(kind.speed));
            void row.offsetWidth;
            row.classList.add("is-frying");
        });
        sound();
        strikeTimer = setTimeout(function() {
            rows.forEach(function(row) {
                row.classList.remove("is-frying");
            });
            stopSound();
            strikeTimer = 0;
        }, kind.dur);
        timer = setTimeout(strike, kind.dur + M.TIME.glitchGapMin + Math.random() * (M.TIME.glitchGapMax - M.TIME.glitchGapMin));
    }
    M.wifiGlitch = {
        setDeviceAudio: function(volume, muted) {
            deviceMuted = !!muted;
            clips.forEach(function(audio) {
                audio.volume = .5 * Math.max(0, Math.min(1, Number(volume) || 0));
                audio.muted = deviceMuted;
            });
            if (deviceMuted) stopSound();
        },
        start: function(page) {
            clear();
            rows = M.$$(".net--corrupted", page);
            strike();
        },
        stop: function() {
            clear();
            rows = [];
        },
        setActive: function(value) {
            active = value;
            if (active) strike(); else clear();
        }
    };
})(window.Cfg = window.Cfg || {});
