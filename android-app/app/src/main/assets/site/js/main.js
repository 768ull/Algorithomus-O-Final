(function(S) {
    "use strict";
    var systemStarted = false;
    var homeIntroPlayed = false;
    var currentHomePage = 0;
    var homePagesTrack = null;
    var homePageNodes = [];
    var homeDotNodes = [];
    var homeSwipe = null;
    var homeSwipeClickTimer = 0;
    function showHomePage(page) {
        if (!homePagesTrack || !homePageNodes.length) return;
        var next = S.clamp(Number(page) || 0, 0, homePageNodes.length - 1);
        currentHomePage = next;
        homePagesTrack.classList.remove("is-dragging");
        homePagesTrack.style.removeProperty("transform");
        homePagesTrack.style.setProperty("--home-page-offset", next ? "-50%" : "0%");
        homePageNodes.forEach(function(node, index) {
            var active = index === next;
            node.classList.toggle("is-active", active);
            node.setAttribute("aria-hidden", active ? "false" : "true");
        });
        homeDotNodes.forEach(function(node, index) {
            var active = index === next;
            node.classList.toggle("is-active", active);
            node.setAttribute("aria-selected", active ? "true" : "false");
            node.tabIndex = active ? 0 : -1;
        });
    }
    function swallowHomeSwipeClick() {
        function swallow(event) {
            document.removeEventListener("click", swallow, true);
            clearTimeout(homeSwipeClickTimer);
            homeSwipeClickTimer = 0;
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        document.addEventListener("click", swallow, true);
        clearTimeout(homeSwipeClickTimer);
        homeSwipeClickTimer = setTimeout(function() {
            document.removeEventListener("click", swallow, true);
            homeSwipeClickTimer = 0;
        }, 400);
    }
    function bindHomePager() {
        var viewport = S.$("#homeViewport");
        homePagesTrack = S.$("#homePages");
        homePageNodes = S.$$(".home__page", homePagesTrack);
        homeDotNodes = S.$$(".home__dot", S.$("#homeDots"));
        if (!viewport || !homePagesTrack) return;
        S.home.cancelPagerGesture = function(pointerId) {
            if (!homeSwipe || pointerId !== undefined && homeSwipe.pointerId !== pointerId) return;
            var wasDragging = homeSwipe.dragging;
            homeSwipe = null;
            if (wasDragging) showHomePage(currentHomePage);
        };
        showHomePage(0);
        viewport.addEventListener("pointerdown", function(event) {
            if (event.button !== undefined && event.button > 0) return;
            if (event.target.closest && event.target.closest('[data-action="home-page"]')) return;
            var draggedApp = event.target.closest && event.target.closest(".home-item--app:not(.home__dock-item)");
            if (draggedApp && S.homeLayout && S.homeLayout.isEditing()) return;
            homeSwipe = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                dx: 0,
                dragging: false
            };
        });
        viewport.addEventListener("pointermove", function(event) {
            if (!homeSwipe || event.pointerId !== homeSwipe.pointerId) return;
            var dx = event.clientX - homeSwipe.startX;
            var dy = event.clientY - homeSwipe.startY;
            if (!homeSwipe.dragging) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                if (Math.abs(dy) > Math.abs(dx)) {
                    homeSwipe = null;
                    return;
                }
                homeSwipe.dragging = true;
                homePagesTrack.classList.add("is-dragging");
                try {
                    viewport.setPointerCapture(event.pointerId);
                } catch (error) {}
            }
            homeSwipe.dx = dx;
            var width = viewport.clientWidth || 1;
            var position = -currentHomePage * width + dx;
            if (position > 0) position *= .28;
            if (position < -width) position = -width + (position + width) * .28;
            homePagesTrack.style.transform = "translate3d(" + position + "px, 0, 0)";
            event.preventDefault();
        });
        function endSwipe(event, cancelled) {
            if (!homeSwipe || event && event.pointerId !== homeSwipe.pointerId) return;
            var gesture = homeSwipe;
            homeSwipe = null;
            if (!gesture.dragging) return;
            var next = currentHomePage;
            if (!cancelled && gesture.dx < -44) next += 1; else if (!cancelled && gesture.dx > 44) next -= 1;
            showHomePage(next);
            swallowHomeSwipeClick();
            S.haptic(8);
        }
        viewport.addEventListener("pointerup", function(event) {
            endSwipe(event, false);
        });
        viewport.addEventListener("pointercancel", function(event) {
            endSwipe(event, true);
        });
    }
    function updateHomeClock() {
        var now = new Date;
        var clock = S.$("#homeClock");
        var date = S.$("#homeDate");
        if (clock) {
            var hours = clock.querySelector(".home-clock__hours");
            var minutes = clock.querySelector(".home-clock__minutes");
            if (hours && minutes) {
                hours.textContent = S.pad(now.getHours());
                minutes.textContent = S.pad(now.getMinutes());
            } else clock.textContent = S.pad(now.getHours()) + ":" + S.pad(now.getMinutes());
        }
        if (date) {
            date.textContent = now.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long"
            }).replace(/^./, function(letter) {
                return letter.toUpperCase();
            });
        }
    }
    S.home = {
        page: showHomePage,
        currentPage: function() {
            return currentHomePage;
        },
        bindPager: bindHomePager,
        reveal: function() {
            if (homeIntroPlayed) return;
            var home = S.$("#home");
            if (!home) return;
            homeIntroPlayed = true;
            home.classList.add("is-intro");
            setTimeout(function() {
                home.classList.add("is-intro-done");
                home.classList.remove("is-intro");
            }, 1700);
        }
    };
    function buildHome() {
        S.homeLayout.init();
    }
    var ACTIONS = {
        "open-app": function(target) {
            if (S.homeLayout.isEditing()) return;
            S.nav.open(target.dataset.app, target);
        },
        "finish-home-edit": function() {
            S.homeLayout.finishEdit();
        },
        "open-card": function(target) {
            S.nav.open(target.dataset.app, target.closest(".card"));
        },
        "kill-app": function(target) {
            S.nav.kill(target.dataset.app);
        },
        "home-page": function(target) {
            S.home.page(target.dataset.page);
        },
        back: function() {
            S.nav.back();
        },
        home: function() {
            S.nav.home();
        },
        recents: function() {
            S.nav.recents();
        },
        "close-recents": function() {
            S.nav.closeRecents();
        },
        "toggle-shade": function() {
            if (S.notifications.wasDragged()) return;
            S.notifications.shade(!S.notifications.isOpen());
        },
        "open-config": function() {
            S.nav.open("configuracoes");
        },
        "clear-notes": function() {
            S.notifications.clear();
        },
        "open-toast": function(target) {
            S.notifications.open(target.dataset.id);
        },
        "open-note": function(target) {
            S.notifications.open(target.dataset.id);
        },
        "decline-call": function() {
            S.calls.decline(false);
        },
        "accept-call": function() {
            S.calls.answer();
        },
        "end-call": function() {
            S.calls.hangUp();
        },
        "call-hangup": function() {
            S.emergencyCalls.hangUp();
        },
        "volume-up": function() {
            S.device.volumeUp();
        },
        "volume-down": function() {
            S.device.volumeDown();
        },
        power: function() {
            S.device.power();
        },
        "open-keypad": function() {
            S.lock.openKeypad();
        },
        "keypad-close": function() {
            S.lock.closeKeypad();
        },
        "keypad-back": function() {
            S.lock.backspace();
        },
        "keypad-digit": function(target) {
            S.lock.type(target.dataset.digit);
        },
        "keypad-call": function() {
            S.lock.call();
        }
    };
    function routeAppEvents() {
        S.bus.on("app:event", function(event) {
            var payload = event.payload || {};
            switch (event.name) {
              case "call":
                S.calls.request(payload);
                break;

              case "phase-four-call":
                if (event.id === "mensagens" && (document.documentElement.classList.contains("is-phase-four-capture") || document.documentElement.classList.contains("is-lock-capture"))) S.calls.ringPhaseFour();
                break;

              case "message":
                S.notifications.push({
                    app: event.id,
                    type: "message",
                    title: payload.title || "Mensagens",
                    text: payload.text || "",
                    creepy: !!payload.creepy,
                    icon: "chat",
                    accent: "var(--app-mensagens)"
                });
                break;

              case "unread":
                S.notifications.setBadge(event.id, payload.count || 0);
                break;

              case "effect":
                S.bus.emit("effect", payload);
                break;

              case "puzzle-complete":
                if (event.id === "y") {
                    if (window.sound && window.sound.activate) window.sound.activate();
                    if (window.glitch && window.glitch.strike) window.glitch.strike();
                    setTimeout(function() {
                        S.bridge.emit("y", "puzzle-complete", null);
                    }, 1300);
                }
                break;

              case "secret-code-entered":
                if (event.id === "calculadora" && S.secretInstall) S.secretInstall.start();
                break;

              case "clue-glitch":
                if (event.id === "y" && window.sound) {
                    if (window.sound.activate) window.sound.activate();
                    if (window.glitch && window.glitch.strike) window.glitch.strike(); else if (window.sound.glitch) window.sound.glitch();
                }
                break;

              case "spam-glitch-home":
                if (event.id === "mensagens") {
                    if (window.sound && window.sound.activate) window.sound.activate();
                    if (window.glitch && window.glitch.strike) window.glitch.strike(true);
                    setTimeout(function() {
                        S.nav.home();
                    }, 650);
                }
                break;

              case "wifi":
                if (event.id === "configuracoes") S.network.radio(payload.on);
                break;

              case "wifi-connection":
                if (event.id === "configuracoes" && typeof payload.connected === "boolean") {
                    S.wifiPuzzle.sync().then(function(connected){S.network.connect(connected,connected);});
                }
                break;

              case "sos-dial":
                if (event.id === "telefone" && payload.number) {
                    if (window.sound && window.sound.activate) window.sound.activate();
                    S.emergencyCalls.dial(payload.number).then(function(accepted){S.bridge.emit('telefone','sos-dial-result',{number:payload.number,accepted:accepted});});
                }
                break;

              case "display":
                S.display.brightness(payload.brilho);
                break;

              case "device-audio":
                if (event.id === "configuracoes" && S.device.audioSettings) {
                    S.device.audioSettings(payload.volume, payload.muted);
                }
                break;

              case "device-vibration":
                if (event.id === "configuracoes" && S.device.vibrationSettings) {
                    S.device.vibrationSettings(!!payload.enabled);
                }
                break;

              case "bluetooth-toggle":
                if (event.id === "configuracoes") {
                    try {
                        var settings = JSON.parse(localStorage.getItem("cfg:v1") || "null") || {};
                        settings.bluetooth = !!payload.enabled;
                        localStorage.setItem("cfg:v1", JSON.stringify(settings));
                    } catch (err) {}
                }
                break;

              case "back-result":
                S.bus.emit("back-result", {
                    id: event.id,
                    payload
                });
                break;
            }
        });
        S.bus.on("app:ready", function(event) {
            S.wifiPuzzle.send(event.id);
            S.network.sync(event.id);
            if (S.device.audioSettings) S.bridge.emit(event.id, "device-audio", {
                volume: S.device.volume ? S.device.volume() : S.VOLUME,
                muted: S.device.isMuted ? S.device.isMuted() : false,
                silent: S.device.isSilent ? S.device.isSilent() : false
            });
            if (event.id === "mensagens" || event.id === "telefone" || event.id === "y") {
                if (event.id === "mensagens" && (document.documentElement.classList.contains("is-phase-four-capture") || document.documentElement.classList.contains("is-lock-capture"))) {
                    S.bridge.emit(event.id, "phase-four-capture", true);
                }
                S.bridge.emit(event.id, "scenario", S.SCENARIO);
            }
            if(event.id === "calculadora")S.bridge.emit(event.id,"reset",null);
            if (event.id === "telefone") {
                var emergencyContacts = S.emergencyCalls.calledNumbers();
                S.bridge.emit(event.id, "emergency-contacts", emergencyContacts);
            }
        });
        S.bus.on("app:opened", function(event) {
            if (event.id === "telefone") S.calls.clearMissed();
        });
    }
    function onBooting(onProgress) {
        var firstBoot = !systemStarted;
        systemStarted = true;
        if (firstBoot) {
            S.hydrateIcons();
            buildHome();
            bindHomePager();
            updateHomeClock();
            setInterval(updateHomeClock, 1e3);
            S.apps.init();
            S.snapshot.init();
            S.status.init();
            S.display.init();
            S.systemBars.init();
            S.wallpaper.init();
            S.notifications.init();
            S.calls.init();
            S.emergencyCalls.init();
            S.lock.init();
            S.update.init();
            S.network.init();
            S.network.refreshIcons();
            S.nav.init();
            S.secretInstall.init();
            S.diaryTest.init();
            S.overload.init();
            S.story.init();
            S.bridge.bind();
            routeAppEvents();
            S.bindActions(ACTIONS);
        }
        var mediaProgress = {
            percent: 0,
            completed: 0,
            total: 0,
            failed: 0
        };
        function updateProgress() {
            onProgress({
                percent: mediaProgress.percent,
                label: mediaProgress.label || "carregando mídias",
                completed: mediaProgress.completed,
                total: mediaProgress.total,
                failed: mediaProgress.failed,
                failedUrls: mediaProgress.failedUrls || []
            });
        }
        var mediaPromise = S.bootLoader.preloadMedia(function(state) {
            mediaProgress = state;
            updateProgress();
        });
        return mediaPromise.then(function(mediaResult) {
            var failures = mediaResult.failed || 0;
            onProgress({
                percent: failures ? 99 : 100,
                label: failures ? "inicialização concluída com avisos" : "celular pronto",
                completed: 1,
                total: 1,
                failed: failures,
                failedUrls: mediaResult.failedUrls || []
            });
            return {
                failed: failures,
                failedUrls: mediaResult.failedUrls || []
            };
        });
    }
    function onBooted() {
        document.documentElement.classList.remove("is-cold");
    }
    if (window.intro) {
        window.intro.onFull = window.intro.chaos;
        window.intro.onBooting = onBooting;
        window.intro.onBooted = onBooted;
    }
    function boot() {
        S.hydrateIcons();
        S.device.init();
    }
    document.addEventListener("DOMContentLoaded", boot);
})(window.Celular = window.Celular || {});
