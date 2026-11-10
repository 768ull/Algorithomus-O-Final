(function(C) {
    "use strict";
    var s = C.state;
    C.stepMs = function() {
        var r = C.RHYTHM;
        return Math.max(r.minStep, r.step - (s.level - 1) * r.stepByLevel);
    };
    C.turn = function(name) {
        var next = C.DIR[name];
        if (!next) return false;
        if (s.status === C.STATUS.idle) {
            C.newGame();
            return true;
        }
        if (s.status !== C.STATUS.playing && s.status !== C.STATUS.countdown) return false;
        var ref = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
        var same = next.x === ref.x && next.y === ref.y;
        var opposite = next.x === -ref.x && next.y === -ref.y;
        if (same || opposite) return false;
        if (s.queue.length >= C.INPUT.queue) return false;
        s.queue.push(next);
        return true;
    };
    C.step = function() {
        if (s.queue.length) s.dir = s.queue.shift();
        s.moveProgress = 0;
        var head = s.snake[0];
        var next = {
            x: head.x + s.dir.x,
            y: head.y + s.dir.y
        };
        if (!C.isInside(next.x, next.y)) return C.die(next);
        var ate = !!s.food && next.x === s.food.x && next.y === s.food.y;
        var body = s.snake.length - (ate ? 0 : 1);
        for (var i = 0; i < body; i++) {
            if (s.snake[i].x === next.x && s.snake[i].y === next.y) return C.die(next);
        }
        s.renderTrail.unshift({
            x: next.x,
            y: next.y
        });
        var trailLimit = C.BOARD.cols * C.BOARD.rows + 2;
        if (s.renderTrail.length > trailLimit) s.renderTrail.length = trailLimit;
        s.snake.unshift(next);
        if (!ate) s.snake.pop();
        if (!ate) return true;
        s.eaten += 1;
        s.score += C.SCORE.perFood;
        s.pulse = 1;
        s.eatFx = {
            x: next.x,
            y: next.y,
            at: performance.now(),
            dir: {
                x: s.dir.x,
                y: s.dir.y
            }
        };
        C.playSound(520);
        levelUp();
        C.ui.sync();
        if (!C.placeFood()) {
            return C.win();
        }
        return true;
    };
    function levelUp() {
        var r = C.RHYTHM;
        if (s.eaten % r.foodsPerLevel !== 0) return;
        if (s.level >= r.maxLevel) return;
        s.level += 1;
    }
    C.die = function(impact) {
        C.playSound(180);
        s.moveProgress = 1;
        var head = s.snake[0];
        s.deathFx = {
            x: head.x,
            y: head.y,
            targetX: impact ? Math.max(0, Math.min(C.BOARD.cols - 1, impact.x)) : head.x,
            targetY: impact ? Math.max(0, Math.min(C.BOARD.rows - 1, impact.y)) : head.y,
            at: performance.now(),
            dir: {
                x: s.dir.x,
                y: s.dir.y
            }
        };
        s.status = C.STATUS.over;
        s.shake = C.RHYTHM.deathShake;
        C.ui.showOver(false);
        return false;
    };
    C.win = function() {
        s.status = C.STATUS.over;
        s.won = true;
        C.ui.showOver(true);
        return false;
    };
    C.newGame = function() {
        C.resetState();
        s.countdown = C.RHYTHM.countdown[0];
        s.countdownAt = performance.now();
        s.status = C.STATUS.countdown;
        C.ui.hideOverlay();
        C.ui.sync();
        C.engine.start();
    };
    C.engine = {
        start: function() {
            if (s.rafId) cancelAnimationFrame(s.rafId);
            s.lastTime = performance.now();
            s.rafId = requestAnimationFrame(C.engine.update);
        },
        stop: function() {
            if (s.rafId) cancelAnimationFrame(s.rafId);
            s.rafId = 0;
        },
        update: function(time) {
            s.rafId = 0;
            if (C.host && C.host.isPaused()) return;
            time = time || performance.now();
            var delta = time - s.lastTime;
            s.lastTime = time;
            if (delta > 500) delta = 0;
            tickCountdown(time);
            tickStep(delta);
            tickEffects(delta);
            C.render.draw(time);
            s.rafId = requestAnimationFrame(C.engine.update);
        }
    };
    function tickCountdown(time) {
        if (s.status !== C.STATUS.countdown) return;
        if (time - s.countdownAt < C.RHYTHM.countdownStep) return;
        var list = C.RHYTHM.countdown;
        var index = list.indexOf(s.countdown);
        if (index < 0 || index + 1 >= list.length) {
            s.countdown = "";
            s.status = C.STATUS.playing;
        } else {
            s.countdown = list[index + 1];
            s.countdownAt = time;
        }
        C.ui.sync();
    }
    function tickStep(delta) {
        if (s.status !== C.STATUS.playing) return;
        if (C.host.isPaused()) return;
        s.stepAcc += delta;
        var step = C.stepMs();
        var max = 3;
        var n = 0;
        while (s.stepAcc >= step && n < max) {
            s.stepAcc -= step;
            n += 1;
            if (!C.step()) break;
        }
        if (n >= max) s.stepAcc = 0;
        if (s.status === C.STATUS.playing) s.moveProgress = Math.min(1, s.stepAcc / C.stepMs());
    }
    function tickEffects(delta) {
        if (s.pulse > 0) s.pulse = Math.max(0, s.pulse - delta / 260);
        if (s.shake > 0) s.shake = Math.max(0, s.shake - delta);
    }
})(window.Cobrinha = window.Cobrinha || {});
