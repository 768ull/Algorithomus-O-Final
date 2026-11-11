(function(T) {
    var s = function() {
        return T.state;
    };
    T.engine = {};
    T.engine.updateProgression = function() {
        var state = s();
        state.level = 1 + Math.floor(state.totalLines / T.LINES_PER_LEVEL);
        state.dropInterval = Math.max(T.MIN_DROP_INTERVAL, Math.round(T.BASE_DROP_INTERVAL * Math.pow(T.LEVEL_SPEED_FACTOR, state.level - 1)));
        if (state.recordEligible) {
            var milestone = Math.min(state.level, T.GARBAGE_TIMED_START_LEVEL - 1);
            while (state.garbageMilestone < milestone) {
                state.garbageMilestone++;
                if (state.garbageMilestone >= T.GARBAGE_START_LEVEL && state.pendingGarbage.length < T.GARBAGE_MAX_PENDING) {
                    state.pendingGarbage.push(state.garbageHole);
                }
            }
        }
        T.ui.updateLevel();
    };
    T.engine.getGarbageInterval = function() {
        return Math.max(T.GARBAGE_MIN_INTERVAL, T.GARBAGE_BASE_INTERVAL - Math.max(0, s().level - T.GARBAGE_TIMED_START_LEVEL) * T.GARBAGE_INTERVAL_STEP);
    };
    T.engine.advanceGarbage = function(elapsed) {
        var state = s();
        if (!state.recordEligible || state.level < T.GARBAGE_TIMED_START_LEVEL) return;
        state.garbageElapsed += elapsed;
        var interval = T.engine.getGarbageInterval();
        while (state.garbageElapsed >= interval) {
            state.garbageElapsed -= interval;
            var hole = Math.floor(Math.random() * T.COLS);
            if (state.pendingGarbage.length < T.GARBAGE_MAX_PENDING) state.pendingGarbage.push(hole);
        }
    };
    T.engine.createPiece = function(type) {
        return {
            matrix: T.PIECES[type],
            type
        };
    };
    T.engine.getRandomPiece = function() {
        var types = T.tutorial && T.tutorial.isOpen() ? T.TUTORIAL_PIECE_TYPES : [ 1, 2, 3, 4, 5, 6, 7 ];
        return T.engine.createPiece(types[Math.floor(Math.random() * types.length)]);
    };
    T.engine.collide = function(board, matrix, x, y) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    let newY = y + r;
                    let newX = x + c;
                    if (newY < -T.HIDDEN_ROWS || newY >= T.ROWS || newX < 0 || newX >= T.COLS || newY < 0 && s().hiddenBoard[newY + T.HIDDEN_ROWS][newX] !== 0 || newY >= 0 && board[newY][newX] !== 0) return true;
                }
            }
        }
        return false;
    };
    T.engine.getGhostY = function() {
        var state = s();
        var ghostY = state.pieceY;
        while (!T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX, ghostY + 1)) ghostY++;
        return ghostY;
    };
    T.engine.resetPiecePosition = function() {
        var state = s();
        var lastOccupiedRow = 0;
        state.currentPiece.matrix.forEach(function(row, y) {
            if (row.some(function(value) {
                return value !== 0;
            })) lastOccupiedRow = y;
        });
        state.pieceX = Math.floor(T.COLS / 2) - Math.floor(state.currentPiece.matrix[0].length / 2);
        state.pieceY = -lastOccupiedRow - 1;
        state.rotationActive = false;
        state.fallEffect = null;
        state.lastAction = T.LAST_ACTION.NONE;
        state.dropCounter = 0;
        state.lockElapsed = 0;
        state.lockResets = 0;
        if (T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX, state.pieceY)) T.engine.triggerGameOver();
    };
    T.engine.isGrounded = function() {
        var state = s();
        return T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX, state.pieceY + 1);
    };
    function resetLockAfterMove(wasGrounded) {
        var state = s();
        if (wasGrounded && state.lockResets < T.LOCK_RESET_LIMIT) {
            state.lockElapsed = 0;
            state.lockResets++;
        }
    }
    T.engine.getPlacementResult = function(y) {
        var state = s();
        var rows = state.hiddenBoard.concat(state.board).map(function(row) {
            return row.slice();
        });
        var valid = !T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX, y);
        if (!valid) return {
            safe: false,
            rows,
            lines: []
        };
        state.currentPiece.matrix.forEach(function(row, r) {
            row.forEach(function(value, c) {
                if (value) rows[y + r + T.HIDDEN_ROWS][state.pieceX + c] = value;
            });
        });
        var lines = [];
        rows.forEach(function(row, r) {
            if (row.every(function(value) {
                return value !== 0;
            })) lines.push(r);
        });
        rows = rows.filter(function(row, r) {
            return !lines.includes(r);
        });
        while (rows.length < T.ROWS + T.HIDDEN_ROWS) rows.unshift(Array(T.COLS).fill(0));
        var garbage = state.recordEligible ? state.pendingGarbage.slice(lines.length) : [];
        if (state.recordEligible) {
            var nextLevel = 1 + Math.floor((state.totalLines + lines.length) / T.LINES_PER_LEVEL);
            var milestone = Math.min(nextLevel, T.GARBAGE_TIMED_START_LEVEL - 1);
            var extra = Math.max(0, milestone - Math.max(state.garbageMilestone, T.GARBAGE_START_LEVEL - 1));
            while (extra-- > 0 && garbage.length < T.GARBAGE_MAX_PENDING) garbage.push(state.garbageHole);
        }
        var finalRows = rows.map(function(row) {
            return row.slice();
        });
        var overflow = false;
        garbage.forEach(function(hole) {
            if (finalRows.shift().some(function(value) {
                return value !== 0;
            })) overflow = true;
            var garbageRow = Array(T.COLS).fill(T.GARBAGE_COLOR_ID);
            garbageRow[hole] = 0;
            finalRows.push(garbageRow);
        });
        var safe = !overflow && finalRows.slice(0, T.HIDDEN_ROWS).every(function(row) {
            return row.every(function(value) {
                return value === 0;
            });
        });
        return {
            safe,
            rows,
            lines,
            finalRows,
            garbage: garbage.length
        };
    };
    T.engine.spawnPiece = function() {
        var state = s();
        state.currentPiece = state.nextPieces.shift();
        state.nextPieces.push(T.engine.getRandomPiece());
        T.engine.resetPiecePosition();
        T.ui.updatePanels();
    };
    T.engine.triggerGameOver = function() {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING) return;
        if (T.input && T.input.cancel) T.input.cancel();
        T.ui.clearCelebration();
        T.audio.reset();
        T.audio.play("gameOver");
        state.gameState = T.GAME_STATE.GAMEOVER_ANIM;
        state.gameOverRow = 0;
        state.gameOverTimer = performance.now();
    };
    T.engine.mergeAndCheck = function(dropSource) {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING) return;
        var previousLevel = state.level;
        var placement = T.engine.getPlacementResult(state.pieceY);
        if (T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX, state.pieceY)) {
            T.engine.triggerGameOver();
            return;
        }
        var isTSpin = false;
        state.landingEffect = T.prefersReducedMotion() ? null : {
            matrix: state.currentPiece.matrix,
            x: state.pieceX,
            y: state.pieceY,
            startTime: performance.now()
        };
        if (state.currentPiece.type === T.TSPIN_TYPE && state.lastAction === T.LAST_ACTION.ROTATE) {
            var cornersBlocked = 0;
            var cx = state.pieceX + 1;
            var cy = state.pieceY + 1;
            function checkCorner(dx, dy) {
                var nx = cx + dx, ny = cy + dy;
                if (nx < 0 || nx >= T.COLS || ny >= T.ROWS || ny >= 0 && state.board[ny][nx] !== 0) {
                    cornersBlocked++;
                }
            }
            checkCorner(-1, -1);
            checkCorner(1, -1);
            checkCorner(-1, 1);
            checkCorner(1, 1);
            if (cornersBlocked >= 3) {
                isTSpin = true;
                state.tSpinEffect = {
                    x: state.pieceX,
                    y: state.pieceY,
                    startTime: performance.now()
                };
                state.score += T.TSPIN_SCORE;
                T.ui.updateScore();
            }
        }
        state.currentPiece.matrix.forEach(function(row, y) {
            row.forEach(function(value, x) {
                if (value !== 0) {
                    var row = state.pieceY + y;
                    if (row < 0) state.hiddenBoard[row + T.HIDDEN_ROWS][state.pieceX + x] = value; else state.board[row][state.pieceX + x] = value;
                }
            });
        });
        var linesToClear = [];
        for (let y = -T.HIDDEN_ROWS; y < T.ROWS; y++) {
            var full = true;
            for (let x = 0; x < T.COLS; x++) {
                if ((y < 0 ? state.hiddenBoard[y + T.HIDDEN_ROWS] : state.board[y])[x] === 0) full = false;
            }
            if (full) linesToClear.push(y);
        }
        if (isTSpin) T.audio.play("tSpin"); else if (linesToClear.length) T.audio.play("clear" + Math.min(4, linesToClear.length)); else if (dropSource !== "hard") T.audio.play("lock");
        if (linesToClear.length > 0) {
            state.comboCount++;
            var now = performance.now();
            T.ui.playFeedback(T.dom.gameArea, "flash");
            linesToClear.forEach(function(y) {
                if (y >= 0 && !T.prefersReducedMotion()) {
                    state.animatingLines.push({
                        y,
                        cells: state.board[y].slice(),
                        startTime: now
                    });
                }
            });
            state.hiddenBoard = placement.rows.slice(0, T.HIDDEN_ROWS);
            state.board = placement.rows.slice(T.HIDDEN_ROWS);
            var baseScore = T.LINE_SCORES[Math.min(4, linesToClear.length)];
            if (isTSpin) baseScore *= 2;
            state.score += baseScore;
            T.ui.updateScore();
            if (state.recordEligible) state.totalLines += linesToClear.length;
            T.engine.updateProgression();
        } else state.comboCount = 0;
        state.hiddenBoard = placement.finalRows.slice(0, T.HIDDEN_ROWS);
        state.board = placement.finalRows.slice(T.HIDDEN_ROWS);
        state.pendingGarbage = [];
        if (placement.garbage) {
            state.garbageRiseEffect = T.prefersReducedMotion() ? null : {
                rows: placement.garbage,
                startTime: performance.now()
            };
            state.landingEffect = null;
            state.animatingLines = [];
        }
        T.ui.updateLevel();
        if (!placement.safe) {
            T.engine.triggerGameOver();
            return;
        }
        if (state.recordEligible) {
            var messages = [];
            if (state.comboCount > 1) messages.push("COMBO ×" + state.comboCount);
            if (state.level > previousLevel) messages.push("NOVO NÍVEL " + state.level + "!");
            if (messages.length) {
                T.ui.celebrate(messages);
                T.audio.play(state.level > previousLevel ? "levelUp" : "comboWin");
            }
        }
        state.canHold = true;
        T.engine.spawnPiece();
    };
    T.engine.playerRotate = function() {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING) return;
        var originalMatrix = state.currentPiece.matrix;
        var wasGrounded = T.engine.isGrounded();
        state.currentPiece.matrix = state.currentPiece.matrix[0].map(function(val, index) {
            return state.currentPiece.matrix.map(function(row) {
                return row[index];
            }).reverse();
        });
        var rotated = false;
        for (let i = 0; i < T.KICK_TESTS.length; i++) {
            var offsetX = T.KICK_TESTS[i][0];
            var offsetY = T.KICK_TESTS[i][1];
            if (!T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX + offsetX, state.pieceY + offsetY)) {
                state.pieceX += offsetX;
                state.pieceY += offsetY;
                rotated = true;
                break;
            }
        }
        if (!rotated) {
            state.currentPiece.matrix = originalMatrix;
            return;
        }
        state.lastAction = T.LAST_ACTION.ROTATE;
        resetLockAfterMove(wasGrounded);
        state.fallEffect = null;
        state.rotationStartTime = performance.now();
        state.rotationActive = true;
        T.audio.play("rotate");
    };
    T.engine.moveLeft = function() {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING) return;
        var wasGrounded = T.engine.isGrounded();
        state.pieceX--;
        if (T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX, state.pieceY)) {
            state.pieceX++;
        } else {
            state.lastAction = T.LAST_ACTION.MOVE;
            resetLockAfterMove(wasGrounded);
            T.audio.play("move");
        }
    };
    T.engine.moveRight = function() {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING) return;
        var wasGrounded = T.engine.isGrounded();
        state.pieceX++;
        if (T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX, state.pieceY)) {
            state.pieceX--;
        } else {
            state.lastAction = T.LAST_ACTION.MOVE;
            resetLockAfterMove(wasGrounded);
            T.audio.play("move");
        }
    };
    T.engine.drop = function(source) {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING) return;
        var now = performance.now();
        var visualY = T.getVisualPieceY(now);
        state.pieceY++;
        if (T.engine.collide(state.board, state.currentPiece.matrix, state.pieceX, state.pieceY)) {
            state.pieceY--;
        } else {
            state.lastAction = T.LAST_ACTION.DROP;
            state.fallEffect = T.prefersReducedMotion() ? null : {
                fromY: visualY,
                startTime: now
            };
            T.audio.play(source === "soft" ? "softDrop" : "fall");
        }
        state.dropCounter = 0;
    };
    T.engine.hardDrop = function() {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING) return;
        var startY = T.getVisualPieceY(performance.now());
        state.pieceY = T.engine.getGhostY();
        state.lastAction = T.LAST_ACTION.DROP;
        state.trailEffect = T.prefersReducedMotion() ? null : {
            matrix: state.currentPiece.matrix,
            x: state.pieceX,
            startY,
            endY: state.pieceY,
            startTime: performance.now(),
            colorId: state.currentPiece.type
        };
        T.ui.playFeedback(T.dom.canvas, "shake");
        T.audio.play("hardDrop");
        T.engine.mergeAndCheck("hard");
    };
    T.engine.hold = function() {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING || !state.canHold) return;
        var pieceToHold = state.currentPiece;
        T.audio.play(state.holdPiece ? "swap" : "hold");
        var oldX = state.pieceX, oldY = state.pieceY;
        if (state.holdPiece === null) {
            state.holdPiece = T.engine.createPiece(pieceToHold.type);
            T.engine.spawnPiece();
        } else {
            var temp = pieceToHold.type;
            state.currentPiece = T.engine.createPiece(state.holdPiece.type);
            state.holdPiece = T.engine.createPiece(temp);
            T.engine.resetPiecePosition();
        }
        state.canHold = false;
        state.lastAction = T.LAST_ACTION.NONE;
        state.hideHoldVisual = true;
        T.ui.updatePanels();
        T.playHoldAnimation(pieceToHold, oldX, oldY, function() {
            state.hideHoldVisual = false;
            T.ui.updatePanels();
        });
    };
    T.startNewGame = function() {
        if (T.input && T.input.cancel) T.input.cancel();
        T.ui.clearCelebration();
        T.ui.hideGameOverModal();
        T.tutorial.close();
        T.audio.reset();
        var state = T.resetState();
        T.adjustCanvasSizes();
        T.ui.updateScore();
        T.ui.updateLevel();
        for (let i = 0; i < T.QUEUE_SIZE; i++) state.nextPieces.push(T.engine.getRandomPiece());
        T.engine.spawnPiece();
        T.ui.updatePanels();
        T.audio.play("start");
        state.lastTime = performance.now();
        T.engine.resume();
    };
    T.engine.pause = function() {
        var state = s();
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = 0;
    };
    T.engine.resume = function() {
        var state = s();
        if (state.rafId || T.host && T.host.isPaused()) return;
        state.lastTime = performance.now();
        state.rafId = requestAnimationFrame(T.engine.update);
    };
    T.engine.update = function(time) {
        time = time || performance.now();
        var state = s();
        if (T.host && T.host.isPaused()) {
            state.rafId = 0;
            return;
        }
        var deltaTime = time - state.lastTime;
        state.lastTime = time;
        if (deltaTime > 500) deltaTime = 0;
        if (T.ui && T.ui.recordCelebrating) {
            state.rafId = requestAnimationFrame(T.engine.update);
            return;
        }
        if (state.gameState === T.GAME_STATE.GAMEOVER_ANIM) {
            if (time - state.gameOverTimer > T.GAMEOVER_ROW_INTERVAL) {
                if (state.gameOverRow < T.ROWS) {
                    for (let c = 0; c < T.COLS; c++) {
                        if (state.board[state.gameOverRow][c] !== 0) {
                            state.board[state.gameOverRow][c] = 8;
                        }
                    }
                    state.gameOverRow++;
                    state.gameOverTimer = time;
                } else {
                    state.gameState = T.GAME_STATE.GAMEOVER;
                    T.ui.showGameOverModal(state.score);
                    return;
                }
            }
            T.draw();
            state.rafId = requestAnimationFrame(T.engine.update);
            return;
        }
        if (state.gameState === T.GAME_STATE.GAMEOVER) return;
        if (state.gameState === T.GAME_STATE.PLAYING && !(T.ui && T.ui.recordCelebrating) && !T.tutorial.isFrozen() && !T.host.isPaused()) {
            var elapsed = deltaTime * state.timeScale;
            T.engine.advanceGarbage(elapsed);
            if (T.engine.isGrounded()) {
                state.lockElapsed += elapsed;
                if (state.lockElapsed >= T.LOCK_DELAY) T.engine.mergeAndCheck("lock");
            } else {
                state.dropCounter += elapsed;
                while (state.dropCounter >= state.dropInterval && !T.engine.isGrounded()) {
                    var remaining = state.dropCounter - state.dropInterval;
                    T.engine.drop();
                    state.dropCounter = remaining;
                }
            }
        }
        T.ui.updateLevel();
        T.draw();
        state.rafId = requestAnimationFrame(T.engine.update);
    };
})(window.Tetris = window.Tetris || {});
