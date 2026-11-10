(function (global) {
    "use strict";

    var durations = {
        "audio/margo/audio-001.ogg": 7.0665,
        "audio/margo/audio-002.ogg": 4.8065,
        "audio/margo/audio-003.ogg": 5.6865,
        "audio/margo/audio-004.ogg": 4.7865,
        "audio/margo/audio-005.ogg": 4.2065,
        "audio/margo/audio-006.ogg": 2.5865,
        "audio/margo/audio-007.ogg": 34.2865,
        "audio/margo/audio-008.ogg": 4.3865,
        "audio/margo/audio-009.ogg": 11.1865,
        "audio/margo/audio-010.ogg": 1.0065,
        "audio/margo/audio-011.ogg": 7.9265,
        "audio/margo/audio-012.ogg": 7.9265,
        "audio/margo/audio-013.ogg": 1.7665,
        "audio/margo/audio-014.ogg": 1.1265,
        "audio/margo/audio-015.ogg": 2.1865,
        "audio/margo/audio-016.ogg": 1.2665,
        "audio/margo/grupo/margo1.ogg": 2.5665,
        "audio/margo/grupo/margo2.ogg": 2.3665,
        "audio/margo/grupo/margo3.ogg": 1.5465,
        "audio/margo/grupo/margo4.ogg": 3.7865,
        "audio/margo/grupo/margo5.ogg": 3.3665,
        "audio/zulmi/audio-001.ogg": 10.01,
        "audio/maya/maya 1.mp3": 7.224,
        "audio/maya/maya 2.mp3": 10.224
    };

    global.Msg = global.Msg || {};
    global.Msg.audioMetadata = {
        duration: function (source) {
            var path = String(source || "").split(/[?#]/, 1)[0].replace(/\\/g, "/").toLowerCase();
            return durations[path] || 0;
        },
        durations: durations
    };
})(window);
