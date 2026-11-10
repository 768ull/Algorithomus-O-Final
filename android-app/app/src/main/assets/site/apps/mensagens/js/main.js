(function(M) {
    "use strict";
    M.focused = false;
    var phaseFourCaptureMode = false;
    function isPhaseFourCapture() {
        try {
            return window.parent !== window && (
                window.parent.document.documentElement.classList.contains("is-phase-four-capture") ||
                window.parent.document.documentElement.classList.contains("is-lock-capture")
            );
        } catch (error) {
            return false;
        }
    }
    function enablePhaseFourCapture() {
        phaseFourCaptureMode = true;
        document.documentElement.classList.add("is-phase-four-capture");
        M.data.setPhaseFourCaptureMode(true);
    }
    M.main = {
        init: function() {
            M.list.init();
            M.chat.init();
            M.profile.init();
            document.addEventListener("click", function(event) {
                var target = event.target.closest ? event.target.closest('[data-action="close-chat"]') : null;
                if (target) M.chat.close();
            });
            M.host.on(function(message) {
                if (message.type === "app:state") return M.main.onState(message.name);
                if (message.type !== "app:event") return;
                switch (message.name) {
                  case "phase-four-capture":
                    enablePhaseFourCapture();
                    break;

                  case "wifi-state":
                    setInternet(message.payload && message.payload.connected);
                    break;

                  case "device-audio":
                    M.chat.setDeviceAudio(message.payload.volume, message.payload.muted);
                    break;

                  case "scenario":
                    if (phaseFourCaptureMode || isPhaseFourCapture()) enablePhaseFourCapture();
                    M.data.load().then(async function(){if(phaseFourCaptureMode)await M.data.setPhaseFourMotherConversation();M.list.render();M.main.publishUnread();}).catch(function(){setInternet(false);});
                    break;

                  case "inject-message":
                    M.chat.receive(message.payload.contact, message.payload.text, message.payload.creepy);
                    break;

                  case "back":
                    {
                        if (M.profile.isOpen()) {
                            M.host.emit("back-result", {
                                handled: true
                            });
                            M.profile.close();
                        } else {
                            var handled = M.chat.isOpen();
                            M.host.emit("back-result", {
                                handled
                            });
                            if (handled) M.chat.close();
                        }
                        break;
                    }
                }
            });
            M.host.ready();
        },
        onState: function(state) {
            M.focused = state === "open";
            if (M.focused && M.chat.isOpen()) M.chat.close();
            if (M.focused && M.chat.resetSpamLimit) M.chat.resetSpamLimit();
        },
        publishUnread: function() {
            M.host.emit("unread", {
                count: M.data.ready() ? M.data.unreadTotal() : 0
            });
        }
    };
    function setInternet(connected) {
        var offline = M.$("#offline");
        var app = M.$("#app");
        offline.hidden = !!connected;
        app.hidden = !connected;
    }
    document.addEventListener("DOMContentLoaded", function() {
        M.main.init();
    });
})(window.Msg = window.Msg || {});
