(function (global) {
    "use strict";

    var probe = document.createElement("audio");
    var supportsVorbis = !!(probe.canPlayType && probe.canPlayType('audio/ogg; codecs="vorbis"'));
    var supportsOpus = !!(probe.canPlayType && probe.canPlayType('audio/ogg; codecs="opus"'));
    var VERSION = "5";

    function versioned(url) {
        var parsed = new URL(url, global.location.href);
        parsed.searchParams.set("v", VERSION);
        return parsed.href;
    }

    function sourceForBrowser(source) {if(String(source).startsWith('/api/')){if(!supportsVorbis||!supportsOpus){var protectedURL=new URL(source,global.location.href);protectedURL.searchParams.set('format','mp3');return protectedURL.href;}return source;}
        if (!/\.ogg(?:[?#]|$)/i.test(String(source || ""))) return source;

        try {
            var resolved = new URL(source, global.location.href);
            if (resolved.protocol === "file:") return source;
            if (supportsVorbis && supportsOpus) return versioned(resolved.href);
            var appsIndex = resolved.pathname.indexOf("/apps/");
            var assetsIndex = resolved.pathname.indexOf("/assets/");
            var rootIndex = appsIndex < 0 ? assetsIndex : assetsIndex < 0 ? appsIndex : Math.min(appsIndex, assetsIndex);
            if (rootIndex < 0) return versioned(resolved.href.replace(/\.ogg$/i, ".mp3"));
            var sitePrefix = resolved.pathname.slice(0, rootIndex);
            resolved.pathname = sitePrefix + "/audio-fallback" + resolved.pathname.slice(rootIndex).replace(/\.ogg$/i, ".mp3");
            return versioned(resolved.href);
        } catch (error) {
            return String(source).replace(/\.ogg(?=([?#]|$))/i, ".mp3");
        }
    }

    global.AudioFormats = {
        supportsVorbis: supportsVorbis,
        supportsOpus: supportsOpus,
        source: sourceForBrowser
    };
    global.audioSource = sourceForBrowser;
})(window);
