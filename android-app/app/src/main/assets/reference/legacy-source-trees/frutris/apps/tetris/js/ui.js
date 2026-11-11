(function(T) {
    var s = function() {
        return T.state;
    };
    T.ui = {};
    var bestScore = 0;
    var lastQueuedPieces = [];
    var recordMerged = false;
    T.ui.recordCelebrating = false;
    var celebrationTimer = null;
    T.ui.clearCelebration = function() {
        clearTimeout(celebrationTimer);
        T.dom.celebrationToast.classList.add("hidden");
        T.dom.celebrationToast.textContent = "";
    };
    T.ui.celebrate = function(messages) {
        var toast = T.dom.celebrationToast;
        clearTimeout(celebrationTimer);
        toast.textContent = messages.join("\n");
        toast.style.setProperty("--celebration-duration", T.CELEBRATION_DURATION / 1e3 + "s");
        toast.classList.remove("hidden");
        animate(toast, "celebration-pop");
        celebrationTimer = setTimeout(T.ui.clearCelebration, T.CELEBRATION_DURATION);
    };
    function updateRecordMerge() {
        var state = s();
        var panel = T.dom.score.closest(".score-panel");
        var merged = state.recordEligible && state.score > 0 && state.score === bestScore;
        if (merged === recordMerged) return;
        if (merged) {
            var scoreRect = T.dom.score.getBoundingClientRect();
            var recordRect = T.dom.bestScore.getBoundingClientRect();
            panel.style.setProperty("--merge-x", scoreRect.left + scoreRect.width / 2 - recordRect.left - recordRect.width / 2 + "px");
            panel.style.setProperty("--merge-y", scoreRect.top + scoreRect.height / 2 - recordRect.top - recordRect.height / 2 + "px");
            panel.style.setProperty("--merge-scale", parseFloat(getComputedStyle(T.dom.score).fontSize) / parseFloat(getComputedStyle(T.dom.bestScore).fontSize));
            animate(T.dom.score, "record-merge");
        } else {
            T.dom.score.classList.remove("record-merge");
        }
        panel.classList.toggle("record-merged", merged);
        recordMerged = merged;
    }
    function animate(element, className) {
        if (T.prefersReducedMotion()) return;
        element.classList.remove(className);
        void element.offsetWidth;
        element.classList.add(className);
    }
    T.ui.playFeedback = animate;
    T.ui.loadRecord = function() {
        try {
            var stored = Number(localStorage.getItem(T.RECORD_STORAGE_KEY));
            bestScore = Number.isSafeInteger(stored) && stored >= 0 ? stored : 0;
        } catch (err) {
            bestScore = 0;
        }
        T.dom.bestScore.textContent = bestScore;
    };
    T.ui.updateScore = function() {
        var state = s();
        if (T.dom.score.textContent !== String(state.score)) {
            T.dom.score.textContent = state.score;
            if (state.score > 0) animate(T.dom.score, "score-pop");
        }
        if (state.recordEligible && !state.goalReached && state.score >= T.RECORD_GOAL_SCORE) {
            state.goalReached = true;
            T.audio.play("record");
            T.ui.startRecordCelebration();
        }
        if (state.recordEligible && state.score > bestScore) {
            if (!state.newRecord) {
                if (!state.goalReached) T.audio.play("record");
            }
            bestScore = state.score;
            state.newRecord = true;
            T.dom.bestScore.textContent = bestScore;
            animate(T.dom.bestScore.closest(".panel"), "record-glow");
            try {
                localStorage.setItem(T.RECORD_STORAGE_KEY, String(bestScore));
            } catch (err) {}
        }
        updateRecordMerge();
    };
    T.ui.startRecordCelebration = function() {
        if (T.ui.recordCelebrating) return;
        T.ui.recordCelebrating = true;
        if (T.input && T.input.cancel) T.input.cancel();
        T.intro.playRecordCelebration(function() {
            if (T.input && T.input.cancel) T.input.cancel();
            T.ui.recordCelebrating = false;
            s().lastTime = performance.now();
        });
    };
    T.ui.updateLevel = function() {
        var state = s();
        var value = String(state.level);
        if (T.dom.level.textContent !== value) {
            T.dom.level.textContent = value;
            animate(T.dom.level, "score-pop");
        }
        var status = T.LINES_PER_LEVEL - state.totalLines % T.LINES_PER_LEVEL + " LINHAS PARA SUBIR";
        if (!state.recordEligible) status = "TREINO"; else if (state.pendingGarbage.length) status = "↑ " + state.pendingGarbage.length + (state.pendingGarbage.length === 1 ? " LINHA PENDENTE" : " LINHAS PENDENTES"); else if (state.level >= T.GARBAGE_TIMED_START_LEVEL) status = "PAREDE EM " + Math.max(0, Math.ceil((T.engine.getGarbageInterval() - state.garbageElapsed) / 1e3)) + "s";
        if (T.dom.levelStatus.textContent !== status) T.dom.levelStatus.textContent = status;
        T.dom.levelPanel.classList.toggle("garbage-pending", state.pendingGarbage.length > 0);
    };
    function drawPreview(context, piece, width, top, height, scale) {
        var minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        piece.matrix.forEach(function(row, y) {
            row.forEach(function(value, x) {
                if (!value) return;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            });
        });
        var size = T.PREVIEW_BLOCK_SIZE * (scale === undefined ? 1 : scale);
        var x = (width / size - (maxX - minX + 1)) / 2 - minX;
        var y = (top + (height - (maxY - minY + 1) * size) / 2) / size - minY;
        T.drawMatrix(context, piece.matrix, x, y, size);
    }
    function drawCompactNext(context, canvas, state, effect, p) {
        var primaryHeight = T.NEXT_COMPACT_PRIMARY_HEIGHT;
        var secondaryHeight = T.NEXT_COMPACT_SECONDARY_HEIGHT;
        var slots = [ {
            x: 0,
            y: 0,
            width: canvas.width,
            height: primaryHeight
        }, {
            x: 0,
            y: primaryHeight,
            width: canvas.width / 2,
            height: secondaryHeight
        }, {
            x: canvas.width / 2,
            y: primaryHeight,
            width: canvas.width / 2,
            height: secondaryHeight
        } ];
        slots.forEach(function(slot, idx) {
            context.fillStyle = idx === 0 ? "#303644" : "#1a1d27";
            context.fillRect(slot.x + 2, slot.y + 2, slot.width - 4, slot.height - 4);
            context.strokeStyle = idx === 0 ? T.UI_ACCENT : "#3a4050";
            context.lineWidth = 2;
            context.strokeRect(slot.x + 2, slot.y + 2, slot.width - 4, slot.height - 4);
        });
        context.save();
        context.beginPath();
        context.rect(4, 4, canvas.width - 8, canvas.height - 8);
        context.clip();
        if (effect && p < 1) {
            drawPreview(context, effect.previous[0], canvas.width, -p * primaryHeight, primaryHeight);
        }
        state.nextPieces.slice(0, state.visibleNext).forEach(function(piece, idx) {
            var target = slots[idx];
            var origin = slots[idx + 1] || {
                x: canvas.width,
                y: primaryHeight,
                width: canvas.width / 2,
                height: secondaryHeight
            };
            var x = origin.x + (target.x - origin.x) * p;
            var y = origin.y + (target.y - origin.y) * p;
            var width = origin.width + (target.width - origin.width) * p;
            var height = origin.height + (target.height - origin.height) * p;
            var scale = idx === 0 ? T.NEXT_SECONDARY_SCALE + (1 - T.NEXT_SECONDARY_SCALE) * p : T.NEXT_SECONDARY_SCALE;
            context.save();
            context.translate(x, 0);
            drawPreview(context, piece, width, y, height, scale);
            context.restore();
        });
        context.restore();
    }
    T.ui.drawNext = function(now) {
        var state = s();
        var context = T.dom.nextCtx;
        var canvas = T.dom.nextCanvas;
        var effect = state.queueEffect;
        var p = effect ? Math.min(1, Math.max(0, (now - effect.startTime) / T.QUEUE_SLIDE_DURATION)) : 1;
        if (T.prefersReducedMotion()) p = 1;
        context.clearRect(0, 0, canvas.width, canvas.height);
        if (T.dom.gameArea.classList.contains("compact-layout")) {
            drawCompactNext(context, canvas, state, effect, p);
            if (p >= 1) state.queueEffect = null;
            return;
        }
        for (var idx = 0; idx < state.visibleNext; idx++) {
            var top = idx * T.NEXT_SLOT_HEIGHT;
            context.fillStyle = idx === 0 ? "#303644" : "#1a1d27";
            context.fillRect(2, top + 2, canvas.width - 4, T.NEXT_SLOT_HEIGHT - 10);
            context.strokeStyle = idx === 0 ? T.UI_ACCENT : "#3a4050";
            context.lineWidth = 2;
            context.strokeRect(2, top + 2, canvas.width - 4, T.NEXT_SLOT_HEIGHT - 10);
        }
        context.save();
        context.beginPath();
        context.rect(4, 4, canvas.width - 8, canvas.height - 8);
        context.clip();
        if (effect && p < 1) {
            drawPreview(context, effect.previous[0], canvas.width, -p * T.NEXT_SLOT_HEIGHT, T.NEXT_SLOT_HEIGHT);
        }
        state.nextPieces.slice(0, state.visibleNext).forEach(function(piece, idx) {
            var top = (idx + 1 - p) * T.NEXT_SLOT_HEIGHT;
            var scale = idx === 0 ? T.NEXT_SECONDARY_SCALE + (1 - T.NEXT_SECONDARY_SCALE) * p : T.NEXT_SECONDARY_SCALE;
            drawPreview(context, piece, canvas.width, top, T.NEXT_SLOT_HEIGHT, scale);
        });
        context.restore();
        if (p >= 1) state.queueEffect = null;
    };
    T.ui.updatePanels = function() {
        var state = s();
        var holdCtx = T.dom.holdCtx;
        var holdCanvas = T.dom.holdCanvas;
        holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        if (lastQueuedPieces[1] && lastQueuedPieces[1] === state.nextPieces[0] && !T.prefersReducedMotion()) {
            state.queueEffect = {
                previous: lastQueuedPieces.slice(),
                startTime: performance.now()
            };
        } else if (lastQueuedPieces[0] !== state.nextPieces[0]) {
            state.queueEffect = null;
        }
        lastQueuedPieces = state.nextPieces.slice();
        T.ui.drawNext(performance.now());
        if (state.holdPiece && !state.hideHoldVisual) {
            drawPreview(holdCtx, state.holdPiece, holdCanvas.width, 0, holdCanvas.height);
        }
        T.dom.holdCanvas.style.opacity = state.canHold ? "1" : ".45";
    };
    T.adjustCanvasSizes = function() {
        var isMobile = window.innerWidth <= T.MOBILE_BREAKPOINT || window.innerHeight < T.NEXT_COMPACT_MAX_HEIGHT;
        var compact = window.innerWidth <= T.MOBILE_BREAKPOINT && window.innerHeight > window.innerWidth;
        T.dom.nextCanvas.height = compact ? T.NEXT_COMPACT_PRIMARY_HEIGHT + T.NEXT_COMPACT_SECONDARY_HEIGHT : isMobile ? T.NEXT_CANVAS_HEIGHT_MOBILE : T.NEXT_CANVAS_HEIGHT_DESKTOP;
        s().visibleNext = isMobile ? T.NEXT_VISIBLE_MOBILE : T.NEXT_VISIBLE_DESKTOP;
        s().queueEffect = null;
        lastQueuedPieces = [];
        var area = T.dom.gameArea;
        area.classList.toggle("compact-layout", compact);
        var rect = area.getBoundingClientRect();
        var style = getComputedStyle(area);
        var gap = parseFloat(style.columnGap) || 0;
        var rowGap = parseFloat(style.rowGap) || 0;
        var sideWidth = compact ? Math.floor(Math.min(T.COMPACT_SIDE_MAX_WIDTH, Math.max(T.COMPACT_SIDE_MIN_WIDTH, rect.width * T.COMPACT_SIDE_WIDTH_RATIO))) : Math.floor(Math.min(T.SIDE_MAX_WIDTH, Math.max(T.SIDE_MIN_WIDTH, rect.width * T.SIDE_WIDTH_RATIO)));
        area.style.setProperty("--side-width", sideWidth + "px");
        var hudSpace = T.dom.gameHud.getBoundingClientRect().height + rowGap;
        var availableWidth = compact ? rect.width : rect.width - sideWidth * 2 - gap * 2;
        var availableHeight = rect.height - hudSpace - T.BOARD_IMPACT_SPACE;
        var boardWidth = Math.max(0, Math.floor(Math.min(T.MAX_BOARD_WIDTH, availableHeight / (2 + T.ENTRY_ROWS / T.COLS), availableWidth)));
        area.style.setProperty("--board-width", boardWidth + "px");
        area.style.setProperty("--board-height", boardWidth * 2 + "px");
        area.style.setProperty("--entry-height", boardWidth * T.ENTRY_ROWS / T.COLS + "px");
    };
    T.ui.showGameOverModal = function(score) {
        T.tutorial.close();
        T.dom.helpBtn.classList.remove("hidden");
        T.dom.finalScore.textContent = score;
        T.dom.finalRecord.textContent = bestScore;
        T.dom.newRecord.classList.toggle("hidden", !s().newRecord);
        T.dom.modal.classList.remove("hidden");
        setTimeout(function() {
            T.dom.modal.classList.add("show");
        }, 10);
    };
    T.ui.hideGameOverModal = function() {
        var modal = T.dom.modal;
        T.dom.helpBtn.classList.add("hidden");
        modal.classList.remove("show");
        setTimeout(function() {
            modal.classList.add("hidden");
        }, 300);
    };
    T.ui.openTutorial = function() {
        if (s().gameState !== T.GAME_STATE.GAMEOVER) return;
        T.ui.hideGameOverModal();
        T.startNewGame();
        T.tutorial.start();
    };
    var ACTIONS = {
        restart: T.startNewGame,
        tutorial: T.ui.openTutorial,
        exitTutorial: function() {
            T.audio.play("ui");
            T.tutorial.close();
        }
    };
    T.ui.bindActions = function() {
        document.addEventListener("click", function(e) {
            var target = e.target.closest ? e.target.closest("[data-action]") : null;
            if (!target) return;
            var handler = ACTIONS[target.dataset.action];
            if (handler) handler();
        });
        T.dom.helpBtn.classList.add("hidden");
        T.dom.helpBtn.addEventListener("click", T.ui.openTutorial);
    };
})(window.Tetris = window.Tetris || {});