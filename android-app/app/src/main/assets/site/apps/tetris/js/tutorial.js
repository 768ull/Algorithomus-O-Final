(function(T) {
    var PHASE = {
        SLOW: "slow",
        FROZEN: "frozen",
        OK: "ok"
    };
    var RESERVE = {
        STORE: "store",
        FIT_LINE: "fit-line",
        WAIT_RETRIEVE: "wait-retrieve",
        RETRIEVE: "retrieve",
        FIT_SQUARE: "fit-square"
    };
    var STEPS = [ {
        kind: "moveLeft",
        gesture: "left",
        name: "ESQUERDA"
    }, {
        kind: "moveRight",
        gesture: "right",
        name: "DIREITA"
    }, {
        kind: "rotate",
        gesture: "tap",
        name: "GIRAR"
    }, {
        kind: "softDrop",
        gesture: "down",
        speed: "slow",
        name: "DESCER"
    }, {
        kind: "hardDrop",
        gesture: "down",
        speed: "fast",
        name: "SOLTAR"
    }, {
        kind: "hold",
        gesture: "up",
        name: "GUARDAR"
    } ];
    var GESTURES = {
        left: {
            dx: -1,
            dy: 0
        },
        right: {
            dx: 1,
            dy: 0
        },
        down: {
            dx: 0,
            dy: 1
        },
        up: {
            dx: 0,
            dy: -1
        },
        tap: {
            dx: 0,
            dy: 0
        }
    };
    T.tutorial = {};
    var view = {
        canvas: null,
        ctx: null,
        dpr: 1,
        t0: 0
    };
    var coach = {
        active: false,
        index: 0,
        phase: null,
        phaseStart: 0,
        shakeUntil: 0,
        lastShake: 0,
        practice: false,
        practiceIndex: 0,
        reservePhase: null,
        notice: null,
        goal: null,
        beforeAction: null,
        lastFrame: 0,
        practiceIntro: false,
        practiceIntroStart: 0
    };
    var rafId = 0;
    var showRaf = 0;
    var requiredForFirstVisit = false;
    var seenThisSession = false;
    T.tutorial.isOpen = function() {
        return coach.active;
    };
    T.tutorial.isFrozen = function() {
        return coach.active && (coach.practice || coach.phase !== PHASE.SLOW);
    };
    function clamp01(v) {
        return v < 0 ? 0 : v > 1 ? 1 : v;
    }
    function easeIO(t) {
        return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    function easeSteps(v, n) {
        var step = Math.floor(v * n);
        return (step + easeIO(v * n % 1)) / n;
    }
    function rrPath(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    function drawTrail(ctx, x, y, dx, dy, len, alpha) {
        if (alpha <= .01) return;
        var thick = T.TUTORIAL_GESTURE.trailThickness;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(dy, dx));
        var grad = ctx.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, "rgba(255,255,255,0.66)");
        grad.addColorStop(.4, "rgba(255,255,255,0.28)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        rrPath(ctx, 0, -thick / 2, len, thick, thick / 2);
        ctx.fill();
        ctx.restore();
    }
    function drawTouch(ctx, x, y, alpha, press) {
        if (alpha <= .02) return;
        var G = T.TUTORIAL_GESTURE;
        var k = 1 - .14 * (press || 0);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.scale(k, k);
        ctx.shadowColor = "rgba(255,255,255,0.55)";
        ctx.shadowBlur = G.glow;
        ctx.fillStyle = "rgba(255,255,255,0.30)";
        ctx.beginPath();
        ctx.arc(0, 0, G.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, G.dot, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    function drawTapWaves(ctx, x, y, p, alpha) {
        if (alpha <= .02) return;
        var G = T.TUTORIAL_GESTURE;
        ctx.save();
        for (let i = 0; i < 2; i++) {
            var phase = (p + i / 2) % 1;
            ctx.globalAlpha = alpha * (1 - phase) * .55;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, G.radius + phase * G.ringGap * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
    function drawStage(step, now) {
        var ctx = view.ctx;
        var W = T.TUTORIAL_STAGE_W;
        var H = T.TUTORIAL_STAGE_H;
        var G = T.TUTORIAL_GESTURE;
        var g = GESTURES[step.gesture];
        var loop = T.TUTORIAL_GESTURE_LOOP;
        var p = T.prefersReducedMotion() ? .5 : ((now - view.t0) % loop + loop) % loop / loop;
        var delay = step.speed === "slow" ? .08 : G.delay;
        var travel = step.speed === "slow" ? .78 : step.speed === "fast" ? .15 : G.travel;
        ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        var outStart = delay + travel + G.hold;
        var fade = clamp01(p / delay) * (1 - clamp01((p - outStart) / (1 - outStart)));
        var dist = G.trailLength;
        var ox = W / 2 - g.dx * dist / 2;
        var oy = H / 2 - g.dy * dist / 2;
        var q = clamp01((p - delay) / travel);
        var eased = step.speed === "fast" ? easeOut(q) : step.speed === "slow" ? easeSteps(q, 3) : easeIO(q);
        var fx = ox + g.dx * dist * eased;
        var fy = oy + g.dy * dist * eased;
        var press = step.gesture === "tap" ? Math.max(0, Math.sin(p * Math.PI * 2 - Math.PI / 2)) : q > .78 ? Math.sin((q - .78) / .22 * Math.PI) * (step.speed === "fast" ? 1 : .45) : 0;
        if (step.gesture === "tap") drawTapWaves(ctx, ox, oy, p, fade); else drawTrail(ctx, ox, oy, g.dx, g.dy, dist, fade);
        drawTouch(ctx, fx, fy, fade, press);
        ctx.save();
        ctx.strokeStyle = T.UI_ACCENT;
        ctx.lineWidth = 3;
        ctx.globalAlpha = .8;
        if (step.gesture === "tap") {
            ctx.beginPath();
            ctx.arc(ox, oy, G.radius + 15, -Math.PI * .8, Math.PI * .5);
            ctx.stroke();
            drawArrow(ctx, ox, oy + G.radius + 15, -1, 0);
        } else {
            var ax = ox + g.dx * (dist + 15);
            var ay = oy + g.dy * (dist + 15);
            drawArrow(ctx, ax, ay, g.dx, g.dy);
            if (step.speed === "fast") drawArrow(ctx, ax - g.dx * 14, ay - g.dy * 14, g.dx, g.dy);
        }
        ctx.restore();
    }
    function drawArrow(context, x, y, dx, dy) {
        context.beginPath();
        context.moveTo(x - dx * 10 - dy * 7, y - dy * 10 + dx * 7);
        context.lineTo(x, y);
        context.lineTo(x - dx * 10 + dy * 7, y - dy * 10 - dx * 7);
        context.stroke();
    }
    function drawSuccess(now) {
        var context = view.ctx;
        var p = T.prefersReducedMotion() ? 1 : clamp01((now - coach.phaseStart) / T.TUTORIAL_STEP_OK_TIME);
        var x = T.TUTORIAL_STAGE_W / 2, y = T.TUTORIAL_STAGE_H / 2;
        context.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
        context.clearRect(0, 0, T.TUTORIAL_STAGE_W, T.TUTORIAL_STAGE_H);
        context.save();
        context.strokeStyle = "#8ce6b7";
        context.fillStyle = "#8ce6b7";
        context.lineWidth = 4;
        context.globalAlpha = (1 - p) * .7;
        context.beginPath();
        context.arc(x, y, 30 + p * 30, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
        var reveal = easeOut(Math.min(1, p * 4));
        context.setLineDash([ 60 * reveal, 100 ]);
        context.beginPath();
        context.moveTo(x - 19, y);
        context.lineTo(x - 5, y + 14);
        context.lineTo(x + 22, y - 17);
        context.stroke();
        context.setLineDash([]);
        for (var i = 0; i < 8; i++) {
            var angle = i * Math.PI / 4;
            context.globalAlpha = (1 - p) * .8;
            context.fillRect(x + Math.cos(angle) * (42 + p * 34) - 3, y + Math.sin(angle) * (42 + p * 34) - 3, 6, 6);
        }
        context.restore();
    }
    function rotateMatrix(matrix) {
        return matrix[0].map(function(_, x) {
            return matrix.map(function(row) {
                return row[x];
            }).reverse();
        });
    }
    function updateProgress() {
        var index = coach.practice ? STEPS.length + coach.practiceIndex : coach.index;
        var total = STEPS.length + T.TUTORIAL_PRACTICE_COUNT;
        var label = "ETAPA " + (index + 1) + " DE " + total;
        T.dom.tutorialStageName.textContent = "ETAPA " + (index + 1);
        T.dom.tutorialStep.textContent = T.dom.tutorialHud.classList.contains("tiny") ? index + 1 + " / " + total : label;
        T.dom.tutorialStep.setAttribute("aria-label", label);
        syncHud();
        var completed = coach.phase === PHASE.OK && coach.reservePhase !== RESERVE.WAIT_RETRIEVE;
        Array.prototype.forEach.call(T.dom.tutorialProgress.children, function(dot, i) {
            dot.classList.toggle("done", i < index || i === index && completed);
            dot.classList.toggle("active", i === index && !completed);
        });
    }
    function syncHud() {
        [ "success", "ready", "step-enter", "practice-intro" ].forEach(function(name) {
            T.dom.tutorialHud.classList.toggle(name, T.dom.coach.classList.contains(name));
        });
    }
    function currentStep() {
        return STEPS[coach.index];
    }
    function setPhase(phase) {
        coach.phase = phase;
        coach.phaseStart = performance.now();
        if (phase === PHASE.OK) T.audio.play("correct");
        if (phase === PHASE.SLOW) T.state.timeScale = T.TUTORIAL_SLOWMO_SCALE; else if (phase === PHASE.FROZEN) T.state.timeScale = 0; else T.state.timeScale = 0;
        T.dom.coach.classList.toggle("success", phase === PHASE.OK);
        if (phase === PHASE.OK) T.dom.coach.classList.remove("step-enter");
        if (phase === PHASE.OK) T.dom.coachName.textContent = !coach.practice ? "ISSO!" : coach.practiceIndex === 0 ? "1 LINHA!" : coach.practiceIndex === 1 ? "4 LINHAS!" : coach.reservePhase === RESERVE.WAIT_RETRIEVE ? "BOA ESCOLHA!" : "BEM GUARDADA!";
        updateProgress();
    }
    function showStep(index) {
        var step = STEPS[index];
        coach.index = index;
        view.t0 = performance.now();
        T.dom.coachName.textContent = step.name;
        T.dom.coachName.classList.remove("shake");
        var state = T.state;
        if (step.kind === "hold" && state.pieceY < T.TUTORIAL_SPAWN_ROW) {
            state.pieceY = T.TUTORIAL_SPAWN_ROW;
            state.fallEffect = null;
            state.dropCounter = 0;
        }
        coach.goal = {
            x: state.pieceX,
            y: state.pieceY,
            matrix: state.currentPiece.matrix.map(function(row) {
                return row.slice();
            }),
            startY: state.pieceY
        };
        if (step.kind === "moveLeft") coach.goal.x -= T.TUTORIAL_MOVE_DISTANCE;
        if (step.kind === "moveRight") coach.goal.x += T.TUTORIAL_MOVE_DISTANCE;
        if (step.kind === "softDrop") coach.goal.y += T.TUTORIAL_DROP_DISTANCE;
        if (step.kind === "rotate") coach.goal.matrix = rotateMatrix(coach.goal.matrix);
        if (step.kind === "hardDrop") coach.goal.y = T.engine.getGhostY();
        T.dom.holdCanvas.closest(".panel").classList.toggle("tutorial-highlight", step.kind === "hold");
        T.dom.coach.classList.remove("step-enter");
        void T.dom.coach.offsetWidth;
        T.dom.coach.classList.add("step-enter");
        setPhase(PHASE.SLOW);
    }
    function seedTutorialPieces() {
        var state = T.state;
        var types = T.TUTORIAL_PIECE_TYPES.slice();
        for (var i = types.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = types[i];
            types[i] = types[j];
            types[j] = temp;
        }
        state.currentPiece = T.engine.createPiece(types.shift());
        state.nextPieces = types.map(function(type) {
            return T.engine.createPiece(type);
        });
        state.pieceX = Math.floor(T.COLS / 2) - Math.floor(state.currentPiece.matrix[0].length / 2);
        state.board = T.createEmptyBoard();
        state.hiddenBoard = Array.from({
            length: T.HIDDEN_ROWS
        }, function() {
            return Array(T.COLS).fill(0);
        });
        state.lockElapsed = 0;
        state.lockResets = 0;
        state.pieceY = T.TUTORIAL_SPAWN_ROW;
        state.holdPiece = null;
        state.canHold = true;
        state.fallEffect = null;
        state.dropCounter = 0;
        state.rotationActive = false;
        T.ui.updatePanels();
    }
    function practiceBoard(rows, gapColumn, gapWidth) {
        var board = T.createEmptyBoard();
        for (var y = T.ROWS - rows; y < T.ROWS; y++) {
            for (var x = 0; x < T.COLS; x++) {
                if (x < gapColumn || x >= gapColumn + gapWidth) board[y][x] = (x + y) % 7 + 1;
            }
        }
        return board;
    }
    function isReservePrompt() {
        return coach.practice && coach.practiceIndex === 2 && (coach.reservePhase === RESERVE.STORE || coach.reservePhase === RESERVE.RETRIEVE);
    }
    function highlightReservePanels() {
        T.dom.holdCanvas.closest(".panel").classList.toggle("tutorial-highlight", isReservePrompt());
        T.dom.nextCanvas.closest(".panel").classList.toggle("tutorial-highlight", coach.reservePhase === RESERVE.STORE);
    }
    function startPractice(index) {
        var state = T.state;
        var isNarrow = index > 0;
        var isReserve = index === 2;
        var targetColumn = isNarrow ? 5 : 6;
        var targetX = isNarrow ? targetColumn - 2 : targetColumn;
        var targetMatrix = isNarrow ? rotateMatrix(T.PIECES[1]) : T.PIECES[4];
        state.board = practiceBoard(isNarrow ? 4 : 1, targetColumn, isNarrow ? 1 : 2);
        state.lockElapsed = 0;
        state.lockResets = 0;
        state.score = 0;
        state.dropInterval = T.BASE_DROP_INTERVAL;
        state.currentPiece = T.engine.createPiece(isReserve ? 4 : isNarrow ? 1 : 4);
        if (isReserve) state.nextPieces = T.TUTORIAL_RESERVE_QUEUE.map(T.engine.createPiece);
        state.holdPiece = null;
        state.pieceX = isNarrow ? 1 : 2;
        state.pieceY = T.TUTORIAL_SPAWN_ROW;
        state.lastAction = T.LAST_ACTION.NONE;
        state.dropCounter = 0;
        state.canHold = isReserve;
        state.hideHoldVisual = false;
        state.rotationActive = false;
        state.trailEffect = null;
        state.fallEffect = null;
        state.landingEffect = null;
        state.animatingLines = [];
        state.tSpinEffect = null;
        state.gameState = T.GAME_STATE.PLAYING;
        coach.practice = true;
        coach.practiceIndex = index;
        coach.reservePhase = isReserve ? RESERVE.STORE : null;
        coach.notice = null;
        coach.goal = {
            x: targetX,
            y: T.ROWS - (isNarrow ? 4 : 2),
            matrix: targetMatrix
        };
        coach.practiceIntro = true;
        coach.practiceIntroStart = performance.now();
        T.dom.coach.classList.add("practice");
        T.dom.coach.classList.add("practice-intro");
        T.dom.coachName.textContent = isReserve ? "NÃO CABE? GUARDE" : isNarrow ? "GIRE E ENCAIXE" : "ENCAIXE";
        T.dom.coach.classList.remove("ready");
        highlightReservePanels();
        T.ui.updateScore();
        T.ui.updatePanels();
        setPhase(PHASE.FROZEN);
    }
    function startReserveRetrieval() {
        var state = T.state;
        state.board = practiceBoard(2, 6, 2);
        state.lockElapsed = 0;
        state.lockResets = 0;
        state.pieceY = T.TUTORIAL_SPAWN_ROW;
        state.dropCounter = 0;
        state.fallEffect = null;
        state.trailEffect = null;
        state.landingEffect = null;
        state.animatingLines = [];
        coach.reservePhase = RESERVE.RETRIEVE;
        coach.goal = {
            x: 6,
            y: T.ROWS - 2,
            matrix: T.PIECES[4]
        };
        coach.practiceIntro = true;
        coach.practiceIntroStart = performance.now();
        coach.notice = null;
        T.dom.coach.classList.add("practice-intro");
        T.dom.coach.classList.remove("ready");
        T.dom.coachName.textContent = "AGORA ELA CABE";
        highlightReservePanels();
        T.ui.updatePanels();
        setPhase(PHASE.FROZEN);
    }
    function nextStep() {
        if (coach.index + 1 >= STEPS.length) {
            startPractice(0);
            return;
        }
        showStep(coach.index + 1);
    }
    function canClearPractice() {
        if (isReservePrompt()) return false;
        var state = T.state;
        var board = state.board.map(function(row) {
            return row.slice();
        });
        var landingY = T.engine.getGhostY();
        state.currentPiece.matrix.forEach(function(row, y) {
            row.forEach(function(value, x) {
                if (value && board[landingY + y]) board[landingY + y][state.pieceX + x] = value;
            });
        });
        return board.filter(function(row) {
            return row.every(function(value) {
                return value !== 0;
            });
        }).length === (coach.practiceIndex === 0 ? 1 : coach.reservePhase === RESERVE.FIT_SQUARE ? 2 : 4);
    }
    function warnWrongAction() {
        var now = performance.now();
        if (now - coach.lastShake <= T.TUTORIAL_SHAKE_COOLDOWN) return;
        coach.lastShake = now;
        coach.shakeUntil = now + T.TUTORIAL_SHAKE_TIME;
        T.audio.play("wrong");
    }
    T.tutorial.gate = function(kind) {
        if (!coach.active) return true;
        if (coach.phase === PHASE.OK || coach.practiceIntro) return false;
        var allowed = isReservePrompt() ? kind === "hold" : coach.practice ? kind === "moveLeft" || kind === "moveRight" || kind === "rotate" && T.state.currentPiece.type === 1 || kind === "hardDrop" && canClearPractice() : currentStep().kind === kind;
        if (!allowed) {
            warnWrongAction();
            return false;
        }
        var state = T.state;
        coach.beforeAction = {
            x: state.pieceX,
            y: state.pieceY,
            piece: state.currentPiece,
            matrix: JSON.stringify(state.currentPiece.matrix),
            hold: state.holdPiece,
            score: state.score
        };
        return true;
    };
    T.tutorial.onAction = function(kind) {
        if (!coach.active || !coach.beforeAction) return;
        var before = coach.beforeAction;
        coach.beforeAction = null;
        var state = T.state;
        var done = false;
        if (isReservePrompt() && kind === "hold") {
            var storing = coach.reservePhase === RESERVE.STORE;
            var changed = storing ? state.holdPiece && state.holdPiece.type === 4 && state.currentPiece.type === 1 : state.currentPiece.type === 4 && state.holdPiece !== before.hold;
            if (!changed || state.holdPiece === before.hold) return;
            coach.reservePhase = storing ? RESERVE.FIT_LINE : RESERVE.FIT_SQUARE;
            coach.notice = {
                text: storing ? "GUARDADA!" : "DE VOLTA!",
                until: performance.now() + T.TUTORIAL_STEP_OK_TIME
            };
            state.pieceY = T.TUTORIAL_SPAWN_ROW;
            state.fallEffect = null;
            state.dropCounter = 0;
            highlightReservePanels();
            return;
        }
        if (coach.practice) {
            done = kind === "hardDrop" && state.score > before.score;
            if (done && coach.reservePhase === RESERVE.FIT_LINE) coach.reservePhase = RESERVE.WAIT_RETRIEVE;
        } else {
            if (kind === "moveLeft") done = state.pieceX <= coach.goal.x && state.pieceX < before.x;
            if (kind === "moveRight") done = state.pieceX >= coach.goal.x && state.pieceX > before.x;
            if (kind === "softDrop") done = state.pieceY >= coach.goal.y && state.pieceY > before.y;
            if (kind === "rotate") done = JSON.stringify(state.currentPiece.matrix) !== before.matrix;
            if (kind === "hardDrop") done = state.currentPiece !== before.piece;
            if (kind === "hold") done = state.holdPiece !== before.hold && !!state.holdPiece;
        }
        if (done) setPhase(PHASE.OK);
    };
    T.tutorial.drawBoardHints = function(context, canvas, now) {
        if (!coach.active || !coach.goal || coach.phase === PHASE.OK) return;
        var goal = coach.goal;
        var kind = currentStep().kind;
        if (!coach.practice && kind === "hold") return;
        var y = !coach.practice && (kind === "moveLeft" || kind === "moveRight" || kind === "rotate") ? T.state.pieceY : goal.y;
        var aligned = coach.practice && canClearPractice();
        var pulse = T.prefersReducedMotion() ? .5 : (Math.sin(now / 240) + 1) / 2;
        context.save();
        context.fillStyle = aligned ? "rgba(140,230,183,0.16)" : T.UI_ACCENT_FILL;
        context.strokeStyle = aligned ? "#8ce6b7" : T.UI_ACCENT;
        context.lineWidth = 3 + pulse * 2;
        context.setLineDash(aligned ? [] : [ 8, 6 ]);
        context.lineDashOffset = T.prefersReducedMotion() ? 0 : -now / 45;
        goal.matrix.forEach(function(row, r) {
            row.forEach(function(value, c) {
                if (!value) return;
                var x = (goal.x + c) * T.BLOCK_SIZE + 3;
                var top = (y + r) * T.BLOCK_SIZE + 3;
                context.fillRect(x, top, T.BLOCK_SIZE - 6, T.BLOCK_SIZE - 6);
                context.strokeRect(x, top, T.BLOCK_SIZE - 6, T.BLOCK_SIZE - 6);
            });
        });
        context.restore();
        if (isReservePrompt()) {
            var piece = T.state.currentPiece;
            var cx = (T.state.pieceX + piece.matrix[0].length / 2) * T.BLOCK_SIZE;
            var cy = (T.engine.getGhostY() + piece.matrix.length / 2) * T.BLOCK_SIZE;
            context.save();
            context.strokeStyle = "#f08b9a";
            context.lineWidth = 5;
            context.beginPath();
            context.moveTo(cx - 12, cy - 12);
            context.lineTo(cx + 12, cy + 12);
            context.moveTo(cx + 12, cy - 12);
            context.lineTo(cx - 12, cy + 12);
            context.stroke();
            context.restore();
        }
    };
    T.tutorial.reposition = function() {
        if (!coach.active) return;
        var rect = T.dom.canvas.getBoundingClientRect();
        T.dom.coach.style.left = rect.left + rect.width / 2 + "px";
        T.dom.coach.style.top = rect.top + rect.height * T.TUTORIAL_FOCUS_Y + "px";
        T.dom.coach.style.width = Math.min(300, rect.width * .92) + "px";
        T.dom.coach.classList.toggle("compact", rect.width < 167);
        var hudWidth = T.dom.gameHud.getBoundingClientRect().width;
        T.dom.tutorialHud.classList.toggle("compact", hudWidth < 167);
        T.dom.tutorialHud.classList.toggle("tiny", hudWidth < 120);
        updateProgress();
    };
    function coachLoop(now) {
        rafId = 0;
        if (!coach.active || T.host.isPaused()) return;
        rafId = requestAnimationFrame(coachLoop);
        syncHud();
        var delta = coach.lastFrame ? Math.max(0, now - coach.lastFrame) : 0;
        coach.lastFrame = now;
        if (T.host.isPaused() || delta > 500) {
            coach.phaseStart += delta;
            coach.practiceIntroStart += delta;
            view.t0 += delta;
            if (coach.notice) coach.notice.until += delta;
            return;
        }
        T.dom.coachName.classList.toggle("shake", now < coach.shakeUntil);
        if (coach.phase === PHASE.OK) {
            drawSuccess(now);
            var duration = coach.practice ? T.TUTORIAL_PRACTICE_OK_TIME : T.TUTORIAL_STEP_OK_TIME;
            if (now - coach.phaseStart > duration) {
                if (!coach.practice) nextStep(); else if (coach.practiceIndex === 0) startPractice(1); else if (coach.practiceIndex === 1) startPractice(2); else if (coach.reservePhase === RESERVE.WAIT_RETRIEVE) startReserveRetrieval(); else {
                    T.audio.play("complete");
                    T.tutorial.markSeen();
                    requiredForFirstVisit = false;
                    document.body.classList.remove("first-tutorial");
                    T.tutorial.close();
                    T.startNewGame();
                }
            }
            return;
        }
        var step = currentStep();
        if (coach.practice) {
            if (coach.practiceIntro && now - coach.practiceIntroStart > T.TUTORIAL_PRACTICE_INTRO_TIME) {
                coach.practiceIntro = false;
                T.dom.coach.classList.remove("practice-intro");
            }
            var ready = canClearPractice();
            var rotated = T.state.currentPiece.type !== 1 || T.state.currentPiece.matrix.some(function(row) {
                return row.filter(function(value) {
                    return value !== 0;
                }).length === 1;
            });
            var targetX = coach.goal.x;
            if (T.state.currentPiece.type === 1 && rotated) {
                var filledColumn = T.state.currentPiece.matrix.reduce(function(min, row) {
                    var c = row.findIndex(function(value) {
                        return value !== 0;
                    });
                    return c < 0 ? min : Math.min(min, c);
                }, T.COLS);
                targetX = coach.goal.x + 2 - filledColumn;
            }
            step = ready ? STEPS[4] : !rotated ? STEPS[2] : T.state.pieceX < targetX ? STEPS[1] : STEPS[0];
            if (isReservePrompt()) {
                step = STEPS[5];
                if (!coach.practiceIntro) T.dom.coachName.textContent = coach.reservePhase === RESERVE.STORE ? "NÃO CABE? GUARDE" : "USE A GUARDADA";
            } else if (!coach.practiceIntro) {
                T.dom.coachName.textContent = coach.notice && now < coach.notice.until ? coach.notice.text : ready ? "SOLTE!" : !rotated ? "GIRE!" : "ENCAIXE";
            }
            T.dom.coach.classList.toggle("ready", ready);
        }
        drawStage(step, now);
        if (!coach.practice && coach.phase === PHASE.SLOW && now - coach.phaseStart > T.TUTORIAL_SLOWMO_TIME) {
            setPhase(PHASE.FROZEN);
        }
    }
    function setSpotlight(on) {
        T.dom.canvas.style.background = on ? T.TUTORIAL_SPOT_BG : "";
    }
    T.tutorial.start = function() {
        if (coach.active) return;
        coach.active = true;
        if (T.input && T.input.cancel) T.input.cancel();
        T.ui.clearCelebration();
        document.body.classList.add("tutorial-mode");
        T.dom.tutorialHud.classList.remove("hidden");
        T.state.recordEligible = false;
        T.state.newRecord = false;
        coach.practice = false;
        coach.practiceIntro = false;
        coach.reservePhase = null;
        coach.notice = null;
        coach.beforeAction = null;
        coach.lastFrame = performance.now();
        coach.shakeUntil = 0;
        coach.lastShake = 0;
        setSpotlight(true);
        view.canvas = T.dom.coachCanvas;
        view.dpr = Math.min(3, window.devicePixelRatio || 1);
        view.canvas.width = T.TUTORIAL_STAGE_W * view.dpr;
        view.canvas.height = T.TUTORIAL_STAGE_H * view.dpr;
        view.ctx = view.canvas.getContext("2d");
        T.dom.tutorialProgress.textContent = "";
        for (var i = 0; i < STEPS.length + T.TUTORIAL_PRACTICE_COUNT; i++) {
            T.dom.tutorialProgress.appendChild(document.createElement("span"));
        }
        T.dom.tutorialTools.classList.remove("hidden");
        seedTutorialPieces();
        T.dom.coach.classList.remove("hidden");
        T.tutorial.reposition();
        T.ui.updateLevel();
        showStep(0);
        showRaf = requestAnimationFrame(function() {
            showRaf = 0;
            if (coach.active) T.dom.coach.classList.add("show");
        });
        if (!rafId) rafId = requestAnimationFrame(coachLoop);
    };
    T.tutorial.pauseLoop = function() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
    };
    T.tutorial.resumeLoop = function() {
        if (coach.active && !rafId) {
            coach.lastFrame = performance.now();
            rafId = requestAnimationFrame(coachLoop);
        }
    };
    T.tutorial.close = function() {
        if (!coach.active) return;
        if (requiredForFirstVisit && !T.tutorial.hasSeen()) return;
        coach.active = false;
        if (T.input && T.input.cancel) T.input.cancel();
        document.body.classList.remove("tutorial-mode");
        T.dom.tutorialHud.classList.add("hidden");
        T.dom.tutorialHud.classList.remove("success", "ready", "step-enter", "practice-intro");
        T.state.timeScale = 1;
        setSpotlight(false);
        T.dom.coach.classList.remove("show");
        T.dom.coach.classList.remove("practice");
        T.dom.coach.classList.remove("practice-intro");
        T.dom.coach.classList.remove("success", "ready", "step-enter");
        T.dom.tutorialTools.classList.add("hidden");
        T.dom.holdCanvas.closest(".panel").classList.remove("tutorial-highlight");
        T.dom.nextCanvas.closest(".panel").classList.remove("tutorial-highlight");
        T.dom.coachName.classList.remove("shake");
        coach.practice = false;
        coach.practiceIntro = false;
        coach.beforeAction = null;
        coach.goal = null;
        coach.reservePhase = null;
        coach.notice = null;
        if (showRaf) {
            cancelAnimationFrame(showRaf);
            showRaf = 0;
        }
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        setTimeout(function() {
            if (!coach.active) T.dom.coach.classList.add("hidden");
        }, 300);
    };
    T.tutorial.hasSeen = function() {
        if (seenThisSession) return true;
        try {
            return localStorage.getItem(T.TUTORIAL_STORAGE_KEY) === "1";
        } catch (err) {
            return false;
        }
    };
    T.tutorial.markSeen = function() {
        seenThisSession = true;
        try {
            localStorage.setItem(T.TUTORIAL_STORAGE_KEY, "1");
        } catch (err) {}
    };
    T.tutorial.requireCompletion = function() {
        requiredForFirstVisit = true;
    };
})(window.Tetris = window.Tetris || {});
