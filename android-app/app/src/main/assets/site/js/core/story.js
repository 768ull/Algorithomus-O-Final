(function(S) {
    "use strict";
    var tetrisTimer = 0;
    var momCalled = false;
    function inject(contactId, text, creepy) {
        S.apps.ensure("mensagens");
        S.bridge.emit("mensagens", "inject-message", {
            contact: contactId,
            text,
            creepy: !!creepy
        });
    }
    S.story = {
        init: function() {
            S.bus.on("app:opened", function(event) {
                if (event.id === "tetris") S.story.armTetris();
            });
            S.bus.on("app:closed", function(event) {
                if (event.id === "tetris") clearTimeout(tetrisTimer);
            });
            S.bus.on("effect", function(payload) {
                if (payload && payload.name === "corrupt") S.story.corrupt();
            });
        },
        armTetris: function() {
            clearTimeout(tetrisTimer);
            if (S.INCOMING_CALLS_ENABLED === false) return;
            if (momCalled) return;
            tetrisTimer = setTimeout(function() {
                momCalled = true;
                S.bridge.emit("tetris", "pause", null);
                inject("mae", "Filho, me atende rápido! Tem algo aqui fora...");
                setTimeout(function() {
                    S.calls.ring("mae");
                }, S.TIMING.messageToCall);
            }, S.TIMING.tetrisTriggers);
        },
        corrupt: function() {
            var device = S.$("#device");
            device.classList.add("is-glitching");
            S.haptic([ 50, 60, 140 ]);
            setTimeout(function() {
                device.classList.remove("is-glitching");
                S.nav.home();
            }, S.TIMING.glitch);
        }
    };
})(window.Celular = window.Celular || {});