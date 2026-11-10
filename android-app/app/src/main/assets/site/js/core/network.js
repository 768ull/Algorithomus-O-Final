(function(S) {
    "use strict";
    var connected = false;
    var timers = [];
    var DELIVERY_KEY = "celular:network-notices-delivered:v1";
    var delivered = loadDelivered();
    var updating = {};
    var updateStartedAt = 0;
    var updateFrame = 0;
    var updateProgress = 0;
    var slowNoticeSent = false;
    var glitchTimers = [];
    var installedKey = {
        mensagens: "celular:app-installed:mensagens:v1",
        y: "celular:app-installed:y:v1"
    };
    function loadDelivered() {
        try {
            var saved = JSON.parse(window.localStorage.getItem(DELIVERY_KEY) || "{}");
            return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
        } catch (error) {
            return {};
        }
    }
    function saveDelivered() {
        try {
            window.localStorage.setItem(DELIVERY_KEY, JSON.stringify(delivered));
        } catch (error) {}
    }
    function isInstalled(appId) {
        try {
            return window.localStorage.getItem(installedKey[appId]) === "true";
        } catch (error) {
            return false;
        }
    }
    function saveInstalled(appId) {
        try {
            window.localStorage.setItem(installedKey[appId], "true");
        } catch (error) {}
    }
    function connectionGlitch() {
        if (!window.glitch || !window.glitch.strike) return;
        glitchTimers.forEach(clearTimeout);
        glitchTimers = [];
        window.glitch.hold(true);
        function strike() {
            window.glitch.strike();
            if (window.IntroEffects && window.IntroEffects.siteStrike) {
                window.IntroEffects.siteStrike();
            }
        }
        strike();
        [ 360, 780, 1240 ].forEach(function(delay) {
            glitchTimers.push(setTimeout(strike, delay));
        });
    }
    function showSlowInternetNotice() {
        if (slowNoticeSent) return;
        slowNoticeSent = true;
        S.notifications.push({
            tag: "slow-internet",
            type: "system",
            app: "configuracoes",
            page: "wifi",
            title: "Internet lenta",
            text: "O carregamento pode demorar alguns dias.",
            icon: "wifi",
            accent: "#ffb52e"
        });
    }
    function paintUpdate(appId) {
        if (!S.$$) return;
        S.$$('.home-item--app[data-app="' + appId + '"]').forEach(function(button) {
            var active = !!updating[appId];
            button.classList.toggle("is-updating", active);
            button.disabled = active;
            button.setAttribute("aria-busy", active ? "true" : "false");
            button.setAttribute("aria-label", active ? S.APP[appId].name + ", atualizando" : S.APP[appId].name);
            if (active) button.style.setProperty("--update-progress", updateProgress + "%"); else {
                button.style.removeProperty("--update-progress");
                button.style.removeProperty("--update-duration");
            }
        });
    }
    function currentProgress() {
        if (!updating.mensagens && !updating.y) return updateProgress;
        if (!connected) return updateProgress;
        var duration = S.TIMING.networkUpdateDuration || 3e4;
        updateProgress = Math.min(100, (Date.now() - updateStartedAt) / duration * 100);
        if (updateProgress >= 75) showSlowInternetNotice();
        if (updateProgress >= 100) finishUpdate();
        return updateProgress;
    }
    function finishUpdate() {
        if (!updating.mensagens && !updating.y) return;
        updateProgress = 100;
        paintUpdate("mensagens");
        paintUpdate("y");
        if (updating.mensagens) saveInstalled("mensagens");
        if (updating.y) saveInstalled("y");
        setUpdating("mensagens", false);
        setUpdating("y", false);
        if (updateFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(updateFrame);
        updateFrame = 0;
        if (S.notifications && S.notifications.resolve) S.notifications.resolve("slow-internet");
        slowNoticeSent = false;
    }
    function animateProgress() {
        if (!updating.mensagens && !updating.y) {
            updateFrame = 0;
            return;
        }
        currentProgress();
        paintUpdate("mensagens");
        paintUpdate("y");
        if (updateProgress < 100 && window.requestAnimationFrame) {
            updateFrame = window.requestAnimationFrame(animateProgress);
        } else updateFrame = 0;
    }
    function setUpdating(appId, active) {
        if (active) updating[appId] = true; else delete updating[appId];
        paintUpdate(appId);
    }
    function cancel() {
        timers.forEach(clearTimeout);
        timers = [];
    }
    function offline() {
        if (S.notifications.all().some(function(note) {
            return note.tag === "offline";
        })) return;
        S.notifications.push({
            tag: "offline",
            type: "system",
            app: "configuracoes",
            page: "wifi",
            persistent: true,
            title: "Configurações",
            text: "Você está sem internet. As mensagens não vão carregar.",
            icon: "gear",
            accent: S.APP.configuracoes.accent
        });
    }
    function syncInternet(app) {
        S.bridge.emit(app, "wifi-state", {
            connected
        });
    }
    function notifyInternetApps() {
        syncInternet("mensagens");
        syncInternet("y");
    }
    S.network = {
        init: function() {
            if (S.wifiPuzzle) S.wifiPuzzle.sync().then(function(on){S.network.connect(on);}).catch(function(){offline();}); else offline();
        },
        radio: function(on) {
            S.status.wifi(on);
            if (!on) S.network.connect(false);
        },
        sync: function(app) {
            if (app === "configuracoes" || app === "mensagens" || app === "y") syncInternet(app);
        },
        connect: function(on, celebratePassword) {
            on = !!on;
            if (on === connected) return;
            if (!on && connected && (updating.mensagens || updating.y)) currentProgress();
            connected = on;
            cancel();
            S.status.connection(on);
            notifyInternetApps();
            if (!on) {
                if (updateFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(updateFrame);
                updateFrame = 0;
                offline();
                return;
            }
            S.status.wifi(true);
            if (celebratePassword) connectionGlitch();
            if (!updating.mensagens && !updating.y) {
                updateProgress = 0;
                [ "mensagens", "y" ].forEach(function(id) {
                    if (!isInstalled(id)) setUpdating(id, true);
                });
            }
            if (updating.mensagens || updating.y) {
                updateStartedAt = Date.now() - updateProgress / 100 * (S.TIMING.networkUpdateDuration || 3e4);
                if (window.requestAnimationFrame) updateFrame = window.requestAnimationFrame(animateProgress);
            }
            S.notifications.resolve("offline");
            if (!delivered.wifiConnected) {
                S.notifications.push({
                    app: "configuracoes",
                    page: "wifi",
                    type: "system",
                    title: "Wi-Fi conectado",
                    text: "Agora você está conectado à internet.",
                    icon: "wifi",
                    accent: S.APP.configuracoes.accent
                });
                delivered.wifiConnected = true;
                saveDelivered();
            }
            var notices = [ {
                app: "tetris",
                text: "Pronto para jogar."
            }, {
                app: "cobrinha",
                text: "Pronto para jogar."
            }, {
                app: "y",
                text: "Atualizando"
            }, {
                app: "mensagens",
                text: "Baixando mensagens"
            } ];
            notices.forEach(function(notice, index) {
                if (delivered[notice.app]) return;
                if ((notice.app === "mensagens" || notice.app === "y") && isInstalled(notice.app)) return;
                timers.push(setTimeout(function() {
                    if (!connected || delivered[notice.app]) return;
                    delivered[notice.app] = true;
                    saveDelivered();
                    var app = S.APP[notice.app];
                    S.notifications.push({
                        app: app.id,
                        title: app.name,
                        text: notice.text,
                        icon: app.icon,
                        accent: app.accent
                    });
                }, S.TIMING.networkFirstNotice + index * S.TIMING.networkNoticeGap));
            });
        },
        isUpdating: function(appId) {
            return !!updating[appId];
        },
        isConnected: function() {
            return connected;
        },
        progress: currentProgress,
        showSlowInternetNotice,
        clearSlowInternetNotice: function() {
            if (updating.mensagens || updating.y) return;
            if (S.notifications && S.notifications.resolve) S.notifications.resolve("slow-internet");
            slowNoticeSent = false;
        },
        refreshIcons: function() {
            [ "mensagens", "y" ].forEach(function(id) {
                paintUpdate(id);
            });
        }
    };
})(window.Celular = window.Celular || {});
