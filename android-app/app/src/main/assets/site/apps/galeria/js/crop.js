(function(M) {
    "use strict";
    var panel, frame, image, zoomInput, xInput, yInput, applyButton;
    var drag = null;
    var ready = false;
    var busy = false;
    var overflowX = 0;
    var overflowY = 0;
    var observer;
    function render() {
        if (!ready || panel.hidden) return;
        var scale = Math.max(frame.clientWidth / image.naturalWidth, frame.clientHeight / image.naturalHeight) * Number(zoomInput.value);
        var width = image.naturalWidth * scale;
        var height = image.naturalHeight * scale;
        overflowX = Math.max(0, width - frame.clientWidth);
        overflowY = Math.max(0, height - frame.clientHeight);
        image.style.width = width + "px";
        image.style.height = height + "px";
        image.style.left = -overflowX * Number(xInput.value) / 100 + "px";
        image.style.top = -overflowY * Number(yInput.value) / 100 + "px";
    }
    M.crop = {
        init: function() {
            panel = M.$("#crop");
            frame = M.$("#cropFrame");
            image = M.$("#cropImg");
            zoomInput = M.$("#cropZoom");
            xInput = M.$("#cropX");
            yInput = M.$("#cropY");
            applyButton = M.$("#cropApply");
            [ zoomInput, xInput, yInput ].forEach(function(input) {
                input.addEventListener("input", render);
            });
            image.addEventListener("load", function() {
                ready = true;
                applyButton.disabled = busy;
                render();
            });
            image.addEventListener("error", function() {
                ready = false;
                applyButton.disabled = true;
                M.$("#cropStatus").textContent = "Não foi possível carregar esta imagem.";
            });
            frame.addEventListener("pointerdown", function(event) {
                if (!ready || busy || event.button !== undefined && event.button !== 0) return;
                drag = {
                    id: event.pointerId,
                    x: event.clientX,
                    y: event.clientY
                };
                frame.setPointerCapture(event.pointerId);
            });
            frame.addEventListener("pointermove", function(event) {
                if (busy || !drag || drag.id !== event.pointerId) return;
                if (overflowX) xInput.value = M.clamp(Number(xInput.value) - (event.clientX - drag.x) / overflowX * 100, 0, 100);
                if (overflowY) yInput.value = M.clamp(Number(yInput.value) - (event.clientY - drag.y) / overflowY * 100, 0, 100);
                drag.x = event.clientX;
                drag.y = event.clientY;
                render();
            });
            [ "pointerup", "pointercancel", "lostpointercapture" ].forEach(function(name) {
                frame.addEventListener(name, function() {
                    drag = null;
                });
            });
            frame.addEventListener("wheel", function(event) {
                event.preventDefault();
                if (busy) return;
                zoomInput.value = M.clamp(Number(zoomInput.value) + (event.deltaY < 0 ? .1 : -.1), 1, 4);
                render();
            }, {
                passive: false
            });
            if (window.ResizeObserver) {
                observer = new ResizeObserver(render);
                observer.observe(frame);
            }
            window.addEventListener("resize", render);
            document.addEventListener("keydown", function(event) {
                if (panel.hidden) return;
                if (event.key === "Escape") {
                    event.preventDefault();
                    M.crop.close();
                }
                if (event.key === "Tab") {
                    var buttons = panel.querySelectorAll("button:not(:disabled), input:not(:disabled)");
                    var first = buttons[0];
                    var last = buttons[buttons.length - 1];
                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                    }
                }
            });
        },
        open: function(item) {
            ready = false;
            busy = false;
            drag = null;
            [ zoomInput, xInput, yInput ].forEach(function(input) {
                input.disabled = false;
            });
            panel.hidden = false;
            M.$("#viewer").inert = true;
            applyButton.disabled = true;
            M.$("#cropStatus").textContent = "";
            M.crop.reset();
            image.src = item.src;
            if (image.complete && image.naturalWidth) {
                ready = true;
                applyButton.disabled = false;
                render();
            }
            panel.querySelector('[data-action="cancel-crop"]').focus();
        },
        reset: function() {
            if (busy) return;
            zoomInput.value = 1;
            xInput.value = 50;
            yInput.value = 50;
            render();
        },
        close: function() {
            panel.hidden = true;
            drag = null;
            M.$("#viewer").inert = false;
            var button = M.$("#wallpaperButton");
            (button.disabled ? M.$("#editorToggle") : button).focus();
        },
        isOpen: function() {
            return !panel.hidden;
        },
        apply: function() {
            if (!ready || busy) return;
            busy = true;
            applyButton.disabled = true;
            drag = null;
            [ zoomInput, xInput, yInput ].forEach(function(input) {
                input.disabled = true;
            });
            M.$("#cropStatus").textContent = "Aplicando…";
            M.viewer.applyWallpaper({
                zoom: Number(zoomInput.value),
                x: Number(xInput.value),
                y: Number(yInput.value)
            });
        },
        result: function(result) {
            busy = false;
            applyButton.disabled = !ready;
            [ zoomInput, xInput, yInput ].forEach(function(input) {
                input.disabled = false;
            });
            if (result.ok) {
                if (!panel.hidden) M.crop.close();
            } else M.$("#cropStatus").textContent = result.message || "Não foi possível aplicar. Tente novamente.";
        }
    };
})(window.Gal = window.Gal || {});