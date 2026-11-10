(function(M) {
    "use strict";
    var TABS = [ "recentes", "contatos", "discagem" ];
    var pane = null;
    var ink = null;
    var sub = null;
    var current = "recentes";
    var dialNumber = "";
    function renderDialer(target) {
        var display = M.el("div", {
            className: "keypad__screen",
            text: dialNumber || "—"
        });
        var hint = M.el("p", {
            className: "keypad__note"
        });
        var keys = M.el("div", {
            className: "keypad__keys"
        });
        function paint() {
            display.textContent = dialNumber || "—";
        }
        [ [ "1", "" ], [ "2", "abc" ], [ "3", "def" ], [ "4", "ghi" ], [ "5", "jkl" ], [ "6", "mno" ], [ "7", "pqrs" ], [ "8", "tuv" ], [ "9", "wxyz" ], [ "back", "" ], [ "0", "" ], [ "#", "" ] ].forEach(function(entry) {
            var digit = entry[0];
            var back = digit === "back";
            var key = M.el("button", {
                className: "keypad__key",
                attrs: {
                    type: "button",
                    "aria-label": back ? "Apagar" : digit
                },
                on: {
                    click: function() {
                        if (back) dialNumber = dialNumber.slice(0, -1); else if (dialNumber.length < 10) dialNumber += digit;
                        hint.textContent = "";
                        paint();
                    }
                }
            });
            if (back) key.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 5H9.5L3 12l6.5 7H20a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m17 9-5 6M12 9l5 6"/></svg>'; else {
                key.appendChild(M.el("span", {
                    text: digit
                }));
                key.appendChild(M.el("small", {
                    text: entry[1]
                }));
            }
            keys.appendChild(key);
        });
        target.appendChild(M.el("section", {
            className: "phone-keypad",
            attrs: {
                "aria-label": "Teclado de emergência"
            }
        }, [ display, hint, keys, M.el("button", {
            className: "keypad__call",
            attrs: {
                type: "button"
            },
            on: {
                click: function() {
                    if (!dialNumber) return;
                    M.host.emit("sos-dial", {
                        number: dialNumber
                    });
                    hint.textContent = "Chamando…";
                }
            }
        }, [ M.el("span", {
            html: M.PHONE_ICON
        }), M.el("span", {
            text: "Chamar"
        }) ]) ]));
    }
    function renderContacts(target) {
        target.innerHTML = "";
        var contacts = M.data.contacts();
        if (!contacts.length) {
            target.appendChild(M.el("div", {
                className: "pane__empty",
                text: "Os números discados na emergência aparecerão aqui."
            }));
        } else contacts.forEach(function(contact) {
            target.appendChild(M.el("div", {
                className: "contact-row",
                attrs: {
                    role: "button",
                    tabindex: "0",
                    "aria-label": "Ligar para " + contact.name
                },
                on: {
                    click: function() {
                        M.host.emit("sos-dial", {
                            number: contact.number
                        });
                    },
                    keydown: function(event) {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            M.host.emit("sos-dial", {
                                number: contact.number
                            });
                        }
                    }
                }
            }, [ M.el("span", {
                className: "call-row__avatar",
                text: contact.avatar
            }), M.el("span", {
                className: "call-row__info"
            }, [ M.el("div", {
                className: "contact-row__name",
                text: contact.name
            }), M.el("div", {
                className: "contact-row__sub",
                text: contact.number
            }) ]), M.el("button", {
                className: "contact-row__call",
                html: M.PHONE_ICON,
                attrs: {
                    "aria-label": "Ligar para " + contact.name
                },
                on: {
                    click: function(event) {
                        event.stopPropagation();
                        M.host.emit("sos-dial", {
                            number: contact.number
                        });
                    }
                }
            }) ]));
        });
    }
    function renderDialPage(target) {
        target.innerHTML = "";
        renderDialer(target);
    }
    function updateHeader() {
        if (current === "recentes") {
            var total = M.data.logs().length;
            sub.textContent = total ? total + (total === 1 ? " ligação" : " ligações") : "nenhuma ligação";
        } else if (current === "contatos") {
            sub.textContent = M.data.contacts().length + " números discados";
        } else if (current === "discagem") {
            sub.textContent = "teclado numérico";
        }
    }
    function show(tab) {
        current = tab;
        M.$$(".tab").forEach(function(button) {
            button.classList.toggle("is-active", button.dataset.tab === tab);
        });
        ink.style.transform = "translateX(" + TABS.indexOf(tab) * 100 + "%)";
        pane.innerHTML = "";
        pane.scrollTop = 0;
        if (tab === "recentes") M.history.render(pane); else if (tab === "contatos") renderContacts(pane); else if (tab === "discagem") renderDialPage(pane); else renderContacts(pane);
        updateHeader();
    }
    function refresh() {
        show(current);
    }
    M.main = {
        init: function() {
            pane = M.$("#pane");
            ink = M.$("#tabsInk");
            sub = M.$("#barSub");
            document.addEventListener("click", function(event) {
                var target = event.target.closest ? event.target.closest('[data-action="tab"]') : null;
                if (target) show(target.dataset.tab);
            });
            M.host.on(function(message) {
                if (message.type !== "app:event") return;
                if (message.name === "scenario") {
                    M.data.load(message.payload);
                    refresh();
                } else if (message.name === "emergency-contacts") {
                    M.data.loadEmergencyContacts(message.payload);
                    refresh();
                } else if (message.name === "log") {
                    M.data.addLog(message.payload);
                    refresh();
                } else if (message.name === "sos-dial-result") {
                    var result = message.payload || {};
                    if (result.number !== dialNumber) return;
                    var hint = M.$(".phone-keypad .keypad__note");
                    if (result.accepted) dialNumber = ""; else if (hint) hint.textContent = "Número inválido ou linha ocupada.";
                    var display = M.$(".phone-keypad .keypad__screen");
                    if (display) display.textContent = dialNumber || "—";
                }
            });
            show(current);
            M.host.ready();
        }
    };
    document.addEventListener("DOMContentLoaded", function() {
        M.main.init();
    });
})(window.Tel = window.Tel || {});