(function(C) {
    "use strict";
    C.state = {
        status: C.STATUS.idle,
        snake: [],
        food: null,
        dir: C.DIR.right,
        queue: [],
        score: 0,
        level: 1,
        eaten: 0,
        best: 0,
        won: false,
        countdown: null,
        countdownAt: 0,
        stepAcc: 0,
        lastTime: 0,
        rafId: null,
        pulse: 0,
        moveProgress: 1,
        renderTrail: [],
        eatFx: null,
        deathFx: null,
        shake: 0
    };
    C.resetState = function() {
        var s = C.state;
        var headY = Math.floor(C.BOARD.rows / 2);
        var headX = Math.floor(C.BOARD.cols / 2);
        s.snake = [];
        for (var i = 0; i < C.BOARD.startLength; i++) {
            s.snake.push({
                x: headX - i,
                y: headY
            });
        }
        s.dir = C.DIR[C.BOARD.startDir];
        s.queue = [];
        s.score = 0;
        s.level = 1;
        s.eaten = 0;
        s.won = false;
        s.countdown = null;
        s.stepAcc = 0;
        s.pulse = 0;
        s.moveProgress = 1;
        s.renderTrail = s.snake.map(function(p) {
            return {
                x: p.x,
                y: p.y
            };
        });
        s.eatFx = null;
        s.deathFx = null;
        s.shake = 0;
        s.status = C.STATUS.idle;
        C.placeFood();
        return s;
    };
    C.isInside = function(x, y) {
        return x >= 0 && x < C.BOARD.cols && y >= 0 && y < C.BOARD.rows;
    };
    C.placeFood = function() {
        var s = C.state;
        var taken = {};
        for (var i = 0; i < s.snake.length; i++) {
            taken[s.snake[i].x + ":" + s.snake[i].y] = true;
        }
        var free = [];
        for (var y = 0; y < C.BOARD.rows; y++) {
            for (var x = 0; x < C.BOARD.cols; x++) {
                if (!taken[x + ":" + y]) free.push({
                    x,
                    y
                });
            }
        }
        if (!free.length) {
            s.food = null;
            return false;
        }
        s.food = free[Math.floor(Math.random() * free.length)];
        return true;
    };
})(window.Cobrinha = window.Cobrinha || {});