(function(S) {
    "use strict";
    var screen = null;
    var home = null;
    var recents = null;
    var rail = null;
    var railLayer = null;
    var state = {
        app: null,
        recents: false,
        back: null
    };
    function setCurrentApp(id) {
        state.app = id;
        S.bus.emit("navigation:changed", {
            id
        });
    }
    function park(appId, animate) {
        var entry = S.apps.get(appId);
        if (!entry) return;
        if (!animate) {
            entry.window.classList.remove("is-open", "is-closing", "is-silent");
            return;
        }
        entry.window.classList.remove("is-open", "is-silent");
        entry.window.classList.add("is-closing");
        setTimeout(function() {
            entry.window.classList.remove("is-closing");
        }, S.TIMING.appOut);
    }
    function setOrigin(win, originEl) {
        var frameRect = screen.getBoundingClientRect();
        var rect = (originEl || home).getBoundingClientRect();
        win.style.setProperty("--ox", rect.left + rect.width / 2 - frameRect.left + "px");
        win.style.setProperty("--oy", rect.top + rect.height / 2 - frameRect.top + "px");
    }
    var LIFT_TRIGGER = 96;
    var LIFT_BACK = 240;
    var LIFT_FLING = 210;
    var lift = {
        card: null,
        appId: null,
        progress: 0,
        buzzed: false,
        timer: 0
    };
    var killing = {};
    function paintLift(y, alpha, mode) {
        var card = lift.card;
        if (!card) return;
        card.style.setProperty("--lift-y", y + "px");
        card.style.setProperty("--lift-a", alpha);
        card.classList.toggle("is-returning", mode === "return");
        card.classList.toggle("is-flinging", mode === "fling");
        var entry = S.apps.get(lift.appId);
        if (!entry) return;
        entry.window.style.setProperty("--lift-y", y + "px");
        entry.window.style.setProperty("--lift-a", alpha);
        entry.window.classList.toggle("is-returning", mode === "return");
        entry.window.classList.toggle("is-flinging", mode === "fling");
    }
    function liftClear() {
        clearTimeout(lift.timer);
        lift.timer = 0;
        if (!lift.card) return;
        var card = lift.card;
        var appId = lift.appId;
        card.classList.remove("is-lifting", "is-returning", "is-flinging");
        card.style.removeProperty("--lift-y");
        card.style.removeProperty("--lift-a");
        var entry = S.apps.get(appId);
        if (entry) {
            entry.window.classList.remove("is-lifting", "is-returning", "is-flinging");
            entry.window.style.removeProperty("--lift-y");
            entry.window.style.removeProperty("--lift-a");
        }
        lift.card = null;
        lift.appId = null;
        lift.progress = 0;
        lift.buzzed = false;
    }
    function liftRelease() {
        if (!lift.card) return;
        clearTimeout(lift.timer);
        paintLift(0, 1, "return");
        lift.timer = setTimeout(liftClear, LIFT_BACK + 80);
    }
    function isTextEntryTarget(target) {
        if (!target || !target.tagName) return false;
        var tagName = target.tagName.toLowerCase();
        return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable || target.getAttribute("role") === "textbox";
    }
    S.nav = {
        init: function() {
            screen = S.$("#screen");
            home = S.$("#home");
            recents = S.$("#recents");
            rail = S.$("#recentsRail");
            railLayer = S.$("#recentsRailLayer");
            S.bus.on("back-result", function(event) {
                if (!state.back || event.id !== state.back.id) return;
                clearTimeout(state.back.timer);
                state.back = null;
                if (!event.payload || !event.payload.handled) S.nav.home();
            });
            document.addEventListener("keydown", function(event) {
                if (isTextEntryTarget(event.target)) return;
                if (event.key === "Escape" || event.key === "Backspace") S.nav.back(); else if (event.key.toLowerCase() === "h") S.nav.home(); else if (event.key.toLowerCase() === "r") S.nav.recents();
            });
            S.nav.bindGestures();
        },
        current: function() {
            return state.app;
        },
        reset: function() {
            if (state.back) clearTimeout(state.back.timer);
            state.back = null;
            S.nav.closeRecents();
            if (state.app) {
                var appId = state.app;
                S.apps.setState(appId, "paused");
                park(appId, false);
                setCurrentApp(null);
                S.bus.emit("app:closed", {
                    id: appId,
                    by: "shutdown"
                });
            }
            home.classList.remove("is-leaving");
        },
        open: function(appId, originEl) {
            if (S.device.isUnavailable()) return;
            if (!S.APP[appId]) return;
            if (S.APP[appId].launchable === false) return;
            if (appId === "sem-nome" && S.secretInstall && S.secretInstall.isInstalling && S.secretInstall.isInstalling()) return;
            if (S.network && S.network.isUpdating && S.network.isUpdating(appId)) return;
            if (S.lock.isLocked()) return;
            if (S.notifications && S.notifications.dismissApp) S.notifications.dismissApp(appId);
            S.notifications.shade(false);
            var fromCard = !!(originEl && originEl.closest && originEl.closest(".card"));
            var wasSnapshot = S.snapshot.has(appId);
            if (fromCard || wasSnapshot) {
                S.nav.closeRecents(appId);
                S.snapshot.dropOthers(appId);
                if (state.app && state.app !== appId) {
                    S.apps.setState(state.app, "paused");
                    park(state.app, true);
                }
                setCurrentApp(null);
                home.classList.add("is-leaving");
                S.snapshot.release(appId, function() {
                    screen.classList.remove("is-recents");
                    S.apps.touch(appId);
                    var entry = S.apps.get(appId);
                    if (entry) entry.window.classList.remove("is-preloading");
                    S.apps.setState(appId, "open");
                    S.bus.emit("app:opened", {
                        id: appId
                    });
                });
                setCurrentApp(appId);
                return;
            }
            S.nav.closeRecents();
            var entry = S.apps.ensure(appId);
            if (!entry) return;
            setOrigin(entry.window, originEl);
            if (state.app && state.app !== appId) {
                S.apps.setState(state.app, "paused");
                park(state.app, true);
            }
            home.classList.add("is-leaving");
            if (S.apps.unfreeze) S.apps.unfreeze(appId);
            entry.window.classList.remove("is-closing", "is-silent", "is-frozen", "is-preloading");
            entry.window.classList.add("is-open");
            S.apps.touch(appId);
            S.apps.setState(appId, "open");
            setCurrentApp(appId);
            S.bus.emit("app:opened", {
                id: appId
            });
        },
        home: function() {
            if (S.device.isUnavailable()) return;
            if (S.notifications.isOpen()) return S.notifications.shade(false);
            if (state.recents) return S.nav.closeRecents();
            if (S.lock.isLocked()) return;
            if (!state.app) return;
            S.apps.setState(state.app, "paused");
            park(state.app, true);
            var leaving = state.app;
            setCurrentApp(null);
            home.classList.remove("is-leaving");
            S.bus.emit("app:closed", {
                id: leaving,
                by: "home"
            });
        },
        back: function() {
            if (S.device.isUnavailable()) return;
            if (S.notifications.isOpen()) return S.notifications.shade(false);
            if (state.recents) return S.nav.closeRecents();
            if (S.lock.isLocked()) return;
            if (!state.app) return;
            var appId = state.app;
            state.back = {
                id: appId,
                timer: setTimeout(function() {
                    state.back = null;
                    S.nav.home();
                }, 400)
            };
            S.bridge.emit(appId, "back", null);
        },
        recents: function() {
            if (S.device.isUnavailable()) return;
            if (S.lock.isLocked()) return;
            if (state.recents) return S.nav.home();
            S.notifications.shade(false);
            if (state.app) {
                S.apps.setState(state.app, "paused");
                setCurrentApp(null);
                home.classList.remove("is-leaving");
            }
            S.apps.recentIds().forEach(function(id) {
                S.apps.freeze(id);
            });
            S.nav.renderRecents();
            recents.classList.add("is-open");
            railLayer.classList.add("is-open");
            screen.classList.add("is-recents");
            state.recents = true;
            S.snapshot.reset();
        },
        closeRecents: function(keep) {
            liftClear();
            if (state.recents) {
                recents.classList.remove("is-open");
                railLayer.classList.remove("is-open");
                state.recents = false;
            }
            if (keep) return;
            S.snapshot.dropAll();
            screen.classList.remove("is-recents");
        },
        renderRecents: function() {
            liftClear();
            rail.innerHTML = "";
            var ids = S.apps.recentIds();
            if (!ids.length) {
                rail.appendChild(S.el("div", {
                    className: "recents__empty"
                }, [ S.el("div", {
                    html: S.icon("inbox")
                }), S.el("p", {
                    text: "Nenhum app aberto ainda."
                }), S.el("p", {
                    text: "Toque em um ícone da tela inicial."
                }) ]));
                return;
            }
            ids.forEach(function(appId) {
                var app = S.APP[appId];
                var card = S.el("div", {
                    className: "card",
                    dataset: {
                        app: appId,
                        action: "open-card"
                    },
                    style: "--card-accent:" + app.accent
                }, [ S.el("div", {
                    className: "card__shot"
                }), S.el("div", {
                    className: "card__bar"
                }, [ S.el("span", {
                    className: "card__name",
                    text: app.name
                }), S.el("button", {
                    className: "card__close",
                    dataset: {
                        action: "kill-app",
                        app: appId
                    },
                    html: S.icon("close"),
                    attrs: {
                        "aria-label": "Fechar " + app.name
                    }
                }) ]) ]);
                rail.appendChild(card);
                S.snapshot.enter(appId, card.querySelector(".card__shot"));
            });
        },
        lift: function(dy, targetEl, phase) {
            var card = targetEl && targetEl.closest ? targetEl.closest(".card") : null;
            if (phase === "end") {
                if (!lift.card) return;
                var appId = lift.appId;
                var triggered = lift.progress >= 1;
                if (triggered) {
                    paintLift(-LIFT_FLING * 2, 0, "fling");
                    setTimeout(function() {
                        liftClear();
                        S.nav.kill(appId);
                    }, LIFT_FLING);
                } else {
                    liftRelease();
                }
                return;
            }
            if (!card || dy > 0) {
                if (lift.card) liftRelease();
                return;
            }
            if (card !== lift.card) {
                liftClear();
                lift.card = card;
                lift.appId = card.dataset.app;
                card.classList.add("is-lifting");
                var entry = S.apps.get(lift.appId);
                if (entry) entry.window.classList.add("is-lifting");
            }
            lift.progress = S.clamp(-dy / LIFT_TRIGGER, 0, 1);
            paintLift(dy, 1 - lift.progress * .9, null);
            if (lift.progress >= 1 && !lift.buzzed) {
                lift.buzzed = true;
                S.haptic(14);
            }
        },
        kill: function(appId) {
            if (killing[appId]) return;
            killing[appId] = true;
            var currentOffset = S.slider ? S.slider.offset() : 0;
            if (lift.card && lift.appId === appId) liftClear();
            S.snapshot.forget(appId);
            S.apps.destroy(appId);
            var card = rail.querySelector('.card[data-app="' + appId + '"]');
            if (!card) {
                delete killing[appId];
                S.nav.renderRecents();
                S.snapshot.reset();
                return;
            }
            card.classList.add("is-leaving");
            S.haptic(14);
            setTimeout(function() {
                delete killing[appId];
                if (!state.recents) return;
                if (card.parentNode === rail) rail.removeChild(card);
                var remaining = rail.querySelectorAll(".card").length;
                if (!remaining) {
                    S.nav.renderRecents();
                    S.snapshot.reset();
                    return;
                }
                S.snapshot.retarget(currentOffset);
            }, 240);
        },
        bindGestures: function() {
            var startX = 0, startY = 0, tracking = false;
            screen.addEventListener("pointerdown", function(event) {
                var rect = screen.getBoundingClientRect();
                if (event.clientX - rect.left > 14) return;
                tracking = true;
                startX = event.clientX;
                startY = event.clientY;
            });
            screen.addEventListener("pointerup", function(event) {
                if (!tracking) return;
                tracking = false;
                var dx = event.clientX - startX;
                var dy = event.clientY - startY;
                if (dx > 48 && Math.abs(dy) < 60) S.nav.back();
            });
        }
    };
})(window.Celular = window.Celular || {});
