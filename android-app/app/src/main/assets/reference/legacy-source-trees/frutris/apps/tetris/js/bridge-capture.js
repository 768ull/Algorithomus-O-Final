(function (window, document) {
    "use strict";

    if (window.parent === window) return;

    document.addEventListener("pointerdown", function (event) {
        if (event.target !== document.getElementById("gameCanvas")) return;
        window.parent.postMessage({
            type: "frutris-fracture-click",
            x: event.clientX / window.innerWidth,
            y: event.clientY / window.innerHeight
        }, "*");
    }, true);

    window.addEventListener("message", function (event) {
        if (event.source !== window.parent || !event.data || event.data.type !== "frutris-capture-request") return;

        var image = "";
        var canvas = document.getElementById("gameCanvas");
        try {
            if (canvas) image = canvas.toDataURL("image/png");
        } catch (error) {
            // Um canvas indisponível não deve impedir que o app responda ao shell.
        }
        window.parent.postMessage({
            type: "frutris-capture",
            requestId: event.data.requestId,
            image: image
        }, "*");
    });

    window.parent.postMessage({ type: "frutris-ready" }, "*");
})(window, document);
