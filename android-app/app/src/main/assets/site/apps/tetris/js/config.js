(function(T) {
    T.ROWS = 20;
    T.HIDDEN_ROWS = 4;
    T.ENTRY_ROWS = 2;
    T.LOCK_DELAY = 1e3;
    T.LOCK_RESET_LIMIT = 15;
    T.DANGER_ROWS = 4;
    T.COLS = 10;
    T.BLOCK_SIZE = 40;
    T.BASE_DROP_INTERVAL = 1e3;
    T.MIN_DROP_INTERVAL = 100;
    T.LINES_PER_LEVEL = 10;
    T.LEVEL_SPEED_FACTOR = .8;
    T.GARBAGE_START_LEVEL = 6;
    T.GARBAGE_TIMED_START_LEVEL = 15;
    T.GARBAGE_BASE_INTERVAL = 2e4;
    T.GARBAGE_INTERVAL_STEP = 1e3;
    T.GARBAGE_MIN_INTERVAL = 8e3;
    T.GARBAGE_MAX_PENDING = 6;
    T.GARBAGE_COLOR_ID = 9;
    T.GARBAGE_RISE_DURATION = 240;
    T.CELEBRATION_DURATION = 1500;
    T.LINE_SCORES = [ 0, 100, 300, 500, 800 ];
    T.TSPIN_SCORE = 400;
    T.RECORD_GOAL_SCORE = 3e4;
    T.QUEUE_SIZE = 5;
    T.DAS_DELAY = 150;
    T.ARR_SPEED = 40;
    T.GESTURE_DEADZONE = 10;
    T.GESTURE_AXIS_DISTANCE = 14;
    T.GESTURE_HORIZONTAL_RATIO = 1.35;
    T.GESTURE_VERTICAL_RATIO = 1.8;
    T.GESTURE_HOLD_RATIO = 2;
    T.GESTURE_STEP_MIN = 18;
    T.GESTURE_STEP_MAX = 32;
    T.GESTURE_VERTICAL_STEP_RATIO = 1.2;
    T.GESTURE_SWIPE_MIN = 54;
    T.GESTURE_SWIPE_STEPS = 2;
    T.GESTURE_FAST_DROP_TIME = 250;
    T.GESTURE_TAP_MAX_TIME = 300;
    T.KICK_TESTS = [ [ 0, 0 ], [ -1, 0 ], [ 1, 0 ], [ 0, -1 ], [ -1, -1 ], [ 1, -1 ], [ 0, -2 ], [ -2, 0 ], [ 2, 0 ] ];
    T.COLORS = [ null, "#00bcd4", "#3f51b5", "#ff9800", "#ffeb3b", "#4caf50", "#9c27b0", "#f44336", "#1a1a1a", "#78838e" ];
    T.PIECES = [ [], [ [ 0, 0, 0, 0 ], [ 1, 1, 1, 1 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ] ], [ [ 2, 0, 0 ], [ 2, 2, 2 ], [ 0, 0, 0 ] ], [ [ 0, 0, 3 ], [ 3, 3, 3 ], [ 0, 0, 0 ] ], [ [ 4, 4 ], [ 4, 4 ] ], [ [ 0, 5, 5 ], [ 5, 5, 0 ], [ 0, 0, 0 ] ], [ [ 0, 6, 0 ], [ 6, 6, 6 ], [ 0, 0, 0 ] ], [ [ 7, 7, 0 ], [ 0, 7, 7 ], [ 0, 0, 0 ] ] ];
    T.TUTORIAL_PIECE_TYPES = [ 1, 2, 3, 5, 6, 7 ];
    T.TSPIN_TYPE = 6;
    T.UI_ACCENT = "#b78aff";
    T.UI_ACCENT_FILL = "rgba(183,138,255,0.12)";
    T.UI_ACCENT_LIGHT = "#d4bcff";
    T.UI_IMPACT = "#efe7ff";
    T.TUTORIAL_STORAGE_KEY = "tetrisTutorialVisto6";
    T.RECORD_STORAGE_KEY = "frutrisWeeklyBestV1";
    T.SOUND_STORAGE_KEY = "tetrisSoundMutedV1";
    T.AUDIO_VOLUME = .22;
    T.AUDIO_MAX_VOICES = 16;
    T.AUDIO_ATTACK = .004;
    T.AUDIO_RELEASE = .012;
    T.AUDIO_FILTER_FREQUENCY = 3200;
    T.AUDIO_THROTTLE = {
        move: 35,
        fall: 80,
        softDrop: 45,
        rotate: 50,
        hold: 100,
        swap: 100,
        wrong: 400
    };
    T.SOUND_EFFECTS = {
        move: [ [ 180, 240, .028, 0, "square", .15 ] ],
        rotate: [ [ 420, 740, .065, 0, "square", .2 ] ],
        fall: [ [ 100, 80, .025, 0, "triangle", .12 ] ],
        softDrop: [ [ 140, 90, .035, 0, "triangle", .3 ] ],
        hardDrop: [ [ 480, 60, .13, 0, "sawtooth", .18 ], [ 85, 42, .12, .06, "triangle", .55 ] ],
        lock: [ [ 110, 55, .075, 0, "triangle", .45 ] ],
        hold: [ [ 420, 660, .06, 0, "square", .18 ], [ 840, 560, .065, .06, "square", .16 ] ],
        swap: [ [ 660, 420, .06, 0, "square", .18 ], [ 560, 840, .065, .06, "square", .16 ] ],
        clear1: [ [ 523, 523, .09, 0, "square", .2 ], [ 659, 659, .12, .08, "square", .2 ] ],
        clear2: [ [ 523, 523, .08, 0, "square", .2 ], [ 659, 659, .08, .07, "square", .2 ], [ 784, 784, .13, .14, "square", .2 ] ],
        clear3: [ [ 523, 523, .07, 0, "square", .2 ], [ 659, 659, .07, .06, "square", .2 ], [ 784, 784, .07, .12, "square", .2 ], [ 1047, 1047, .15, .18, "square", .2 ] ],
        clear4: [ [ 523, 523, .07, 0, "square", .22 ], [ 659, 659, .07, .06, "square", .22 ], [ 784, 784, .07, .12, "square", .22 ], [ 1047, 1047, .2, .18, "square", .22 ], [ 523, 523, .2, .18, "triangle", .2 ] ],
        tSpin: [ [ 587, 880, .08, 0, "square", .2 ], [ 1175, 1175, .1, .08, "square", .2 ], [ 880, 1175, .16, .17, "square", .2 ] ],
        start: [ [ 262, 262, .075, 0, "square", .17 ], [ 330, 330, .075, .08, "square", .17 ], [ 523, 523, .15, .16, "square", .18 ] ],
        gameOver: [ [ 392, 392, .16, 0, "triangle", .35 ], [ 330, 330, .16, .16, "triangle", .35 ], [ 262, 262, .18, .32, "triangle", .35 ], [ 196, 98, .3, .5, "triangle", .35 ] ],
        correct: [ [ 660, 660, .07, 0, "square", .16 ], [ 880, 880, .12, .07, "square", .16 ] ],
        wrong: [ [ 165, 130, .07, 0, "triangle", .2 ] ],
        complete: [ [ 523, 523, .09, 0, "square", .18 ], [ 659, 659, .09, .09, "square", .18 ], [ 784, 784, .09, .18, "square", .18 ], [ 1047, 1047, .22, .27, "square", .18 ] ],
        record: [ [ 784, 784, .07, 0, "triangle", .25 ], [ 1047, 1047, .07, .07, "triangle", .25 ], [ 1568, 1568, .16, .14, "triangle", .25 ] ],
        ui: [ [ 740, 620, .035, 0, "triangle", .25 ] ],
        levelUp: [ [ 523, 523, .1, 0, "triangle", .25 ], [ 659, 659, .1, .1, "triangle", .25 ], [ 784, 784, .1, .2, "triangle", .25 ], [ 1047, 1047, .3, .3, "triangle", .3 ] ],
        comboWin: [ [ 659, 659, .08, 0, "triangle", .22 ], [ 784, 784, .08, .08, "triangle", .22 ], [ 1047, 1047, .18, .16, "triangle", .28 ] ]
    };
    T.TUTORIAL_SLOWMO_SCALE = .2;
    T.TUTORIAL_SLOWMO_TIME = 1e3;
    T.TUTORIAL_STEP_OK_TIME = 650;
    T.TUTORIAL_PRACTICE_INTRO_TIME = 750;
    T.TUTORIAL_PRACTICE_OK_TIME = 1200;
    T.TUTORIAL_MOVE_DISTANCE = 2;
    T.TUTORIAL_DROP_DISTANCE = 3;
    T.TUTORIAL_SPAWN_ROW = 3;
    T.TUTORIAL_PRACTICE_COUNT = 3;
    T.TUTORIAL_RESERVE_QUEUE = [ 1, 6, 2, 3, 5 ];
    T.TUTORIAL_GESTURE_LOOP = 1500;
    T.TUTORIAL_SHAKE_TIME = 400;
    T.TUTORIAL_SHAKE_COOLDOWN = 700;
    T.TUTORIAL_STAGE_W = 320;
    T.TUTORIAL_STAGE_H = 170;
    T.TUTORIAL_FOCUS_Y = .55;
    T.TUTORIAL_SPOT_BG = "#0b0b12";
    T.TUTORIAL_SPOT_CORE = "#33333f";
    T.TUTORIAL_GHOST_ALPHA = .4;
    T.TUTORIAL_GESTURE = {
        radius: 22,
        dot: 9,
        trailLength: 108,
        trailThickness: 14,
        glow: 20,
        ringGap: 26,
        delay: .1,
        travel: .62,
        hold: .08
    };
    T.MOBILE_BREAKPOINT = 768;
    T.NEXT_COMPACT_MAX_HEIGHT = 500;
    T.MAX_BOARD_WIDTH = 520;
    T.SIDE_MIN_WIDTH = 48;
    T.SIDE_MAX_WIDTH = 100;
    T.SIDE_WIDTH_RATIO = .16;
    T.COMPACT_SIDE_MIN_WIDTH = 68;
    T.COMPACT_SIDE_MAX_WIDTH = 120;
    T.COMPACT_SIDE_WIDTH_RATIO = .24;
    T.BOARD_IMPACT_SPACE = 8;
    T.NEXT_VISIBLE_DESKTOP = 5;
    T.NEXT_VISIBLE_MOBILE = 3;
    T.PREVIEW_BLOCK_SIZE = 28;
    T.NEXT_SECONDARY_SCALE = .65;
    T.NEXT_COMPACT_PRIMARY_HEIGHT = 100;
    T.NEXT_COMPACT_SECONDARY_HEIGHT = 60;
    T.NEXT_SLOT_HEIGHT = 124;
    T.NEXT_CANVAS_HEIGHT_DESKTOP = T.NEXT_SLOT_HEIGHT * T.NEXT_VISIBLE_DESKTOP;
    T.NEXT_CANVAS_HEIGHT_MOBILE = T.NEXT_SLOT_HEIGHT * T.NEXT_VISIBLE_MOBILE;
    T.REDUCED_MOTION = false;
    T.prefersReducedMotion = function() {
        return T.REDUCED_MOTION;
    };
    T.TRAIL_DURATION = 380;
    T.FALL_TWEEN_DURATION = 100;
    T.LANDING_DURATION = 280;
    T.QUEUE_SLIDE_DURATION = 120;
    T.ROTATION_POP_DURATION = 80;
    T.LINE_CLEAR_DURATION = 420;
    T.TSPIN_DURATION = 1e3;
    T.GAMEOVER_ROW_INTERVAL = 35;
    T.HOLD_ANIM_DURATION = 150;
})(window.Tetris = window.Tetris || {});