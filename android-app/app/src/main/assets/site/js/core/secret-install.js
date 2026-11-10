(function(S) {
    "use strict";
    var overlay = null;
    var running = false;
    var timers = [];
    var progressFrame = 0;
    var perpetualGlitchTimer = 0;
    var INSTALL_APP = "sem-nome";
    var INSTALL_DURATION = 3e4;
    var INSTALL_STORAGE_KEY = "celular:sem-nome:installation:v2";
    var LEGACY_INSTALL_STORAGE_KEY = "celular:sem-nome:installed:v1";
    var restorePending = false;
    var installing = false;
    var installed = false;
    var installationProgress = 0;
    var slowNoticeShown = false;
    function getInstallState() {
        try {
            var state = window.localStorage.getItem(INSTALL_STORAGE_KEY);
            if (state === "installing" || state === "done") return state;
            return window.localStorage.getItem(LEGACY_INSTALL_STORAGE_KEY) === "true" ? "installing" : "";
        } catch (error) {
            return "";
        }
    }
    function saveInstallState(state) {
        try {
            window.localStorage.setItem(INSTALL_STORAGE_KEY, state);
        } catch (error) {}
    }
    function disableCalculator() {
        if (S.APP && S.APP.calculadora) S.APP.calculadora.launchable = false;
    }
    function later(callback, delay) {
        timers.push(window.setTimeout(callback, delay));
    }
    function strike() {
        if (overlay) {
            overlay.classList.remove("is-glitching");
            void overlay.offsetWidth;
            overlay.classList.add("is-glitching");
        }
        if (window.glitch && window.glitch.strike) window.glitch.strike();
        if (window.IntroEffects && window.IntroEffects.siteStrike) window.IntroEffects.siteStrike();
    }
    function startIntroStorm() {
        var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (window.sound && window.sound.activate) window.sound.activate();
        if (overlay && !reducedMotion) overlay.classList.add("is-storming");
        if (reducedMotion) {
            if (window.glitch && window.glitch.setCalm) window.glitch.setCalm(true);
            if (window.glitch && window.glitch.hold) window.glitch.hold(true);
            strike();
            return;
        }
        if (window.IntroEffects && window.IntroEffects.setStorming) window.IntroEffects.setStorming(true);
        if (window.glitch) {
            if (window.glitch.hold) window.glitch.hold(false);
            if (window.glitch.storm) window.glitch.storm(true);
            if (window.glitch.strike) window.glitch.strike();
        }
        if (window.IntroEffects && window.IntroEffects.siteStrike) window.IntroEffects.siteStrike();
    }
    function stopIntroStorm() {
        if (window.glitch && window.glitch.stop) window.glitch.stop();
        if (window.IntroEffects && window.IntroEffects.stop) window.IntroEffects.stop();
        if (overlay) overlay.classList.remove("is-storming");
    }
    function startPerpetualGlitches() {
        armQuietGlitches();
        function repeat() {
            var currentApp = S.nav.current();
            if (currentApp !== "tetris" && currentApp !== "cobrinha") {
                armQuietGlitches();
                strike();
            } else {
                stopIntroStorm();
            }
            perpetualGlitchTimer = window.setTimeout(repeat, 7e3 + Math.random() * 8e3);
        }
        perpetualGlitchTimer = window.setTimeout(repeat, 3e3);
    }
    function stopPerpetualGlitches() {
        if (perpetualGlitchTimer) window.clearTimeout(perpetualGlitchTimer);
        perpetualGlitchTimer = 0;
        stopIntroStorm();
        if (overlay) overlay.classList.remove("is-glitching");
    }
    function armQuietGlitches() {
        if (window.glitch) {
            if (window.glitch.stop) window.glitch.stop();
            if (window.glitch.setCalm) window.glitch.setCalm(true);
            if (window.glitch.hold) window.glitch.hold(true);
        }
        if (window.IntroEffects && window.IntroEffects.stop) window.IntroEffects.stop();
    }
    function hideOverlay() {
        if (!overlay) return;
        overlay.classList.remove("is-active", "is-revealing", "is-glitching");
        overlay.setAttribute("aria-hidden", "true");
    }
    function refreshIcon() {
        var selector = '.home-item--app[data-app="' + INSTALL_APP + '"]';
        var icons = S.$$ ? S.$$(selector) : [ S.$(selector) ];
        icons.forEach(function(icon) {
            if (!icon) return;
            icon.classList.toggle("is-updating", installing);
            icon.disabled = installing || !installed;
            icon.setAttribute("aria-busy", String(installing));
            icon.setAttribute("aria-label", installing
                ? S.APP[INSTALL_APP].name + ", instalando, " + Math.floor(installationProgress) + "%"
                : S.APP[INSTALL_APP].name + (installed ? "" : ", indisponível"));
            if (installing) icon.style.setProperty("--update-progress", installationProgress + "%");
            else {
                icon.style.removeProperty("--update-progress");
                icon.style.removeProperty("--update-duration");
            }
        });
    }
    function beginProgress() {
        if (!S.home || !S.homeLayout || installed) return;
        var icon = S.$('.home-item--app[data-app="' + INSTALL_APP + '"]');
        var page = icon && icon.closest(".home__page");
        if (page && S.home.page) S.home.page(page.id === "homePage1" ? 1 : 0);
        installing = true;
        installed = false;
        installationProgress = 0;
        slowNoticeShown = false;
        if (S.APP[INSTALL_APP]) S.APP[INSTALL_APP].launchable = true;
        refreshIcon();
        if (S.notifications) S.notifications.push({
            app: INSTALL_APP,
            type: "system",
            title: "Diário Pessoal está sendo atualizado",
            text: "Instalando atualização.",
            icon: S.APP[INSTALL_APP].icon,
            accent: S.APP[INSTALL_APP].accent
        });
        var start = null;
        function step(now) {
            if (start === null) start = now;
            installationProgress = Math.min(100, (now - start) / INSTALL_DURATION * 100);
            refreshIcon();
            if (!slowNoticeShown && installationProgress >= 75) {
                slowNoticeShown = true;
                if (S.network && S.network.showSlowInternetNotice) S.network.showSlowInternetNotice();
            }
            if (installationProgress < 100) {
                progressFrame = window.requestAnimationFrame(step);
                return;
            }
            progressFrame = 0;
            installing = false;
            installed = true;
            installationProgress = 100;
            if (S.APP[INSTALL_APP]) S.APP[INSTALL_APP].launchable = true;
            saveInstallState("done");
            if (S.network && S.network.clearSlowInternetNotice) S.network.clearSlowInternetNotice();
            refreshIcon();
            if (S.notifications) S.notifications.push({
                app: INSTALL_APP,
                type: "system",
                title: "Diário Pessoal instalado",
                text: "A atualização foi concluída. O aplicativo está pronto para abrir.",
                icon: S.APP[INSTALL_APP].icon,
                accent: S.APP[INSTALL_APP].accent
            });
            startPerpetualGlitches();
        }
        progressFrame = window.requestAnimationFrame(step);
    }
    S.secretInstall = {
        isInstalling: function() {
            return installing;
        },
        init: function() {
            overlay = S.$("#secretInstall");

            S.bus.on("system:unlocked", async function() {try{var authorized=await S.request('secret-state');if(authorized.installed){var state=getInstallState();running=true;installing=state==='installing';installed=!installing;disableCalculator();if(S.APP[INSTALL_APP])S.APP[INSTALL_APP].launchable=true;restorePending=installing;if(S.homeLayout&&S.homeLayout.revealApp)S.homeLayout.revealApp(INSTALL_APP);refreshIcon();}}catch(e){}
                if (!restorePending) return;
                restorePending = false;
                beginProgress();
            });
            S.bus.on("app:opened", function(event) {
                if (event.id === INSTALL_APP) stopPerpetualGlitches();
                else if (event.id === "tetris" || event.id === "cobrinha") stopIntroStorm();
            });
        },
        start: async function() {try{var state=await S.request('secret-state');if(!state.installed)return;}catch(e){return;}
            if (running || !overlay || S.nav.current() !== "calculadora") return;
            running = true;
            installing = true;
            installed = false;
            disableCalculator();
            if (S.APP[INSTALL_APP]) S.APP[INSTALL_APP].launchable = true;
            saveInstallState("installing");
            if (S.homeLayout && S.homeLayout.revealApp) S.homeLayout.revealApp(INSTALL_APP);
            beginProgress();
            timers.forEach(window.clearTimeout);
            timers = [];
            overlay.setAttribute("aria-hidden", "false");
            overlay.classList.remove("is-revealing", "is-active");
            void overlay.offsetWidth;
            overlay.classList.add("is-active");
            startIntroStorm();
            later(function() {
                S.nav.home();
                overlay.classList.add("is-revealing");
                if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) strike();
            }, 1100);
            later(function() {
                stopIntroStorm();
                hideOverlay();
            }, 2150);
        },
        refreshIcon: refreshIcon
    };
})(window.Celular = window.Celular || {});
