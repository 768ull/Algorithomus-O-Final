(function(S) {
    "use strict";
    var screen = null;
    var black = null;
    var pctEl = null;
    var pctTimer = 0;
    var completionTimer = 0;
    var GAP_1 = 1e3;
    var GAP_2 = 2e3;
    var STORM_LEAD = 1200;
    var BLACK_HOLD = 1e3;
    var BURST_FALLBACK = 620;
    var COMPLETE_AT = 5200;
    var COMPLETE_MS = 1600;
    var GLITCH = [ "50%", "5▓%", "▓0%", "5░%", "%50", "0x▓%", "ERRO", "--%", "NaN%", "▓▒░%", "5▒%", "E░R" ];
    var shown = false;
    var titleEl = null;
    var noteEl = null;
    var fillEl = null;
    function preloadSite() {
        var base = window.location.href;
        var resources = new Set;
        var visited = new Set;
        var completed = 0;
        var failed = 0;
        function request(url, read) {
            var controller = window.AbortController ? new AbortController : null;
            var timer;
            var timeout = new Promise(function(resolve, reject) {
                timer = setTimeout(function() {
                    if (controller) controller.abort();
                    reject(new Error("Tempo limite ao preparar " + url));
                }, 18e4);
            });
            var work = Promise.resolve().then(function() {
                return fetch(url, {
                    credentials: "same-origin",
                    cache: "force-cache",
                    signal: controller ? controller.signal : undefined
                });
            }).then(function(response) {
                if (!response.ok) throw new Error("Resposta HTTP " + response.status + " para " + url);
                return read(response);
            });
            return Promise.race([ work, timeout ]).finally(function() { clearTimeout(timer); });
        }
        function add(value, from) {
            if (!value || /^(data:|blob:|#|javascript:|mailto:|tel:)/i.test(value)) return;
            try {
                var url = new URL(value, from || base);
                if (url.origin === window.location.origin) resources.add(url.href);
            } catch (error) {}
        }
        function parse(text, url, type) {
            var matches;
            if (type === "text/html") {
                var doc = (new DOMParser).parseFromString(text, "text/html");
                doc.querySelectorAll('img[src],script[src],link[rel="stylesheet"][href],source[src],audio[src],video[src]').forEach(function(node) {
                    add(node.getAttribute("src") || node.getAttribute("href"), url);
                    if (node.hasAttribute("srcset")) node.getAttribute("srcset").split(",").forEach(function(entry) {
                        add(entry.trim().split(/\s+/)[0], url);
                    });
                });
            }
            if (type === "text/css") {
                matches = text.matchAll(/url\(["']?([^"')]+)["']?\)/gi);
                for (var cssMatch of matches) add(cssMatch[1], url);
            }
            if (type === "text/javascript" || type === "application/javascript") {
                matches = text.matchAll(/["']([^"']+\.(?:webp|png|jpe?g|gif|svg|avif|bmp|ogg|mp3|wav|m4a|aac|mp4|webm)(?:\?[^"']*)?)["']/gi);
                for (var jsMatch of matches) add(jsMatch[1], url);
            }
        }
        document.querySelectorAll('img[src],link[rel="stylesheet"][href],script[src]').forEach(function(node) {
            add(node.getAttribute("src") || node.getAttribute("href"), base);
        });
        S.APPS.forEach(function(app) {
            add(app.url, base);
        });
        if (S.APP.galeria) add("apps/galeria/js/catalog.js", base);
        async function discover(url) {
            if (visited.has(url)) return;
            visited.add(url);
            try {
                var discovered = await request(url, function(response) {
                    return response.text().then(function(text) {
                        return { text: text, type: (response.headers.get("content-type") || "").split(";")[0] };
                    });
                });
                if (discovered.type === "text/html" || discovered.type === "text/css" || discovered.type.indexOf("javascript") >= 0) {
                    parse(discovered.text, url, discovered.type);
                }
            } catch (error) {
                failed++;
            }
        }
        async function run() {
            var cursor = 0;
            while (cursor < resources.size) {
                var batch = Array.from(resources).slice(cursor);
                cursor = resources.size;
                await Promise.all(batch.map(discover));
            }
            var list = Array.from(resources);
            await Promise.all(list.map(async function(url) {
                try {
                    if (/\.(?:webp|png|jpe?g|gif|svg|avif|bmp)(?:\?|$)/i.test(url)) {
                        await new Promise(function(resolve, reject) {
                            var image = new Image;
                            var timer = setTimeout(function() { finish(false); }, 18e4);
                            var settled = false;
                            function finish(success) {
                                if (settled) return;
                                settled = true;
                                clearTimeout(timer);
                                image.onload = image.onerror = null;
                                if (success) resolve(); else reject(new Error("Imagem indisponível: " + url));
                            }
                            image.onload = function() {
                                if (image.decode) image.decode().then(function() { finish(true); }, function() { finish(image.naturalWidth > 0); });
                                else finish(true);
                            };
                            image.onerror = function() { finish(false); };
                            image.src = url;
                        });
                    } else await request(url, function(response) { return response.arrayBuffer(); });
                } catch (error) { failed++; }
                completed++;
                var progress = 50 + Math.floor(completed / Math.max(1, list.length) * 50);
                if (pctEl) pctEl.textContent = progress + "%";
                if (fillEl) fillEl.style.width = progress + "%";
                if (noteEl) noteEl.textContent = "carregando arquivos " + completed + "/" + list.length + (failed ? " · " + failed + " falha(s)" : "");
            }));
            if (noteEl) noteEl.textContent = failed ? failed + " arquivo(s) indisponível(is)" : "arquivos preparados";
            return { completed: completed, total: list.length, failed: failed };
        }
        return run();
    }
    function engine() {
        return typeof window !== "undefined" && window.glitch || null;
    }
    function intro() {
        return typeof window !== "undefined" && window.intro || null;
    }
    function burstMs() {
        var device = document.getElementById("device");
        var value = device && device.style ? parseFloat(device.style.getPropertyValue("--glitch-burst")) : NaN;
        return value > 0 ? value : BURST_FALLBACK;
    }
    function hit(done) {
        var g = engine();
        if (!g || !g.strike) {
            done();
            return;
        }
        g.strike();
        setTimeout(done, burstMs());
    }
    function scramble() {
        if (!pctEl) return;
        pctEl.textContent = GLITCH[Math.floor(Math.random() * GLITCH.length)];
        pctTimer = setTimeout(scramble, 80 + Math.random() * 220);
    }
    function startScramble() {
        if (!pctEl) pctEl = S.$("#updatePct");
        if (!pctEl) return;
        clearTimeout(pctTimer);
        scramble();
    }
    function showBlack() {
        if (!black) return;
        black.classList.add("is-on");
        setTimeout(function() {
            if (!screen) return;
            screen.classList.add("is-on");
            screen.setAttribute("aria-hidden", "false");
            S.haptic([ 40, 80, 40 ]);
            if (pctEl) pctEl.textContent = "50%";
            if (fillEl) {
                fillEl.style.animation = "none";
                fillEl.style.width = "50%";
            }
            if (noteEl) noteEl.textContent = "baixando imagens e preparando aplicativos";
            preloadSite().then(complete, complete);
        }, BLACK_HOLD);
    }
    function complete() {
        if (!screen || !shown) return;
        clearTimeout(pctTimer);
        if (fillEl) {
            fillEl.style.removeProperty("animation");
            fillEl.style.removeProperty("width");
        }
        pctEl.textContent = "100%";
        if (titleEl) titleEl.textContent = "terminando atualização";
        if (noteEl) noteEl.textContent = "preparando o sistema";
        screen.classList.add("is-completing");
        setTimeout(function() {
            screen.classList.remove("is-completing", "is-on", "is-error");
            screen.setAttribute("aria-hidden", "true");
            if (black) black.classList.remove("is-on");
            if (S.lock && S.lock.finishUpdate) S.lock.finishUpdate();
            shown = false;
        }, COMPLETE_MS);
    }
    function storm() {
        var i = intro();
        if (!i || typeof i.flash !== "function" || typeof i.reveal !== "function") {
            showBlack();
            return;
        }
        if (typeof i.storm === "function") i.storm(true);
        setTimeout(function() {
            i.flash(function() {
                i.reveal({
                    boot: false,
                    init: false,
                    onReveal: showBlack
                });
            });
        }, STORM_LEAD);
    }
    S.update = {
        init: function() {
            screen = S.$("#update");
            black = S.$("#screenBlack");
            pctEl = S.$("#updatePct");
            titleEl = S.$("#updateTitle");
            noteEl = S.$("#updateNote");
            fillEl = S.$(".update__fill");
        },
        show: function() {
            if (shown || !screen) return;
            shown = true;
            screen.classList.remove("is-on", "is-completing", "is-error");
            screen.setAttribute("aria-hidden", "true");
            if (titleEl) titleEl.textContent = "atualizando sistema";
            if (noteEl) noteEl.textContent = "instalando arquivos";
            if (pctEl) pctEl.textContent = "50%";
            clearTimeout(completionTimer);
            var g = engine();
            if (g && g.hold) g.hold(true);
            hit(function() {
                setTimeout(function() {
                    hit(function() {
                        setTimeout(storm, GAP_2);
                    });
                }, GAP_1);
            });
        }
    };
})(window.Celular = window.Celular || {});
