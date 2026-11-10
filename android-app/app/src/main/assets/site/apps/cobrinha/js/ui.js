(function(C) {
    "use strict";
    var s = C.state;
    var dom = {};
    var soundOn = true;
    var deviceVolume = 1;
    var deviceMuted = false;
    C.ui = {};
    function read(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (err) {
            return null;
        }
    }
    function write(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (err) {}
    }
    C.ui.init = function() {
        dom = {
            stage: document.getElementById("stage"),
            score: document.getElementById("score"),
            level: document.getElementById("level"),
            best: document.getElementById("best"),
            gearBtn: document.getElementById("gearBtn"),
            gearPanel: document.getElementById("gearPanel"),
            pauseBtn: document.getElementById("pauseBtn"),
            pauseIcon: document.querySelector("#pauseBtn [data-icon]"),
            dpad: document.getElementById("dpad"),
            dpadValue: document.getElementById("dpadValue"),
            themeValue: document.getElementById("themeValue"),
            overlay: document.getElementById("overlay"),
            title: document.getElementById("overlayTitle"),
            sub: document.getElementById("overlaySub"),
            count: document.getElementById("overlayCount"),
            final: document.getElementById("overlayFinal"),
            restart: document.getElementById("btnRestart"),
            resume: document.getElementById("btnResume"),
            hint: document.getElementById("overlayHint")
        };
        s.best = parseInt(read(C.STORAGE.best), 10) || 0;
        C.hydrateIcons();
        applyTheme(read(C.STORAGE.theme) || C.DEFAULT_THEME);
        applyDpad(read(C.STORAGE.dpad) === "1");
    };
    C.ui.bindActions = function() {
        document.addEventListener("click", function(event) {
            var target = event.target.closest ? event.target.closest("[data-action]") : null;
            if (!target) {
                C.ui.closeGear();
                return;
            }
            var action = target.dataset.action;
            if (action === "restart") C.newGame(); else if (action === "resume") C.ui.togglePause(); else if (action === "pause") C.ui.togglePause(); else if (action === "gear") C.ui.toggleGear(); else if (action === "theme") cycleTheme(); else if (action === "toggle-dpad") toggleDpad();
        });
    };
    C.playSound = function(frequency) {
        if (!soundOn || deviceMuted || deviceVolume <= 0) return;
        try {
            var Audio = window.AudioContext || window.webkitAudioContext;
            if (!Audio) return;
            var audio = C.audioContext || (C.audioContext = new Audio);
            if (audio.state === "suspended") audio.resume();
            var oscillator = audio.createOscillator(), gain = audio.createGain();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, audio.currentTime + .09);
            gain.gain.setValueAtTime(1e-4, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(.08 * deviceVolume, audio.currentTime + .012);
            gain.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + .13);
            oscillator.connect(gain);
            gain.connect(audio.destination);
            oscillator.start();
            oscillator.stop(audio.currentTime + .14);
        } catch (err) {}
    };
    C.ui.setDeviceAudio = function(volume, muted) {
        deviceVolume = Math.max(0, Math.min(1, Number(volume) || 0));
        deviceMuted = !!muted;
    };
    C.ui.sync = function() {
        if (s.score > s.best) saveBest();
        dom.score.textContent = s.score;
        dom.level.textContent = s.level;
        dom.best.textContent = s.best;
        syncPauseBtn();
        dom.stage.classList.toggle("is-playing", s.status === C.STATUS.playing || s.status === C.STATUS.countdown);
        if (s.status === C.STATUS.countdown) showCountdown(s.countdown); else if (s.status === C.STATUS.playing) C.ui.hideOverlay();
    };
    function themeById(id) {
        var themes = C.THEMES;
        for (var i = 0; i < themes.length; i++) {
            if (themes[i].id === id) return themes[i];
        }
        return themes[0];
    }
    function currentTheme() {
        return themeById(document.documentElement.dataset.theme);
    }
    function applyTheme(id) {
        var theme = themeById(id);
        document.documentElement.dataset.theme = theme.id;
        dom.themeValue.textContent = theme.label;
        if (C.render.loadPalette) C.render.loadPalette();
    }
    function cycleTheme() {
        var themes = C.THEMES;
        var current = currentTheme();
        var next = themes[0];
        for (var i = 0; i < themes.length; i++) {
            if (themes[i].id === current.id) next = themes[(i + 1) % themes.length];
        }
        applyTheme(next.id);
        write(C.STORAGE.theme, next.id);
    }
    function applyDpad(on) {
        dom.dpad.hidden = !on;
        dom.dpadValue.textContent = on ? "LIGADO" : "DESLIGADO";
    }
    function toggleDpad() {
        var on = dom.dpad.hidden;
        applyDpad(on);
        write(C.STORAGE.dpad, on ? "1" : "0");
    }
    C.ui.toggleGear = function() {
        if (dom.gearPanel.hidden) C.ui.openGear(); else C.ui.closeGear();
    };
    C.ui.openGear = function() {
        dom.gearPanel.hidden = false;
        dom.gearBtn.setAttribute("aria-expanded", "true");
    };
    C.ui.closeGear = function() {
        if (dom.gearPanel.hidden) return;
        dom.gearPanel.hidden = true;
        dom.gearBtn.setAttribute("aria-expanded", "false");
    };
    C.ui.isGearOpen = function() {
        return !dom.gearPanel.hidden;
    };
    function syncPauseBtn() {
        var playable = s.status === C.STATUS.playing || s.status === C.STATUS.countdown || s.status === C.STATUS.paused;
        dom.pauseBtn.disabled = !playable;
        var icon = s.status === C.STATUS.paused ? "play" : "pause";
        if (dom.pauseIcon.dataset.icon !== icon) {
            dom.pauseIcon.dataset.icon = icon;
            dom.pauseIcon.innerHTML = C.icon(icon);
        }
        dom.pauseBtn.setAttribute("aria-label", s.status === C.STATUS.paused ? "Continuar" : "Pausar");
    }
    function overlay(mode) {
        dom.overlay.dataset.mode = mode;
        dom.overlay.hidden = mode === "none";
    }
    C.ui.hideOverlay = function() {
        overlay("none");
    };
    function showCountdown(text) {
        dom.title.hidden = true;
        dom.sub.hidden = true;
        dom.final.hidden = true;
        dom.restart.hidden = true;
        dom.resume.hidden = true;
        dom.count.hidden = !text;
        dom.count.textContent = text || "";
        overlay("countdown");
    }
    C.ui.showStart = function() {
        dom.title.hidden = false;
        dom.title.textContent = "Jogo da Cobrinha";
        dom.sub.hidden = true;
        dom.sub.textContent = "";
        dom.count.hidden = true;
        dom.final.hidden = true;
        dom.restart.hidden = false;
        dom.restart.textContent = "JOGAR";
        dom.resume.hidden = true;
        dom.hint.hidden = true;
        overlay("start");
    };
    C.ui.showPause = function() {
        dom.title.hidden = false;
        dom.title.textContent = "PAUSA";
        dom.sub.hidden = false;
        dom.sub.textContent = "a partida está esperando";
        dom.count.hidden = true;
        dom.final.hidden = true;
        dom.restart.hidden = false;
        dom.restart.textContent = "RECOMEÇAR";
        dom.resume.hidden = false;
        dom.hint.hidden = true;
        overlay("pause");
    };
    C.ui.showOver = function(won) {
        saveBest();
        dom.title.hidden = false;
        dom.title.textContent = won ? "VOCÊ VENCEU" : "FIM DE JOGO";
        dom.sub.hidden = false;
        dom.sub.textContent = "toque para tentar de novo";
        dom.final.hidden = false;
        dom.final.textContent = s.score + " PTS · RECORDE " + s.best;
        dom.count.hidden = true;
        dom.restart.hidden = false;
        dom.restart.textContent = "JOGAR DE NOVO";
        dom.resume.hidden = true;
        dom.hint.hidden = true;
        overlay("over");
    };
    var pausedByUser = false;
    function isPlaying() {
        return s.status === C.STATUS.playing || s.status === C.STATUS.countdown;
    }
    C.ui.suspend = function(reason) {
        if (!isPlaying()) return;
        s.status = C.STATUS.paused;
        if (reason === "user") pausedByUser = true;
        C.ui.sync();
    };
    C.ui.restore = function() {
        if (s.status !== C.STATUS.paused) return;
        if (pausedByUser) {
            pausedByUser = false;
            s.status = C.STATUS.playing;
            C.ui.hideOverlay();
            C.ui.sync();
            return;
        }
        s.status = C.STATUS.countdown;
        s.countdown = C.RHYTHM.countdown[0];
        s.countdownAt = performance.now();
        C.ui.sync();
    };
    C.ui.togglePause = function() {
        if (s.status === C.STATUS.paused) {
            pausedByUser = false;
            s.status = C.STATUS.playing;
            C.ui.hideOverlay();
            C.ui.sync();
            return;
        }
        if (!isPlaying()) return;
        pausedByUser = true;
        s.status = C.STATUS.paused;
        C.ui.showPause();
        C.ui.sync();
    };
    C.ui.keyPause = function() {
        if (C.ui.isGearOpen()) {
            C.ui.closeGear();
            return;
        }
        C.ui.togglePause();
    };
    C.ui.onBack = function() {
        if (C.ui.isGearOpen()) {
            C.ui.closeGear();
            return true;
        }
        if (!isPlaying()) return false;
        C.ui.togglePause();
        return true;
    };
    function saveBest() {
        if (s.score <= s.best) return;
        s.best = s.score;
        write(C.STORAGE.best, s.best);
    }
})(window.Cobrinha = window.Cobrinha || {});