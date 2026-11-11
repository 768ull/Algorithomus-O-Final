(function(T) {
    T.dom = {};
    var gameArea = document.getElementById("gameArea");
    T.initDom = function() {
        var canvas = document.getElementById("gameCanvas");
        var nextCanvas = document.getElementById("nextCanvas");
        var holdCanvas = document.getElementById("holdCanvas");
        T.dom = {
            canvas,
            ctx: canvas.getContext("2d"),
            entryCanvas: document.getElementById("entryCanvas"),
            entryCtx: document.getElementById("entryCanvas").getContext("2d"),
            nextCanvas,
            nextCtx: nextCanvas.getContext("2d"),
            holdCanvas,
            holdCtx: holdCanvas.getContext("2d"),
            score: document.getElementById("score"),
            level: document.getElementById("level"),
            levelPanel: document.getElementById("levelPanel"),
            levelStatus: document.getElementById("levelStatus"),
            celebrationToast: document.getElementById("celebrationToast"),
            bestScore: document.getElementById("bestScore"),
            finalRecord: document.getElementById("finalRecord"),
            newRecord: document.getElementById("newRecord"),
            finalScore: document.getElementById("finalScore"),
            modal: document.getElementById("gameOverModal"),
            gameArea,
            gameHud: document.getElementById("gameHud"),
            helpBtn: document.getElementById("helpBtn"),
            coach: document.getElementById("tutorialCoach"),
            coachCanvas: document.getElementById("coachCanvas"),
            coachName: document.getElementById("coachName"),
            tutorialTools: document.getElementById("tutorialTools"),
            tutorialHud: document.getElementById("tutorialHud"),
            tutorialStep: document.getElementById("tutorialStep"),
            tutorialStageName: document.getElementById("tutorialStageName"),
            tutorialProgress: document.getElementById("tutorialProgress")
        };
    };
    function boot() {
        T.initDom();
        document.body.classList.toggle("reduce-motion", T.prefersReducedMotion());
        T.ui.loadRecord();
        T.audio.init();
        T.ui.bindActions();
        T.input.bind();
        T.adjustCanvasSizes();
        var layoutRaf = 0;
        function scheduleLayout() {
            if (layoutRaf) return;
            layoutRaf = requestAnimationFrame(function() {
                layoutRaf = 0;
                T.adjustCanvasSizes();
                T.ui.updatePanels();
                T.tutorial.reposition();
            });
        }
        window.addEventListener("resize", scheduleLayout);
        if (window.ResizeObserver) {
            var observer = new ResizeObserver(scheduleLayout);
            observer.observe(gameArea);
            observer.observe(T.dom.gameHud);
        }
        T.startNewGame();
        if (!T.tutorial.hasSeen()) {
            document.body.classList.add("first-tutorial");
            T.tutorial.requireCompletion();
            T.tutorial.start();
        }
        T.host.ready();
    }
    document.addEventListener("DOMContentLoaded", boot);
})(window.Tetris = window.Tetris || {});