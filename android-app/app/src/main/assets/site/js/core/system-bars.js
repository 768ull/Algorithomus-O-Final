(function(S) {
    "use strict";
    var screen;
    var themes = {};
    var defaults = {
        mensagens: "#1f2c34",
        y: "#16181c",
        telefone: "#12121a",
        galeria: "#12121a",
        tetris: "#10121a",
        cobrinha: "#9cae86",
        calculadora: "#14141c",
        configuracoes: "#12121a"
    };
    function opaqueColor(value) {
        return typeof value === "string" && (/^#[a-f0-9]{6}$/i.test(value) || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(value));
    }
    function paint(id) {
        var active = !!(id && S.APP[id]);
        screen.classList.toggle("is-app-active", active);
        if (!active) {
            screen.style.removeProperty("--active-app-bg");
            screen.style.removeProperty("--active-app-text");
            return;
        }
        var theme = themes[id] || {
            background: defaults[id] || "#12121a",
            text: id === "cobrinha" ? "#26331f" : "#f2f2f7"
        };
        screen.style.setProperty("--active-app-bg", theme.background);
        screen.style.setProperty("--active-app-text", theme.text);
    }
    S.systemBars = {
        init: function() {
            screen = S.$("#screen");
            S.bus.on("navigation:changed", function(event) {
                paint(event.id);
            });
            S.bus.on("app:event", function(event) {
                if (event.name !== "system-bars-theme" || !S.APP[event.id]) return;
                var payload = event.payload || {};
                if (!opaqueColor(payload.background) || !opaqueColor(payload.text)) return;
                themes[event.id] = {
                    background: payload.background,
                    text: payload.text
                };
                if (S.nav.current() === event.id) paint(event.id);
            });
            paint(S.nav.current());
        }
    };
})(window.Celular = window.Celular || {});