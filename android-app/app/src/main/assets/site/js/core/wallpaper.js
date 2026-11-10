(function(S) {
    "use strict";
    var storageKey = "celular.wallpaper";
    var revision = 0;
    function resolve(src) {
        if (typeof src !== "string" || !/^img\/(camera|downloads|Wallpapers|zap|oculto)\//.test(src)) return null;
        try {
            var base = new URL("apps/galeria/", document.baseURI);
            var url = new URL(src, base);
            var decoded = decodeURIComponent(url.pathname);
            if (url.protocol !== base.protocol || url.host !== base.host || !url.pathname.startsWith(base.pathname + "img/") || decoded.indexOf("\\") !== -1 || /(?:^|\/)\.\.(?:\/|$)/.test(decoded) || url.search || url.hash || !/\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(decoded)) return null;
            return url.href;
        } catch (error) {
            return null;
        }
    }
    function normalizeCrop(crop) {
        if (crop === undefined) return {
            zoom: 1,
            x: 50,
            y: 50
        };
        if (!crop || [ "zoom", "x", "y" ].some(function(key) {
            return typeof crop[key] !== "number" || !Number.isFinite(crop[key]);
        })) return null;
        return {
            zoom: Math.max(1, Math.min(4, crop.zoom)),
            x: Math.max(0, Math.min(100, crop.x)),
            y: Math.max(0, Math.min(100, crop.y))
        };
    }
    function apply(src, crop, persist, callback) {
        var url = resolve(src);
        crop = normalizeCrop(crop);
        if (!url || !crop) {
            if (callback) callback({
                ok: false
            });
            return;
        }
        var token = ++revision;
        var image = new Image;
        image.onload = function() {
            if (token !== revision) return;
            var screen = S.$ ? S.$("#screen") : null;
            var width = screen && screen.clientWidth || 320;
            var height = screen && screen.clientHeight || 640;
            var imageWidth = image.naturalWidth || width;
            var imageHeight = image.naturalHeight || height;
            var scale = Math.max(width / imageWidth, height / imageHeight) * crop.zoom;
            document.documentElement.style.setProperty("--phone-wallpaper-size", imageWidth * scale / width * 100 + "% " + imageHeight * scale / height * 100 + "%");
            document.documentElement.style.setProperty("--phone-wallpaper-position", crop.x + "% " + crop.y + "%");
            document.documentElement.style.setProperty("--phone-wallpaper", "url(" + JSON.stringify(url) + ")");
            document.documentElement.classList.add("has-custom-wallpaper");
            var saved = true;
            if (persist) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify({
                        src,
                        crop
                    }));
                } catch (error) {
                    saved = false;
                }
            }
            if (callback) callback({
                ok: true,
                saved
            });
        };
        image.onerror = function() {
            if (token === revision && callback) callback({
                ok: false
            });
        };
        image.src = url;
    }
    S.wallpaper = {
        resolve,
        normalizeCrop,
        init: function() {
            try {
                var saved = localStorage.getItem(storageKey);
                if (saved) {
                    var selection;
                    try {
                        selection = JSON.parse(saved);
                    } catch (error) {
                        selection = {
                            src: saved
                        };
                    }
                    if (selection && typeof selection === "object") apply(selection.src, selection.crop, false);
                }
            } catch (error) {}
            S.bus.on("app:event", function(event) {
                if (event.id !== "galeria" || event.name !== "set-wallpaper") return;
                if (S.nav.current() !== "galeria" || S.lock.isLocked() || S.device.isUnavailable()) return;
                apply(event.payload && event.payload.src, event.payload && event.payload.crop, true, function(result) {
                    S.bridge.emit("galeria", "wallpaper-result", result);
                });
            });
        }
    };
})(window.Celular = window.Celular || {});