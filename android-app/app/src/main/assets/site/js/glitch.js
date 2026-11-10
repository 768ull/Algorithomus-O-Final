(function(global) {
    "use strict";
    var V = 6;
    var TIMING = {
        gapMin: 3e3,
        gapMax: 8e3,
        firstGap: 2e3,
        weak: {
            dur: 320,
            speed: 1.15,
            roll: .85,
            weight: 5
        },
        mid: {
            dur: 620,
            speed: .95,
            roll: 1.2,
            weight: 3
        },
        strong: {
            dur: 1200,
            speed: .6,
            roll: 1.8,
            weight: 1
        },
        calmGapMin: 4e3,
        calmGapMax: 9e3,
        textoACada: 3,
        storm: {
            gapMin: 170,
            gapMax: 340
        }
    };
    var BASE = "assets/img/";
    var TEXTOS = [ BASE + "texto1.webp", BASE + "texto2.webp", BASE + "texto3.webp", BASE + "texto4.webp", BASE + "texto5.webp" ];
    var TEXTOS_PNG = TEXTOS;
    function url(name) {
        return name + "?v=" + V;
    }
    function supportsWebp() {
        var c;
        if (!global.document || !global.document.createElement) return false;
        c = global.document.createElement("canvas");
        if (!c || !c.getContext) return false;
        c.width = 1;
        c.height = 1;
        try {
            return c.toDataURL("image/webp").indexOf("data:image/webp") === 0;
        } catch (err) {
            return false;
        }
    }
    var FORMATOS = supportsWebp() ? TEXTOS : TEXTOS_PNG;
    var texturas = [];
    (function preload() {
        var i;
        for (i = 0; i < FORMATOS.length; i++) {
            var img = new Image;
            img.src = url(FORMATOS[i]);
            texturas.push(img);
        }
    })();
    var CLASS_ON = "is-frying";
    var CLASS_HELD = "is-held";
    var CLASS_CALM = "is-calm";
    var CLASS_CHAOS = "is-chaos";
    var CLASS_TEXTO = "is-texto";
    var device = null;
    var timer = 0;
    var strikeTimer = 0;
    var held = false;
    var calm = false;
    var storming = false;
    var textoEl = null;
    var textoImg = null;
    var textoIndex = 0;
    var textoTimer = 0;
    var golpes = 0;
    function between(min, max) {
        return min + Math.random() * (max - min);
    }
    function textoNodes() {
        if (!textoEl) textoEl = document.getElementById("screen-texto");
        if (!textoImg) textoImg = document.getElementById("screen-texto-img");
        return textoEl && textoImg;
    }
    function indiceDoTexto(forcar) {
        if (forcar) return forcar;
        if (storming) return textoIndex + 1;
        if (golpes % TIMING.textoACada === 0) return 0;
        return textoIndex + 1;
    }
    function showTexto(dur, forcar) {
        var indice;
        if (!textoNodes() || textoTimer) return false;
        indice = indiceDoTexto(forcar);
        if (!indice) return false;
        textoImg.src = url(FORMATOS[indice - 1]);
        if (!forcar) textoIndex = (textoIndex + 1) % FORMATOS.length;
        textoEl.style.setProperty("--texto-ms", dur + "ms");
        textoEl.classList.add(CLASS_TEXTO);
        textoTimer = setTimeout(function() {
            textoEl.classList.remove(CLASS_TEXTO);
            textoTimer = 0;
        }, dur);
        return true;
    }
    function rollKind() {
        var kinds = [ "weak", "mid", "strong" ];
        var total = 0;
        var i;
        if (storming) return "strong";
        if (calm) return "weak";
        for (i = 0; i < kinds.length; i++) total += TIMING[kinds[i]].weight;
        var dice = Math.random() * total;
        for (i = 0; i < kinds.length; i++) {
            dice -= TIMING[kinds[i]].weight;
            if (dice <= 0) return kinds[i];
        }
        return "mid";
    }
    function strike(forcar) {
        clearTimeout(timer);
        timer = 0;
        var kind = rollKind();
        var cfg = TIMING[kind];
        golpes++;
        device.style.setProperty("--glitch-burst", cfg.dur + "ms");
        device.style.setProperty("--glitch-speed", String(cfg.speed));
        device.style.setProperty("--glitch-roll-h", "calc(" + 46 * cfg.roll + " * var(--px))");
        if (storming) {
            device.classList.remove(CLASS_ON);
            void device.offsetWidth;
        }
        device.classList.add(CLASS_ON);
        clearTimeout(strikeTimer);
        strikeTimer = setTimeout(function() {
            device.classList.remove(CLASS_ON);
        }, cfg.dur);
        if (global.sound && global.sound.glitch) global.sound.glitch();
        showTexto(cfg.dur, forcar);
        if (!held) timer = setTimeout(function() {
            strike();
        }, cfg.dur + gap());
    }
    function gap() {
        if (storming) return between(TIMING.storm.gapMin, TIMING.storm.gapMax);
        return calm ? between(TIMING.calmGapMin, TIMING.calmGapMax) : between(TIMING.gapMin, TIMING.gapMax);
    }
    function hold(on) {
        held = !!on;
        clearTimeout(timer);
        if (held) {
            document.documentElement.classList.add(CLASS_HELD);
            return;
        }
        document.documentElement.classList.remove(CLASS_HELD);
        if (!device) return;
        if (storming) {
            timer = setTimeout(function() {
                strike();
            }, gap());
            return;
        }
        timer = setTimeout(function() {
            strike();
        }, TIMING.firstGap);
    }
    function setCalm(on) {
        calm = !!on;
        document.documentElement.classList.toggle(CLASS_CALM, calm && !storming);
    }
    function storm(on) {
        storming = !!on;
        var html = document.documentElement;
        html.classList.toggle(CLASS_CHAOS, storming);
        html.classList.toggle(CLASS_CALM, calm && !storming);
        clearTimeout(timer);
        if (!storming) {
            timer = 0;
            clearTimeout(strikeTimer);
            strikeTimer = 0;
            if (device) device.classList.remove(CLASS_ON);
            return;
        }
        if (held || !device) return;
        timer = setTimeout(function() {
            strike();
        }, gap());
    }
    function stop() {
        clearTimeout(timer);
        clearTimeout(strikeTimer);
        clearTimeout(textoTimer);
        timer = 0;
        strikeTimer = 0;
        textoTimer = 0;
        storming = false;
        calm = false;
        var html = document.documentElement;
        html.classList.remove(CLASS_HELD);
        html.classList.remove(CLASS_CALM);
        html.classList.remove(CLASS_CHAOS);
        if (device) device.classList.remove(CLASS_ON);
        if (textoEl) textoEl.classList.remove(CLASS_TEXTO);
    }
    function hasGlitchFlag() {
        var search = global.location && global.location.search || "";
        return search.indexOf("glitch") !== -1;
    }
    function boot() {
        device = document.getElementById("device");
        if (!device) return;
        if (hasGlitchFlag()) {
            document.documentElement.classList.remove(CLASS_HELD);
            held = false;
            strike();
            return;
        }
        if (held) return;
        timer = setTimeout(function() {
            strike();
        }, TIMING.firstGap);
    }
    document.addEventListener("DOMContentLoaded", boot);
    global.glitch = {
        strike: function(forcar) {
            if (!device) device = document.getElementById("device");
            if (device) strike(forcar);
        },
        texto: function() {
            return showTexto(TIMING.mid.dur, 1);
        },
        hold,
        setCalm,
        storm,
        stop,
        TEXTOS: FORMATOS,
        texturas,
        TIMING
    };
})(window);