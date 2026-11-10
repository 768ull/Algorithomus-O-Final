(function(S) {
    "use strict";
    var shade = null;
    var list = null;
    var count = null;
    var toast = null;
    var toastTimer = 0;
    var toastQueue = [];
    var activeToast = null;
    var toastExiting = false;
    var sequence = 0;
    function later(delay, callback) {
        clearTimeout(toastTimer);
        toastTimer = setTimeout(callback, delay);
    }
    function finishToast() {
        if (!activeToast || toastExiting) return;
        toastExiting = true;
        toast.classList.remove("is-show", "is-content");
        toast.setAttribute("aria-hidden", "true");
        later(S.TIMING.toastExit, function() {
            toast.classList.remove("is-expanded");
            activeToast = null;
            toastExiting = false;
            showNextToast();
        });
    }
    function showNextToast() {
        if (activeToast) return;
        var note;
        while (toastQueue.length) {
            var candidate = toastQueue.shift();
            if (notes.some(function(item) {
                return item.id === candidate.id;
            })) {
                note = candidate;
                break;
            }
        }
        if (!note) return;
        activeToast = note;
        toast.dataset.id = note.id;
        toast.style.setProperty("--toast-accent", note.accent);
        fillIcon(S.$("#toastIcon"), note);
        S.$("#toastTitle").textContent = note.title;
        S.$("#toastText").textContent = note.text;
        S.$("#toastText").classList.toggle("is-creepy", !!note.creepy);
        toast.classList.remove("is-show", "is-expanded", "is-content");
        toast.setAttribute("aria-hidden", "false");
        void toast.offsetWidth;
        toast.classList.add("is-show");
        later(S.TIMING.toastEnter, function() {
            toast.classList.add("is-expanded");
            later(S.TIMING.toastExpand, function() {
                toast.classList.add("is-content");
                later(S.TIMING.toast, function() {
                    toast.classList.remove("is-content");
                    later(S.TIMING.toastTextOut, function() {
                        toast.classList.remove("is-expanded");
                        later(S.TIMING.toastCollapse, finishToast);
                    });
                });
            });
        });
    }
    var notes = [];
    var badges = {};
    var notificationBadges = {};
    function drawBadge(appId) {
        var value = S.notifications.badgeCount(appId);
        if (!S.$$) return;
        S.$$('.icon[data-app="' + appId + '"]').forEach(function(icon) {
            var badge = icon.querySelector(".icon__badge");
            if (!badge) return;
            var previous = parseInt(badge.textContent, 10) || 0;
            badge.textContent = value ? value > 9 ? "9+" : String(value) : "";
            if (value > previous) {
                badge.classList.remove("is-on");
                void badge.offsetWidth;
            }
            badge.classList.toggle("is-on", value > 0);
        });
    }
    var draggedAt = 0;
    var pendingApp = null;
    var rendered = {};
    function fillIcon(container, note) {
        container.innerHTML = "";
        var app = S.APP && S.APP[note.app];
        if (!app || !app.image) {
            container.innerHTML = S.icon(note.icon);
            container.classList.remove("has-app-image");
            return;
        }
        container.classList.add("has-app-image");
        container.appendChild(S.el("img", {
            src: app.image,
            alt: "",
            attrs: {
                "aria-hidden": "true",
                draggable: "false"
            },
            on: {
                error: function() {
                    container.classList.remove("has-app-image");
                    container.innerHTML = S.icon(note.icon);
                }
            }
        }));
    }
    function openDestination(note) {
        S.nav.open(note.app);
        if (note.page) S.bridge.emit(note.app, "open-section", {
            page: note.page
        });
        S.notifications.dismiss(note.id);
    }
    function setProgress(value) {
        shade.style.setProperty("--shade-p", String(S.clamp(value, 0, 1)));
    }
    function isOpen() {
        return shade.classList.contains("is-open") || shade.style.getPropertyValue("--shade-p") === "1";
    }
    function rubber(value) {
        if (value < 0) return value * .28;
        if (value > 1) return 1 + (value - 1) * .28;
        return value;
    }
    function travel() {
        return S.$("#screen").offsetHeight || 640;
    }
    function startDrag(event, base) {
        if (event.button !== undefined && event.button > 0) return;
        var startY = event.clientY;
        var height = travel();
        var moved = false;
        var lastY = startY;
        var lastAt = Date.now();
        var speed = 0;
        var ended = false;
        shade.classList.add("is-dragging");
        try {
            shade.setPointerCapture(event.pointerId);
        } catch (error) {}
        function move(moveEvent) {
            if (moveEvent.cancelable) moveEvent.preventDefault();
            var delta = moveEvent.clientY - startY;
            if (Math.abs(delta) > 4) moved = true;
            var now = Date.now();
            if (now > lastAt) speed = (moveEvent.clientY - lastY) / (now - lastAt);
            lastY = moveEvent.clientY;
            lastAt = now;
            setProgress(rubber(base + delta / height));
        }
        function end(endEvent) {
            if (ended) return;
            if (endEvent && typeof endEvent.clientY === "number") move(endEvent);
            ended = true;
            shade.classList.remove("is-dragging");
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
            window.removeEventListener("blur", end);
            if (moved) draggedAt = Date.now();
            var current = parseFloat(shade.style.getPropertyValue("--shade-p")) || 0;
            var distance = lastY - startY;
            var threshold = height * .1;
            var projected = current + speed * .35;
            var shouldOpen = Math.abs(distance) >= threshold ? distance > 0 : projected >= .5;
            S.notifications.shade(shouldOpen);
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
        window.addEventListener("blur", end);
        shade.addEventListener("lostpointercapture", end, {
            once: true
        });
    }
    S.notifications = {
        init: function() {
            shade = S.$("#shade");
            list = S.$("#noteList");
            count = S.$("#noteCount");
            toast = S.$("#toast");
            toast.setAttribute("aria-hidden", "true");
            setProgress(0);
            S.$("#statusBar").addEventListener("pointerdown", function(event) {
                if (event.target.closest && event.target.closest(".status-bar__gear")) return;
                startDrag(event, isOpen() ? 1 : 0);
            });
            S.$("#pullZone").addEventListener("pointerdown", function(event) {
                startDrag(event, isOpen() ? 1 : 0);
            });
            [ ".shade__grip", ".shade__head", ".shade__foot" ].forEach(function(sel) {
                var el = S.$(sel);
                if (!el) return;
                el.addEventListener("pointerdown", function(event) {
                    if (!isOpen()) return;
                    if (event.target.closest && event.target.closest(".shade__head-action")) return;
                    startDrag(event, 1);
                });
            });
            list.addEventListener("pointerdown", function(event) {
                if (!isOpen()) return;
                if (list.scrollTop > 0) return;
                if (event.target.closest && event.target.closest(".note")) return;
                var startY = event.clientY;
                var startX = event.clientX;
                var engaged = false;
                var pid = event.pointerId;
                function move(moveEvent) {
                    var dy = moveEvent.clientY - startY;
                    var dx = moveEvent.clientX - startX;
                    if (!engaged) {
                        if (dy < -10 && Math.abs(dy) > Math.abs(dx) * 1.4) {
                            engaged = true;
                            window.removeEventListener("pointermove", move);
                            window.removeEventListener("pointerup", cancel);
                            window.removeEventListener("pointercancel", cancel);
                            startDrag({
                                clientY: startY,
                                button: 0,
                                pointerId: pid
                            }, 1);
                            window.dispatchEvent(new PointerEvent("pointermove", {
                                clientY: moveEvent.clientY,
                                pointerId: pid,
                                bubbles: true
                            }));
                        } else if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
                            cancel();
                        }
                    }
                }
                function cancel() {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", cancel);
                    window.removeEventListener("pointercancel", cancel);
                }
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", cancel);
                window.addEventListener("pointercancel", cancel);
            });
            list.addEventListener("pointerdown", function(event) {
                var note = event.target.closest(".note");
                if (!note) return;
                if (note.dataset.persistent === "true") return;
                var startX = event.clientX;
                var dragging = false;
                note.classList.add("is-dragging");
                function move(moveEvent) {
                    var dx = moveEvent.clientX - startX;
                    if (Math.abs(dx) > 6) dragging = true;
                    note.style.transform = "translateX(" + dx + "px)";
                    note.style.opacity = String(Math.max(.2, 1 - Math.abs(dx) / 160));
                }
                function end() {
                    document.removeEventListener("pointermove", move);
                    document.removeEventListener("pointerup", end);
                    var dx = parseFloat(note.style.transform.replace(/[^-\d.]/g, "")) || 0;
                    if (Math.abs(dx) > 64) S.notifications.dismiss(note.dataset.id); else {
                        note.classList.remove("is-dragging");
                        note.style.transform = "";
                        note.style.opacity = "";
                    }
                }
                document.addEventListener("pointermove", move);
                document.addEventListener("pointerup", end);
            });
        },
        isOpen,
        shade: function(open) {
            open = !!open;
            var wasOpen = shade.classList.contains("is-open");
            var targetProgress = open ? 1 : 0;
            var currentProgress = parseFloat(shade.style.getPropertyValue("--shade-p")) || 0;
            var stateChanged = open !== wasOpen;
            if (!stateChanged && currentProgress === targetProgress) return;
            shade.classList.toggle("is-open", open);
            setProgress(targetProgress);
            if (stateChanged) {
                S.haptic(12);
                S.notifications.render();
                S.status.alert(open ? false : notes.length > 0);
            }
        },
        push: function(note) {
            var item = {
                id: "n" + Date.now() + "-" + ++sequence,
                type: note.type || "message",
                title: note.title || "Aviso",
                text: note.text || "",
                time: S.time(),
                createdAt: Date.now(),
                creepy: !!note.creepy,
                icon: note.icon || "chat",
                accent: note.accent || "var(--app-mensagens)",
                app: note.app || null,
                page: note.page || null,
                persistent: !!note.persistent,
                tag: note.tag || null
            };
            notes.unshift(item);
            if (notes.length > 24) {
                for (var i = notes.length - 1; i >= 0; i--) {
                    if (!notes[i].persistent) {
                        notes.splice(i, 1);
                        break;
                    }
                }
            }
            S.notifications.render();
            S.notifications.toast(item);
            S.status.alert(true);
            S.haptic(18);
            if (S.lock.isLocked()) S.lock.render();
        },
        dismiss: function(id) {
            if (notes.some(function(note) {
                return note.id === id && note.persistent;
            })) return;
            var node = list.querySelector('.note[data-id="' + id + '"]');
            notes = notes.filter(function(note) {
                return note.id !== id;
            });
            if (!node) return S.notifications.render();
            node.classList.add("is-leaving");
            setTimeout(S.notifications.render, 240);
        },
        dismissApp: function(appId) {
            var before = notes.length;
            notes = notes.filter(function(note) {
                return note.app !== appId || note.persistent;
            });
            if (notes.length === before) return;
            S.notifications.render();
            S.status.alert(notes.length > 0);
            if (S.lock.isLocked()) S.lock.render();
        },
        clear: function() {
            notes = notes.filter(function(note) {
                return note.persistent;
            });
            S.notifications.render();
            S.status.alert(notes.length > 0);
            if (S.lock.isLocked()) S.lock.render();
        },
        count: function() {
            return notes.length;
        },
        all: function() {
            return notes.slice();
        },
        resolve: function(tag) {
            notes = notes.filter(function(note) {
                return note.tag !== tag;
            });
            S.notifications.render();
            S.status.alert(notes.length > 0);
            if (S.lock.isLocked()) S.lock.render();
        },
        open: function(id) {
            if (S.notifications.wasDragged()) return;
            var note = notes.find(function(item) {
                return item.id === id;
            });
            if (!note) {
                S.notifications.shade(true);
                return;
            }
            if (!note.app) {
                S.notifications.dismiss(note.id);
                S.notifications.shade(true);
                return;
            }
            if (S.device.isUnavailable()) return;
            finishToast();
            if (S.lock.isLocked()) {
                pendingApp = note;
                S.notifications.shade(false);
                S.lock.openPasscode();
                return;
            }
            S.notifications.shade(false);
            openDestination(note);
        },
        openPending: function() {
            if (!pendingApp) return;
            if (S.lock.isLocked() || S.device.isUnavailable()) return;
            var app = pendingApp;
            pendingApp = null;
            openDestination(app);
        },
        node: function(note, index) {
            var icon = S.el("div", {
                className: "note__icon"
            });
            fillIcon(icon, note);
            return S.el("div", {
                className: "note" + (!note.createdAt || Date.now() - note.createdAt < 700 ? " is-entering" : ""),
                dataset: {
                    id: note.id,
                    persistent: String(!!note.persistent),
                    action: "open-note"
                },
                style: "--note-accent:" + note.accent + ";animation-delay:" + (index || 0) * 40 + "ms"
            }, [ icon, S.el("div", {
                className: "note__body"
            }, [ S.el("div", {
                className: "note__title"
            }, [ S.el("span", {
                text: note.title
            }), S.el("span", {
                className: "note__time",
                text: note.time
            }) ]), S.el("div", {
                className: "note__text" + (note.creepy ? " is-creepy" : ""),
                text: note.text
            }) ]) ]);
        },
        render: function() {
            toastQueue = toastQueue.filter(function(note) {
                return notes.some(function(item) {
                    return item.id === note.id;
                });
            });
            if (activeToast && !notes.some(function(note) {
                return note.id === activeToast.id;
            })) finishToast();
            var positions = {};
            Object.keys(rendered).forEach(function(id) {
                var card = rendered[id];
                if (card.getBoundingClientRect) positions[id] = card.getBoundingClientRect().top;
            });
            list.innerHTML = "";
            count.textContent = notes.length + (notes.length === 1 ? " alerta" : " alertas");
            S.status.notes(notes);
            var apps = {};
            Object.keys(badges).forEach(function(app) {
                apps[app] = true;
            });
            notes.forEach(function(note) {
                if (note.app) apps[note.app] = true;
            });
            Object.keys(notificationBadges).forEach(function(app) {
                apps[app] = true;
            });
            notificationBadges = {};
            notes.forEach(function(note) {
                if (note.app) notificationBadges[note.app] = (notificationBadges[note.app] || 0) + 1;
            });
            Object.keys(apps).forEach(function(app) {
                drawBadge(app);
            });
            if (!notes.length) {
                rendered = {};
                list.appendChild(S.el("div", {
                    className: "shade__empty",
                    text: "Nenhum aviso recente."
                }));
                return;
            }
            var next = {};
            var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            notes.forEach(function(note, index) {
                var card = rendered[note.id];
                if (card) card.classList.remove("is-entering"); else card = S.notifications.node(note, index);
                next[note.id] = card;
                list.appendChild(card);
                if (!reduced && card.animate && positions[note.id] !== undefined) {
                    var offset = positions[note.id] - card.getBoundingClientRect().top;
                    if (offset) card.animate([ {
                        transform: "translateY(" + offset + "px)"
                    }, {
                        transform: "translateY(0)"
                    } ], {
                        duration: 420,
                        easing: "cubic-bezier(.22,1,.36,1)"
                    });
                }
            });
            rendered = next;
        },
        toast: function(note) {
            if (activeToast && activeToast.id === note.id) return;
            if (toastQueue.some(function(item) {
                return item.id === note.id;
            })) return;
            toastQueue.push(note);
            showNextToast();
        },
        setBadge: function(appId, value) {
            value = Math.max(0, Number(value) || 0);
            badges[appId] = value;
            drawBadge(appId);
        },
        badgeCount: function(appId) {
            return Math.max(badges[appId] || 0, notificationBadges[appId] || 0);
        },
        wasDragged: function() {
            return Date.now() - draggedAt < 260;
        }
    };
})(window.Celular = window.Celular || {});