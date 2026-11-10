(function() {
    var intro = document.getElementById("tetrisIntro");
    var tiles = document.getElementById("introTiles");
    var returnButton = document.getElementById("recordReturn");
    var initialTimer = 0;
    var showTimer = 0;
    var finishTimer = 0;
    var finishRecord = null;
    window.Tetris = window.Tetris || {};
    window.Tetris.intro = window.Tetris.intro || {};
    var colors = [ "#55d6be", "#f4d35e", "#ee6c4d", "#8d78e8", "#56a8f5", "#f28ab2", "#8bd450" ];
    var reducedMotion = window.Tetris.prefersReducedMotion();
    if (!intro || !tiles) return;
    for (var i = 0; i < (reducedMotion ? 0 : 108); i++) {
        var tile = document.createElement("i");
        tile.className = "intro-tile";
        tile.style.setProperty("--tile-color", colors[(i * 5 + Math.floor(i / 9)) % colors.length]);
        tile.style.setProperty("--tile-delay", Math.floor(i / 9) * .018 + i % 9 * .012 + "s");
        tiles.appendChild(tile);
    }
    initialTimer = window.setTimeout(function() {
        if (intro.parentNode) intro.remove();
    }, reducedMotion ? 0 : 2500);
    window.Tetris.intro.playRecordCelebration = function(onFinish) {
        window.clearTimeout(initialTimer);
        window.clearTimeout(showTimer);
        window.clearTimeout(finishTimer);
        finishRecord = onFinish;
        if (!intro.parentNode) document.body.appendChild(intro);
        intro.classList.remove("record-leave", "show-card");
        intro.classList.add("record-intro");
        intro.setAttribute("aria-hidden", "false");
        tiles.textContent = "";
        for (var i = 0; i < 108; i++) {
            var tile = document.createElement("i");
            tile.className = "intro-tile";
            tile.style.setProperty("--tile-color", colors[(i * 5 + Math.floor(i / 9)) % colors.length]);
            tile.style.setProperty("--tile-delay", Math.floor(i / 9) * .006 + i % 9 * .004 + "s");
            tiles.appendChild(tile);
        }
        void intro.offsetWidth;
        showTimer = window.setTimeout(function() {
            intro.classList.add("show-card");
            finishTimer = window.setTimeout(closeRecordCelebration, 4200);
        }, reducedMotion ? 0 : 540);
    };
    function closeRecordCelebration() {
        if (!finishRecord) return;
        window.clearTimeout(showTimer);
        window.clearTimeout(finishTimer);
        var done = finishRecord;
        finishRecord = null;
        intro.classList.add("record-leave");
        window.setTimeout(function() {
            intro.classList.remove("record-intro", "record-leave", "show-card");
            intro.setAttribute("aria-hidden", "true");
            if (intro.parentNode) intro.remove();
            done();
        }, reducedMotion ? 0 : 900);
    }
    if (returnButton) returnButton.addEventListener("click", closeRecordCelebration);
})();