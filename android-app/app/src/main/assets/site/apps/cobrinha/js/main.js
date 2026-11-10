(function(C) {
    "use strict";
    function boot() {
        var canvas = document.getElementById("board");
        C.render.init(canvas, document.getElementById("stage"));
        C.ui.init();
        C.ui.bindActions();
        C.ui.showStart();
        C.ui.sync();
        C.input.bind(canvas);
        window.addEventListener("resize", function() {
            C.render.measure();
        });
        C.resetState();
        C.engine.start();
        C.host.ready();
    }
    document.addEventListener("DOMContentLoaded", boot);
})(window.Cobrinha = window.Cobrinha || {});