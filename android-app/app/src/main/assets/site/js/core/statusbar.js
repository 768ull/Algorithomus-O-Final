(function(S) {
    "use strict";
    var clock = null;
    var icons = null;
    var notesEl = null;
    var fill = null;
    var track = null;
    var island = null;
    var netSlot = null;
    var signalSlot = null;
    var muteSlot = null;
    var pctEl = null;
    var level = 100;
    var pendingNotes = [];
    var signalFluctuationTimer = 0;
    function setSignalBars(count) {
        if (signalSlot) {
            Array.prototype.forEach.call(signalSlot.querySelectorAll("rect"), function(bar, index) {
                bar.classList.toggle("is-signal-on", index < count);
            });
        }
        if (netSlot) {
            var waves = netSlot.querySelector(".wifi-waves");
            if (waves) Array.prototype.forEach.call(waves.children, function(bar, index) {
                bar.classList.toggle("is-signal-on", index >= waves.children.length - count);
            });
        }
    }
    function fluctuateSignal() {
        setSignalBars(Math.floor(Math.random() * 5));
        signalFluctuationTimer = setTimeout(fluctuateSignal, 250 + Math.random() * 650);
    }
    function signalIcon() {
        return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + '<rect x="1" y="16" width="3" height="4" rx=".7"/>' + '<rect x="5" y="13" width="3" height="7" rx=".7"/>' + '<rect x="9" y="10" width="3" height="10" rx=".7"/>' + '<rect x="13" y="7" width="3" height="13" rx=".7"/>' + '<rect x="17" y="4" width="3" height="16" rx=".7"/></svg>';
    }
    function wifiOffIcon() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + '<g class="wifi-waves"><path d="M1.42 9a16 16 0 0 1 21.16 0"/>' + '<path d="M5 12.55a11 11 0 0 1 14 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>' + '<path d="M12 20h.01"/></g><path class="wifi-slash" d="M2 2l20 20"/></svg>';
    }
    function drawBattery() {
        if (!fill || !track) return;
        fill.style.width = level + "%";
        if (pctEl) pctEl.textContent = level + "%";
        track.classList.toggle("is-low", level <= 20);
        track.classList.toggle("is-full", level === 100);
    }
    S.status = {
        init: function() {
            clock = S.$("#clock");
            icons = S.$("#statusIcons");
            notesEl = S.$("#statusNotes");
            track = S.$(".status-bar__battery-track");
            fill = S.$(".status-bar__battery-fill");
            island = S.$("#island");
            icons.innerHTML = '<span class="status-bar__signal" title="Chip: sem sinal">' + signalIcon() + "</span>" + '<span class="status-bar__net is-off" title="Sem internet">' + wifiOffIcon() + '<span class="status-bar__wifi-warning" aria-hidden="true">!</span></span>' + '<span class="status-bar__mute" title="Silencioso" aria-label="Celular no mudo" hidden>' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m17 9 5 6m0-6-5 6"/></svg></span>' + '<div class="status-bar__battery">' + '<span class="status-bar__battery-pct" id="batteryPct">100%</span>' + '<span class="status-bar__battery-track"><span class="status-bar__battery-fill"></span></span>' + "</div>";
            track = S.$(".status-bar__battery-track");
            fill = S.$(".status-bar__battery-fill");
            netSlot = S.$(".status-bar__net");
            signalSlot = S.$(".status-bar__signal");
            muteSlot = S.$(".status-bar__mute");
            pctEl = S.$("#batteryPct");
            drawBattery();
            if (S.device && S.device.isMuted) S.status.muted(S.device.isMuted());
            function tick() {
                clock.innerHTML = S.clockText();
            }
            tick();
            setInterval(tick, 1e3);
            if (window.ResizeObserver) {
                var observer = new window.ResizeObserver(function() {
                    S.status.notes(pendingNotes);
                });
                observer.observe(S.$("#screen"));
                observer.observe(clock);
            } else if (window.addEventListener) {
                window.addEventListener("resize", function() {
                    S.status.notes(pendingNotes);
                });
            }
        },
        alert: function(on) {
            island.classList.toggle("is-alert", !!on);
        },
        wifi: function(on) {
            if (netSlot) netSlot.classList.toggle("is-off", !on);
        },
        muted: function(on) {
            if (muteSlot) muteSlot.hidden = !on;
        },
        connection: function(connected) {
            if (netSlot) {
                netSlot.classList.toggle("is-connected", connected);
                netSlot.title = connected ? "Wi-Fi: 100%" : "Sem internet";
            }
            if (signalSlot) {
                signalSlot.classList.toggle("is-connected", connected);
                signalSlot.title = connected ? "Chip: 5 de 5 barras" : "Chip: sem sinal";
            }
        },
        wifiProblem: function(on) {
            if (!netSlot) return;
            netSlot.classList.toggle("has-problem", !!on);
            if (signalSlot) signalSlot.classList.toggle("has-problem", !!on);
            clearTimeout(signalFluctuationTimer);
            signalFluctuationTimer = 0;
            if (on) fluctuateSignal(); else setSignalBars(5);
            netSlot.title = on ? "Wi-Fi conectado, mas a internet está lenta" : netSlot.classList.contains("is-connected") ? "Wi-Fi: 100%" : "Sem internet";
        },
        notes: function(notes) {
            if (!notesEl) return;
            pendingNotes = notes;
            var groups = [];
            notes.forEach(function(note) {
                var found = null;
                for (var i = 0; i < groups.length; i++) {
                    if (groups[i].key === (note.app || note.icon)) {
                        found = groups[i];
                        break;
                    }
                }
                if (found) found.total += 1; else groups.push({
                    key: note.app || note.icon,
                    app: note.app,
                    icon: note.icon,
                    accent: note.accent,
                    total: 1
                });
            });
            notesEl.classList.toggle("is-on", groups.length > 0);
            var available = 54;
            if (island.getBoundingClientRect && notesEl.getBoundingClientRect) {
                var screen = S.$("#screen");
                var scale = screen && screen.offsetWidth ? screen.getBoundingClientRect().width / screen.offsetWidth : 1;
                scale = scale || 1;
                available = Math.max(0, (island.getBoundingClientRect().left - notesEl.getBoundingClientRect().left) / scale - 10);
            }
            var capacity = Math.max(0, Math.floor((available + 3) / 18));
            var limit = groups.length > capacity ? Math.max(0, Math.floor((available - 18) / 18)) : capacity;
            var shown = groups.slice(0, limit);
            var hidden = groups.length - shown.length;
            notesEl.style.setProperty("max-width", available + "px");
            notesEl.innerHTML = "";
            shown.forEach(function(group) {
                var app = S.APP && S.APP[group.app];
                var node = S.el("span", {
                    className: "status-note",
                    title: (app && app.name || group.app || "Avisos") + ": " + group.total
                });
                if (app && app.image) {
                    node.appendChild(S.el("img", {
                        src: app.image,
                        alt: "",
                        attrs: {
                            draggable: "false"
                        },
                        on: {
                            error: function() {
                                node.innerHTML = S.icon(group.icon);
                            }
                        }
                    }));
                } else node.innerHTML = S.icon(group.icon);
                notesEl.appendChild(node);
            });
            if (hidden) notesEl.appendChild(S.el("span", {
                className: "status-note is-more",
                text: "...",
                title: hidden + " outros aplicativos com notificações",
                attrs: {
                    "aria-label": hidden + " outros aplicativos com notificações"
                }
            }));
        }
    };
})(window.Celular = window.Celular || {});