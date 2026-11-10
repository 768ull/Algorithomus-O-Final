(function(C) {
    "use strict";
    C.VERSION = 1;
    C.BOARD = {
        cols: 14,
        rows: 14,
        startLength: 4,
        startDir: "right"
    };
    C.RHYTHM = {
        step: 145,
        minStep: 72,
        stepByLevel: 9,
        foodsPerLevel: 5,
        maxLevel: 10,
        countdown: [ "3", "2", "1", "COBRA!" ],
        countdownStep: 620,
        deathShake: 520
    };
    C.SCORE = {
        perFood: 10
    };
    C.INPUT = {
        swipeMin: 20,
        axisRatio: 1.2,
        queue: 2,
        dpadRepeatDelay: 320,
        dpadRepeatEvery: 110
    };
    C.DIR = {
        up: {
            x: 0,
            y: -1
        },
        down: {
            x: 0,
            y: 1
        },
        left: {
            x: -1,
            y: 0
        },
        right: {
            x: 1,
            y: 0
        }
    };
    C.THEMES = [ {
        id: "lcd",
        label: "LCD"
    }, {
        id: "fosforo",
        label: "FÓSFORO"
    }, {
        id: "neon",
        label: "NEON"
    } ];
    C.DEFAULT_THEME = "lcd";
    C.STORAGE = {
        best: "cobrinha.recorde",
        theme: "cobrinha.tema",
        dpad: "cobrinha.direcional"
    };
    C.DEFAULT_DPAD = false;
    C.STATUS = {
        idle: "idle",
        countdown: "countdown",
        playing: "playing",
        paused: "paused",
        over: "over"
    };
})(window.Cobrinha = window.Cobrinha || {});