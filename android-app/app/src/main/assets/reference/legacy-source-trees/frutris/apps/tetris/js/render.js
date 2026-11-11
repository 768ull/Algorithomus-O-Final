(function(T) {
    var s = function() {
        return T.state;
    };
    T.drawBlock = function(context, col, row, colorId, size, options) {
        if (!colorId) return;
        size = size || T.BLOCK_SIZE;
        options = options || {};
        var bx = col * size;
        var by = row * size;
        var baseColor = T.COLORS[colorId];
        if (colorId === 8) {
            context.fillStyle = options.muted ? "#3c3c48" : "#0a0a0c";
            context.fillRect(bx, by, size, size);
            context.strokeStyle = options.muted ? "#4a4a55" : "#1e1e24";
            context.lineWidth = 1;
            context.strokeRect(bx, by, size, size);
            return;
        }
        if (options.ghost) {
            var inset = size * .05;
            context.strokeStyle = options.color || baseColor;
            context.lineWidth = Math.max(1, size * .05);
            context.strokeRect(bx + inset, by + inset, size - inset * 2, size - inset * 2);
            context.fillStyle = options.color ? options.color === "#64df9b" ? "rgba(100,223,155,.14)" : "rgba(255,92,108,.18)" : "rgba(255,255,255,0.05)";
            context.fillRect(bx + inset, by + inset, size - inset * 2, size - inset * 2);
            return;
        }
        context.fillStyle = baseColor;
        context.fillRect(bx, by, size, size);
        var bevelSize = size * .125;
        context.fillStyle = "rgba(255, 255, 255, 0.4)";
        context.beginPath();
        context.moveTo(bx, by);
        context.lineTo(bx + size, by);
        context.lineTo(bx + size - bevelSize, by + bevelSize);
        context.lineTo(bx + bevelSize, by + bevelSize);
        context.fill();
        context.fillStyle = "rgba(255, 255, 255, 0.2)";
        context.beginPath();
        context.moveTo(bx, by);
        context.lineTo(bx + bevelSize, by + bevelSize);
        context.lineTo(bx + bevelSize, by + size - bevelSize);
        context.lineTo(bx, by + size);
        context.fill();
        context.fillStyle = "rgba(0, 0, 0, 0.2)";
        context.beginPath();
        context.moveTo(bx + size, by);
        context.lineTo(bx + size, by + size);
        context.lineTo(bx + size - bevelSize, by + size - bevelSize);
        context.lineTo(bx + size - bevelSize, by + bevelSize);
        context.fill();
        context.fillStyle = "rgba(0, 0, 0, 0.4)";
        context.beginPath();
        context.moveTo(bx, by + size);
        context.lineTo(bx + size, by + size);
        context.lineTo(bx + size - bevelSize, by + size - bevelSize);
        context.lineTo(bx + bevelSize, by + size - bevelSize);
        context.fill();
        context.strokeStyle = "rgba(0,0,0,0.6)";
        context.lineWidth = 1;
        context.strokeRect(bx, by, size, size);
    };
    T.drawMatrix = function(context, matrix, offsetX, offsetY, size, options) {
        matrix.forEach(function(row, y) {
            row.forEach(function(value, x) {
                if (value !== 0) {
                    T.drawBlock(context, x + offsetX, y + offsetY, value, size, options);
                }
            });
        });
    };
    T.drawGridLines = function(context, canvas) {
        context.lineWidth = 1;
        for (let r = 1; r < T.ROWS; r++) {
            context.beginPath();
            context.moveTo(0, r * T.BLOCK_SIZE);
            context.lineTo(canvas.width, r * T.BLOCK_SIZE);
            context.strokeStyle = "rgba(255, 255, 255, 0.03)";
            context.stroke();
        }
        for (let c = 1; c < T.COLS; c++) {
            context.beginPath();
            context.moveTo(c * T.BLOCK_SIZE, 0);
            context.lineTo(c * T.BLOCK_SIZE, canvas.height);
            context.strokeStyle = "rgba(255, 255, 255, 0.03)";
            context.stroke();
        }
        context.lineWidth = 3;
        context.strokeStyle = "#5c5c6b";
        context.beginPath();
        context.moveTo(0, 1);
        context.lineTo(canvas.width, 1);
        context.stroke();
        context.beginPath();
        context.moveTo(0, canvas.height - 1);
        context.lineTo(canvas.width, canvas.height - 1);
        context.stroke();
        context.beginPath();
        context.moveTo(1, 0);
        context.lineTo(1, canvas.height);
        context.stroke();
        context.beginPath();
        context.moveTo(canvas.width - 1, 0);
        context.lineTo(canvas.width - 1, canvas.height);
        context.stroke();
    };
    T.drawDangerOverlay = function(context, canvas, now) {
        var board = s().board;
        var highestRow = T.ROWS;
        for (let r = 0; r < T.ROWS; r++) {
            if (board[r].some(function(val) {
                return val !== 0 && val !== 8;
            })) {
                highestRow = r;
                break;
            }
        }
        if (highestRow > 9) return;
        var intensity = Math.min(.4, (9 - highestRow) / 9);
        var pulse = Math.sin(now / 250) * .1;
        var grad = context.createLinearGradient(0, 0, 0, canvas.height * .4);
        grad.addColorStop(0, "rgba(255, 50, 50, " + (intensity + pulse) + ")");
        grad.addColorStop(1, "rgba(255, 50, 50, 0)");
        context.fillStyle = grad;
        context.fillRect(0, 0, canvas.width, canvas.height);
    };
    function drawTrailEffect(context, now) {
        var trail = s().trailEffect;
        var elapsed = now - trail.startTime;
        if (elapsed >= T.TRAIL_DURATION || T.prefersReducedMotion()) {
            s().trailEffect = null;
            return;
        }
        var progress = elapsed / T.TRAIL_DURATION;
        context.save();
        context.globalAlpha = (1 - progress) * .65;
        trail.matrix.forEach(function(row, y) {
            row.forEach(function(val, x) {
                if (val !== 0) {
                    var rectX = (trail.x + x) * T.BLOCK_SIZE;
                    var end = (trail.endY + y) * T.BLOCK_SIZE;
                    var rectY = (trail.startY + y) * T.BLOCK_SIZE;
                    if (end > rectY) {
                        context.fillStyle = T.COLORS[trail.colorId];
                        context.fillRect(rectX, rectY, T.BLOCK_SIZE, end - rectY);
                    }
                }
            });
        });
        context.restore();
    }
    T.getVisualPieceY = function(now) {
        var state = s();
        var fall = state.fallEffect;
        if (!fall || T.prefersReducedMotion()) return state.pieceY;
        var p = Math.min(1, Math.max(0, (now - fall.startTime) / T.FALL_TWEEN_DURATION));
        return fall.fromY + (state.pieceY - fall.fromY) * (1 - Math.pow(1 - p, 3));
    };
    function drawLandingEffect(context, now) {
        var effect = s().landingEffect;
        if (!effect) return;
        var p = (now - effect.startTime) / T.LANDING_DURATION;
        if (p >= 1 || T.prefersReducedMotion()) {
            s().landingEffect = null;
            return;
        }
        context.save();
        context.globalAlpha = (1 - p) * .7;
        context.fillStyle = T.UI_IMPACT;
        effect.matrix.forEach(function(row, y) {
            row.forEach(function(value, x) {
                if (!value || effect.matrix[y + 1] && effect.matrix[y + 1][x]) return;
                var px = (effect.x + x) * T.BLOCK_SIZE;
                var py = (effect.y + y + 1) * T.BLOCK_SIZE;
                context.fillRect(px - p * 10, py - 3, T.BLOCK_SIZE + p * 20, 3 * (1 - p) + 1);
                context.fillRect(px + 8 - p * 16, py - p * 24, 4, 4);
                context.fillRect(px + 28 + p * 16, py - p * 18, 3, 3);
            });
        });
        context.restore();
    }
    function drawLineClearAnimations(context, now) {
        s().animatingLines = s().animatingLines.filter(function(line) {
            var elapsed = now - line.startTime;
            if (elapsed >= T.LINE_CLEAR_DURATION || T.prefersReducedMotion()) return false;
            var p = elapsed / T.LINE_CLEAR_DURATION;
            var rowY = line.y * T.BLOCK_SIZE;
            var width = T.COLS * T.BLOCK_SIZE;
            var collapse = Math.max(0, (p - .24) / .76);
            context.save();
            context.globalAlpha = 1 - collapse;
            context.fillStyle = "#ffffff";
            var height = T.BLOCK_SIZE * (1 - collapse);
            context.fillRect(0, rowY + (T.BLOCK_SIZE - height) / 2, width, height);
            context.fillStyle = T.UI_ACCENT_LIGHT;
            context.fillRect(width * collapse / 2, rowY + T.BLOCK_SIZE / 2 - 2, width * (1 - collapse), 4);
            context.globalAlpha = Math.sin(collapse * Math.PI) * .9;
            (line.cells || []).forEach(function(color, x) {
                context.fillStyle = T.COLORS[color];
                for (var i = 0; i < 3; i++) {
                    var direction = (x + i) % 2 ? -1 : 1;
                    var px = (x + .2 + i * .3) * T.BLOCK_SIZE + direction * collapse * 32;
                    var py = rowY + T.BLOCK_SIZE / 2 - Math.sin(collapse * Math.PI) * (22 + i * 14) + collapse * collapse * 40;
                    var size = (8 - i) * (1 - collapse * .6);
                    context.fillRect(px, py, size, size);
                }
            });
            context.restore();
            return true;
        });
    }
    function drawTSpinEffect(context, now) {
        var effect = s().tSpinEffect;
        if (!effect) return;
        var elapsed = now - effect.startTime;
        if (elapsed >= T.TSPIN_DURATION) {
            s().tSpinEffect = null;
            return;
        }
        var alpha = 1 - elapsed / T.TSPIN_DURATION;
        var floatY = effect.y * T.BLOCK_SIZE - elapsed / 15;
        context.save();
        context.fillStyle = "rgba(183, 138, 255, " + alpha + ")";
        context.font = '900 28px "Segoe UI"';
        context.textAlign = "center";
        context.strokeStyle = "rgba(0,0,0," + alpha + ")";
        context.lineWidth = 4;
        var textX = (effect.x + 1.5) * T.BLOCK_SIZE;
        context.strokeText("T-SPIN!", textX, floatY);
        context.fillText("T-SPIN!", textX, floatY);
        context.restore();
    }
    function drawCurrentPiece(context, now) {
        var state = s();
        if (state.gameState !== T.GAME_STATE.PLAYING) return;
        var ghostY = T.engine.getGhostY();
        var danger = state.pieceY < 0 || state.pendingGarbage.length > 0 || state.board.slice(0, T.DANGER_ROWS).some(function(row) {
            return row.some(function(value) {
                return value !== 0;
            });
        });
        var safe = danger ? T.engine.getPlacementResult(ghostY).safe : true;
        T.drawMatrix(context, state.currentPiece.matrix, state.pieceX, ghostY, T.BLOCK_SIZE, {
            ghost: true,
            color: danger ? safe ? "#64df9b" : "#ff5c6c" : null
        });
        context.save();
        if (state.rotationActive && !T.prefersReducedMotion()) {
            var elapsed = now - state.rotationStartTime;
            if (elapsed < T.ROTATION_POP_DURATION) {
                var progress = elapsed / T.ROTATION_POP_DURATION;
                var scale = 1.15 - .15 * progress;
                var cx = (state.pieceX + state.currentPiece.matrix[0].length / 2) * T.BLOCK_SIZE;
                var cy = (state.pieceY + state.currentPiece.matrix.length / 2) * T.BLOCK_SIZE;
                context.translate(cx, cy);
                context.scale(scale, scale);
                context.translate(-cx, -cy);
            } else {
                state.rotationActive = false;
            }
        }
        T.drawMatrix(context, state.currentPiece.matrix, state.pieceX, T.getVisualPieceY(now), T.BLOCK_SIZE);
        context.restore();
    }
    T.drawTutorialFocus = function(context, canvas, now) {
        if (!T.tutorial || !T.tutorial.isOpen()) return;
        var state = s();
        if (!state.currentPiece) return;
        var minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
        state.currentPiece.matrix.forEach(function(row, y) {
            row.forEach(function(value, x) {
                if (value === 0) return;
                if (x < minC) minC = x;
                if (x > maxC) maxC = x;
                if (y < minR) minR = y;
                if (y > maxR) maxR = y;
            });
        });
        if (minC === Infinity) return;
        var bx = T.BLOCK_SIZE;
        var cx = (state.pieceX + (minC + maxC + 1) / 2) * bx;
        var visualY = T.getVisualPieceY(now);
        var cy = (visualY + (minR + maxR + 1) / 2) * bx;
        context.fillStyle = T.TUTORIAL_SPOT_BG;
        context.fillRect(0, 0, canvas.width, canvas.height);
        var pool = context.createRadialGradient(cx, cy, bx * .4, cx, cy, bx * 4.6);
        pool.addColorStop(0, T.TUTORIAL_SPOT_CORE);
        pool.addColorStop(.45, T.TUTORIAL_SPOT_BG);
        pool.addColorStop(1, T.TUTORIAL_SPOT_BG);
        context.fillStyle = pool;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.globalAlpha = .45;
        T.drawMatrix(context, state.board, 0, 0, T.BLOCK_SIZE);
        context.restore();
        T.drawGridLines(context, canvas);
        context.save();
        context.globalAlpha = T.TUTORIAL_GHOST_ALPHA;
        T.drawMatrix(context, state.currentPiece.matrix, state.pieceX, T.engine.getGhostY(), T.BLOCK_SIZE, {
            ghost: true
        });
        context.restore();
        var pulse = 1 + .04 * Math.sin(now / 420);
        context.save();
        context.translate(cx, cy);
        context.scale(pulse, pulse);
        context.translate(-cx, -cy);
        context.shadowColor = T.COLORS[state.currentPiece.type];
        context.shadowBlur = 30;
        T.drawMatrix(context, state.currentPiece.matrix, state.pieceX, visualY, T.BLOCK_SIZE);
        context.shadowBlur = 0;
        T.drawMatrix(context, state.currentPiece.matrix, state.pieceX, visualY, T.BLOCK_SIZE);
        context.restore();
    };
    T.draw = function() {
        var dom = T.dom;
        var context = dom.ctx;
        var state = s();
        var now = performance.now();
        context.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
        dom.entryCtx.clearRect(0, 0, dom.entryCanvas.width, dom.entryCanvas.height);
        if (state.gameState === T.GAME_STATE.PLAYING && state.currentPiece) {
            var entry = dom.entryCtx;
            var ghostY = T.engine.getGhostY();
            var safe = T.engine.getPlacementResult(ghostY).safe;
            T.drawMatrix(entry, state.currentPiece.matrix, state.pieceX, ghostY + T.ENTRY_ROWS, T.BLOCK_SIZE, {
                ghost: true,
                color: safe ? "#64df9b" : "#ff5c6c"
            });
            T.drawMatrix(entry, state.currentPiece.matrix, state.pieceX, T.getVisualPieceY(now) + T.ENTRY_ROWS, T.BLOCK_SIZE);
            if (!safe) {
                entry.strokeStyle = "#ff5c6c";
                entry.lineWidth = 5;
                var x = Math.min(dom.entryCanvas.width - 22, Math.max(22, (state.pieceX + state.currentPiece.matrix[0].length / 2) * T.BLOCK_SIZE));
                entry.beginPath();
                entry.moveTo(x - 10, 8);
                entry.lineTo(x + 10, 28);
                entry.moveTo(x + 10, 8);
                entry.lineTo(x - 10, 28);
                entry.stroke();
            }
        }
        T.drawGridLines(context, dom.canvas);
        context.save();
        if (state.garbageRiseEffect) {
            var progress = Math.min(1, (now - state.garbageRiseEffect.startTime) / T.GARBAGE_RISE_DURATION);
            if (progress >= 1 || T.prefersReducedMotion()) state.garbageRiseEffect = null; else context.translate(0, (1 - progress) * state.garbageRiseEffect.rows * T.BLOCK_SIZE);
        }
        T.drawMatrix(context, state.board, 0, 0, T.BLOCK_SIZE);
        context.restore();
        if (state.trailEffect) drawTrailEffect(context, now);
        drawLandingEffect(context, now);
        if (state.queueEffect) T.ui.drawNext(now);
        drawCurrentPiece(context, now);
        var tutorialOpen = T.tutorial && T.tutorial.isOpen();
        if (!tutorialOpen) drawLineClearAnimations(context, now);
        drawTSpinEffect(context, now);
        T.drawDangerOverlay(context, dom.canvas, now);
        T.drawTutorialFocus(context, dom.canvas, now);
        if (tutorialOpen) drawLineClearAnimations(context, now);
        if (tutorialOpen) T.tutorial.drawBoardHints(context, dom.canvas, now);
    };
    T.playHoldAnimation = function(piece, startCol, startRow, callback) {
        if (T.prefersReducedMotion()) {
            callback();
            return;
        }
        var dom = T.dom;
        var gameRect = dom.canvas.getBoundingClientRect();
        var holdRect = dom.holdCanvas.getBoundingClientRect();
        var cw = gameRect.width / T.COLS;
        var ch = gameRect.height / T.ROWS;
        var tempCanvas = document.createElement("canvas");
        tempCanvas.width = piece.matrix[0].length * cw;
        tempCanvas.height = piece.matrix.length * ch;
        var tempCtx = tempCanvas.getContext("2d");
        tempCtx.scale(cw / T.BLOCK_SIZE, ch / T.BLOCK_SIZE);
        T.drawMatrix(tempCtx, piece.matrix, 0, 0);
        tempCanvas.style.position = "fixed";
        tempCanvas.style.left = gameRect.left + startCol * cw + "px";
        tempCanvas.style.top = gameRect.top + startRow * ch + "px";
        tempCanvas.style.zIndex = "1000";
        tempCanvas.style.transition = "all " + T.HOLD_ANIM_DURATION / 1e3 + "s cubic-bezier(0.5, 0, 0.2, 1)";
        tempCanvas.style.opacity = "1";
        document.body.appendChild(tempCanvas);
        void tempCanvas.offsetWidth;
        tempCanvas.style.left = holdRect.left + holdRect.width / 2 - tempCanvas.width / 2 + "px";
        tempCanvas.style.top = holdRect.top + holdRect.height / 2 - tempCanvas.height / 2 + "px";
        tempCanvas.style.transform = "scale(0.8)";
        tempCanvas.style.opacity = "0.5";
        setTimeout(function() {
            document.body.removeChild(tempCanvas);
            callback();
        }, T.HOLD_ANIM_DURATION);
    };
})(window.Tetris = window.Tetris || {});