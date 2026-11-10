(function(M) {
    "use strict";
    var viewer = null;
    var stage = null;
    var img = null;
    var mediaStatus = null;
    var mediaMessage = null;
    var mediaRetry = null;
    var canvas = null;
    var nameEl = null;
    var zoomEl = null;
    var editor = null;
    var currentItem = null;
    var wallpaperTimer = 0;
    function wallpaperStatus(text) {
        M.$("#wallpaperStatus").textContent = text;
    }
    var zoom = 1;
    var panX = 0;
    var panY = 0;
    var pointers = {};
    var pinchStart = 0;
    var pinchZoom = 1;
    var swipe = null;
    var closeTimer = 0;
    function showPhoto(item) {
        currentItem = item;
        clearTimeout(wallpaperTimer);
        M.$("#wallpaperButton").disabled = true;
        wallpaperStatus("");
        if (mediaStatus) mediaStatus.hidden = false;
        if (mediaMessage) mediaMessage.textContent = "Carregando foto…";
        if (mediaRetry) mediaRetry.hidden = true;
        img.hidden = false;
        img.classList.remove("is-media-error");
        img.src = item.src;
        img.alt = item.name;
        nameEl.textContent = item.name;
        zoom = 1;
        panX = 0;
        panY = 0;
        pointers = {};
        swipe = null;
        resetFilters();
        applyTransform();
    }
    function applyTransform() {
        img.style.transform = "translate(" + panX + "px," + panY + "px) scale(" + zoom + ")";
        canvas.style.transform = img.style.transform;
        zoomEl.textContent = Math.round(zoom * 100) + "%";
    }
    function setZoom(value, keepPan) {
        zoom = M.clamp(value, 1, 5);
        if (zoom === 1) {
            panX = 0;
            panY = 0;
        } else if (!keepPan) {
            panX = 0;
            panY = 0;
        }
        applyTransform();
    }
    function applyFilters() {
        var value = function(name) {
            var input = editor.querySelector('input[data-filter="' + name + '"]');
            return input ? input.value : null;
        };
        img.style.filter = "brightness(" + value("brightness") + "%) " + "contrast(" + value("contrast") + "%) " + "saturate(" + value("saturate") + "%) " + "hue-rotate(" + value("hue") + "deg)";
        canvas.style.filter = img.style.filter;
        var adjustments = {
            brightness: {
                normal: 100,
                range: 100
            },
            contrast: {
                normal: 100,
                range: 100
            },
            saturate: {
                normal: 100,
                range: 200
            },
            hue: {
                normal: 0,
                range: 360
            }
        };
        var key = currentItem && currentItem.clueAdjustment;
        var adjustment = adjustments[key];
        var strength = adjustment ? Math.abs(Number(value(key)) - adjustment.normal) / adjustment.range : 0;
        var revealed = M.clueImage.render(canvas, img, currentItem, strength);
        canvas.hidden = !revealed;
        img.hidden = revealed;
    }
    function resetFilters() {
        [ [ "brightness", 100 ], [ "contrast", 100 ], [ "saturate", 100 ], [ "hue", 0 ] ].forEach(function(pair) {
            var input = editor.querySelector('input[data-filter="' + pair[0] + '"]');
            if (input) input.value = pair[1];
        });
        applyFilters();
    }
    function distance() {
        var points = Object.keys(pointers).map(function(key) {
            return pointers[key];
        });
        var dx = points[0].x - points[1].x;
        var dy = points[0].y - points[1].y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    M.viewer = {
        init: function() {
            viewer = M.$("#viewer");
            stage = M.$("#viewerStage");
            img = M.$("#viewerImg");
            mediaStatus = M.$("#viewerMediaStatus");
            mediaMessage = M.$("#viewerMediaMessage");
            mediaRetry = M.$("#viewerMediaRetry");
            canvas = M.$("#viewerCanvas");
            img.addEventListener("load", function() {
                if (mediaStatus) mediaStatus.hidden = true;
                img.hidden = false;
                img.classList.remove("is-media-error");
                M.$("#wallpaperButton").disabled = false;
                applyFilters();
            });
            img.addEventListener("error", function() {
                if (mediaStatus) mediaStatus.hidden = false;
                if (mediaMessage) mediaMessage.textContent = "Esta foto não pôde ser carregada.";
                if (mediaRetry) mediaRetry.hidden = false;
                img.hidden = true;
                img.classList.add("is-media-error");
                M.$("#wallpaperButton").disabled = true;
            });
            if (mediaRetry) mediaRetry.addEventListener("click", function() {
                if (!currentItem) return;
                var retryUrl = new URL(currentItem.src, document.baseURI);
                retryUrl.searchParams.set("retry", Date.now());
                mediaMessage.textContent = "Tentando carregar a foto…";
                mediaRetry.hidden = true;
                img.hidden = false;
                img.src = retryUrl.href;
            });
            nameEl = M.$("#viewerName");
            zoomEl = M.$("#viewerZoom");
            editor = M.$("#editor");
            M.pager.init();
            M.$$("#editorRows input").forEach(function(input) {
                input.addEventListener("input", applyFilters);
            });
            stage.addEventListener("pointerdown", function(event) {
                if (event.button !== undefined && event.button !== 0) return;
                pointers[event.pointerId] = {
                    x: event.clientX,
                    y: event.clientY
                };
                stage.setPointerCapture(event.pointerId);
                if (Object.keys(pointers).length === 2) {
                    swipe = null;
                    applyTransform();
                    pinchStart = distance();
                    pinchZoom = zoom;
                } else if (Object.keys(pointers).length === 1) {
                    swipe = zoom === 1 ? {
                        id: event.pointerId,
                        x: event.clientX,
                        y: event.clientY,
                        dx: 0,
                        dy: 0
                    } : null;
                } else {
                    swipe = null;
                }
            });
            stage.addEventListener("pointermove", function(event) {
                if (!pointers[event.pointerId]) return;
                var previous = pointers[event.pointerId];
                pointers[event.pointerId] = {
                    x: event.clientX,
                    y: event.clientY
                };
                var count = Object.keys(pointers).length;
                if (count === 2) {
                    if (pinchStart > 0) setZoom(pinchZoom * (distance() / pinchStart), true);
                    return;
                }
                if (count !== 1) return;
                if (zoom <= 1) {
                    if (swipe && swipe.id === event.pointerId) {
                        swipe.dx = event.clientX - swipe.x;
                        swipe.dy = event.clientY - swipe.y;
                        if (Math.abs(swipe.dx) > Math.abs(swipe.dy)) {
                            img.style.transform = "translateX(" + swipe.dx * .35 + "px)";
                            canvas.style.transform = img.style.transform;
                        }
                    }
                    return;
                }
                panX += event.clientX - previous.x;
                panY += event.clientY - previous.y;
                applyTransform();
            });
            function release(event) {
                delete pointers[event.pointerId];
                if (swipe && swipe.id === event.pointerId) {
                    var gesture = swipe;
                    swipe = null;
                    if (event.type === "pointerup" && zoom === 1 && Math.abs(gesture.dx) >= 48 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3) {
                        M.pager.step(gesture.dx < 0 ? 1 : -1);
                    }
                    applyTransform();
                }
            }
            stage.addEventListener("pointerup", release);
            stage.addEventListener("pointercancel", release);
            stage.addEventListener("lostpointercapture", release);
            stage.addEventListener("wheel", function(event) {
                event.preventDefault();
                setZoom(zoom + (event.deltaY < 0 ? .2 : -.2));
            }, {
                passive: false
            });
            stage.addEventListener("dblclick", function() {
                setZoom(zoom > 1 ? 1 : 2.5);
            });
            document.addEventListener("keydown", function(event) {
                if (viewer.hidden || !currentItem || M.crop.isOpen() || event.target.tagName === "INPUT") return;
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    M.pager.step(event.key === "ArrowLeft" ? -1 : 1);
                }
            });
        },
        open: function(item, photos) {
            clearTimeout(closeTimer);
            editor.classList.remove("is-open");
            M.$("#editorToggle").setAttribute("aria-expanded", "false");
            viewer.hidden = false;
            viewer.classList.remove("is-leaving");
            M.pager.open(photos || [ item ], item, showPhoto);
            showPhoto(item);
        },
        close: function() {
            if (M.crop.isOpen()) {
                M.crop.close();
                return;
            }
            currentItem = null;
            clearTimeout(wallpaperTimer);
            pointers = {};
            swipe = null;
            viewer.classList.add("is-leaving");
            closeTimer = setTimeout(function() {
                viewer.hidden = true;
                viewer.classList.remove("is-leaving");
                img.removeAttribute("src");
            }, 240);
        },
        isOpen: function() {
            return !viewer.hidden;
        },
        toggleEditor: function() {
            editor.classList.toggle("is-open");
            M.$("#editorToggle").setAttribute("aria-expanded", editor.classList.contains("is-open") ? "true" : "false");
        },
        setWallpaper: function() {
            if (currentItem) M.crop.open(currentItem);
        },
        applyWallpaper: function(crop) {
            if (!currentItem) return;
            M.$("#wallpaperButton").disabled = true;
            wallpaperStatus("Aplicando…");
            M.host.emit("set-wallpaper", {
                src: currentItem.src,
                crop
            });
            wallpaperTimer = setTimeout(function() {
                M.viewer.wallpaperResult({
                    ok: false,
                    message: "Abra a galeria pelo celular para trocar o papel de parede."
                });
            }, 8e3);
        },
        wallpaperResult: function(result) {
            M.crop.result(result);
            clearTimeout(wallpaperTimer);
            M.$("#wallpaperButton").disabled = false;
            wallpaperStatus(result.ok ? result.saved === false ? "Papel de parede aplicado; não foi possível salvar neste navegador." : "Papel de parede aplicado!" : result.message || "Não foi possível carregar a imagem.");
        },
        reset: resetFilters
    };
})(window.Gal = window.Gal || {});
