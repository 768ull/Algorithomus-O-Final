(function(S) {
    "use strict";
    var layer = null;
    var source = null;
    var particles = [];
    var frame = 0;
    var last = null;
    var emitting = false;
    var reduced = false;
    var accumulated = 0;
    var MAX_PARTICLES = 90;
    function emit() {
        if (!source || particles.length >= MAX_PARTICLES) return;
        var rect = source.getBoundingClientRect();
        var scale = rect.width / (source.offsetWidth || rect.width || 1);
        var outlet = Math.floor(Math.random() * 3);
        var x = rect.left + rect.width / 2;
        var y = rect.bottom - 8 * scale;
        if (outlet === 1) {
            x = rect.left + 2 * scale;
            y = rect.top + rect.height * .7;
        }
        if (outlet === 2) {
            x = rect.right - 2 * scale;
            y = rect.top + rect.height * .72;
        }
        x += (Math.random() - .5) * 14 * scale;
        var node = document.createElement("span");
        node.className = "smoke-particle";
        var size = (28 + Math.random() * 22) * scale;
        node.style.width = size + "px";
        node.style.height = size * 1.25 + "px";
        layer.appendChild(node);
        particles.push({
            node,
            x,
            y,
            age: 0,
            life: 2.1 + Math.random() * .7,
            vx: ((outlet === 1 ? -24 : outlet === 2 ? 24 : 0) + (Math.random() - .5) * 42) * scale,
            vy: -(reduced ? 32 + Math.random() * 20 : 85 + Math.random() * 75) * scale,
            phase: Math.random() * Math.PI * 2,
            size,
            scale,
            opacity: reduced ? .35 : .7
        });
    }
    function tick(time) {
        frame = 0;
        var dt = last === null ? 0 : Math.min(.05, Math.max(0, (time - last) / 1e3));
        last = time;
        if (emitting) {
            accumulated += dt;
            var gap = reduced ? .12 : .055;
            while (accumulated >= gap) {
                accumulated -= gap;
                emit();
                if (!reduced) emit();
            }
        }
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.age += dt;
            if (p.age >= p.life) {
                p.node.remove();
                particles.splice(i, 1);
                continue;
            }
            p.x += (p.vx + Math.sin(p.age * 3 + p.phase) * 14 * p.scale) * dt;
            p.y += p.vy * dt;
            var progress = p.age / p.life;
            var growth = .55 + progress * (reduced ? 1.3 : 3.3);
            var alpha = Math.min(1, p.age / .2) * Math.pow(1 - progress, 1.3) * p.opacity;
            p.node.style.opacity = String(alpha);
            p.node.style.transform = "translate3d(" + (p.x - p.size / 2) + "px," + (p.y - p.size / 2) + "px,0) scale(" + growth + ")";
        }
        if (emitting || particles.length) frame = window.requestAnimationFrame(tick); else {
            layer.hidden = true;
            last = null;
        }
    }
    S.smoke = {
        start: function(device, reduceMotion) {
            S.smoke.clear();
            layer = S.$("#deviceSmoke");
            if (!layer) return;
            source = device;
            reduced = !!reduceMotion;
            emitting = true;
            layer.hidden = false;
            for (var i = 0; i < (reduced ? 3 : 8); i++) emit();
            frame = window.requestAnimationFrame(tick);
        },
        stop: function() {
            emitting = false;
        },
        clear: function() {
            if (frame) window.cancelAnimationFrame(frame);
            frame = 0;
            emitting = false;
            last = null;
            accumulated = 0;
            particles.forEach(function(p) {
                p.node.remove();
            });
            particles = [];
            source = null;
            if (layer) layer.hidden = true;
        }
    };
})(window.Celular = window.Celular || {});