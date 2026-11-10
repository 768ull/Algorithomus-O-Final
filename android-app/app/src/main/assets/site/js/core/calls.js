(function(S) {
    "use strict";
    var incoming = null;
    var active = null;
    var staticEl = null;
    var timerNode = null;
    var device = null;
    var ringTimer = 0;
    var tickTimer = 0;
    var staticTimer = 0;
    var buzzTimer = 0;
    var caller = null;
    var missed = 0;
    var phaseFourRingAudio = null;
    var phaseFourCallAudio = null;
    var phaseFourCallStartTimer = 0;
    var phaseFourRetryTimer = 0;
    function contact(id) {
        return S.SCENARIO && S.SCENARIO.contacts[id] || {
            name: "Número desconhecido",
            avatar: "👁️"
        };
    }
    function stopRing() {
        clearTimeout(ringTimer);
        ringTimer = 0;
    }
    function stopTick() {
        clearInterval(tickTimer);
        tickTimer = 0;
    }
    function shake(mode) {
        device.classList.remove("is-ringing", "is-in-call");
        if (mode) device.classList.add(mode);
        clearInterval(buzzTimer);
        buzzTimer = 0;
        if (navigator.vibrate) {
            navigator.vibrate(0);
            if (mode === "is-ringing") buzzTimer = setInterval(function() {
                if (!S.device || !S.device.isVibrationEnabled || S.device.isVibrationEnabled()) {
                    navigator.vibrate([ 220, 140 ]);
                }
            }, 720);
        }
    }
    function setAvatar(node, avatar) {
        node.textContent = "";
        if (/^(?:https?:|\/|[\w.-]+\/)/.test(avatar || "")) {
            var image = document.createElement("img");
            image.src = avatar;
            image.alt = "";
            image.draggable = false;
            node.appendChild(image);
        } else {
            node.textContent = avatar || "👁️";
        }
    }
    function stopPhaseFourRing() {
        if (!phaseFourRingAudio) return;
        phaseFourRingAudio.pause();
        phaseFourRingAudio.currentTime = 0;
        phaseFourRingAudio = null;
    }
    function stopPhaseFourCallAudio() {
        if (!phaseFourCallAudio) return;
        phaseFourCallAudio.pause();
        phaseFourCallAudio.currentTime = 0;
        phaseFourCallAudio = null;
    }
    function log(contactId, type, note) {
        var who = contact(contactId);
        S.bridge.emit("telefone", "log", {
            name: who.name,
            avatar: who.avatar,
            type,
            time: S.time(),
            note: note || ""
        });
        S.notifications.push({
            app: "telefone",
            type: "call",
            title: who.name,
            text: note || type,
            icon: "phone",
            accent: "var(--app-telefone)"
        });
    }
    S.calls = {
        init: function() {
            incoming = S.$("#callIn");
            active = S.$("#callActive");
            staticEl = S.$("#callStatic");
            timerNode = S.$("#callTimer");
            device = S.$("#device");
        },
        ring: function(contactId) {
            if (S.INCOMING_CALLS_ENABLED === false) return;
            if (caller) return;
            active.classList.remove("is-phase-four-mother");
            S.$("#callEndButton").disabled = false;
            var who = contact(contactId);
            caller = {
                id: contactId,
                name: who.name,
                avatar: who.avatar
            };
            S.$("#callInAvatar").textContent = who.avatar;
            S.$("#callInName").textContent = who.name;
            S.$("#callActiveAvatar").textContent = who.avatar;
            S.$("#callActiveName").textContent = who.name;
            timerNode.textContent = "00:00";
            incoming.classList.add("is-open", "is-ringing");
            shake("is-ringing");
            S.haptic(60);
            ringTimer = setTimeout(function() {
                S.calls.decline(true);
            }, S.TIMING.ring);
        },
        ringPhaseFour: function() {
            if (caller) return;
            clearTimeout(phaseFourRetryTimer);
            phaseFourRetryTimer = 0;
            var avatar = "apps/mensagens/pfp/imagem-012.webp";
            caller = {
                id: "mae",
                name: "Mãe",
                avatar: avatar,
                phaseFour: true
            };
            setAvatar(S.$("#callInAvatar"), avatar);
            S.$("#callInName").textContent = "Mãe";
            setAvatar(S.$("#callActiveAvatar"), avatar);
            S.$("#callActiveName").textContent = "Mãe";
            timerNode.textContent = "00:00";
            incoming.classList.add("is-open", "is-ringing");
            shake("is-ringing");
            S.haptic(60);
            stopPhaseFourRing();
            phaseFourRingAudio = new Audio(window.DiaryFinalMedia ? window.DiaryFinalMedia.ring : "");
            phaseFourRingAudio.loop = true;
            phaseFourRingAudio.volume = S.device.volume ? S.device.volume() : 1;
            phaseFourRingAudio.muted = S.device.isMuted ? S.device.isMuted() : false;
            var ringPlayback = phaseFourRingAudio.play();
            if (ringPlayback && typeof ringPlayback.catch === "function") ringPlayback.catch(function() {});
            ringTimer = setTimeout(function() {
                S.calls.decline(true);
            }, S.TIMING.ring);
        },
        answer: function() {
            if (!caller) return;
            var isPhaseFourCall = !!caller.phaseFour;
            stopRing();
            if (isPhaseFourCall) stopPhaseFourRing();
            incoming.classList.remove("is-ringing");
            incoming.classList.remove("is-open");
            active.classList.add("is-open");
            shake("is-in-call");
            var started = Date.now();
            tickTimer = setInterval(function() {
                timerNode.textContent = S.duration(Date.now() - started);
            }, 1e3);
            if (isPhaseFourCall) {
                active.classList.add("is-phase-four-mother");
                S.$("#callEndButton").disabled = true;
                clearTimeout(phaseFourCallStartTimer);
                phaseFourCallStartTimer = setTimeout(function() {
                    phaseFourCallStartTimer = 0;
                    if (!caller || !caller.phaseFour) return;
                    phaseFourCallAudio = new Audio(window.DiaryFinalMedia ? window.DiaryFinalMedia.call : "");
                    phaseFourCallAudio.volume = S.device.volume ? S.device.volume() : 1;
                    phaseFourCallAudio.muted = S.device.isMuted ? S.device.isMuted() : false;
                    phaseFourCallAudio.addEventListener("ended", function() {
                        if (S.diaryTest && S.diaryTest.phaseFourCallAudioEnded) S.diaryTest.phaseFourCallAudioEnded();
                        if (caller && caller.phaseFour) S.calls.hangUp();
                    });
                    phaseFourCallAudio.addEventListener("timeupdate", function() {
                        if (S.diaryTest && S.diaryTest.updatePhaseFourCall) S.diaryTest.updatePhaseFourCall(phaseFourCallAudio.currentTime);
                    });
                    var callPlayback = phaseFourCallAudio.play();
                    if (callPlayback && typeof callPlayback.catch === "function") callPlayback.catch(function() {});
                }, 1e3);
                return;
            }
            log(caller.id, "Recebida", "Chamada em curso");
            staticTimer = setTimeout(function() {
                staticEl.hidden = false;
                staticTimer = setTimeout(function() {
                    staticEl.hidden = true;
                    S.calls.hangUp();
                }, 3e3);
            }, S.TIMING.callStatic);
        },
        decline: function(missedCall) {
            if (!caller) return;
            var isPhaseFourCall = !!caller.phaseFour;
            stopRing();
            if (isPhaseFourCall) stopPhaseFourRing();
            incoming.classList.remove("is-ringing");
            incoming.classList.remove("is-open");
            shake(null);
            if (missedCall) missed += 1;
            if (!isPhaseFourCall) {
                S.notifications.setBadge("telefone", missed);
                log(caller.id, "Perdida", missedCall ? "Chamada não atendida" : "Chamada recusada");
            }
            caller = null;
            if (isPhaseFourCall) phaseFourRetryTimer = setTimeout(function() {
                phaseFourRetryTimer = 0;
                S.calls.ringPhaseFour();
            }, 1e3);
        },
        hangUp: function() {
            if (!caller) return;
            var isPhaseFourCall = !!caller.phaseFour;
            stopTick();
            clearTimeout(staticTimer);
            staticTimer = 0;
            staticEl.hidden = true;
            active.classList.remove("is-open");
            active.classList.remove("is-phase-four-mother");
            S.$("#callEndButton").disabled = false;
            shake(null);
            if (isPhaseFourCall) {
                clearTimeout(phaseFourCallStartTimer);
                phaseFourCallStartTimer = 0;
                stopPhaseFourCallAudio();
                clearTimeout(phaseFourRetryTimer);
                phaseFourRetryTimer = 0;
            } else log(caller.id, "Encerrada", "Ligação encerrada");
            caller = null;
        },
        request: function(payload) {
            if (S.INCOMING_CALLS_ENABLED === false) return;
            S.calls.ring(payload && payload.contact || "desconhecido");
        },
        missed: function() {
            return missed;
        },
        clearMissed: function() {
            missed = 0;
            S.notifications.setBadge("telefone", 0);
        }
    };
})(window.Celular = window.Celular || {});
