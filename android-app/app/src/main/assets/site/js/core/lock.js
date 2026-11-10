(function(S) {
    "use strict";
    var VIEW = 300;
    var GAP = 100;
    var EDGE = 50;
    var SWITCH = 56;
    var FLICK = 220;
    var lockEl = null;
    var screenEl = null;
    var clockEl = null;
    var dateEl = null;
    var listEl = null;
    var padEl = null;
    var fillEl = null;
    var lineEl = null;
    var hintEl = null;
    var keypadEl = null;
    var keypadScreen = null;
    var keypadNote = null;
    var updateEl = null;
    var noteTimer = 0;
    var unlockGlitchTimers = [];
    var dots = [];
    var locked = true;
    var drawing = false;
    var path = [];
    var pointer = {
        x: 0,
        y: 0
    };
    var resetTimer = 0;
    var typed = "";
    var passcode = false;
    var accepted = false;
    var updating = false;
    var hasUnlocked = false;
    var UNLOCKED_KEY = "celular:system-unlocked";
    function loadUnlocked() {
        try {
            return window.localStorage.getItem(UNLOCKED_KEY) === "true";
        } catch (error) {
            return false;
        }
    }
    function saveUnlocked() {
        try {
            window.localStorage.setItem(UNLOCKED_KEY, "true");
        } catch (error) {}
    }
    function centers() {
        var points = [];
        for (var row = 0; row < 3; row++) {
            for (var col = 0; col < 3; col++) {
                points.push({
                    x: EDGE + col * GAP,
                    y: EDGE + row * GAP
                });
            }
        }
        return points;
    }
    function draw() {
        var pts = centers();
        var marks = path.map(function(i) {
            return pts[i];
        });
        var tail = drawing ? [ pointer ] : [];
        var all = marks.concat(tail);
        if (all.length > 0) {
            var d = "M " + all.map(function(p) {
                return p.x + " " + p.y;
            }).join(" L ");
            lineEl.setAttribute("d", d);
        } else {
            lineEl.setAttribute("d", "");
        }
        if (marks.length >= 2) {
            var fillD = "M " + marks.map(function(p) {
                return p.x + " " + p.y;
            }).join(" L ");
            if (tail.length) {
                fillD += " L " + tail[0].x + " " + tail[0].y;
            }
            fillD += " L " + marks[0].x + " " + marks[0].y + " Z";
            fillEl.setAttribute("d", fillD);
        } else {
            fillEl.setAttribute("d", "");
        }
        dots.forEach(function(dot, index) {
            dot.classList.toggle("is-on", path.indexOf(index) >= 0);
        });
    }
    function reset() {
        path = [];
        drawing = false;
        draw();
    }
    function say(message, wrong) {
        hintEl.textContent = message || "";
        hintEl.classList.toggle("is-wrong", !!wrong);
    }
    function deny() {
        if (window.sound && window.sound.deny) window.sound.deny();
    }
    function succeed() {
        if (window.sound && window.sound.success) window.sound.success();
    }
    function unlockGlitch() {
        unlockGlitchTimers.forEach(clearTimeout);
        unlockGlitchTimers = [];
        if (!window.glitch || !window.glitch.strike) return;
        window.glitch.hold(true);
        function strike() {
            window.glitch.strike();
            if (window.IntroEffects && window.IntroEffects.siteStrike) {
                window.IntroEffects.siteStrike();
            }
        }
        strike();
        [ 360, 780, 1240 ].forEach(function(delay) {
            unlockGlitchTimers.push(setTimeout(strike, delay));
        });
    }
    function canClose() {
        return path.length >= 4;
    }
    function hitAt(point) {
        var pts = centers();
        var nearest = -1;
        var best = S.LOCK.hit * S.LOCK.hit;
        var expected = null;
        pts.forEach(function(center, index) {
            if (path.indexOf(index) >= 0) {
                var closing = index === path[0] && path.length >= 3 && path[path.length - 1] !== index;
                if (!closing) return;
            }
            var dx = center.x - point.x;
            var dy = center.y - point.y;
            var distance = dx * dx + dy * dy;
            if (distance <= best) {
                best = distance;
                nearest = index;
            }
        });
        return nearest;
    }
    function toLocal(event) {
        var box = padEl.getBoundingClientRect();
        return {
            x: (event.clientX - box.left) / box.width * VIEW,
            y: (event.clientY - box.top) / box.height * VIEW
        };
    }

    function verdict(ok) {
        if (accepted) return;
        clearTimeout(resetTimer);
        padEl.classList.remove("is-wrong", "is-right");
        void padEl.offsetWidth;
        if (ok) {
            accepted = true;
            padEl.classList.add("is-right");
            S.haptic([ 30, 50, 30 ]);
            succeed();
            unlockGlitch();
            say("conectado", false);
            resetTimer = setTimeout(function() {
                S.lock.unlock();
            }, hasUnlocked ? 180 : 2e3);
        } else {
            padEl.classList.add("is-wrong");
            S.haptic([ 40, 60, 40 ]);
            deny();
            say("tente novamente", true);
            resetTimer = setTimeout(function() {
                padEl.classList.remove("is-wrong");
                reset();
                say("");
            }, S.TIMING.lockWrong);
        }
    }
    function tick() {
        var now = new Date;
        clockEl.textContent = S.pad(now.getHours()) + ":" + S.pad(now.getMinutes());
        dateEl.textContent = now.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long"
        }).replace(/^./, function(letter) {
            return letter.toUpperCase();
        });
    }
    function drawKeypad() {
        keypadScreen.textContent = typed || "-";
    }
    function press(digit) {
        if (typed.length >= 10) return;
        typed += digit;
        drawKeypad();
        S.haptic(8);
    }
    function backspace() {
        typed = typed.slice(0, -1);
        drawKeypad();
        S.haptic(8);
    }
    function unknown() {
        typed = "";
        drawKeypad();
        keypadNote.textContent = "número inválido";
        keypadScreen.classList.remove("is-wrong");
        void keypadScreen.offsetWidth;
        keypadScreen.classList.add("is-wrong");
        deny();
        S.haptic([ 30, 50, 30 ]);
        clearTimeout(noteTimer);
        noteTimer = setTimeout(function() {
            keypadNote.textContent = "";
            keypadScreen.classList.remove("is-wrong");
        }, S.TIMING.sosHint);
    }
    function setProgress(value) {
        lockEl.style.setProperty("--lock-drag", String(S.clamp(value, 0, 1)));
    }
    function rubber(value) {
        if (value < 0) return value * .28;
        if (value > 1) return 1 + (value - 1) * .28;
        return value;
    }
    function travel() {
        return lockEl.clientHeight || 640;
    }
    function showPasscode(on) {
        passcode = on;
        lockEl.classList.toggle("is-passcode", on);
        clearTimeout(resetTimer);
        padEl.classList.remove("is-wrong", "is-right");
        say("");
        reset();
    }
    S.lock = {
        init: function() {
            hasUnlocked = loadUnlocked();
            lockEl = S.$("#lock");
            screenEl = S.$("#screen");
            clockEl = S.$("#lockClock");
            dateEl = S.$("#lockDate");
            listEl = S.$("#lockList");
            padEl = S.$("#lockPad");
            fillEl = S.$("#lockFill");
            lineEl = S.$("#lockLine");
            hintEl = S.$("#lockHint");
            keypadEl = S.$("#keypad");
            keypadScreen = S.$("#keypadScreen");
            keypadNote = S.$("#keypadNote");
            updateEl = S.$("#update");
            centers().forEach(function(center) {
                var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                dot.setAttribute("class", "lock__dot");
                dot.setAttribute("cx", center.x);
                dot.setAttribute("cy", center.y);
                dot.setAttribute("r", 13);
                padEl.querySelector(".lock__grid").appendChild(dot);
                dots.push(dot);
            });
            lockEl.addEventListener("pointerdown", function(event) {
                if (event.button !== undefined && event.button > 0) return;
                if (keypadEl.classList.contains("is-open")) return;
                if (event.target.closest && event.target.closest(".lock__pad")) return;
                if (event.target.closest && event.target.closest(".lock__sos")) return;
                var startY = event.clientY;
                var base = passcode ? 1 : 0;
                var moved = false;
                var lastY = startY;
                var lastAt = Date.now();
                var speed = 0;
                var delta = 0;
                lockEl.classList.add("is-dragging");
                try {
                    lockEl.setPointerCapture(event.pointerId);
                } catch (error) {}
                function move(moveEvent) {
                    delta = moveEvent.clientY - startY;
                    if (Math.abs(delta) > 6) moved = true;
                    var now = Date.now();
                    if (now > lastAt) speed = (moveEvent.clientY - lastY) / (now - lastAt);
                    lastY = moveEvent.clientY;
                    lastAt = now;
                    setProgress(rubber(base - delta / travel()));
                }
                function end() {
                    lockEl.classList.remove("is-dragging");
                    lockEl.removeEventListener("pointermove", move);
                    lockEl.removeEventListener("pointerup", end);
                    lockEl.removeEventListener("pointercancel", end);
                    if (!moved) {
                        setProgress(base);
                        return;
                    }
                    var reach = -delta - speed * FLICK;
                    var open = reach > (base ? -SWITCH : SWITCH);
                    setProgress(open ? 1 : 0);
                    showPasscode(open);
                    S.haptic(open ? 12 : 8);
                }
                lockEl.addEventListener("pointermove", move);
                lockEl.addEventListener("pointerup", end);
                lockEl.addEventListener("pointercancel", end);
            });
            padEl.addEventListener("pointerdown", function(event) {
                if (event.button !== undefined && event.button > 0) return;
                event.preventDefault();
                drawing = true;
                pointer = toLocal(event);
                padEl.classList.remove("is-wrong", "is-right");
                say("solte para conferir");
                var first = hitAt(pointer);
                if (first >= 0) path.push(first);
                draw();
                try {
                    padEl.setPointerCapture(event.pointerId);
                } catch (error) {}
            });
            padEl.addEventListener("pointermove", function(event) {
                if (!drawing) return;
                pointer = toLocal(event);
                var next = hitAt(pointer);
                if (next >= 0) {
                    path.push(next);
                    S.haptic(5);
                }
                draw();
            });
            async function release() {
                if (!drawing) return;
                drawing = false;
                if(path.length){try{var result=await S.request('pattern',{path:path.slice()});verdict(result.ok===true);}catch(e){verdict(false);}} else draw();
            }
            padEl.addEventListener("pointerup", release);
            padEl.addEventListener("pointercancel", release);
            padEl.addEventListener("pointerleave", function() {
                if (drawing) draw();
            });
            drawKeypad();
            tick();
            setInterval(tick, 1e3);
            S.lock.lock();
        },
        isLocked: function() {
            return locked;
        },
        lock: function() {
            locked = true;
            updating = false;
            accepted = false;
            clearTimeout(resetTimer);
            showPasscode(false);
            keypadEl.classList.remove("is-open");
            typed = "";
            drawKeypad();
            lockEl.classList.add("is-locked");
            screenEl.classList.add("is-locked");
            if (updateEl) updateEl.classList.remove("is-on", "is-completing", "is-error");
            S.lock.render();
        },
        unlock: function() {
            if (!locked || updating) return;
            if (S.device && S.device.isUnavailable()) return;
            if (hasUnlocked) {
                S.lock.finishUpdate();
                return;
            }
            updating = true;
            say("atualizando sistema", false);
            if (S.update && S.update.show) S.update.show(); else S.lock.finishUpdate();
        },
        finishUpdate: function() {
            if (S.device && S.device.isUnavailable()) return;
            hasUnlocked = true;
            saveUnlocked();
            clearTimeout(resetTimer);
            updating = false;
            locked = false;
            accepted = false;
            lockEl.classList.remove("is-locked");
            screenEl.classList.remove("is-locked");
            if (updateEl) updateEl.setAttribute("aria-hidden", "true");
            S.lock.render();
            if (S.home && S.home.reveal) S.home.reveal();
            if (S.notifications.openPending) S.notifications.openPending();
            if (S.bus && S.bus.emit) S.bus.emit("system:unlocked");
            if(S.network&&S.network.sync){S.network.sync('mensagens');S.network.sync('y');}
            S.haptic(24);
        },
        render: function() {
            if (!listEl) return;
            var notes = locked ? S.notifications.all() : [];
            listEl.innerHTML = "";
            if (!notes.length) {
                listEl.appendChild(S.el("div", {
                    className: "lock__empty",
                    text: "Nenhum aviso."
                }));
                return;
            }
            notes.forEach(function(note, index) {
                var card = S.notifications.node(note, index);
                card.classList.add("is-locked");
                listEl.appendChild(card);
            });
        },
        openPasscode: function() {
            if (passcode) return;
            S.haptic(12);
            setProgress(1);
            showPasscode(true);
        },
        closePasscode: function() {
            if (!passcode) return;
            S.haptic(8);
            setProgress(0);
            showPasscode(false);
        },
        openKeypad: function() {
            S.haptic(12);
            keypadEl.classList.add("is-open");
        },
        closeKeypad: function() {
            clearTimeout(noteTimer);
            keypadNote.textContent = "";
            keypadScreen.classList.remove("is-wrong");
            keypadEl.classList.remove("is-open");
            typed = "";
            drawKeypad();
        },
        type: press,
        backspace,
        call: async function() {
            if (!typed) return;
            var number = typed;
            if (!await S.emergencyCalls.dial(number)) {
                unknown();
                return;
            }
            S.lock.closeKeypad();
        }
    };
})(window.Celular = window.Celular || {});
