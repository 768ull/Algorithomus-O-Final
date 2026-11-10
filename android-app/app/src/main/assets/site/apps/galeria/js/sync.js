(function(M) {
    "use strict";
    var pending = false;
    var last = JSON.stringify(M.catalog);
    M.sync = {
        check: function() {
            if (pending || document.hidden) return;
            pending = true;
            var script = document.createElement("script");
            var timer;
            function finish() {
                clearTimeout(timer);
                script.remove();
                pending = false;
            }
            script.src = "js/catalog.js?refresh=" + Date.now();
            script.onload = function() {
                var next = JSON.stringify(M.catalog);
                if (next !== last) {
                    last = next;
                    M.data.refresh();
                    M.main.refresh();
                }
                finish();
            };
            script.onerror = finish;
            timer = setTimeout(finish, 5e3);
            document.head.appendChild(script);
        },
        init: function() {
            setInterval(M.sync.check, 3e4);
            window.addEventListener("focus", M.sync.check);
            document.addEventListener("visibilitychange", M.sync.check);
        }
    };
})(window.Gal = window.Gal || {});
