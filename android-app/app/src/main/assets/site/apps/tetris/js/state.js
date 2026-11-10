(function(T) {
    T.GAME_STATE = {
        PLAYING: "PLAYING",
        GAMEOVER_ANIM: "GAMEOVER_ANIM",
        GAMEOVER: "GAMEOVER"
    };
    T.LAST_ACTION = {
        NONE: "none",
        MOVE: "move",
        ROTATE: "rotate",
        DROP: "drop"
    };
    T.createInitialState = function() {
        return {
            board: T.createEmptyBoard(),
            hiddenBoard: Array.from({
                length: T.HIDDEN_ROWS
            }, function() {
                return Array(T.COLS).fill(0);
            }),
            lockElapsed: 0,
            lockResets: 0,
            score: 0,
            level: 1,
            totalLines: 0,
            garbageElapsed: 0,
            pendingGarbage: [],
            garbageMilestone: T.GARBAGE_START_LEVEL - 1,
            garbageHole: Math.floor(Math.random() * T.COLS),
            comboCount: 0,
            garbageRiseEffect: null,
            recordEligible: true,
            newRecord: false,
            goalReached: false,
            gameState: T.GAME_STATE.PLAYING,
            gameOverRow: 0,
            gameOverTimer: 0,
            currentPiece: null,
            holdPiece: null,
            nextPieces: [],
            pieceX: 0,
            pieceY: 0,
            canHold: true,
            lastAction: T.LAST_ACTION.NONE,
            dropCounter: 0,
            dropInterval: T.BASE_DROP_INTERVAL,
            lastTime: 0,
            timeScale: 1,
            trailEffect: null,
            fallEffect: null,
            landingEffect: null,
            queueEffect: null,
            animatingLines: [],
            tSpinEffect: null,
            rotationStartTime: 0,
            rotationActive: false,
            hideHoldVisual: false,
            visibleNext: T.NEXT_VISIBLE_DESKTOP,
            rafId: 0
        };
    };
    T.createEmptyBoard = function() {
        return Array.from({
            length: T.ROWS
        }, () => Array(T.COLS).fill(0));
    };
    T.resetState = function() {
        if (T.state.rafId) cancelAnimationFrame(T.state.rafId);
        Object.assign(T.state, T.createInitialState());
        return T.state;
    };
    T.state = T.createInitialState();
})(window.Tetris = window.Tetris || {});