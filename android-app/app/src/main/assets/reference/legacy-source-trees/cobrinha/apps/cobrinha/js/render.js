(function(C) {
    "use strict";
    var s = C.state, canvas, ctx, stage, cell = 0, dpr = 1, pal = {}, snakeColors = [];
    C.render = {};
    C.render.init = function(el, area) {
        canvas = el;
        stage = area || el.parentElement;
        ctx = el.getContext("2d");
        C.render.resize();
        C.render.loadPalette();
    };
    C.render.resize = function() {
        if (!canvas || !stage) return;
        var cs = getComputedStyle(stage);
        var w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        dpr = Math.min(3, window.devicePixelRatio || 1);
        if (w > 0 && h > 0) {
            var oldRows = C.BOARD.rows;
            var rows = Math.max(C.BOARD.cols, Math.round(h / w * C.BOARD.cols));
            if (rows !== oldRows) {
                var shift = Math.floor((rows - oldRows) / 2);
                C.BOARD.rows = rows;
                if (C.state.snake.length) C.state.snake.forEach(function(p) {
                    p.y += shift;
                });
                if (C.state.renderTrail.length) C.state.renderTrail.forEach(function(p) {
                    p.y += shift;
                });
                if (C.state.eatFx) C.state.eatFx.y += shift;
                if (C.state.deathFx) {
                    C.state.deathFx.y += shift;
                    C.state.deathFx.targetY += shift;
                }
                if (C.state.food) {
                    C.state.food.y += shift;
                    if (C.state.food.y < 0 || C.state.food.y >= rows) C.placeFood();
                }
            }
        }
        cell = Math.max(1 / dpr, Math.min(w / C.BOARD.cols, h / C.BOARD.rows));
        canvas.width = cell * C.BOARD.cols * dpr;
        canvas.height = cell * C.BOARD.rows * dpr;
        canvas.style.width = cell * C.BOARD.cols + "px";
        canvas.style.height = cell * C.BOARD.rows + "px";
    };
    C.render.measure = C.render.resize;
    C.render.loadPalette = function() {
        var css = getComputedStyle(document.documentElement);
        [ "--board-a", "--board-b", "--grid-line", "--snake-body", "--snake-head", "--snake-tail", "--snake-shade", "--snake-eye", "--food", "--food-shade", "--food-leaf" ].forEach(function(key) {
            pal[key] = css.getPropertyValue(key).trim();
        });
        snakeColors = [ colorChannels(pal["--snake-head"]), colorChannels(pal["--snake-tail"] || pal["--snake-body"]) ];
    };
    C.render.draw = function(time) {
        if (!ctx || !cell) return;
        var w = cell * C.BOARD.cols, h = cell * C.BOARD.rows;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        var shake = s.shake > 0 ? s.shake / C.RHYTHM.deathShake : 0;
        ctx.save();
        if (shake) ctx.translate(Math.sin(time * .095) * cell * .13 * shake, Math.cos(time * .12) * cell * .1 * shake);
        drawGrid();
        drawApple(time);
        drawSnake(time);
        drawEatEffect(time);
        drawDeathEffect(time, w, h);
        ctx.restore();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    function drawGrid() {
        var width = C.BOARD.cols * cell, height = C.BOARD.rows * cell;
        ctx.fillStyle = pal["--board-a"];
        ctx.fillRect(0, 0, width, height);
        ctx.beginPath();
        for (var x = 1; x < C.BOARD.cols; x++) {
            ctx.moveTo(x * cell, 0);
            ctx.lineTo(x * cell, height);
        }
        for (var y = 1; y < C.BOARD.rows; y++) {
            ctx.moveTo(0, y * cell);
            ctx.lineTo(width, y * cell);
        }
        ctx.strokeStyle = pal["--grid-line"];
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    function drawSnake(time) {
        var points = buildRenderPath();
        if (!points.length) return;
        if (s.deathFx) {
            var impactAge = time - s.deathFx.at;
            if (impactAge >= 0 && impactAge < 150) {
                var impactT = 1 - Math.pow(1 - impactAge / 150, 3);
                points[0].x += (s.deathFx.targetX - s.deathFx.x) * cell * .34 * impactT;
                points[0].y += (s.deathFx.targetY - s.deathFx.y) * cell * .34 * impactT;
            }
        }
        drawTaperedBody(points);
        var head = points[0], radius = cell * .49;
        var eatAge = s.eatFx ? time - s.eatFx.at : Infinity;
        var chomp = eatAge >= 0 && eatAge < 300 ? Math.sin(Math.PI * eatAge / 300) : 0;
        var squash = 1 + chomp * .13;
        ctx.save();
        ctx.translate(head.x, head.y);
        if (s.dir.x) ctx.scale(squash, 1 / squash); else ctx.scale(1 / squash, squash);
        ctx.translate(-head.x, -head.y);
        ctx.beginPath();
        ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = pal["--snake-head"];
        ctx.shadowColor = "rgba(61,43,30,.2)";
        ctx.shadowBlur = cell * .09;
        ctx.shadowOffsetY = cell * .06;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        drawEyes(head.x - cell / 2, head.y - cell / 2, time);
        drawMouth(head.x, head.y, time);
        ctx.restore();
    }
    function buildRenderPath() {
        var trail = s.renderTrail;
        if (!trail || trail.length < 2) {
            return s.snake.map(function(p) {
                return {
                    x: (p.x + .5) * cell,
                    y: (p.y + .5) * cell
                };
            });
        }
        var t = Math.max(0, Math.min(1, s.moveProgress));
        var newest = trail[0], previous = trail[1];
        var route = [ {
            x: (previous.x + (newest.x - previous.x) * t + .5) * cell,
            y: (previous.y + (newest.y - previous.y) * t + .5) * cell
        } ];
        for (var i = 1; i < trail.length; i++) route.push({
            x: (trail[i].x + .5) * cell,
            y: (trail[i].y + .5) * cell
        });
        var smooth = [ route[0] ], current = route[0];
        for (var j = 1; j < route.length - 1; j++) {
            var corner = route[j], before = route[j - 1], after = route[j + 1];
            var inX = before.x - corner.x, inY = before.y - corner.y;
            var outX = after.x - corner.x, outY = after.y - corner.y;
            var inLength = Math.hypot(inX, inY), outLength = Math.hypot(outX, outY);
            var cross = inX * outY - inY * outX;
            if (inLength < .5 || outLength < .5 || Math.abs(cross) < .001) {
                if (Math.hypot(current.x - corner.x, current.y - corner.y) > .01) smooth.push(corner);
                current = corner;
                continue;
            }
            var radius = Math.min(cell * .46, inLength * .44, outLength * .44);
            var start = {
                x: corner.x + inX / inLength * radius,
                y: corner.y + inY / inLength * radius
            };
            var end = {
                x: corner.x + outX / outLength * radius,
                y: corner.y + outY / outLength * radius
            };
            if (Math.hypot(current.x - start.x, current.y - start.y) > .01) smooth.push(start);
            for (var q = 1; q <= 8; q++) {
                var u = q / 8, inverse = 1 - u;
                smooth.push({
                    x: inverse * inverse * start.x + 2 * inverse * u * corner.x + u * u * end.x,
                    y: inverse * inverse * start.y + 2 * inverse * u * corner.y + u * u * end.y
                });
            }
            current = end;
        }
        var routeTail = route[route.length - 1];
        if (Math.hypot(current.x - routeTail.x, current.y - routeTail.y) > .01) smooth.push(routeTail);
        var maxLength = Math.max(0, s.snake.length - 1) * cell;
        var result = [ smooth[0] ], covered = 0;
        for (var k = 1; k < smooth.length && covered < maxLength; k++) {
            var length = Math.hypot(smooth[k].x - smooth[k - 1].x, smooth[k].y - smooth[k - 1].y);
            if (!length) continue;
            if (covered + length >= maxLength) {
                var fraction = (maxLength - covered) / length;
                result.push({
                    x: smooth[k - 1].x + (smooth[k].x - smooth[k - 1].x) * fraction,
                    y: smooth[k - 1].y + (smooth[k].y - smooth[k - 1].y) * fraction
                });
                break;
            }
            result.push(smooth[k]);
            covered += length;
        }
        return result.length > 1 ? result : smooth.slice(0, 2);
    }
    function drawTaperedBody(path) {
        if (path.length < 2) return;
        var points = [ path[0] ];
        for (var p = 1; p < path.length; p++) {
            var dx = path[p].x - path[p - 1].x, dy = path[p].y - path[p - 1].y;
            var span = Math.hypot(dx, dy), divisions = Math.max(1, Math.ceil(span / (cell * .14)));
            for (var part = 1; part <= divisions; part++) {
                var fraction = part / divisions;
                points.push({
                    x: path[p - 1].x + dx * fraction,
                    y: path[p - 1].y + dy * fraction
                });
            }
        }
        var distances = [ 0 ], total = 0;
        for (var d = 1; d < points.length; d++) {
            total += Math.hypot(points[d].x - points[d - 1].x, points[d].y - points[d - 1].y);
            distances.push(total);
        }
        if (!total) return;
        var left = [], right = [], widths = [];
        for (var n = 0; n < points.length; n++) {
            var a = points[Math.max(0, n - 1)], b = points[Math.min(points.length - 1, n + 1)];
            var tx = b.x - a.x, ty = b.y - a.y, len = Math.hypot(tx, ty) || 1;
            var alongBody = distances[n] / total;
            var halfWidth = cell * (.42 - .012 * alongBody);
            widths.push(halfWidth);
            left.push({
                x: points[n].x - ty / len * halfWidth,
                y: points[n].y + tx / len * halfWidth
            });
            right.push({
                x: points[n].x + ty / len * halfWidth,
                y: points[n].y - tx / len * halfWidth
            });
        }
        var head = points[0], tail = points[points.length - 1];
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        for (var l = 1; l < left.length; l++) ctx.lineTo(left[l].x, left[l].y);
        var beforeTail = points[points.length - 2];
        var tailAngle = Math.atan2(tail.y - beforeTail.y, tail.x - beforeTail.x);
        ctx.arc(tail.x, tail.y, widths[widths.length - 1], tailAngle + Math.PI / 2, tailAngle - Math.PI / 2, true);
        for (var r = right.length - 2; r >= 0; r--) ctx.lineTo(right[r].x, right[r].y);
        ctx.closePath();
        ctx.shadowColor = "rgba(37,46,29,.25)";
        ctx.shadowBlur = cell * .09;
        ctx.shadowOffsetY = cell * .07;
        ctx.fillStyle = pal["--snake-head"];
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.clip();
        for (var slice = 0; slice < points.length - 1; slice++) {
            var sx = points[slice + 1].x - points[slice].x;
            var sy = points[slice + 1].y - points[slice].y;
            var segmentLength = Math.hypot(sx, sy) || 1;
            var ux = sx / segmentLength, uy = sy / segmentLength;
            var overlap = .55;
            var startLeft = {
                x: left[slice].x - ux * overlap,
                y: left[slice].y - uy * overlap
            };
            var startRight = {
                x: right[slice].x - ux * overlap,
                y: right[slice].y - uy * overlap
            };
            var endLeft = {
                x: left[slice + 1].x + ux * overlap,
                y: left[slice + 1].y + uy * overlap
            };
            var endRight = {
                x: right[slice + 1].x + ux * overlap,
                y: right[slice + 1].y + uy * overlap
            };
            var local = ctx.createLinearGradient(points[slice].x, points[slice].y, points[slice + 1].x, points[slice + 1].y);
            local.addColorStop(0, snakeGradientColor(distances[slice] / total));
            local.addColorStop(1, snakeGradientColor(distances[slice + 1] / total));
            ctx.beginPath();
            ctx.moveTo(startLeft.x, startLeft.y);
            ctx.lineTo(endLeft.x, endLeft.y);
            ctx.lineTo(endRight.x, endRight.y);
            ctx.lineTo(startRight.x, startRight.y);
            ctx.closePath();
            ctx.fillStyle = local;
            ctx.fill();
        }
        var tailX = tail.x - beforeTail.x, tailY = tail.y - beforeTail.y;
        var tailLength = Math.hypot(tailX, tailY) || 1;
        var tailUx = tailX / tailLength, tailUy = tailY / tailLength;
        var tailRadius = widths[widths.length - 1];
        var capGradient = ctx.createLinearGradient(tail.x - tailUx * tailRadius, tail.y - tailUy * tailRadius, tail.x + tailUx * tailRadius, tail.y + tailUy * tailRadius);
        capGradient.addColorStop(0, snakeGradientColor(Math.max(0, 1 - tailRadius / total)));
        capGradient.addColorStop(1, snakeGradientColor(1));
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, tailRadius, 0, Math.PI * 2);
        ctx.fillStyle = capGradient;
        ctx.fill();
        ctx.restore();
    }
    function snakeGradientColor(position) {
        var amount = Math.max(0, Math.min(1, position));
        var from = snakeColors[0], to = snakeColors[1];
        return "rgb(" + from.map(function(channel, index) {
            return Math.round(channel + (to[index] - channel) * amount);
        }).join(",") + ")";
    }
    function colorChannels(color) {
        var match = /^#([0-9a-f]{6})$/i.exec(color || "");
        if (!match) return [ 128, 128, 128 ];
        var hex = match[1];
        return [ parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16) ];
    }
    function drawEyes(x, y, time) {
        var forward = cell * .22, side = cell * .23, radius = cell * .155;
        var cx = x + cell / 2 + C.state.dir.x * forward;
        var cy = y + cell / 2 + C.state.dir.y * forward;
        var px = -C.state.dir.y * side, py = C.state.dir.x * side;
        var head = s.snake[0], lookX = C.state.dir.x, lookY = C.state.dir.y;
        if (s.food && head) {
            var tx = s.food.x - head.x, ty = s.food.y - head.y;
            var distance = Math.sqrt(tx * tx + ty * ty) || 1;
            lookX = tx / distance;
            lookY = ty / distance;
        }
        var blinkPhase = time % 3900;
        var blink = blinkPhase < 145 ? Math.sin(Math.PI * blinkPhase / 145) : 0;
        var eyeHeight = Math.max(.12, 1 - blink * .9);
        ctx.fillStyle = "#fff";
        [ 1, -1 ].forEach(function(sign) {
            var ex = cx + px * sign, ey = cy + py * sign;
            ctx.beginPath();
            ctx.ellipse(ex, ey, radius, radius * eyeHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            if (eyeHeight > .32) {
                var pupilX = ex + lookX * radius * .37, pupilY = ey + lookY * radius * .37;
                ctx.fillStyle = pal["--snake-shade"];
                ctx.beginPath();
                ctx.arc(pupilX, pupilY, radius * .53, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(pupilX - radius * .12, pupilY - radius * .15, radius * .17, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = "#fff";
        });
    }
    function drawMouth(cx, cy, time) {
        var eatAge = s.eatFx ? time - s.eatFx.at : Infinity;
        var eating = eatAge >= 0 && eatAge < 300;
        var nearFood = false;
        if (s.food) {
            var dx = s.food.x + .5 - (s.snake[0].x + .5);
            var dy = s.food.y + .5 - (s.snake[0].y + .5);
            var ahead = dx * s.dir.x + dy * s.dir.y;
            var beside = Math.abs(dx * s.dir.y - dy * s.dir.x);
            nearFood = ahead > 0 && ahead <= 3.2 && beside <= 1.05;
        }
        var opening = eating ? Math.sin(Math.PI * eatAge / 300) : nearFood ? .24 + Math.abs(Math.sin(time / 90)) * .28 : 0;
        var angle = Math.atan2(s.dir.y, s.dir.x);
        ctx.save();
        ctx.translate(cx + s.dir.x * cell * .015, cy + s.dir.y * cell * .015);
        ctx.rotate(angle);
        ctx.fillStyle = pal["--snake-shade"];
        if (opening < .08) {
            ctx.beginPath();
            ctx.moveTo(0, -cell * .065);
            ctx.lineTo(0, cell * .065);
            ctx.lineWidth = Math.max(1.2, cell * .035);
            ctx.lineCap = "round";
            ctx.strokeStyle = pal["--snake-shade"];
            ctx.stroke();
        } else {
            var mouthDepth = cell * (.025 + opening * .085);
            var mouthWidth = cell * (.045 + opening * .045);
            ctx.beginPath();
            ctx.ellipse(cell * opening * .035, 0, mouthDepth, mouthWidth, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cell * opening * .035, -mouthWidth * .36, mouthDepth * .38, mouthWidth * .18, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,.72)";
            ctx.fill();
        }
        ctx.restore();
    }
    function drawEatEffect(time) {
        if (!s.eatFx) return;
        var age = time - s.eatFx.at;
        if (age < 0 || age > 620) {
            if (age > 620) s.eatFx = null;
            return;
        }
        var progress = age / 620, cx = (s.eatFx.x + .5) * cell, cy = (s.eatFx.y + .5) * cell;
        ctx.save();
        ctx.globalAlpha = (1 - progress) * .72;
        ctx.strokeStyle = pal["--food-shade"];
        ctx.lineWidth = Math.max(1.5, cell * .045);
        ctx.beginPath();
        ctx.arc(cx, cy, cell * (.22 + progress * .72), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    function drawDeathEffect(time, width, height) {
        if (!s.deathFx) return;
        var age = time - s.deathFx.at;
        if (age < 0 || age > 950) {
            if (age > 950) s.deathFx = null;
            return;
        }
        var progress = age / 950, cx = (s.deathFx.x + .5) * cell, cy = (s.deathFx.y + .5) * cell;
        if (age < 190) {
            ctx.fillStyle = "rgba(168,88,67," + (1 - age / 190) * .13 + ")";
            ctx.fillRect(0, 0, width, height);
        }
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = "#b76f54";
        ctx.lineWidth = Math.max(2, cell * .065);
        ctx.beginPath();
        ctx.arc(cx, cy, cell * (.35 + progress * 1.5), 0, Math.PI * 2);
        ctx.stroke();
        for (var i = 0; i < 10; i++) {
            var angle = i * Math.PI * 2 / 10 + .12;
            var distance = cell * (.38 + progress * 1.45), particle = cell * (.06 + (1 - progress) * .07);
            var px = cx + Math.cos(angle) * distance, py = cy + Math.sin(angle) * distance;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle + progress * 2);
            ctx.fillStyle = i % 2 ? "#c97850" : "#a95c43";
            ctx.beginPath();
            ctx.moveTo(0, -particle);
            ctx.lineTo(particle * .42, 0);
            ctx.lineTo(0, particle);
            ctx.lineTo(-particle * .42, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }
    function drawApple(time) {
        if (!s.food) return;
        var cx = (s.food.x + .5) * cell, cy = (s.food.y + .53) * cell;
        var bob = Math.sin(time / 270) * cell * .025, r = cell * .4;
        var breathe = 1 + Math.sin(time / 210) * .018;
        ctx.save();
        ctx.translate(cx, cy + bob);
        ctx.rotate(Math.sin(time / 560) * .018);
        ctx.scale(breathe, 2 - breathe);
        ctx.shadowColor = "rgba(24,25,20,.28)";
        ctx.shadowBlur = cell * .07;
        ctx.shadowOffsetY = cell * .06;
        ctx.beginPath();
        ctx.moveTo(0, -r * .48);
        ctx.bezierCurveTo(-r * .96, -r * 1.03, -r * 1.14, .28 * r, -r * .6, r * .78);
        ctx.bezierCurveTo(-.18 * r, 1.13 * r, .14 * r, .95 * r, .22 * r, .83 * r);
        ctx.bezierCurveTo(.79 * r, 1.04 * r, 1.06 * r, .51 * r, .92 * r, -.18 * r);
        ctx.bezierCurveTo(.82 * r, -.77 * r, .33 * r, -.72 * r, 0, -.48 * r);
        ctx.fill();
        var fruit = ctx.createLinearGradient(0, -r, 0, r);
        fruit.addColorStop(0, "#df7863");
        fruit.addColorStop(.5, pal["--food"]);
        fruit.addColorStop(1, pal["--food-shade"]);
        ctx.fillStyle = fruit;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = "rgba(70,39,32,.42)";
        ctx.lineWidth = Math.max(1, cell * .025);
        ctx.stroke();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = "rgba(255,226,201,.4)";
        ctx.beginPath();
        ctx.ellipse(-r * .45, -r * .1, r * .15, r * .25, .5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(86,42,37,.12)";
        ctx.beginPath();
        ctx.ellipse(r * .62, r * .18, r * .35, r * .7, -.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "#684d35";
        ctx.lineWidth = Math.max(1.5, cell * .06);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, -r * .55);
        ctx.quadraticCurveTo(-.1 * r, -r * 1.05, .15 * r, -r * 1.14);
        ctx.stroke();
        ctx.fillStyle = pal["--food-leaf"];
        ctx.beginPath();
        ctx.ellipse(.43 * r, -r * 1.06, .35 * r, .17 * r, -.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(45,65,38,.58)";
        ctx.lineWidth = Math.max(1, cell * .025);
        ctx.beginPath();
        ctx.moveTo(.18 * r, -r * 1.03);
        ctx.quadraticCurveTo(.42 * r, -r * 1.12, .68 * r, -r * 1.1);
        ctx.stroke();
        ctx.restore();
    }
})(window.Cobrinha = window.Cobrinha || {});