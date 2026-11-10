(function (S) {
    'use strict';

    var FREEZE_DURATION = 1000;
    var GLITCH_RAMP_DURATION = 3200;
    var GLITCH_DURATION = 5400;
    var ICON_DELETE_DURATION = 560;
    var ICON_DELETE_GAP = 150;
    var HOME_PAGE_SWITCH_DELAY = 430;
    var PRESERVED_APP_IDS = { 'sem-nome': true };
    var CMD_LOAD_DELAY = 650;
    var CMD_TYPE_DELAY = 140;
    var GLITCH_SOUND_OFFSETS = [0, 620, 1170, 1640, 2070, 2450, 2780, 3050];
    var TYPE_DELAY = 26;
    var TEST_TYPE_DELAY = 26;
    var FINAL_WARNING = 'Atenção: Esta decisão é irreversível. Uma vez confirmada, não será possível voltar atrás.';

    var DAY_SIX_CUT_TIMES = [154.96, 157.76, 159.84, 161.96, 165.32, 165.56, 165.84];
    var TERMINAL_COMMANDS = [
        { command: 'ver', output: 'Liga Práxis Command [Versão 4.2]' },
        { command: 'whoami', output: 'LPX-MOBILE-04\\Morajo' },
        { command: 'hostname', output: 'LPX-MOBILE-04' },
        { command: 'dir C:\\Users\\Morajo', output: '1 arquivo encontrado: diario.dat' },
        { command: 'tasklist', output: 'diary.exe                 RUNNING' },
        { command: 'netstat -ano', output: 'Conexão local: ESTÁVEL' },
        { command: 'systeminfo', output: 'Sistema: LPX Mobile 4.2' },
        { command: 'chkdsk C:', output: 'Nenhum problema encontrado.' },
        { command: 'diary.exe /scan', output: 'AVISO: resposta inesperada detectada.' }
    ];
    var WHITEOUT_CLASS = 'is-diary-whiteout';
    var ALERT_CLASS = 'is-diary-alert';
    var FREEZE_CLASS = 'is-diary-freezing';
    var GLITCH_CLASS = 'is-diary-glitching';
    var DELETE_CLASS = 'is-diary-deleting-icons';
    var RECEDE_CLASS = 'is-diary-receding';
    var FULLSCREEN_CLASS = 'is-diary-fullscreen';
    var STAGE_TWO_CLASS = 'is-diary-stage-two';
    var active = false;
    var animating = false;
    var transitionStarted = false;
    var whiteoutDone = false;
    var iconsDeletionDone = false;
    var finishStarted = false;
    var openingFinalDiary = false;
    var fullscreenBackSwipeStart = null;
    var timers = [];
    var popup = null;
    var options = null;
    var continueButton = null;
    var backButton = null;
    var terminalTitle = null;
    var terminalOutput = null;
    var terminalCloseButton = null;
    var mediaProgressLine = null;
    var mediaProgressCountLine = null;
    var mediaSpinnerStep = 0;
    var mediaLoadingRetry = null;
    var mediaLoadingActive = false;
    var deletedAppCount = 0;
    var awaitingSecurityAnswer = false;
    var securityQuestionIndex = 0;
    var selectedSecurityQuestions = [];
    var securityAnswer = '';
    var securityAnswerText = null;
    var securityAnswerInput = null;
    var daySixCutIndex = 0;
    var daySixCutQueue = [];
    var daySixCutTimer = 0;
    var daySixStaticFrame = 0;
    var daySixScreenActive = false;
    var daySixScreenFrozen = false;
    var daySixFragments = [];
    var daySixGeometry = null;
    var daySixLastTime = null;
    var daySixImpactAnimation = null;
    var daySixImpactGlowAnimation = null;
    var daySixDeviceScaleAnimation = null;
    var daySixWhiteout = null;
    var daySixWhiteoutAnimation = null;
    var daySixPhaseFourRevealTimer = 0;
    var daySixImpactDirection = Math.random() < .5 ? -1 : 1;
    var daySixImpactCount = 0;
    var daySixImpactGlitchActive = false;
    var daySixGlitchProgress = 0;
    var daySixImpactFlashTimer = 0;
    var daySixAppFrameIndex = 0;
    var daySixStaticTravelTimer = 0;
    var daySixStaticTarget = null;
    var daySixStaticCursor = 0;
    var daySixParticleFrame = 0;
    var daySixParticleLastFrame = 0;
    var daySixParticles = [];
    var daySixSparkTimer = 0;
    var daySixLockCaptureMode = false;
    var phaseFourBlackout = false;
    var phaseFourBlackoutOverlay = null;
    var phaseFourLogo = null;
    var phaseFourCreditsTimer = 0;
    var daySixSparksAudio = null;
    var daySixSparksFadeProgress = 0;
    var DAY_SIX_SCREEN_WIDTH = 240;
    var DAY_SIX_WHITEOUT_START = 161;
    var DAY_SIX_WHITEOUT_END = 169;
    var DAY_SIX_PHASE_FOUR_REVEAL_DURATION = 1400;
    var DAY_SIX_PHASE_FOUR_REVEAL_DELAY = 1000;
    var DAY_SIX_NOISE_BASE_OPACITY = .34;
    var DAY_SIX_VIDEO_DURATION_FALLBACK = 14.3;

    function getDaySixParticleCanvas() {
        var canvas = S.$('#diaryScreenParticles');
        if (canvas && canvas.parentNode !== document.body) document.body.appendChild(canvas);
        return canvas;
    }

    function setDaySixScreenNoise(progress) {
        var layer = S.$('#diaryScreenBreak');
        if (!layer) return;
        var normalizedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
        var opacity = DAY_SIX_NOISE_BASE_OPACITY + (1 - DAY_SIX_NOISE_BASE_OPACITY) * normalizedProgress;
        var value = opacity.toFixed(3);
        if (layer.style.getPropertyValue('--day-six-noise-opacity') !== value) {
            layer.style.setProperty('--day-six-noise-opacity', value);
        }
    }

    function updateDaySixScreenNoiseFromTime(time) {
        var video = S.$('#diaryDaySixVideo');
        var duration = video && Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : DAY_SIX_VIDEO_DURATION_FALLBACK;
        setDaySixScreenNoise((time - 155) / duration);
    }

    function setDaySixDeviceScale(progress, instant, playing, duration) {
        var device = S.$('#device');
        if (!device) return;
        if (instant) {
            if (daySixDeviceScaleAnimation) daySixDeviceScaleAnimation.cancel();
            daySixDeviceScaleAnimation = null;
            device.style.scale = '1';
            return;
        }
        var normalizedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
        var animationDuration = Math.max(1, (Number(duration) || DAY_SIX_VIDEO_DURATION_FALLBACK) * 1000);
        var targetTime = normalizedProgress * animationDuration;
        if (!daySixDeviceScaleAnimation || daySixDeviceScaleAnimation.playState === 'idle') {
            if (daySixDeviceScaleAnimation) daySixDeviceScaleAnimation.cancel();
            daySixDeviceScaleAnimation = device.animate([
                { scale: '1' },
                { scale: '.2' }
            ], {
                duration: animationDuration,
                easing: 'linear',
                fill: 'forwards'
            });
            daySixDeviceScaleAnimation.pause();
            daySixDeviceScaleAnimation.currentTime = targetTime;
        } else if (daySixDeviceScaleAnimation.effect.getTiming().duration !== animationDuration) {
            daySixDeviceScaleAnimation.effect.updateTiming({ duration: animationDuration });
            daySixDeviceScaleAnimation.currentTime = targetTime;
        } else if (Math.abs((Number(daySixDeviceScaleAnimation.currentTime) || 0) - targetTime) > 500) {
            daySixDeviceScaleAnimation.currentTime = targetTime;
        }
        if (playing && normalizedProgress < 1) daySixDeviceScaleAnimation.play();
        else daySixDeviceScaleAnimation.pause();
    }

    function ensureDaySixWhiteout() {
        if (daySixWhiteout && daySixWhiteout.isConnected) return daySixWhiteout;
        daySixWhiteout = document.createElement('div');
        daySixWhiteout.className = 'diary-day-six-whiteout';
        daySixWhiteout.setAttribute('aria-hidden', 'true');
        document.body.appendChild(daySixWhiteout);
        return daySixWhiteout;
    }

    function updateDaySixWhiteout(time, playing, videoDuration) {
        var overlay = ensureDaySixWhiteout();
        if (time < DAY_SIX_WHITEOUT_START) {
            if (daySixWhiteoutAnimation) daySixWhiteoutAnimation.cancel();
            daySixWhiteoutAnimation = null;
            overlay.style.removeProperty('opacity');
            overlay.style.removeProperty('background-color');
            overlay.classList.remove('is-visible');
            return;
        }

        overlay.classList.add('is-visible');
        if (time >= DAY_SIX_WHITEOUT_END) {
            setDaySixWhiteoutBlack();
            return;
        }
        var fadeDuration = DAY_SIX_WHITEOUT_END - DAY_SIX_WHITEOUT_START;
        var animationDuration = fadeDuration * 1000;
        overlay.style.removeProperty('background-color');
        if (!daySixWhiteoutAnimation || daySixWhiteoutAnimation.playState === 'idle') {
            if (daySixWhiteoutAnimation) daySixWhiteoutAnimation.cancel();
            daySixWhiteoutAnimation = overlay.animate([
                { opacity: 0 },
                { opacity: 1 }
            ], {
                duration: animationDuration,
                easing: 'linear',
                fill: 'both'
            });
            daySixWhiteoutAnimation.pause();
        } else if (daySixWhiteoutAnimation.effect.getTiming().duration !== animationDuration) {
            daySixWhiteoutAnimation.effect.updateTiming({ duration: animationDuration });
        }

        var targetTime = Math.max(0, Math.min(fadeDuration, time - DAY_SIX_WHITEOUT_START)) * 1000;
        if (Math.abs((Number(daySixWhiteoutAnimation.currentTime) || 0) - targetTime) > 500) {
            daySixWhiteoutAnimation.currentTime = targetTime;
        }
        if (playing && targetTime < animationDuration) daySixWhiteoutAnimation.play();
        else daySixWhiteoutAnimation.pause();
    }

    function setDaySixWhiteoutBlack() {
        var overlay = ensureDaySixWhiteout();
        if (daySixWhiteoutAnimation) daySixWhiteoutAnimation.cancel();
        daySixWhiteoutAnimation = null;
        overlay.classList.add('is-visible');
        overlay.style.backgroundColor = '#000';
        overlay.style.opacity = '1';
    }

    function revealDaySixPhaseFour() {
        setDaySixWhiteoutBlack();
        setDaySixDeviceScale(0, true);
        var overlay = daySixWhiteout;
        window.clearTimeout(daySixPhaseFourRevealTimer);
        daySixPhaseFourRevealTimer = window.setTimeout(function () {
            daySixPhaseFourRevealTimer = 0;
            if (!daySixLockCaptureMode) return;
            var fade = overlay.animate([
                { opacity: 1 },
                { opacity: 0 }
            ], {
                duration: DAY_SIX_PHASE_FOUR_REVEAL_DURATION,
                easing: 'ease-out',
                fill: 'forwards'
            });
            daySixWhiteoutAnimation = fade;
            fade.onfinish = function () {
                if (daySixWhiteoutAnimation !== fade) return;
                daySixWhiteoutAnimation = null;
                overlay.classList.remove('is-visible');
                overlay.style.removeProperty('opacity');
                overlay.style.removeProperty('background-color');
            };
            scheduleDaySixPhaseFourSparks(0);
        }, DAY_SIX_PHASE_FOUR_REVEAL_DELAY);
    }

    function clearDaySixWhiteout() {
        window.clearTimeout(daySixPhaseFourRevealTimer);
        daySixPhaseFourRevealTimer = 0;
        if (daySixWhiteoutAnimation) daySixWhiteoutAnimation.cancel();
        daySixWhiteoutAnimation = null;
        if (daySixWhiteout) {
            daySixWhiteout.classList.remove('is-visible');
            daySixWhiteout.style.removeProperty('opacity');
            daySixWhiteout.style.removeProperty('background-color');
        }
    }

    function styleDaySixFragmentGlitch(visual, index, progress) {
        if (!visual || daySixLockCaptureMode) return;
        var intensity = .25 + progress * .75;
        var amplitude = 1 + progress * 8;
        var hue = (36 + index * 83 + progress * 270) % 360;
        visual.classList.add('is-glitching');
        visual.style.setProperty('--day-six-glitch-cycle', Math.round(1050 - progress * 880) + 'ms');
        visual.style.setProperty('--day-six-glitch-hue', hue.toFixed(1) + 'deg');
        visual.style.setProperty('--day-six-glitch-alt-hue', (-hue * .72).toFixed(1) + 'deg');
        visual.style.setProperty('--day-six-glitch-intensity', intensity.toFixed(2));
        visual.style.setProperty('--day-six-glitch-x', amplitude.toFixed(1) + 'px');
        visual.style.setProperty('--day-six-glitch-neg-x', (-amplitude).toFixed(1) + 'px');
        visual.style.setProperty('--day-six-glitch-y', (amplitude * .4).toFixed(1) + 'px');
        visual.style.setProperty('--day-six-glitch-neg-y', (-amplitude * .4).toFixed(1) + 'px');
    }

    function updateDaySixFragmentGlitches(progress) {
        daySixGlitchProgress = Math.max(0, Math.min(1, Number(progress) || 0));
        daySixFragments.forEach(function (fragment, index) {
            styleDaySixFragmentGlitch(fragment.visual, index, daySixGlitchProgress);
        });
    }

    function clearDaySixFragmentGlitches() {
        daySixFragments.forEach(function (fragment) {
            if (!fragment.visual) return;
            fragment.visual.classList.remove('is-glitching');
            ['--day-six-glitch-cycle', '--day-six-glitch-hue', '--day-six-glitch-alt-hue',
                '--day-six-glitch-intensity', '--day-six-glitch-x', '--day-six-glitch-neg-x',
                '--day-six-glitch-y', '--day-six-glitch-neg-y'].forEach(function (property) {
                fragment.visual.style.removeProperty(property);
            });
        });
    }

    function createDaySixBrokenGlassOverlay() {
        var layer = S.$('#diaryScreenBreak');
        if (!layer) return;
        var previousOverlay = S.$('#diaryScreenGlassOverlay');
        if (previousOverlay) previousOverlay.remove();
        var geometry = daySixGeometry || getDaySixScreenGeometry();
        var overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.setAttribute('id', 'diaryScreenGlassOverlay');
        overlay.setAttribute('class', 'diary-screen-glass-overlay is-visible');
        overlay.setAttribute('viewBox', '0 0 ' + geometry.width + ' ' + geometry.height);
        overlay.setAttribute('preserveAspectRatio', 'none');
        overlay.setAttribute('aria-hidden', 'true');

        function addCrack(points) {
            if (points.length < 2) return;
            var pathData = points.map(function (point, index) {
                return (index ? 'L ' : 'M ') + point.x.toFixed(1) + ' ' + point.y.toFixed(1);
            }).join(' ');
            var shadow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            shadow.setAttribute('class', 'diary-screen-glass-crack-shadow');
            shadow.setAttribute('d', pathData);
            overlay.appendChild(shadow);
            var highlight = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            highlight.setAttribute('class', 'diary-screen-glass-crack-highlight');
            highlight.setAttribute('d', pathData);
            overlay.appendChild(highlight);
        }

        function rayFrom(origin, angle, requestedLength, jitter) {
            var dx = Math.cos(angle);
            var dy = Math.sin(angle);
            var edgeDistance = Math.min(
                dx > 0 ? (geometry.width - origin.x) / dx : dx < 0 ? -origin.x / dx : Infinity,
                dy > 0 ? (geometry.height - origin.y) / dy : dy < 0 ? -origin.y / dy : Infinity
            );
            var length = Math.max(0, Math.min(requestedLength, edgeDistance));
            var steps = Math.max(2, Math.ceil(length / 38));
            var points = [origin];
            for (var step = 1; step < steps; step += 1) {
                var distance = length * step / steps;
                var offset = (Math.random() - .5) * jitter;
                points.push({
                    x: origin.x + dx * distance - dy * offset,
                    y: origin.y + dy * distance + dx * offset
                });
            }
            points.push({ x: origin.x + dx * length, y: origin.y + dy * length });
            return points;
        }

        var centers = [
            { x: geometry.width * .52, y: geometry.height * .43 },
            { x: geometry.width * .2, y: geometry.height * .78 }
        ];
        centers.forEach(function (origin, centerIndex) {
            var rays = centerIndex === 0 ? 13 : 7;
            for (var ray = 0; ray < rays; ray += 1) {
                var angle = ray / rays * Math.PI * 2 + (Math.random() - .5) * .15;
                var mainPath = rayFrom(origin, angle, Math.max(geometry.width, geometry.height) * 1.2, 10);
                addCrack(mainPath);
                if (ray % 2 === 0 && mainPath.length > 3) {
                    var branchPoint = mainPath[Math.floor(mainPath.length * (.42 + Math.random() * .28))];
                    var branchAngle = angle + (Math.random() < .5 ? -1 : 1) * (.55 + Math.random() * .55);
                    addCrack(rayFrom(branchPoint, branchAngle, 24 + Math.random() * 54, 7));
                }
            }
        });
        layer.appendChild(overlay);
    }

    function showPhaseFourBlackout() {
        if (phaseFourBlackout) return;
        phaseFourBlackout = true;
        setDaySixSparksVolume(1);
        document.documentElement.classList.add('is-phase-four-blackout');
        phaseFourBlackoutOverlay = document.createElement('div');
        phaseFourBlackoutOverlay.className = 'diary-phase-four-blackout';
        phaseFourBlackoutOverlay.setAttribute('aria-hidden', 'false');
        document.body.appendChild(phaseFourBlackoutOverlay);
    }

    function updatePhaseFourLogo(time) {
        if (!phaseFourBlackoutOverlay || time < 63) return;
        if (time >= 70) {
            if (phaseFourLogo) {
                var completedLogo = phaseFourLogo;
                completedLogo.style.opacity = '1';
                phaseFourLogo = null;
                window.setTimeout(function () { completedLogo.remove(); }, 50);
            }
            return;
        }
        if (!phaseFourLogo) {
            phaseFourLogo = document.createElement('img');
            phaseFourLogo.className = 'diary-phase-four-logo';
            phaseFourLogo.src = 'assets/img/logo/logotest.png';
            phaseFourLogo.alt = 'Algorithomus';
            phaseFourBlackoutOverlay.appendChild(phaseFourLogo);
        }
        var progress = Math.max(0, Math.min(1, (time - 63) / 7));
        phaseFourLogo.style.opacity = String(progress);
        phaseFourLogo.style.setProperty('--logo-progress', String(progress));
    }

    function showPhaseFourCredits() {
        if (!phaseFourBlackoutOverlay || phaseFourBlackoutOverlay.querySelector('.diary-phase-four-credits')) return;
        var credits = document.createElement('section');
        credits.className = 'diary-phase-four-credits';
        credits.setAttribute('aria-label', 'Créditos do desenvolvimento do site');
        var thanks = document.createElement('h1');
        thanks.className = 'diary-phase-four-credits__thanks';
        thanks.textContent = 'obrigado por jogar :)';
        credits.appendChild(thanks);
        var episode = document.createElement('p');
        episode.className = 'diary-phase-four-credits__episode';
        episode.appendChild(document.createTextNode('Assista o episódio 3 completo no YouTube dia 15 de outubro (quinta-feira)'));
        episode.appendChild(document.createElement('br'));
        episode.appendChild(document.createTextNode('Canal: '));
        var channelLink = document.createElement('a');
        channelLink.href = 'https://www.youtube.com/@Torajo';
        channelLink.target = '_blank';
        channelLink.rel = 'noopener noreferrer';
        channelLink.textContent = 'Mundo Torajo';
        episode.appendChild(channelLink);
        credits.appendChild(episode);
        var groups = [
            ['Escrito por', ['B1EL', 'Ctoon_Patu', 'Prunnoo', 'Purple Moony', 'Saberaa']],
            ['Programado por', ['B1EL', 'Ctoon_Patu']],
            ['Sonorização', ['Rockii Editor']],
            ['Infraestrutura', ['Tio Michael']],
            ['Desenhos/ícones', ['Camie']],
            ['Wallpapers', ['Uangellea', 'Coffee Ed', 'Saberaa']]
        ];
        groups.forEach(function (group) {
            var article = document.createElement('div');
            article.className = 'diary-phase-four-credits__group';
            var heading = document.createElement('h2');
            heading.textContent = group[0];
            var names = document.createElement('p');
            names.textContent = group[1].join(' · ');
            article.appendChild(heading);
            article.appendChild(names);
            credits.appendChild(article);
        });
        phaseFourBlackoutOverlay.appendChild(credits);
        window.requestAnimationFrame(function () { credits.classList.add('is-visible'); });
    }

    function phaseFourCallAudioEnded() {
        if (phaseFourCreditsTimer) window.clearTimeout(phaseFourCreditsTimer);
        phaseFourCreditsTimer = window.setTimeout(function () {
            phaseFourCreditsTimer = 0;
            showPhaseFourCredits();
        }, 5000);
    }

    function startDaySixSparksLoop() {
        if (daySixSparksAudio) return;
        daySixSparksAudio = new Audio(finalMedia ? finalMedia.sparks : '');
        daySixSparksAudio.loop = true;
        daySixSparksAudio.preload = 'auto';
        daySixSparksAudio.volume = S.device && S.device.volume ? S.device.volume() : 1;
        daySixSparksAudio.muted = S.device && S.device.isMuted ? S.device.isMuted() : false;
        var playback = daySixSparksAudio.play();
        if (playback && typeof playback.catch === 'function') playback.catch(function () {});
    }

    function setDaySixSparksVolume(progress) {
        if (!daySixSparksAudio) return;
        daySixSparksFadeProgress = Math.max(daySixSparksFadeProgress, Math.max(0, Math.min(1, Number(progress) || 0)));
        var baseVolume = S.device && S.device.volume ? S.device.volume() : 1;
        daySixSparksAudio.volume = baseVolume * (1 - daySixSparksFadeProgress);
        daySixSparksAudio.muted = S.device && S.device.isMuted ? S.device.isMuted() : false;
        if (daySixSparksFadeProgress >= 1) daySixSparksAudio.pause();
    }

    function makeDaySixGlassShards(originX, originY, screenLeft, screenTop, scaleX, scaleY) {
        var radius = Math.min(48, Math.max(34, daySixGeometry.width * .19));
        var seeds = [{ x: originX, y: originY }];
        [7, 10].forEach(function (count, ringIndex) {
            var ringRadius = radius * (ringIndex === 0 ? .38 : .76);
            for (var i = 0; i < count; i += 1) {
                var angle = (i / count) * Math.PI * 2 + (ringIndex ? .17 : 0) + (Math.random() - .5) * .18;
                var distance = ringRadius * (.86 + Math.random() * .28);
                seeds.push({
                    x: originX + Math.cos(angle) * distance,
                    y: originY + Math.sin(angle) * distance
                });
            }
        });
        var boundary = [];
        for (var edge = 0; edge < 12; edge += 1) {
            var edgeAngle = edge / 12 * Math.PI * 2;
            var edgeRadius = radius * (.9 + Math.random() * .12);
            boundary.push({
                x: originX + Math.cos(edgeAngle) * edgeRadius,
                y: originY + Math.sin(edgeAngle) * edgeRadius
            });
        }

        return seeds.map(function (seed) {
            var polygon = boundary;
            for (var otherIndex = 0; otherIndex < seeds.length && polygon.length; otherIndex += 1) {
                var other = seeds[otherIndex];
                if (other === seed) continue;
                var nx = other.x - seed.x;
                var ny = other.y - seed.y;
                var limit = (other.x * other.x + other.y * other.y - seed.x * seed.x - seed.y * seed.y) / 2;
                polygon = clipDaySixPolygon(polygon, nx, ny, limit, false);
            }
            if (polygon.length < 3 || daySixPolygonArea(polygon) < 3) return null;

            var center = polygon.reduce(function (sum, point) {
                return { x: sum.x + point.x / polygon.length, y: sum.y + point.y / polygon.length };
            }, { x: 0, y: 0 });
            var dx = center.x - originX;
            var dy = center.y - originY;
            var distance = Math.hypot(dx, dy);
            var force = Math.max(.28, 1 - distance / (radius * 1.5));
            var angle = distance < 1 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);
            var speed = (65 + Math.random() * 95) * force;
            return {
                kind: 'glass',
                vertices: polygon.map(function (point) {
                    return { x: (point.x - center.x) * scaleX, y: (point.y - center.y) * scaleY };
                }),
                x: screenLeft + center.x * scaleX,
                y: screenTop + center.y * scaleY,
                z: Math.random() * 3,
                vx: Math.cos(angle) * speed * scaleX + (Math.random() - .5) * 24 * scaleX,
                vy: Math.sin(angle) * speed * scaleY - 24 * scaleY + (Math.random() - .5) * 18 * scaleY,
                vz: 40 + Math.random() * 100 * force,
                gravity: (90 + Math.random() * 55) * scaleY,
                depthGravity: 65,
                rx: (Math.random() - .5) * .35,
                ry: (Math.random() - .5) * .35,
                rz: Math.random() * Math.PI * 2,
                vrx: (Math.random() - .5) * 8,
                vry: (Math.random() - .5) * 10,
                vrz: (Math.random() - .5) * 7,
                life: 1.05 + Math.random() * .5,
                maxLife: 1.55,
                alpha: 1,
                hue: Math.random() * 16 - 8
            };
        }).filter(Boolean);
    }

    function emitDaySixParticles(x, y) {
        if (daySixLockCaptureMode || !daySixGeometry) return;
        var screen = S.$('#screen');
        var bounds = screen ? screen.getBoundingClientRect() : { left: 0, top: 0, width: daySixGeometry.width, height: daySixGeometry.height };
        var scaleX = bounds.width / daySixGeometry.width;
        var scaleY = bounds.height / daySixGeometry.height;
        var originX = bounds.left + x * scaleX;
        var originY = bounds.top + y * scaleY;
        for (var i = 0; i < 22; i += 1) {
            var sparkAngle = Math.random() * Math.PI * 2;
            var sparkSpeed = 65 + Math.random() * 170;
            var sparkColor = Math.random() < .72 ? '#f2fcff' : (Math.random() < .7 ? '#9be4ff' : '#ffd38a');
            daySixParticles.push({
                kind: 'spark', x: originX, y: originY,
                vx: Math.cos(sparkAngle) * sparkSpeed * scaleX,
                vy: Math.sin(sparkAngle) * sparkSpeed * scaleY,
                gravity: (135 + Math.random() * 100) * scaleY,
                life: .5 + Math.random() * .42,
                maxLife: .92,
                size: (1.5 + Math.random() * 1.4) * (scaleX + scaleY) * .5,
                color: sparkColor
            });
        }
        daySixParticles.push.apply(daySixParticles, makeDaySixGlassShards(x, y, bounds.left, bounds.top, scaleX, scaleY));
        var particleCanvas = getDaySixParticleCanvas();
        if (particleCanvas) particleCanvas.classList.add('is-active');
        if (!daySixParticleFrame) {
            daySixParticleLastFrame = 0;
            daySixParticleFrame = window.requestAnimationFrame(drawDaySixParticles);
        }
    }

    function projectDaySixGlassVertex(vertex, shard) {
        var x = vertex.x;
        var y = vertex.y;
        var z = 0;
        var nextY = y * Math.cos(shard.rx) - z * Math.sin(shard.rx);
        z = y * Math.sin(shard.rx) + z * Math.cos(shard.rx);
        y = nextY;
        var nextX = x * Math.cos(shard.ry) + z * Math.sin(shard.ry);
        z = -x * Math.sin(shard.ry) + z * Math.cos(shard.ry);
        x = nextX;
        nextX = x * Math.cos(shard.rz) - y * Math.sin(shard.rz);
        y = x * Math.sin(shard.rz) + y * Math.cos(shard.rz);
        x = nextX;
        z += shard.z;
        var perspective = 360 / (360 + z);
        return { x: shard.x + x * perspective, y: shard.y + y * perspective, perspective: perspective };
    }

    function drawDaySixGlassShard(context, shard) {
        var points = shard.vertices.map(function (vertex) { return projectDaySixGlassVertex(vertex, shard); });
        if (points.length < 3) return;
        var depth = Math.max(.2, Math.min(1.3, points.reduce(function (sum, point) { return sum + point.perspective; }, 0) / points.length));
        var tint = Math.round(205 + shard.hue);
        context.save();
        context.globalAlpha = shard.alpha;
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
        context.closePath();
        var glass = context.createLinearGradient(shard.x - 15, shard.y - 18, shard.x + 18, shard.y + 20);
        glass.addColorStop(0, 'rgba(' + (tint + 25) + ',250,255,.52)');
        glass.addColorStop(.48, 'rgba(' + tint + ',232,244,.2)');
        glass.addColorStop(1, 'rgba(88,151,180,.34)');
        context.fillStyle = glass;
        context.fill();
        context.lineWidth = Math.max(.65, .95 * depth);
        context.strokeStyle = 'rgba(239,252,255,' + (.92 * depth) + ')';
        context.shadowColor = 'rgba(202,244,255,.75)';
        context.shadowBlur = 3 * depth;
        context.stroke();
        context.shadowBlur = 0;
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        context.lineTo(points[1].x, points[1].y);
        context.lineTo(shard.x + (points[1].x - shard.x) * .72, shard.y + (points[1].y - shard.y) * .72);
        context.closePath();
        context.fillStyle = 'rgba(255,255,255,' + (.16 * depth) + ')';
        context.fill();
        context.restore();
    }

    function drawDaySixParticles(timestamp) {
        var canvas = getDaySixParticleCanvas();
        if (!canvas || !daySixGeometry || !daySixParticles.length) {
            daySixParticleFrame = 0;
            daySixParticleLastFrame = 0;
            return;
        }
        var ratio = 1;
        var viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        var viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        var pixelWidth = Math.max(1, Math.round(viewportWidth * ratio));
        var pixelHeight = Math.max(1, Math.round(viewportHeight * ratio));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }
        var context = canvas.getContext('2d');
        if (!context) {
            daySixParticleFrame = 0;
            return;
        }
        if (daySixParticleLastFrame && timestamp - daySixParticleLastFrame < 1000 / 30) {
            daySixParticleFrame = window.requestAnimationFrame(drawDaySixParticles);
            return;
        }
        var delta = daySixParticleLastFrame ? Math.min(.06, (timestamp - daySixParticleLastFrame) / 1000) : 1 / 30;
        daySixParticleLastFrame = timestamp;
        context.setTransform(canvas.width / viewportWidth, 0, 0, canvas.height / viewportHeight, 0, 0);
        context.clearRect(0, 0, viewportWidth, viewportHeight);

        daySixParticles = daySixParticles.filter(function (particle) {
            particle.life -= delta;
            if (particle.life <= 0) return false;
            var previousX = particle.x;
            var previousY = particle.y;
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.vy += particle.gravity * delta;

            if (particle.kind === 'spark') {
                context.save();
                context.globalAlpha = Math.min(1, particle.life / particle.maxLife);
                context.globalCompositeOperation = 'lighter';
                context.strokeStyle = particle.color;
                context.lineWidth = particle.size;
                context.lineCap = 'round';
                context.shadowColor = particle.color;
                context.shadowBlur = 4;
                context.beginPath();
                context.moveTo(previousX, previousY);
                context.lineTo(particle.x, particle.y);
                context.stroke();
                context.restore();
            } else {
                particle.z += particle.vz * delta;
                particle.vz -= particle.depthGravity * delta;
                particle.rx += particle.vrx * delta;
                particle.ry += particle.vry * delta;
                particle.rz += particle.vrz * delta;
                particle.alpha = Math.min(1, particle.life / particle.maxLife);
                drawDaySixGlassShard(context, particle);
            }
            return true;
        });

        if (daySixParticles.length) {
            daySixParticleFrame = window.requestAnimationFrame(drawDaySixParticles);
        } else {
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);
            daySixParticleFrame = 0;
            daySixParticleLastFrame = 0;
        }
    }

    function stopDaySixParticles() {
        window.clearTimeout(daySixSparkTimer);
        daySixSparkTimer = 0;
        if (daySixParticleFrame) window.cancelAnimationFrame(daySixParticleFrame);
        daySixParticleFrame = 0;
        daySixParticleLastFrame = 0;
        daySixParticles = [];
        var canvas = getDaySixParticleCanvas();
        var context = canvas && canvas.getContext('2d');
        if (canvas) canvas.classList.remove('is-active');
        if (context) {
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function emitDaySixPhaseFourSparks() {
        if (!daySixLockCaptureMode || !daySixGeometry) return;
        var device = S.$('#device');
        var bounds = device ? device.getBoundingClientRect() : null;
        if (!bounds) return;
        var count = 4 + Math.floor(Math.random() * 4);
        for (var i = 0; i < count && daySixParticles.length < 70; i += 1) {
            var side = Math.floor(Math.random() * 4);
            var x = bounds.left;
            var y = bounds.top;
            var vx = 0;
            var vy = 0;
            if (side === 0) {
                x += Math.random() * bounds.width;
                vy = -(45 + Math.random() * 110);
                vx = (Math.random() - .5) * 110;
            } else if (side === 1) {
                x += bounds.width;
                y += Math.random() * bounds.height;
                vx = 45 + Math.random() * 110;
                vy = (Math.random() - .5) * 110;
            } else if (side === 2) {
                x += Math.random() * bounds.width;
                y += bounds.height;
                vy = 45 + Math.random() * 110;
                vx = (Math.random() - .5) * 110;
            } else {
                y += Math.random() * bounds.height;
                vx = -(45 + Math.random() * 110);
                vy = (Math.random() - .5) * 110;
            }
            daySixParticles.push({
                kind: 'spark',
                x: x,
                y: y,
                vx: vx,
                vy: vy,
                gravity: 80 + Math.random() * 100,
                life: .38 + Math.random() * .42,
                maxLife: .8,
                size: 1.4 + Math.random() * 1.8,
                color: 'rgba(255, ' + Math.round(165 + Math.random() * 65) + ', ' + Math.round(28 + Math.random() * 35) + ', .98)'
            });
        }
        var canvas = getDaySixParticleCanvas();
        if (canvas) canvas.classList.add('is-active');
        if (!daySixParticleFrame && daySixParticles.length) {
            daySixParticleLastFrame = 0;
            daySixParticleFrame = window.requestAnimationFrame(drawDaySixParticles);
        }
    }

    function scheduleDaySixPhaseFourSparks(delay) {
        window.clearTimeout(daySixSparkTimer);
        daySixSparkTimer = window.setTimeout(function () {
            daySixSparkTimer = 0;
            if (!daySixLockCaptureMode) return;
            emitDaySixPhaseFourSparks();
            scheduleDaySixPhaseFourSparks(650 + Math.random() * 950);
        }, Math.max(0, delay || 0));
    }

    function spreadDaySixLockFragments() {
        if (daySixFragments.length < 2 || !daySixGeometry) return;

        var anchor = daySixFragments.reduce(function (largest, fragment) {
            return !largest || daySixPolygonArea(fragment.poly) > daySixPolygonArea(largest.poly) ? fragment : largest;
        }, null);

        daySixFragments.forEach(function (fragment) {
            if (fragment === anchor) return;

            var fromX = fragment.tx;
            var fromY = fragment.ty;
            var angle = (Math.random() * 1.4) - .7;
            var slide = 8 + Math.random() * 7;
            var targetX = fromX + Math.cos(angle) * slide;
            var targetY = fromY + Math.sin(angle) * slide;
            fragment.tx = targetX;
            fragment.ty = targetY;

            if (fragment.visual) {
                fragment.visual.style.transition = 'transform .55s cubic-bezier(.25,.8,.25,1)';
                fragment.visual.style.transform = 'translate(' + (fromX * daySixGeometry.scale) + 'px, ' + (fromY * daySixGeometry.scale) + 'px)';
                window.requestAnimationFrame(function () {
                    if (fragment.visual.isConnected) {
                        fragment.visual.style.transform = 'translate(' + (targetX * daySixGeometry.scale) + 'px, ' + (targetY * daySixGeometry.scale) + 'px)';
                    }
                });
            }

            if (fragment.element) {
                fragment.element.querySelectorAll('animateTransform').forEach(function (animation) { animation.remove(); });
                fragment.element.setAttribute('transform', 'translate(' + fromX + ' ' + fromY + ')');
                var motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
                motion.setAttribute('attributeName', 'transform');
                motion.setAttribute('type', 'translate');
                motion.setAttribute('from', fromX + ' ' + fromY);
                motion.setAttribute('to', targetX + ' ' + targetY);
                motion.setAttribute('dur', '.55s');
                motion.setAttribute('calcMode', 'spline');
                motion.setAttribute('keyTimes', '0;1');
                motion.setAttribute('keySplines', '.25 .8 .25 1');
                motion.setAttribute('fill', 'freeze');
                fragment.element.appendChild(motion);
                if (motion.beginElement) motion.beginElement();
            }
        });
    }

    function enterDaySixLockCaptureMode() {
        if (daySixLockCaptureMode) return;
        daySixLockCaptureMode = true;
        clearDaySixFragmentGlitches();
        stopDaySixImpactGlitch();
        revealDaySixPhaseFour();
        window.clearTimeout(daySixCutTimer);
        daySixCutTimer = 0;
        daySixCutQueue = [];
        stopDaySixParticles();
        window.clearTimeout(daySixStaticFrame);
        window.clearTimeout(daySixStaticTravelTimer);
        daySixStaticFrame = 0;
        daySixStaticTravelTimer = 0;
        daySixStaticTarget = null;
        daySixStaticCursor = 0;
        daySixFragments.forEach(function (fragment) {
            window.clearTimeout(fragment.ghostTimer);
            if (fragment.ghostAnimation) fragment.ghostAnimation.cancel();
            if (fragment.appFrame) fragment.appFrame.remove();
            if (fragment.ghostTouch) fragment.ghostTouch.remove();
            if (fragment.staticCanvas && fragment.visual && !fragment.staticCanvas.isConnected) fragment.visual.appendChild(fragment.staticCanvas);
            if (fragment.visual) fragment.visual.classList.remove('is-static');
        });
        ['#diaryScreenOutlines', '#diaryScreenCutLines'].forEach(function (selector) {
            var lineLayer = S.$(selector);
            if (lineLayer) lineLayer.replaceChildren();
        });
        createDaySixBrokenGlassOverlay();
        var layer = S.$('#diaryScreenBreak');
        if (!layer) return;
        setDaySixScreenNoise(0);
        layer.classList.add('is-visible', 'is-phase-four-overlay');
        document.documentElement.classList.add('is-day-six-screen-break', 'is-day-six-screen-fractured');
        document.documentElement.classList.remove(FULLSCREEN_CLASS);
        document.documentElement.classList.add('is-phase-four-capture');
        spreadDaySixLockFragments();
        if (daySixFragments.length > 1) {
            daySixStaticTravelTimer = window.setTimeout(rotateDaySixStaticTarget, 700 + Math.random() * 700);
        }

        if (S.nav && S.nav.home) S.nav.home();
        if (S.lock && S.lock.lock) {
            S.lock.lock();
            if (S.lock.openPasscode) S.lock.openPasscode();
        }
        if (S.bridge && S.bridge.emit) {
            S.bridge.emit('mensagens', 'phase-four-capture', true);
            S.bridge.emit('mensagens', 'scenario', S.SCENARIO);
        }
    }

    function drawDaySixStatic() {
        var canvas = S.$('#diaryScreenStatic');
        var root = document.documentElement;
        if (!canvas || !root.classList.contains('is-day-six-screen-break') || root.classList.contains('is-day-six-screen-fractured')) return;
        paintDaySixStatic(canvas);
        daySixStaticFrame = window.setTimeout(drawDaySixStatic, 120);
    }

    function paintDaySixStatic(canvas) {
        var context = canvas.getContext('2d');
        if (!context) return;
        var width = 120;
        var aspect = canvas.clientWidth ? canvas.clientHeight / canvas.clientWidth : daySixGeometry ? daySixGeometry.height / daySixGeometry.width : 2;
        var height = Math.max(120, Math.round(width * aspect));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            canvas.daySixPixelData = null;
        }
        var pixels = canvas.daySixPixelData;
        if (!pixels) {
            pixels = context.createImageData(width, height);
            canvas.daySixPixelData = pixels;
        }
        for (var i = 0; i < pixels.data.length; i += 4) {
            var shade = Math.random() < 0.5 ? 0 : 255;
            var noise = Math.floor(Math.random() * 90);
            shade = Math.max(0, Math.min(255, shade + noise - 45));
            pixels.data[i] = shade;
            pixels.data[i + 1] = shade;
            pixels.data[i + 2] = shade;
            pixels.data[i + 3] = 255;
        }
        context.putImageData(pixels, 0, 0);
    }

    function drawDaySixFragmentStatic(fragment) {
        if (!fragment || daySixStaticTarget !== fragment || !fragment.visual || !fragment.visual.isConnected) return;
        paintDaySixStatic(fragment.staticCanvas);
        daySixStaticFrame = window.setTimeout(function () { drawDaySixFragmentStatic(fragment); }, 120);
    }

    function rotateDaySixStaticTarget() {
        window.clearTimeout(daySixStaticTravelTimer);
        window.clearTimeout(daySixStaticFrame);
        daySixStaticFrame = 0;
        var previousTarget = daySixStaticTarget;
        if (previousTarget && previousTarget.visual) {
            previousTarget.visual.classList.remove('is-static');
            var oldContext = previousTarget.staticCanvas && previousTarget.staticCanvas.getContext('2d');
            if (oldContext) oldContext.clearRect(0, 0, previousTarget.staticCanvas.width, previousTarget.staticCanvas.height);
        }
        daySixStaticTarget = null;
        var candidates = daySixFragments.filter(function (fragment) {
            return fragment.visual && fragment.visual.isConnected && fragment.staticCanvas && fragment.staticCanvas.isConnected;
        });
        if (daySixLockCaptureMode && candidates.length) {
            daySixStaticCursor %= candidates.length;
            daySixStaticTarget = candidates[daySixStaticCursor];
            daySixStaticCursor = (daySixStaticCursor + 1) % candidates.length;
        } else {
            if (candidates.length > 1) candidates = candidates.filter(function (fragment) { return fragment !== previousTarget; });
            daySixStaticTarget = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
        }
        if (daySixStaticTarget) {
            daySixStaticTarget.visual.classList.add('is-static');
            drawDaySixFragmentStatic(daySixStaticTarget);
        }
        if (candidates.length) {
            if (daySixLockCaptureMode) {
                daySixStaticTravelTimer = window.setTimeout(function () {
                    window.clearTimeout(daySixStaticFrame);
                    daySixStaticFrame = 0;
                    if (daySixStaticTarget && daySixStaticTarget.visual) {
                        daySixStaticTarget.visual.classList.remove('is-static');
                        var context = daySixStaticTarget.staticCanvas && daySixStaticTarget.staticCanvas.getContext('2d');
                        if (context) context.clearRect(0, 0, daySixStaticTarget.staticCanvas.width, daySixStaticTarget.staticCanvas.height);
                    }
                    daySixStaticTarget = null;
                    daySixStaticTravelTimer = window.setTimeout(rotateDaySixStaticTarget, 850 + Math.random() * 550);
                }, 240 + Math.random() * 180);
            } else {
                daySixStaticTravelTimer = window.setTimeout(rotateDaySixStaticTarget, 900 + Math.random() * 450);
            }
        }
    }

    function getDaySixScreenGeometry() {
        var layer = S.$('#diaryScreenBreak');
        var screen = S.$('#screen');
        var target = screen || layer;
        var bounds = target.getBoundingClientRect();
        var screenWidth = target.clientWidth || bounds.width;
        var screenHeight = target.clientHeight || bounds.height;
        var width = DAY_SIX_SCREEN_WIDTH;
        var height = width * (screenHeight / Math.max(1, screenWidth));
        var svg = S.$('#diaryScreenFractureSvg');
        if (svg) svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        return {
            width: width,
            height: height,
            scale: screenWidth / width,
            area: width * height
        };
    }

    function clipDaySixPolygon(poly, nx, ny, c, keepPositive) {
        var result = [];
        for (var i = 0; i < poly.length; i += 1) {
            var p = poly[i];
            var q = poly[(i + 1) % poly.length];
            var dp = p.x * nx + p.y * ny - c;
            var dq = q.x * nx + q.y * ny - c;
            var insideP = keepPositive ? dp >= -1e-7 : dp <= 1e-7;
            var insideQ = keepPositive ? dq >= -1e-7 : dq <= 1e-7;
            if (insideP) result.push(p);
            if (insideP !== insideQ) {
                var t = dp / (dp - dq);
                result.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
            }
        }
        return result;
    }

    function daySixPolygonArea(poly) {
        return Math.abs(poly.reduce(function (sum, p, i) {
            var q = poly[(i + 1) % poly.length];
            return sum + p.x * q.y - q.x * p.y;
        }, 0) / 2);
    }

    function daySixContains(poly, x, y) {
        var inside = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
            var a = poly[i];
            var b = poly[j];
            if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        return inside;
    }

    function daySixPolygonPoints(poly) {
        return poly.map(function (point) { return point.x.toFixed(2) + ',' + point.y.toFixed(2); }).join(' ');
    }

    function nextDaySixAppId() {
        var appIds = ['mensagens', 'y', 'galeria', 'configuracoes', 'telefone', 'calculadora', 'tetris', 'cobrinha'];
        var appId = appIds[daySixAppFrameIndex % appIds.length];
        daySixAppFrameIndex += 1;
        return appId;
    }

    function performDaySixGhostTouch(fragment) {
        if (!fragment || !fragment.visual || !fragment.visual.isConnected) return;
        var frame = fragment.appFrame;
        try {
            frame.contentWindow.postMessage({
                v: 1,
                from: 'shell',
                type: 'app:event',
                name: 'ghost-touch',
                payload: { move: true }
            }, '*');
        } catch (error) { }

        var touch = fragment.ghostTouch;
        if (touch && touch.animate) {
            if (fragment.ghostAnimation) fragment.ghostAnimation.cancel();
            var fromX = 16 + Math.random() * 68;
            var fromY = 18 + Math.random() * 64;
            var toX = Math.max(12, Math.min(88, fromX + (Math.random() - .5) * 30));
            var toY = Math.max(14, Math.min(86, fromY + (Math.random() - .5) * 25));
            fragment.ghostAnimation = touch.animate([
                { left: fromX + '%', top: fromY + '%', opacity: 0, scale: .55, offset: 0 },
                { left: fromX + '%', top: fromY + '%', opacity: .92, scale: 1, offset: .16 },
                { left: toX + '%', top: toY + '%', opacity: .9, scale: .95, offset: .62 },
                { left: toX + '%', top: toY + '%', opacity: 1, scale: .72, offset: .72 },
                { left: toX + '%', top: toY + '%', opacity: 0, scale: 1.7, offset: 1 }
            ], { duration: 900, easing: 'cubic-bezier(.2,.7,.25,1)' });
        }
        fragment.ghostTimer = window.setTimeout(function () {
            performDaySixGhostTouch(fragment);
        }, 2600 + Math.random() * 1400);
    }

    function daySixCutEndpoints(poly, nx, ny, c) {
        var hits = [];
        for (var i = 0; i < poly.length; i += 1) {
            var p = poly[i];
            var q = poly[(i + 1) % poly.length];
            var dp = p.x * nx + p.y * ny - c;
            var dq = q.x * nx + q.y * ny - c;
            if (Math.abs(dp) < 1e-6) hits.push(p);
            if (dp * dq < 0) {
                var t = dp / (dp - dq);
                hits.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
            }
        }
        var unique = hits.filter(function (point, index) {
            return hits.findIndex(function (candidate) { return Math.hypot(point.x - candidate.x, point.y - candidate.y) < 0.01; }) === index;
        });
        if (unique.length < 2) return [];
        var pair = [unique[0], unique[1]];
        var maxDistance = -1;
        for (var a = 0; a < unique.length; a += 1) {
            for (var b = a + 1; b < unique.length; b += 1) {
                var distance = Math.hypot(unique[a].x - unique[b].x, unique[a].y - unique[b].y);
                if (distance > maxDistance) {
                    maxDistance = distance;
                    pair = [unique[a], unique[b]];
                }
            }
        }
        return pair;
    }

    function createDaySixCrackLine(points, transform, className) {
        var cutLayer = S.$('#diaryScreenCutLines');
        if (!cutLayer || points.length < 2) return null;
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('class', className);
        line.setAttribute('points', daySixPolygonPoints(points));
        line.setAttribute('transform', transform);
        cutLayer.appendChild(line);
        return line;
    }

    function addDaySixCrackBranches(seam, tx, ty) {
        if (seam.length !== 2) return;
        var dx = seam[1].x - seam[0].x;
        var dy = seam[1].y - seam[0].y;
        var length = Math.hypot(dx, dy);
        if (length < 1) return;
        var tangent = Math.atan2(dy, dx);
        var transform = 'translate(' + tx + ' ' + ty + ')';

        [0.3, 0.7].forEach(function (position, index) {
            var origin = {
                x: seam[0].x + dx * position,
                y: seam[0].y + dy * position
            };
            var direction = tangent + (index === 0 ? 1 : -1) * (0.55 + Math.random() * 0.35);
            var branchLength = 10 + Math.random() * 16;
            var end = {
                x: origin.x + Math.cos(direction) * branchLength,
                y: origin.y + Math.sin(direction) * branchLength
            };
            createDaySixCrackLine([origin, end], transform, 'diary-screen-crack-branch');

            if (Math.random() < 0.55) {
                var twigStart = {
                    x: origin.x + (end.x - origin.x) * 0.58,
                    y: origin.y + (end.y - origin.y) * 0.58
                };
                var twigAngle = direction + (index === 0 ? -1 : 1) * (0.6 + Math.random() * 0.45);
                var twigLength = 5 + Math.random() * 8;
                createDaySixCrackLine([twigStart, {
                    x: twigStart.x + Math.cos(twigAngle) * twigLength,
                    y: twigStart.y + Math.sin(twigAngle) * twigLength
                }], transform, 'diary-screen-crack-branch');
            }
        });
    }

    function animateDaySixImpact() {
        var device = S.$('#device');
        var screenLayer = S.$('#diaryScreenBreak');
        triggerDaySixImpactGlitch();
        daySixImpactCount += 1;
        var glowStrength = Math.min(1, .38 + (daySixImpactCount - 1) * .1);
        var glowRadius = Math.min(48, 18 + daySixImpactCount * 5);
        var direction = daySixImpactDirection;
        daySixImpactDirection *= -1;
        var strength = .9 + Math.random() * .2;
        function px(value) { return (value * strength * direction).toFixed(1) + 'px'; }
        function deg(value) { return (value * direction).toFixed(2) + 'deg'; }
        if (device) {
            if (device.animate) {
                var currentFilter = window.getComputedStyle(device).filter;
                if (!currentFilter || currentFilter === 'none') currentFilter = 'none';
                if (daySixImpactGlowAnimation) daySixImpactGlowAnimation.cancel();
                var glow = 'drop-shadow(0 0 ' + glowRadius + 'px rgba(190,235,255,' + glowStrength.toFixed(2) + ')) ' +
                    'drop-shadow(0 0 ' + (glowRadius * 2) + 'px rgba(70,155,255,' + (glowStrength * .62).toFixed(2) + '))';
                var glowAnimation = device.animate([
                    { filter: currentFilter, offset: 0 },
                    { filter: glow, offset: .14 },
                    { filter: glow, offset: .32 },
                    { filter: 'none', offset: 1 }
                ], {
                    duration: 900,
                    easing: 'ease-out'
                });
                daySixImpactGlowAnimation = glowAnimation;
                glowAnimation.onfinish = function () {
                    if (daySixImpactGlowAnimation === glowAnimation) daySixImpactGlowAnimation = null;
                };
            }
            if (daySixImpactAnimation) daySixImpactAnimation.cancel();
            if (device.animate) {
                var computedDevice = window.getComputedStyle(device);
                var currentTranslate = computedDevice.translate;
                if (!currentTranslate || currentTranslate === 'none') currentTranslate = '0px 0px';
                var currentRotate = computedDevice.rotate;
                if (!currentRotate || currentRotate === 'none') currentRotate = '0deg';
                var impactAnimation = device.animate([
                    { translate: currentTranslate, rotate: currentRotate, offset: 0 },
                    { translate: px(19) + ' 5px', rotate: deg(3), offset: .1 },
                    { translate: px(-16) + ' -7px', rotate: deg(-2.6), offset: .23 },
                    { translate: px(14) + ' 5px', rotate: deg(2.2), offset: .38 },
                    { translate: px(-10) + ' -4px', rotate: deg(-1.6), offset: .54 },
                    { translate: px(7) + ' 2px', rotate: deg(.9), offset: .69 },
                    { translate: px(-3) + ' -1px', rotate: deg(-.4), offset: .84 },
                    { translate: '0px 0px', rotate: '0deg', offset: 1 }
                ], {
                    duration: 760,
                    easing: 'cubic-bezier(.18,.72,.25,1)'
                });
                daySixImpactAnimation = impactAnimation;
                impactAnimation.onfinish = function () {
                    if (daySixImpactAnimation === impactAnimation) daySixImpactAnimation = null;
                };
            } else {
                device.classList.remove('is-diary-screen-impact-heavy', 'is-diary-screen-impact-reversed');
                void device.offsetWidth;
                device.classList.add('is-diary-screen-impact-heavy');
                if (direction > 0) device.classList.add('is-diary-screen-impact-reversed');
            }
        }
        if (screenLayer) {
            screenLayer.classList.remove('is-impacting');
            void screenLayer.offsetWidth;
            screenLayer.classList.add('is-impacting');
            window.clearTimeout(daySixImpactFlashTimer);
            daySixImpactFlashTimer = window.setTimeout(function () {
                screenLayer.classList.remove('is-impacting');
                daySixImpactFlashTimer = 0;
            }, 260);
        }
    }

    function makeDaySixFragment(poly, tx, ty, appId, fromX, fromY) {
        var fragmentsLayer = S.$('#diaryScreenFragments');
        var outlinesLayer = S.$('#diaryScreenOutlines');
        var geom = daySixGeometry;
        var visual = null;
        var appFrame = null;
        var ghostTouch = null;
        var staticCanvas = null;
        var fragmentState = null;
        if (fragmentsLayer && geom) {
            visual = document.createElement('div');
            visual.className = 'diary-screen-fragment';
            visual.style.clipPath = 'polygon(' + poly.map(function (point) {
                return (point.x / geom.width * 100) + '% ' + (point.y / geom.height * 100) + '%';
            }).join(',') + ')';
            visual.style.transform = 'translate(' + (fromX * geom.scale) + 'px, ' + (fromY * geom.scale) + 'px)';
            styleDaySixFragmentGlitch(visual, daySixFragments.length, daySixGlitchProgress);
            var appConfig = !daySixLockCaptureMode && S.APP && S.APP[appId];
            if (appConfig) {
                appFrame = document.createElement('iframe');
                appFrame.src = appConfig.url;
                appFrame.title = appConfig.name + ' (fragmento)';
                appFrame.tabIndex = -1;
                appFrame.setAttribute('aria-hidden', 'true');
                appFrame.setAttribute('scrolling', 'no');
                ghostTouch = document.createElement('span');
                ghostTouch.className = 'diary-screen-ghost-touch';
                ghostTouch.setAttribute('aria-hidden', 'true');
                appFrame.addEventListener('load', function () {
                    if (appId === 'mensagens' || appId === 'y') {
                        appFrame.contentWindow.postMessage({
                            v: 1,
                            from: 'shell',
                            type: 'app:event',
                            name: 'wifi-state',
                            payload: { connected: true }
                        }, '*');
                        appFrame.contentWindow.postMessage({
                            v: 1,
                            from: 'shell',
                            type: 'app:event',
                            name: 'scenario',
                            payload: S.SCENARIO
                        }, '*');
                        try {
                            var offline = appFrame.contentDocument.getElementById('offline');
                            var app = appFrame.contentDocument.getElementById('app');
                            if (offline && app) {
                                offline.hidden = true;
                                app.hidden = false;
                            }
                        } catch (error) { }
                    }
                    if (fragmentState) performDaySixGhostTouch(fragmentState);
                });
                visual.appendChild(appFrame);
                staticCanvas = document.createElement('canvas');
                staticCanvas.className = 'diary-screen-fragment__static';
                staticCanvas.setAttribute('aria-hidden', 'true');
                visual.appendChild(staticCanvas);
                visual.appendChild(ghostTouch);
            }
            fragmentsLayer.appendChild(visual);
            if (fromX !== tx || fromY !== ty) {
                window.requestAnimationFrame(function () {
                    if (visual.isConnected) visual.style.transform = 'translate(' + (tx * geom.scale) + 'px, ' + (ty * geom.scale) + 'px)';
                });
            }
            fragmentState = {
                poly: poly,
                tx: tx,
                ty: ty,
                appId: appId,
                element: null,
                visual: visual,
                staticCanvas: staticCanvas,
                appFrame: appFrame,
                ghostTouch: ghostTouch,
                ghostTimer: 0,
                ghostAnimation: null
            };
        }

        var outline = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        outline.setAttribute('class', 'diary-screen-piece-outline');
        outline.setAttribute('points', daySixPolygonPoints(poly));
        outline.setAttribute('transform', 'translate(' + fromX + ' ' + fromY + ')');
        if (outlinesLayer) outlinesLayer.appendChild(outline);
        if (fromX !== tx || fromY !== ty) {
            var motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
            motion.setAttribute('attributeName', 'transform');
            motion.setAttribute('type', 'translate');
            motion.setAttribute('from', fromX + ' ' + fromY);
            motion.setAttribute('to', tx + ' ' + ty);
            motion.setAttribute('dur', '.48s');
            motion.setAttribute('calcMode', 'spline');
            motion.setAttribute('keyTimes', '0;1');
            motion.setAttribute('keySplines', '.25 .8 .25 1');
            motion.setAttribute('fill', 'freeze');
            outline.appendChild(motion);
        }
        if (!fragmentState) fragmentState = { poly: poly, tx: tx, ty: ty, appId: appId, element: outline, visual: visual, staticCanvas: null, ghostTimer: 0, ghostAnimation: null };
        fragmentState.element = outline;
        return fragmentState;
    }

    function splitDaySixFragment(index, localX, localY) {
        var original = daySixFragments[index];
        if (!original || !daySixScreenFrozen) return false;
        var angle = (Math.random() * 1.4) - .7;
        var dx = Math.cos(angle);
        var dy = Math.sin(angle);
        var nx = -dy;
        var ny = dx;
        var c = localX * nx + localY * ny;
        var first = clipDaySixPolygon(original.poly, nx, ny, c, true);
        var second = clipDaySixPolygon(original.poly, nx, ny, c, false);
        if (first.length < 3 || second.length < 3 || daySixPolygonArea(first) < 20 || daySixPolygonArea(second) < 20) return false;
        var seam = daySixCutEndpoints(original.poly, nx, ny, c);
        window.clearTimeout(original.ghostTimer);
        if (original.ghostAnimation) original.ghostAnimation.cancel();
        if (original.element) original.element.remove();
        if (original.visual) original.visual.remove();
        daySixFragments.splice(index, 1);
        var separation = 5 + Math.random() * 7;
        var shiftX = nx * separation * .5;
        var shiftY = ny * separation * .5;
        var firstPiece = makeDaySixFragment(first, original.tx - shiftX, original.ty - shiftY, nextDaySixAppId(), original.tx, original.ty);
        var secondPiece = makeDaySixFragment(second, original.tx + shiftX, original.ty + shiftY, nextDaySixAppId(), original.tx, original.ty);
        if (seam.length === 2) {
            var lineTransform = 'translate(' + original.tx + ' ' + original.ty + ')';
            createDaySixCrackLine(seam, lineTransform, 'diary-screen-cut-shadow');
            createDaySixCrackLine(seam, lineTransform, 'diary-screen-cut-line');
            addDaySixCrackBranches(seam, original.tx, original.ty);
        }
        daySixFragments.splice(index, 0, firstPiece, secondPiece);
        emitDaySixParticles(localX, localY);
        rotateDaySixStaticTarget();
        animateDaySixImpact();
        return true;
    }

    function randomDaySixCut() {
        if (!daySixGeometry || !daySixFragments.length) return false;
        for (var attempt = 0; attempt < 60; attempt += 1) {
            var candidates = daySixFragments.map(function (fragment, index) {
                return { fragment: fragment, index: index, size: daySixPolygonArea(fragment.poly) };
            }).filter(function (item) { return item.size > daySixGeometry.area * .001; });
            if (!candidates.length) return false;
            var total = candidates.reduce(function (sum, item) { return sum + item.size; }, 0);
            var pick = Math.random() * total;
            var chosen = candidates[0];
            for (var i = 0; i < candidates.length; i += 1) {
                pick -= candidates[i].size;
                if (pick <= 0) {
                    chosen = candidates[i];
                    break;
                }
            }
            var xs = chosen.fragment.poly.map(function (point) { return point.x; });
            var ys = chosen.fragment.poly.map(function (point) { return point.y; });
            var minX = Math.min.apply(Math, xs);
            var maxX = Math.max.apply(Math, xs);
            var minY = Math.min.apply(Math, ys);
            var maxY = Math.max.apply(Math, ys);
            for (var sample = 0; sample < 30; sample += 1) {
                var x = minX + Math.random() * (maxX - minX);
                var y = minY + Math.random() * (maxY - minY);
                if (daySixContains(chosen.fragment.poly, x, y) && splitDaySixFragment(chosen.index, x, y)) return true;
            }
        }
        return false;
    }

    function resetDaySixScreen() {
        if (!daySixScreenActive) return;
        var root = document.documentElement;
        var layer = S.$('#diaryScreenBreak');
        var canvas = S.$('#diaryScreenStatic');
        root.classList.remove('is-day-six-screen-break', 'is-day-six-screen-fractured');
        if (layer) layer.classList.remove('is-visible', 'is-phase-four-overlay');
        window.clearTimeout(daySixStaticFrame);
        window.clearTimeout(daySixCutTimer);
        daySixStaticFrame = 0;
        daySixCutTimer = 0;
        daySixCutIndex = 0;
        daySixCutQueue = [];
        daySixScreenFrozen = false;
        daySixFragments = [];
        daySixGeometry = null;
        daySixLastTime = null;
        daySixImpactDirection = Math.random() < .5 ? -1 : 1;
        daySixImpactCount = 0;
        daySixGlitchProgress = 0;
        setDaySixDeviceScale(0, true);
        daySixAppFrameIndex = 0;
        daySixStaticTarget = null;
        daySixStaticCursor = 0;
        window.clearTimeout(daySixStaticTravelTimer);
        daySixStaticTravelTimer = 0;
        stopDaySixParticles();
        clearDaySixWhiteout();
        stopDaySixImpactGlitch();
        var glassOverlay = S.$('#diaryScreenGlassOverlay');
        if (glassOverlay) glassOverlay.remove();
        daySixLockCaptureMode = false;
        root.classList.remove('is-phase-four-capture');
        if (layer) layer.style.removeProperty('--day-six-noise-opacity');
        if (daySixImpactAnimation) daySixImpactAnimation.cancel();
        daySixImpactAnimation = null;
        if (daySixImpactGlowAnimation) daySixImpactGlowAnimation.cancel();
        daySixImpactGlowAnimation = null;
        window.clearTimeout(daySixImpactFlashTimer);
        daySixImpactFlashTimer = 0;
        ['#diaryScreenFragments', '#diaryScreenOutlines', '#diaryScreenCutLines'].forEach(function (selector) {
            var node = S.$(selector);
            if (node) node.replaceChildren();
        });
        if (canvas) {
            var context = canvas.getContext('2d');
            if (context) context.clearRect(0, 0, canvas.width, canvas.height);
        }
        daySixScreenActive = false;
    }

    function performDaySixCut() {
        if (!daySixScreenFrozen) {
            var canvas = S.$('#diaryScreenStatic');
            if (!canvas) return;
            daySixScreenFrozen = true;
            document.documentElement.classList.add('is-day-six-screen-fractured');
            window.clearTimeout(daySixStaticFrame);
            daySixStaticFrame = 0;
        }
        randomDaySixCut();
    }

    function queueDaySixCut() {
        if (!daySixCutQueue.length || daySixCutTimer) return;
        daySixCutQueue.shift();
        performDaySixCut();
        daySixCutTimer = window.setTimeout(function () {
            daySixCutTimer = 0;
            queueDaySixCut();
        }, 160);
    }

    function updateDaySixScreen(payload) {
        var root = document.documentElement;
        var layer = S.$('#diaryScreenBreak');
        var time = Math.max(0, Number(payload.currentTime) || 0);
        if (Number(payload.day) !== 6 || time < DAY_SIX_CUT_TIMES[0]) {
            resetDaySixScreen();
            return;
        }
        if (daySixScreenActive && daySixLastTime !== null && time < daySixLastTime - .5) {
            resetDaySixScreen();
        }
        updateDaySixScreenNoiseFromTime(time);
        var video = S.$('#diaryDaySixVideo');
        var videoDuration = video && Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : DAY_SIX_VIDEO_DURATION_FALLBACK;
        if (!daySixLockCaptureMode) {
            setDaySixDeviceScale((time - 155) / videoDuration, false, !!payload.playing, videoDuration);
            updateDaySixWhiteout(time, !!payload.playing, videoDuration);
            updateDaySixFragmentGlitches((time - 155) / videoDuration);
        }
        if (!daySixScreenActive) {
            daySixScreenActive = true;
            daySixImpactCount = 0;
            if (layer) layer.classList.add('is-visible');
            root.classList.add('is-day-six-screen-break');
            daySixGeometry = getDaySixScreenGeometry();
            daySixFragments = [makeDaySixFragment([
                { x: 0, y: 0 },
                { x: daySixGeometry.width, y: 0 },
                { x: daySixGeometry.width, y: daySixGeometry.height },
                { x: 0, y: daySixGeometry.height }
            ], 0, 0, null, 0, 0)];
            drawDaySixStatic();
        }
        daySixLastTime = time;
        while (daySixCutIndex < DAY_SIX_CUT_TIMES.length && time >= DAY_SIX_CUT_TIMES[daySixCutIndex]) {
            daySixCutQueue.push(daySixCutIndex);
            daySixCutIndex += 1;
        }
        queueDaySixCut();
    }

    function later(callback, delay) {
        timers.push(window.setTimeout(callback, delay));
    }

    function resetTerminal() {
        if (securityAnswerInput && document.activeElement === securityAnswerInput) securityAnswerInput.blur();
        securityAnswerInput = null;
        terminalOutput.textContent = '';
        options.hidden = true;
        awaitingSecurityAnswer = false;
        securityQuestionIndex = 0;
        securityAnswer = '';
        securityAnswerText = null;
        mediaProgressLine = null;
        mediaProgressCountLine = null;
        mediaLoadingActive = false;
        if (mediaLoadingRetry) mediaLoadingRetry.hidden = true;
        if (terminalCloseButton) terminalCloseButton.disabled = true;
    }

    function appendLine(text, className) {
        var line = document.createElement('p');
        if (className) line.className = className;
        line.textContent = text;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
        return line;
    }

    function typeText(target, text, delay, done) {
        var index = 0;
        target.textContent = '';
        function typeNext() {
            if (index >= text.length) {
                if (done) done();
                return;
            }
            target.textContent += text.charAt(index);
            if (!/\s/.test(text.charAt(index)) && window.sound && window.sound.typewriter) {
                window.sound.typewriter();
            }
            index += 1;
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
            later(typeNext, delay);
        }
        typeNext();
    }

    function typeTerminal() {
        appendLine('Liga Práxis Corporation [Versão LPX 4.2]', 'diary-terminal__dim');
        var commandIndex = 0;

        function runCommand() {
            if (commandIndex >= TERMINAL_COMMANDS.length) {
                later(clearForTest, 450);
                return;
            }
            var entry = TERMINAL_COMMANDS[commandIndex];
            var line = document.createElement('p');
            line.className = 'diary-terminal__command';
            var prompt = document.createElement('span');
            prompt.className = 'diary-terminal__prompt';
            prompt.textContent = 'C:\\Users\\Morajo> ';
            var command = document.createElement('span');
            line.appendChild(prompt);
            line.appendChild(command);
            terminalOutput.appendChild(line);
            typeText(command, entry.command, TYPE_DELAY, function () {
                later(function () {
                    appendLine(entry.output, entry.command === 'diary.exe /scan' ? 'diary-terminal__warning' : 'diary-terminal__dim');
                    commandIndex += 1;
                    later(runCommand, 120);
                }, 150);
            });
        }

    function clearForTest() {terminalOutput.textContent='';S.request('diary/questions').then(function(data){selectedSecurityQuestions=data.questions;askSecurityQuestion(data.index);}).catch(function(){appendLine('Não foi possível carregar o teste. Feche e tente novamente.','diary-terminal__warning');});}

        runCommand();
    }

    function normalizeSecurityAnswer(value) {
        return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function askSecurityQuestion(index) {
        if (securityAnswerInput && document.activeElement === securityAnswerInput) securityAnswerInput.blur();
        securityQuestionIndex = index;
        securityAnswer = '';
        securityAnswerText = null;
        securityAnswerInput = null;
        awaitingSecurityAnswer = false;
        terminalOutput.textContent = '';
        var entry = selectedSecurityQuestions[index];
        if (!entry) {
            if (terminalCloseButton) terminalCloseButton.disabled = true;
            showFinalWarning();
            return;
        }
        if (terminalCloseButton) terminalCloseButton.disabled = false;
        var heading = appendLine('', 'diary-terminal__security-heading');
        typeText(heading, 'Pergunta de segurança (' + (index + 1) + '/3)', TEST_TYPE_DELAY, function () {
            var question = appendLine('', 'diary-terminal__dim');
            typeText(question, entry.question, TEST_TYPE_DELAY, function () {
                var line = document.createElement('p');
                line.className = 'diary-terminal__command';
                var prompt = document.createElement('span');
                prompt.className = 'diary-terminal__prompt';
                prompt.textContent = 'C:\\Users\\Morajo> ';
                securityAnswerInput = document.createElement('input');
                securityAnswerInput.className = 'diary-terminal__answer-input';
                securityAnswerInput.type = 'text';
                securityAnswerInput.autocomplete = 'off';
                securityAnswerInput.autocapitalize = 'off';
                securityAnswerInput.autocorrect = 'off';
                securityAnswerInput.spellcheck = false;
                securityAnswerInput.inputMode = 'text';
                securityAnswerInput.enterKeyHint = 'done';
                securityAnswerInput.maxLength = 120;
                securityAnswerInput.setAttribute('aria-label', 'Digite sua resposta');
                securityAnswerText = securityAnswerInput;
                securityAnswerInput.addEventListener('input', function () {
                    securityAnswer = securityAnswerInput.value;
                    securityAnswerInput.style.width = Math.max(1, securityAnswer.length + 1) + 'ch';
                });
                line.appendChild(prompt);
                line.appendChild(securityAnswerInput);
                terminalOutput.appendChild(line);
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
                awaitingSecurityAnswer = true;
                securityAnswerInput.focus();
            });
        });
    }

    async function submitSecurityAnswer() {
        awaitingSecurityAnswer = false;
        var result;try{result=await S.request('diary/answer',{answer:securityAnswer});}catch(e){awaitingSecurityAnswer=true;appendLine('Falha de conexão. Tente novamente.','diary-terminal__warning');return;}
        var accepted=result.ok;
        if (!accepted) {
            if (window.sound && window.sound.deny) window.sound.deny();
            if (securityAnswerText) {
                securityAnswerText.classList.add('is-security-error');
                later(function () {
                    if (securityAnswerText) securityAnswerText.classList.remove('is-security-error');
                }, 700);
            }
            appendLine('Resposta incorreta. Tente novamente.', 'diary-terminal__warning');
            later(function () { askSecurityQuestion(securityQuestionIndex); }, 850);
            return;
        }
        if (window.sound && window.sound.success) window.sound.success();
        later(function () { askSecurityQuestion(result.index); }, 420);
    }

    function showFinalWarning() {
        if (window.sound && window.sound.securityComplete) window.sound.securityComplete();
        loadDiarySequenceMedia();
    }

    function displayFinalWarning() {
        terminalOutput.textContent = '';
        var warning = appendLine('', 'diary-terminal__warning');
        typeText(warning, FINAL_WARNING, TEST_TYPE_DELAY, function () {
            later(function () {
                var question = appendLine('', 'diary-terminal__dim');
                typeText(question, 'Deseja continuar?', TEST_TYPE_DELAY, function () {
                    later(function () {
                        var label = appendLine('', 'diary-terminal__dim');
                        typeText(label, 'opções', TEST_TYPE_DELAY, function () {
                            later(function () {
                                options.hidden = false;
                                continueButton.focus();
                            }, 700);
                        });
                    }, 200);
                });
            }, 300);
        });
    }

    function handleSecurityKey(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === 'Enter') {
            submitSecurityAnswer();
            return;
        }
        if (event.key === 'Backspace') {
            securityAnswer = securityAnswer.slice(0, -1);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            securityAnswer += event.key;
            if (!/\s/.test(event.key) && window.sound && window.sound.typewriter) window.sound.typewriter();
        } else {
            return;
        }
        if (securityAnswerInput) {
            securityAnswerInput.value = securityAnswer;
            securityAnswerInput.style.width = Math.max(1, securityAnswer.length + 1) + 'ch';
        }
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function blockOutsideTerminal(event) {
        if (!active) return;
        if (popup.hidden) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }
        var card = popup.querySelector('.diary-test-popup__card');
        if (card && card.contains(event.target)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function scheduleGlitchSounds() {
        if (!window.sound || !window.sound.glitch) return;
        GLITCH_SOUND_OFFSETS.forEach(function (delay) {
            later(function () {
                if (active && window.sound && window.sound.glitch) window.sound.glitch();
            }, delay);
        });
    }

    function pauseAmbientGlitches() {
        if (window.glitch) {
            if (window.glitch.stop) window.glitch.stop();
            if (window.glitch.hold) window.glitch.hold(true);
        }
    }

    function triggerDaySixImpactGlitch() {
        if (!window.glitch || !window.glitch.strike) return;
        if (window.glitch.hold) window.glitch.hold(true);
        if (window.glitch.storm) window.glitch.storm(true);
        window.glitch.strike();
        daySixImpactGlitchActive = true;
    }

    function stopDaySixImpactGlitch() {
        if (!daySixImpactGlitchActive) return;
        pauseAmbientGlitches();
        daySixImpactGlitchActive = false;
    }

    function finishAnimation() {
        var root = document.documentElement;
        root.classList.remove(WHITEOUT_CLASS, GLITCH_CLASS, DELETE_CLASS, ALERT_CLASS, RECEDE_CLASS);
        if (window.glitch && window.glitch.hold) window.glitch.hold(true);
        active = false;
        animating = false;
        transitionStarted = false;
        whiteoutDone = false;
        iconsDeletionDone = false;
        finishStarted = false;
        timers = [];
        root.classList.add(FULLSCREEN_CLASS);
        root.classList.add(STAGE_TWO_CLASS);
        document.querySelectorAll('.device__key').forEach(function (key) {
            key.removeAttribute('data-action');
            key.setAttribute('aria-disabled', 'true');
            key.tabIndex = -1;
        });
        openingFinalDiary = true;
        S.nav.open('sem-nome', S.$('#device'));
        openingFinalDiary = false;
    }

    function maybeFinishAnimation() {
        if (!active || !transitionStarted || !whiteoutDone || !iconsDeletionDone || finishStarted) return;
        finishStarted = true;
        finishAnimation();
    }

    function revealAlert() {
        if (!active || animating) return;
        var root = document.documentElement;
        root.classList.remove(GLITCH_CLASS);
        root.classList.add(ALERT_CLASS);
        popup.hidden = false;
        popup.classList.remove('is-cmd-open');
        popup.classList.add('is-cmd-loading');
        resetTerminal();
        later(openTerminal, CMD_LOAD_DELAY);
    }

    function openTerminal() {
        if (!active || animating) return;
        popup.classList.remove('is-cmd-loading');
        popup.classList.add('is-cmd-open');
        if (terminalTitle) terminalTitle.focus();
        later(typeTerminal, CMD_TYPE_DELAY);
    }

    function beginGlitchRamp() {
        if (!active || animating) return;
        var root = document.documentElement;
        root.classList.remove(FREEZE_CLASS, RECEDE_CLASS);
        root.classList.add(GLITCH_CLASS);
        scheduleGlitchSounds();
        later(revealAlert, GLITCH_RAMP_DURATION);
    }

    function updateDiaryMediaProgress(state) {
        if (!state) return;
        var percent = Math.max(0, Math.min(100, Number(state.percent) || 0));
        var filled = Math.round(percent / 10);
        var bar = new Array(filled + 1).join('#') + new Array(11 - filled).join('-');
        var spinnerFrames = ['|', '/', '-', '\\'];
        mediaSpinnerStep += 1;
        if (mediaProgressLine) mediaProgressLine.textContent = '[' + spinnerFrames[mediaSpinnerStep % spinnerFrames.length] + '] [' + bar + '] ' + Math.floor(percent) + '%';
        if (mediaProgressCountLine) mediaProgressCountLine.textContent = 'Arquivos: ' + (state.completed || 0) + '/' + (state.total || 0);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function loadDiarySequenceMedia() {
        if (mediaLoadingActive) return;
        mediaLoadingActive = true;
        terminalOutput.textContent = '';
        options.hidden = true;
        appendLine('[OK] Perguntas de segurança concluídas com sucesso', 'diary-terminal__dim');
        appendLine('Aguarde...', 'diary-terminal__dim');
        mediaProgressLine = appendLine('[|] [----------] 0%', 'diary-terminal__dim');
        mediaProgressCountLine = appendLine('Etapas: 0/1', 'diary-terminal__dim');
        mediaSpinnerStep = 0;
        if (mediaLoadingRetry) {
            mediaLoadingRetry.hidden = true;
            mediaLoadingRetry.disabled = true;
        }

        var loader = S.bootLoader && S.bootLoader.preloadGroup;
        if (!loader) {
            mediaLoadingActive = false;
            appendLine('[ERRO] Não foi possível iniciar o carregamento das mídias.', 'diary-terminal__warning');
            if (mediaLoadingRetry) {
                mediaLoadingRetry.hidden = false;
                mediaLoadingRetry.disabled = false;
            }
            return;
        }

        S.request('diary/prepare').then(function(result){updateDiaryMediaProgress({percent:100,completed:result.total,total:result.total});return {total:result.total,completed:result.total,failed:0};}).then(function (result) {
            mediaLoadingActive = false;
            if (!result.total || result.failed || result.completed < result.total) {
                appendLine('[ERRO] Falha ao preparar todas as mídias.', 'diary-terminal__warning');
                (result.failedUrls || []).slice(0, 3).forEach(function (url) {
                    appendLine('  ' + url, 'diary-terminal__dim');
                });
                if (result.failedUrls && result.failedUrls.length > 3) appendLine('  ... e mais ' + (result.failedUrls.length - 3) + ' arquivo(s)', 'diary-terminal__dim');
                appendLine('Verifique a conexão e tente novamente.', 'diary-terminal__dim');
                if (mediaLoadingRetry) {
                    mediaLoadingRetry.hidden = false;
                    mediaLoadingRetry.disabled = false;
                }
                return;
            }
            updateDiaryMediaProgress({ percent: 100, completed: result.completed, total: result.total });
            mediaProgressLine = null;
            mediaProgressCountLine = null;
            terminalOutput.textContent = '';
            appendLine('+------------------------------------+', 'diary-terminal__dim');
            appendLine('| [OK] DIÁRIO PREPARADO |', 'diary-terminal__dim');
            appendLine('| ' + result.completed + '/' + result.total + ' etapas concluídas.       |', 'diary-terminal__dim');
            appendLine('+------------------------------------+', 'diary-terminal__dim');
            later(displayFinalWarning, 1400);
        }).catch(function () {
            mediaLoadingActive = false;
            appendLine('[ERRO] Falha no carregamento das mídias. Tente novamente.', 'diary-terminal__warning');
            if (mediaLoadingRetry) {
                mediaLoadingRetry.hidden = false;
                mediaLoadingRetry.disabled = false;
            }
        });
    }

    function start() {
        if (active) return;
        active = true;
        animating = false;
        S.nav.home();
        if (window.sound && window.sound.activate) window.sound.activate();
        var root = document.documentElement;
        root.classList.remove(WHITEOUT_CLASS, ALERT_CLASS, GLITCH_CLASS);
        root.classList.add(FREEZE_CLASS);
        popup.hidden = true;
        popup.classList.remove('is-cmd-loading', 'is-cmd-open');
        resetTerminal();
        pauseAmbientGlitches();
        later(beginGlitchRamp, FREEZE_DURATION);
    }

    function beginAnimation() {
        if (transitionStarted) return;
        transitionStarted = true;
        var root = document.documentElement;
        root.classList.remove(FREEZE_CLASS, WHITEOUT_CLASS, GLITCH_CLASS);
        void root.offsetWidth;
        root.classList.add(GLITCH_CLASS, WHITEOUT_CLASS);
        if (window.sound && window.sound.playRiser) window.sound.playRiser();
        scheduleGlitchSounds();
        later(function () {
            whiteoutDone = true;
            maybeFinishAnimation();
        }, GLITCH_DURATION);
    }

    function deleteControlsSequentially(elements, index, done) {
        if (index >= elements.length) {
            done();
            return;
        }
        var element = elements[index];
        if (!element || element.classList.contains('is-diary-deleted')) {
            deleteControlsSequentially(elements, index + 1, done);
            return;
        }
        element.classList.add('is-diary-deleting-control');
        if (window.sound && window.sound.glitch) window.sound.glitch();
        later(function () {
            element.classList.remove('is-diary-deleting-control');
            element.classList.add('is-diary-deleted');
            later(function () {
                deleteControlsSequentially(elements, index + 1, done);
            }, ICON_DELETE_GAP);
        }, ICON_DELETE_DURATION);
    }

    function startDeletionStorm() {
        beginAnimation();
    }

    function deleteHomeItemsSequentially(icons, index, done) {
        if (index >= icons.length) {
            done();
            return;
        }
        var icon = icons[index];
        if (!icon || !icon.parentNode) {
            deleteHomeItemsSequentially(icons, index + 1, done);
            return;
        }
        icon.classList.add('is-diary-deleting');
        if (window.sound && window.sound.glitch) window.sound.glitch();
        later(function () {
            if (icon.parentNode) icon.parentNode.removeChild(icon);
            if (icon.classList.contains('home-item--app')) {
                deletedAppCount += 1;
                if (deletedAppCount === 3) startDeletionStorm();
            }
            later(function () {
                deleteHomeItemsSequentially(icons, index + 1, done);
            }, ICON_DELETE_GAP);
        }, ICON_DELETE_DURATION);
    }

    function deleteHomeWidgets(done) {
        document.documentElement.classList.add(RECEDE_CLASS);
        var originalPage = S.home.currentPage();
        var otherPage = originalPage === 0 ? 1 : 0;
        var currentPage = S.$('#homePage' + originalPage);
        var secondaryPage = S.$('#homePage' + otherPage);
        var currentWidgets = currentPage ? Array.prototype.slice.call(currentPage.querySelectorAll('.home-widget')) : [];
        var otherWidgets = secondaryPage ? Array.prototype.slice.call(secondaryPage.querySelectorAll('.home-widget')) : [];

        deleteHomeItemsSequentially(currentWidgets, 0, function () {
            S.home.page(otherPage);
            later(function () {
                deleteHomeItemsSequentially(otherWidgets, 0, function () {
                    S.home.page(originalPage);
                    later(done, HOME_PAGE_SWITCH_DELAY);
                });
            }, HOME_PAGE_SWITCH_DELAY);
        });
    }

    function deleteHomeIcons() {
        var originalPage = S.home.currentPage();
        var otherPage = originalPage === 0 ? 1 : 0;
        var currentPage = S.$('#homePage' + originalPage);
        var secondaryPage = S.$('#homePage' + otherPage);
        function deletableIcons(container) {
            if (!container) return [];
            return Array.prototype.slice.call(container.querySelectorAll('.home-item--app')).filter(function (icon) {
                return !PRESERVED_APP_IDS[icon.dataset.app];
            });
        }
        var dock = S.$('#homeDock');
        var dockIcons = deletableIcons(dock);
        var currentIcons = deletableIcons(currentPage);
        var otherIcons = deletableIcons(secondaryPage);

        deleteHomeItemsSequentially(currentIcons, 0, function () {
            deleteHomeItemsSequentially(dockIcons, 0, function () {
                S.home.page(otherPage);
                later(function () {
                    deleteHomeItemsSequentially(otherIcons, 0, function () {
                        S.home.page(originalPage);
                        later(function () {
                            iconsDeletionDone = true;
                            maybeFinishAnimation();
                        }, HOME_PAGE_SWITCH_DELAY);
                    });
                }, HOME_PAGE_SWITCH_DELAY);
            });
        });
    }

    function blockPhoneKeys(event) {
        if (awaitingSecurityAnswer) {
            if (event.target === securityAnswerInput) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    submitSecurityAnswer();
                }
                return;
            }
            handleSecurityKey(event);
            return;
        }
        var root = document.documentElement;
        var paused = root.classList.contains(FREEZE_CLASS) || root.classList.contains(GLITCH_CLASS) || root.classList.contains(DELETE_CLASS);
        var modal = root.classList.contains(ALERT_CLASS);
        var fullscreen = root.classList.contains(FULLSCREEN_CLASS);
        if (!paused && !modal && !fullscreen) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        var blockedKeys = ['Escape', 'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'h', 'r'];
        if (paused || options.hidden || fullscreen) blockedKeys.push('Enter', ' ');
        if (blockedKeys.indexOf(event.key) === -1) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function trackFullscreenBackSwipe(event) {
        var root = document.documentElement;
        if (!root.classList.contains(FULLSCREEN_CLASS)) {
            fullscreenBackSwipeStart = null;
            return;
        }
        if (event.type === 'pointerdown') {
            var screen = S.$('#screen');
            var rect = screen.getBoundingClientRect();
            fullscreenBackSwipeStart = event.clientX - rect.left <= 14 ? {
                x: event.clientX,
                y: event.clientY
            } : null;
            return;
        }
        if (!fullscreenBackSwipeStart) return;
        var dx = event.clientX - fullscreenBackSwipeStart.x;
        var dy = event.clientY - fullscreenBackSwipeStart.y;
        fullscreenBackSwipeStart = null;
        if (event.type === 'pointerup' && dx > 48 && Math.abs(dy) < 60) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }

    var finalMedia=null,finalMediaPending=false;
    function syncDaySixBackground(payload) {
        if(Number(payload.day)===6&&Number(payload.currentTime)>=155&&!finalMedia){if(!finalMediaPending){finalMediaPending=true;S.request('diary/final-media').then(function(data){finalMedia=data;window.DiaryFinalMedia=data;}).catch(function(){}).finally(function(){finalMediaPending=false;});}return;}
        if (Number(payload.day) !== 6) return;
        var layer = S.$('#diaryDaySixBackground');
        var video = S.$('#diaryDaySixVideo');
        if (!layer || !video) return;
        var time = Math.max(0, Number(payload.currentTime) || 0);
        if (time < 155) {
            layer.classList.remove('is-visible');
            video.pause();
            return;
        }
        if (video.dataset.videoEnded === 'true') {
            layer.classList.remove('is-visible');
            return;
        }
        layer.classList.add('is-visible');
        var src = window.innerWidth > window.innerHeight
            ? finalMedia.horizontal
            : finalMedia.vertical;
        var offset = Math.max(0, time - 155);
        var changedSource = video.getAttribute('src') !== src;
        if (changedSource) {
            video.pause();
            video.src = src;
            video.dataset.videoEnded = 'false';
            video.dataset.audioPlaying = payload.playing ? 'true' : 'false';
            video.addEventListener('loadedmetadata', function onMetadata() {
                video.removeEventListener('loadedmetadata', onMetadata);
                try { video.currentTime = offset; } catch (error) {}
                if (video.dataset.audioPlaying === 'true') video.play().catch(function () {});
            });
            video.load();
        } else if (payload.playing) {
            video.dataset.audioPlaying = 'true';
            if (Math.abs(video.currentTime - offset) > 2 && Number.isFinite(video.duration)) {
                try { video.currentTime = Math.min(offset, video.duration); } catch (error) {}
            }
            video.play().catch(function () {});
        } else {
            video.dataset.audioPlaying = 'false';
            video.pause();
        }
    }

    function cancelPrompt() {
        if (!active || animating) return;
        timers.forEach(window.clearTimeout);
        timers = [];
        popup.hidden = true;
        if (terminalCloseButton) terminalCloseButton.disabled = true;
        popup.classList.remove('is-cmd-loading', 'is-cmd-open');
        resetTerminal();
        var root = document.documentElement;
        root.classList.remove(ALERT_CLASS, FREEZE_CLASS, GLITCH_CLASS, DELETE_CLASS, WHITEOUT_CLASS, RECEDE_CLASS);
        S.nav.home();
        if (window.glitch && window.glitch.hold) window.glitch.hold(false);
        active = false;
    }

    function continuePrompt() {
        if (!active || animating) return;
        animating = true;
        transitionStarted = false;
        whiteoutDone = false;
        iconsDeletionDone = false;
        finishStarted = false;
        deletedAppCount = 0;
        popup.hidden = true;
        var root = document.documentElement;
        root.classList.remove(FREEZE_CLASS, RECEDE_CLASS);
        root.classList.add(DELETE_CLASS);
        var bottomActions = Array.prototype.slice.call(document.querySelectorAll('#navBar .nav-btn'));
        var notificationTab = S.$('#statusBar');
        deleteControlsSequentially(bottomActions, 0, function () {
            deleteControlsSequentially(notificationTab ? [notificationTab] : [], 0, function () {
                deleteHomeWidgets(deleteHomeIcons);
            });
        });
    }

    var rabiscosActive = false;

    function sendRabiscosVisibility(iframe) {
        if (!iframe || !iframe.contentWindow || !iframe.getAttribute('src')) return;
        iframe.contentWindow.postMessage({
            type: 'rabiscos:visibility',
            active: rabiscosActive
        }, '*');
    }

    function setRabiscosOpacity(value) {
        var layer = S.$('#diaryRabiscosOverlay');
        if (!layer) return;
        var opacity = Math.max(0, Math.min(1, Number(value) || 0));
        var activeNow = opacity > 0;
        var changed = activeNow !== rabiscosActive;
        rabiscosActive = activeNow;
        layer.style.opacity = String(opacity);

        var iframe = layer.querySelector('iframe');
        if (!iframe) return;
        if (activeNow && !iframe.getAttribute('src')) {
            if (!iframe.dataset.rabiscosLoadListener) {
                iframe.addEventListener('load', function () {
                    sendRabiscosVisibility(iframe);
                });
                iframe.dataset.rabiscosLoadListener = 'true';
            }
            var source = iframe.getAttribute('data-src');
            if (source) iframe.setAttribute('src', source);
            return;
        }
        if (changed) sendRabiscosVisibility(iframe);
    }

    S.diaryTest = {
        isEnteringSecurityAnswer: function () {
            return awaitingSecurityAnswer;
        },
        isSequenceActive: function () {
            return active;
        },
        phaseFourCallAudioEnded: phaseFourCallAudioEnded,
        updatePhaseFourCall: function (time) {
            var root = document.documentElement;
            var device = S.$('#device');
            var currentTime = Math.max(0, Number(time) || 0);
            if (phaseFourBlackout || currentTime >= 57) {
                setRabiscosOpacity(0);
                showPhaseFourBlackout();
                updatePhaseFourLogo(currentTime);
                return;
            }
            var phoneProgress = Math.max(0, Math.min(1, (currentTime - 41) / 15));
            var rabiscosProgress = Math.max(0, Math.min(1, (currentTime - 54) / 2));
            setDaySixSparksVolume(phoneProgress);
            root.classList.toggle('is-diary-call-receding', currentTime >= 41);
            root.classList.toggle('is-diary-audio-zooming', currentTime >= 41);
            root.classList.toggle('is-diary-rabiscos-visible', currentTime >= 54);
            root.classList.toggle('is-diary-rabiscos-inverted', currentTime >= 54);
            if (device) {
                device.style.removeProperty('scale');
                device.style.setProperty('--diary-device-scale', String(1 - phoneProgress * .5));
                device.style.opacity = String(1 - phoneProgress * .1);
            }
            setRabiscosOpacity(rabiscosProgress);
            var backgroundLevel = Math.round(5 + rabiscosProgress * 250);
            var backgroundColor = 'rgb(' + backgroundLevel + ',' + backgroundLevel + ',' + backgroundLevel + ')';
            document.documentElement.style.backgroundColor = backgroundColor;
            document.body.style.backgroundColor = backgroundColor;
        },
        init: function () {
            popup = S.$('#diaryTestPopup');
            mediaLoadingRetry = S.$('#diaryMediaLoadingRetry');
            options = S.$('#diaryTerminalOptions');
            continueButton = S.$('#diaryTestContinue');
            backButton = S.$('#diaryTestBack');
            terminalTitle = S.$('#diaryTestTitle');
            terminalOutput = S.$('#diaryTerminalOutput');
            terminalCloseButton = S.$('#diaryTerminalClose');
            if (!popup || !options || !continueButton || !backButton || !terminalOutput || !terminalCloseButton) return;
            var daySixVideo = S.$('#diaryDaySixVideo');
            var daySixLayer = S.$('#diaryDaySixBackground');
            ensureDaySixWhiteout();
            if (daySixVideo && daySixLayer) {
                daySixVideo.addEventListener('ended', function () {
                    daySixVideo.dataset.videoEnded = 'true';
                    daySixLayer.classList.remove('is-visible');
                    daySixVideo.pause();
                    setDaySixScreenNoise(0);
                    enterDaySixLockCaptureMode();
                });
            }
            if (mediaLoadingRetry) mediaLoadingRetry.addEventListener('click', loadDiarySequenceMedia);
            document.addEventListener('keydown', blockPhoneKeys, true);
            document.addEventListener('keydown', blockOutsideTerminal, true);
            document.addEventListener('pointerdown', blockOutsideTerminal, true);
            document.addEventListener('pointerup', blockOutsideTerminal, true);
            document.addEventListener('click', blockOutsideTerminal, true);
            document.addEventListener('pointerdown', trackFullscreenBackSwipe, true);
            document.addEventListener('pointerup', trackFullscreenBackSwipe, true);
            document.addEventListener('pointercancel', trackFullscreenBackSwipe, true);
            continueButton.addEventListener('click', continuePrompt);
            backButton.addEventListener('click', cancelPrompt);
            terminalCloseButton.addEventListener('click', function () {
                if (!terminalCloseButton.disabled) cancelPrompt();
            });
            S.bus.on('system:unlocked', function () {
                if (!document.documentElement.classList.contains('is-phase-four-capture')) return;
                window.setTimeout(function () {
                    if (!document.documentElement.classList.contains('is-phase-four-capture')) return;
                    if (S.lock && S.lock.isLocked && S.lock.isLocked()) return;
                    if (S.nav && S.nav.open) S.nav.open('mensagens');
                }, 250);
            });
            S.bus.on('app:opened', function (event) {
                if (event.id !== 'sem-nome') return;
                if (openingFinalDiary) {
                    return;
                }
                start();
            });
            S.bus.on('app:event', function (event) {
                if (!event || event.id !== 'sem-nome' || event.name !== 'diary-audio-playback') return;
                var root = document.documentElement;
                var payload = event.payload || {};
                syncDaySixBackground(payload);
                updateDaySixScreen(payload);
                var device = S.$('#device');
                if (payload.ended) {
                    if (Number(payload.day) === 6) startDaySixSparksLoop();
                    root.classList.remove('is-diary-audio-zooming');
                    root.classList.remove('is-diary-audio-glitching');
                    root.classList.remove('is-diary-day6-reappearing');
                    root.classList.remove('is-diary-rabiscos-visible', 'is-diary-rabiscos-inverted');
                    setRabiscosOpacity(0);
                    if (device) {
                        device.style.setProperty('--diary-device-scale', '1');
                        device.style.setProperty('--diary-device-zoom', '1');
                        device.style.opacity = '1';
                        device.classList.remove('is-diary-audio-glitching', 'is-diary-day6-shaking');
                    }
                    if (Number(payload.day) === 4 || Number(payload.day) === 5) {
                        root.classList.remove('is-diary-audio-resetting');
                    } else {
                        root.classList.add('is-diary-audio-resetting');
                        window.setTimeout(function () { root.classList.remove('is-diary-audio-resetting'); }, 1400);
                    }
                    return;
                }
                if (payload.playing) {
                    root.classList.remove('is-diary-audio-resetting');
                    var scale = 1;
                    if (Number(payload.day) === 6) {
                        var daySixTime = Math.max(0, Number(payload.currentTime) || 0);
                        var daySixScale = 1;
                        var phoneOpacity = 1;
                        if (daySixTime >= 86 && daySixTime < 105) {
                            daySixScale = 1 + ((daySixTime - 86) / 19) * 0.3;
                            root.classList.add('is-diary-audio-zooming');
                        } else if (daySixTime >= 105 && daySixTime < 110) {
                            daySixScale = 1.3 - ((daySixTime - 105) / 5) * 0.3;
                            root.classList.add('is-diary-audio-zooming');
                        } else if (daySixTime >= 115 && daySixTime < 142) {
                            var fadeProgress = (daySixTime - 115) / 27;
                            daySixScale = 1 - fadeProgress * 0.3;
                            phoneOpacity = 1 - fadeProgress;
                            root.classList.add('is-diary-audio-zooming');
                        } else if (daySixTime >= 142 && daySixTime < 154) {
                            daySixScale = 0.7;
                            phoneOpacity = 0;
                            root.classList.add('is-diary-audio-zooming');
                        } else if (daySixTime >= 154) {
                            daySixScale = window.innerWidth <= 700 ? 0.9 : 0.95;
                            root.classList.remove('is-diary-audio-zooming');
                            root.classList.add('is-diary-day6-reappearing');
                        } else {
                            root.classList.remove('is-diary-audio-zooming', 'is-diary-day6-reappearing');
                        }
                        if (device) {
                            device.style.setProperty('--diary-device-scale', String(daySixScale));
                            device.style.opacity = String(phoneOpacity);
                            device.classList.toggle('is-diary-day6-shaking', daySixTime >= 115 && daySixTime < 115.5);
                        }
                    } else if (Number(payload.day) === 5) {
                        var currentTime = Math.max(0, Number(payload.currentTime) || 0);
                        if (currentTime >= 12 && currentTime < 32) {
                            var recedeProgress = (currentTime - 12) / 20;
                            scale = 1 - recedeProgress * 0.2;
                            root.classList.add('is-diary-audio-zooming');
                        } else {
                            root.classList.remove('is-diary-audio-zooming');
                        }
                        if (currentTime >= 25 && currentTime < 32) {
                            var glitchProgress = (currentTime - 25) / 7;
                            root.classList.add('is-diary-audio-glitching');
                            if (device) {
                                device.classList.add('is-diary-audio-glitching');
                                device.style.setProperty('--diary-audio-glitch-intensity', String(glitchProgress));
                                device.style.setProperty('--diary-audio-shake-x', (0.35 + glitchProgress * 3.65) + 'px');
                                device.style.setProperty('--diary-audio-glitch-cycle', (170 - glitchProgress * 105) + 'ms');
                            }
                        } else {
                            root.classList.remove('is-diary-audio-glitching');
                            if (device) device.classList.remove('is-diary-audio-glitching');
                        }
                        if (currentTime >= 25 && currentTime < 32) {
                            root.classList.add('is-diary-rabiscos-visible');
                            setRabiscosOpacity((currentTime - 25) / 7 * 0.5);
                        } else {
                            root.classList.remove('is-diary-rabiscos-visible', 'is-diary-rabiscos-inverted');
                            setRabiscosOpacity(0);
                        }
                    } else if (Number(payload.day) === 4) {
                        root.classList.remove('is-diary-rabiscos-visible', 'is-diary-rabiscos-inverted');
                        setRabiscosOpacity(0);
                        var dayFourProgress = Math.max(0, Math.min(1, Number(payload.progress) || 0));
                        scale = 1 + dayFourProgress * 0.1;
                        root.classList.add('is-diary-audio-zooming');
                    } else {
                        root.classList.remove('is-diary-rabiscos-visible', 'is-diary-rabiscos-inverted');
                        setRabiscosOpacity(0);
                        var progress = Math.max(0, Math.min(1, Number(payload.progress) || 0));
                        scale = 1 + progress * 0.1;
                        root.classList.add('is-diary-audio-zooming');
                    }
                    if (device) {
                        if (Number(payload.day) === 6) device.style.setProperty('--diary-device-zoom', String(scale));
                        else device.style.setProperty('--diary-device-scale', String(scale));
                    }
                } else {
                    root.classList.remove('is-diary-audio-zooming');
                    root.classList.remove('is-diary-audio-glitching');
                    if (device) device.classList.remove('is-diary-audio-glitching', 'is-diary-day6-shaking');
                }
            });
        }
    };
})(window.Celular = window.Celular || {});
