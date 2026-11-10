(function(M) {
    "use strict";
    var chatEl = null;
    var historyEl = null;
    var choicesEl = null;
    var typingEl = null;
    var nameEl = null;
    var statusEl = null;
    var avatarEl = null;
    var openId = null;
    var replyTimer = 0;
    var deviceVolume = 1;
    var deviceMuted = false;
    var audioSpeeds = [ 1, 1.5, 2 ];
    var audioSpeedIndex = 0;
    var recentSends = [];
    var spamTriggered = false;
    var endingEffectElement = null;
    var blockedAudio = [];
    var phaseFourCallTimer = 0;
    var phaseFourCallStarted = false;
    var pessyReadObserver = null;
    var pessyReadObserverTargets = [];
    var imageViewerEl = null;
    var playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    var pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
    function forgetBlockedAudio(audio) {
        var index = blockedAudio.indexOf(audio);
        if (index !== -1) blockedAudio.splice(index, 1);
    }
    function playAudio(audio) {
        if (!audio) return;
        try {
            var playback = audio.play();
            if (playback && playback.then) playback.then(function() {
                forgetBlockedAudio(audio);
            }, function(error) {
                if (error && error.name === "NotAllowedError" && blockedAudio.indexOf(audio) === -1) blockedAudio.push(audio);
            });
        } catch (error) {
            if (error && error.name === "NotAllowedError" && blockedAudio.indexOf(audio) === -1) blockedAudio.push(audio);
        }
    }
    function retryBlockedAudio(event) {
        if (!event.isTrusted) return;
        var clickedBubble = event.target.closest && event.target.closest(".bubble--audio");
        var clickedAudio = clickedBubble && clickedBubble.querySelector("audio");
        blockedAudio.slice().forEach(function(audio) {
            if (audio === clickedAudio) return;
            playAudio(audio);
        });
    }
    function scrollDown() {
        historyEl.scrollTop = historyEl.scrollHeight;
    }
    function scrollAudioIntoView(bubble) {
        if (!historyEl || !bubble) return;
        var viewport = historyEl.getBoundingClientRect();
        var item = bubble.getBoundingClientRect();
        var margin = 20;
        var nextTop = historyEl.scrollTop;
        if (item.bottom > viewport.bottom - margin) {
            nextTop += item.bottom - viewport.bottom + margin;
        } else if (item.top < viewport.top + margin) {
            nextTop -= viewport.top + margin - item.top;
        }
        if (nextTop !== historyEl.scrollTop) historyEl.scrollTo({
            top: nextTop,
            behavior: "smooth"
        });
    }
    function fmtTime(seconds) {
        var total = Math.max(0, Math.floor(seconds || 0));
        var minutes = Math.floor(total / 60);
        var rest = total % 60;
        return minutes + ":" + (rest < 10 ? "0" + rest : String(rest));
    }
    function setAvatar(element, avatar) {
        element.textContent = "";
        element.classList.toggle("has-img", !!(M.list && M.list.isImage(avatar)));
        if (M.list && M.list.isImage(avatar)) {
            var img = document.createElement("img");
            img.className = "chat__avatar-img";
            img.alt = "";
            img.draggable = false;
            img.src = avatar;
            element.appendChild(img);
        } else {
            element.textContent = avatar || "👤";
        }
    }
    function stopOthers(current) {
        var audios = historyEl.querySelectorAll("audio");
        for (var i = 0; i < audios.length; i++) {
            if (audios[i] !== current && !audios[i].paused) audios[i].pause();
        }
    }
    function buildText(message, bubble) {
        var text = message.text || "";
        var mentionPattern = /(?:https?:\/\/[^\s]+|www\.[^\s]+|@[\p{L}\p{N}_]+)/gu;
        var lastIndex = 0;
        var match;
        while (match = mentionPattern.exec(text)) {
            if (match.index > lastIndex) bubble.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            if (/^(?:https?:\/\/|www\.)/i.test(match[0])) {
                if (/^www\.receitasdahora\.com\.vr$/i.test(match[0])) {
                    bubble.appendChild(M.el("span", {
                        className: "message-mention",
                        text: match[0]
                    }));
                } else {
                    var link = document.createElement("a");
                    link.className = "message-mention";
                    link.href = /^https?:\/\//i.test(match[0]) ? match[0] : "https://" + match[0];
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = match[0];
                    bubble.appendChild(link);
                }
            } else {
                var mention = document.createElement("span");
                mention.className = "message-mention";
                mention.textContent = match[0];
                var mentionedName = match[0].slice(1).toLocaleLowerCase();
                var mentionedContact = M.data.get(mentionedName) || M.data.all().filter(function(contact) {
                    return (contact.name || "").replace(/\s+/g, "").toLocaleLowerCase() === mentionedName;
                })[0];
                if (mentionedContact && M.profile) {
                    mention.classList.add("message-mention--profile");
                    mention.setAttribute("data-profile-contact", mentionedContact.id);
                    mention.setAttribute("role", "button");
                    mention.setAttribute("tabindex", "0");
                    mention.setAttribute("aria-label", "Abrir perfil de " + mentionedContact.name);
                    function openMentionedProfile(event) {
                        if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        M.profile.open(event.currentTarget.getAttribute("data-profile-contact"));
                    }
                    mention.addEventListener("click", openMentionedProfile);
                    mention.addEventListener("keydown", openMentionedProfile);
                }
                bubble.appendChild(mention);
            }
            lastIndex = mentionPattern.lastIndex;
        }
        if (lastIndex < text.length) bubble.appendChild(document.createTextNode(text.slice(lastIndex)));
        return bubble;
    }
    function watchPessyUnsentMessage(message, bubble) {
        if (typeof IntersectionObserver !== "function") return;
        var observer = new IntersectionObserver(function(entries) {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            bubble.classList.add("bubble--glitch-on-view");
            var replaced = false;
            function replaceWithError() {
                if (replaced) return;
                replaced = true;
                bubble.removeEventListener("animationend", replaceWithError);
                message.text = "Não foi possível carregar essa mensagem, tente mais tarde.";
                message.type = "text";
                bubble.classList.remove("bubble--unsent", "bubble--glitch-on-view");
                bubble.classList.add("bubble--load-error");
                var meta = bubble.querySelector(".bubble__time");
                bubble.textContent = "";
                buildText(message, bubble);
                if (meta) bubble.appendChild(meta);
                M.data.persist();
            }
            bubble.addEventListener("animationend", replaceWithError);
            window.setTimeout(replaceWithError, 1500);
        }, {
            root: historyEl,
            threshold: .25
        });
        observer.observe(bubble);
    }
    function waveHeights(seed, count) {
        var heights = [];
        var hash = 0;
        var str = String(seed || "audio");
        for (var s = 0; s < str.length; s++) hash = hash * 31 + str.charCodeAt(s) | 0;
        var value = hash | 0;
        for (var i = 0; i < count; i++) {
            value = value * 1103515245 + 12345 & 2147483647;
            heights.push(22 + value % 79);
        }
        return heights;
    }
    function isPhaseFourMotherAudio(message) {
        return !!(message && message.type === "audio" && message.phaseFourAudio === true);
    }
    function phaseFourMotherAudiosComplete(contact) {
        if (!contact || contact.id !== "mae") return false;
        var required = contact.messages.filter(isPhaseFourMotherAudio);
        return required.length === 2 && required.every(function(message) {
            return message.phaseFourHeard === true;
        });
    }
    function lockPhaseFourMotherAudios(contact) {
        if (!phaseFourMotherAudiosComplete(contact)) return false;
        historyEl.querySelectorAll("audio").forEach(function(player) {
            if (player.dataset.phaseFourAudio !== 'true') return;
            var bubble = player.closest(".bubble--audio");
            if (!bubble) return;
            var button = bubble.querySelector(".audio__btn");
            var wave = bubble.querySelector(".audio__wave");
            if (button) {
                button.disabled = true;
                button.setAttribute("aria-label", "Este áudio já foi ouvido");
            }
            if (wave) wave.classList.add("is-locked");
        });
        return true;
    }
    function buildAudio(message, bubble, contact) {
        bubble.classList.add("bubble--audio");
        var fixedPhaseFourAudio = !!(contact && contact.id === "mae" && document.documentElement.classList.contains("is-phase-four-capture"));
        var initialSpeed = fixedPhaseFourAudio ? 1 : audioSpeeds[audioSpeedIndex];
        var isMine = message.sender === "me";
        var btn = M.el("button", {
            className: "audio__btn",
            html: playIcon,
            type: "button",
            "aria-label": "Reproduzir áudio"
        });
        var col = M.el("span", {
            className: "audio__col"
        });
        var wave = M.el("span", {
            className: "audio__wave"
        });
        if (fixedPhaseFourAudio) wave.classList.add("is-unseekable");
        var bars = [];
        var heights = waveHeights(message.src || message.duration, 32);
        heights.forEach(function(height) {
            var bar = M.el("i", {
                style: "height:" + height + "%"
            });
            bars.push(bar);
            wave.appendChild(bar);
        });
        var meta = M.el("span", {
            className: "audio__meta"
        });
        var fallback = typeof message.duration === "number" && message.duration > 0
            ? message.duration
            : M.audioMetadata ? M.audioMetadata.duration(message.src) : 0;
        if (fallback > 0) message.duration = fallback;
        var time = M.el("span", {
            className: "audio__time",
            text: fmtTime(fallback)
        });
        var speed = M.el("button", {
            className: "audio__speed",
            type: "button",
            text: initialSpeed + "x",
            title: "Velocidade de reprodução"
        });
        speed.setAttribute("aria-label", "Velocidade " + initialSpeed + " vezes");
        meta.appendChild(time);
        col.appendChild(wave);
        col.appendChild(meta);
        if (message.forwarded) col.insertBefore(M.el("span", {
            className: "audio__forwarded",
            text: "↪ Encaminhada"
        }), wave);
        var senderAvatar = isMine ? M.data.myself() : contact;
        if (!isMine && contact && contact.isGroup && message.author) {
            senderAvatar = M.data.all().filter(function(item) {
                return item.name === message.author;
            })[0] || contact;
        }
        var avatar = M.el("span", {
            className: "audio__avatar",
            "aria-hidden": "true"
        });
        setAvatar(avatar, senderAvatar && senderAvatar.avatar ? senderAvatar.avatar : "👤");
        speed.hidden = true;
        speed.disabled = fixedPhaseFourAudio;
        var accessory = M.el("span", {
            className: "audio__accessory"
        });
        accessory.appendChild(avatar);
        accessory.appendChild(speed);
        if (message.time) {
            var sentMeta = M.el("span", {
                className: "audio__sent-meta",
                text: message.time
            });
            if (message.sender === "me" || message.sender === "them") sentMeta.appendChild(M.el("span", {
                className: "message-receipt" + (message.read ? " message-receipt--read" : ""),
                text: " ✓✓",
                title: message.read ? "Lida" : "Entregue",
                "aria-label": message.read ? "Lida" : "Entregue"
            }));
            accessory.appendChild(sentMeta);
        }
        var audio = document.createElement("audio");
        if (isPhaseFourMotherAudio(message)) audio.dataset.phaseFourAudio = 'true';
        audio.preload = "metadata";
        audio.src = window.audioSource ? window.audioSource(message.src || "") : message.src || "";
        var mediaStatus = M.el("span", {
            className: "audio__status",
            role: "status",
            text: ""
        });
        col.appendChild(mediaStatus);
        audio.volume = deviceVolume;
        audio.muted = deviceMuted;
        audio.playbackRate = initialSpeed;
        function startWithEffect() {
            stopOthers(audio);
            var effect = new Audio("/apps/mensagens/audio/audio-002.mp3");
            effect.volume = deviceVolume;
            effect.muted = deviceMuted;
            playAudio(effect);
            playAudio(audio);
        }
        audio._playAfterZap = startWithEffect;
        speed.addEventListener("click", function(event) {
            event.stopPropagation();
            if (fixedPhaseFourAudio) return;
            audioSpeedIndex = (audioSpeedIndex + 1) % audioSpeeds.length;
            var rate = audioSpeeds[audioSpeedIndex];
            var players = historyEl.querySelectorAll(".audio__speed");
            for (var i = 0; i < players.length; i++) {
                players[i].textContent = rate + "x";
                players[i].setAttribute("aria-label", "Velocidade " + rate + " vezes");
                var playerAudio = players[i].closest(".bubble--audio").querySelector("audio");
                if (playerAudio) playerAudio.playbackRate = rate;
            }
        });
        function paint() {
            var dur = fallback || (audio.duration && isFinite(audio.duration) ? audio.duration : 0);
            var cur = audio.currentTime || 0;
            var ratio = dur > 0 ? Math.max(0, Math.min(1, cur / dur)) : 0;
            var played = Math.floor(ratio * bars.length);
            for (var i = 0; i < bars.length; i++) {
                bars[i].classList.toggle("is-played", i < played);
            }
            wave.classList.toggle("is-done", ratio >= 1 && dur > 0);
            time.textContent = fmtTime(cur) + " / " + fmtTime(dur);
        }
        function applyPendingSeek() {
            if (pendingSeek === null) return;
            try {
                audio.currentTime = Math.max(0, Math.min(fallback || audio.duration, pendingSeek));
                pendingSeek = null;
            } catch (error) {}
        }
        var pendingSeek = null;
        audio.addEventListener("loadedmetadata", function() {
            if (audio.duration && isFinite(audio.duration)) {
                if (!fallback) {
                    fallback = audio.duration;
                    message.duration = fallback;
                }
                applyPendingSeek();
            }
            paint();
        });
        audio.addEventListener("canplay", applyPendingSeek);
        audio.addEventListener("timeupdate", paint);
        audio.addEventListener("ended", function() {
            forgetBlockedAudio(audio);
            btn.innerHTML = playIcon;
            btn.setAttribute("aria-label", "Reproduzir áudio");
            bubble.classList.remove("is-playing");
            avatar.hidden = false;
            speed.hidden = true;
            if (fixedPhaseFourAudio && isPhaseFourMotherAudio(message)) {
                message.phaseFourHeard = true;
                var allPhaseFourAudiosHeard = phaseFourMotherAudiosComplete(contact);
                if (allPhaseFourAudiosHeard) {
                    lockPhaseFourMotherAudios(contact);
                    paint();
                    if (!phaseFourCallStarted) {
                        phaseFourCallStarted = true;
                        if (phaseFourCallTimer) clearTimeout(phaseFourCallTimer);
                        phaseFourCallTimer = setTimeout(function() {
                            phaseFourCallTimer = 0;
                            M.host.emit("phase-four-call", null);
                        }, 2e3);
                    }
                    return;
                }
                audio.currentTime = 0;
                paint();
                return;
            }
            audio.currentTime = 0;
            paint();
            var queue = historyEl.querySelectorAll("audio");
            var currentIndex = Array.prototype.indexOf.call(queue, audio);
            var next = currentIndex >= 0 ? queue[currentIndex + 1] : null;
            if (next) {
                if ((!contact || contact.id !== "grupinho") && !fixedPhaseFourAudio && next._playAfterZap) next._playAfterZap();
            } else {
                endingEffectElement = new Audio("/apps/mensagens/audio/audio-001.mp3");
                endingEffectElement.volume = deviceVolume;
                endingEffectElement.muted = deviceMuted;
                playAudio(endingEffectElement);
            }
        });
        audio.addEventListener("error", function() {
            mediaStatus.textContent = "Não foi possível carregar este áudio. Toque em reproduzir para tentar novamente.";
            bubble.classList.add("bubble--media-error");
            btn.innerHTML = playIcon;
            btn.setAttribute("aria-label", "Tentar reproduzir áudio novamente");
            avatar.hidden = false;
            speed.hidden = true;
            bubble.classList.remove("is-playing");
        });
        audio.addEventListener("play", function() {
            forgetBlockedAudio(audio);
            mediaStatus.textContent = "";
            bubble.classList.remove("bubble--media-error");
            stopOthers(audio);
            scrollAudioIntoView(bubble);
            btn.innerHTML = pauseIcon;
            btn.setAttribute("aria-label", "Pausar áudio");
            bubble.classList.add("is-playing");
            avatar.hidden = true;
            speed.hidden = fixedPhaseFourAudio;
        });
        audio.addEventListener("pause", function() {
            forgetBlockedAudio(audio);
            btn.innerHTML = playIcon;
            btn.setAttribute("aria-label", "Reproduzir áudio");
            bubble.classList.remove("is-playing");
            avatar.hidden = false;
            speed.hidden = true;
        });
        btn.addEventListener("click", function() {
            if (fixedPhaseFourAudio && phaseFourMotherAudiosComplete(contact)) {
                lockPhaseFourMotherAudios(contact);
                return;
            }
            if (audio.paused) {
                if (audio.error) {
                    mediaStatus.textContent = "Tentando carregar o áudio…";
                    audio.load();
                }
                startWithEffect();
            } else audio.pause();
        });
        function seek(event) {
            if (fixedPhaseFourAudio) return;
            if (fixedPhaseFourAudio && phaseFourMotherAudiosComplete(contact)) {
                lockPhaseFourMotherAudios(contact);
                return;
            }
            var rect = wave.getBoundingClientRect();
            var ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
            ratio = Math.max(0, Math.min(1, ratio));
            var dur = fallback || (audio.duration && isFinite(audio.duration) ? audio.duration : 0);
            if (dur > 0) {
                var target = ratio * dur;
                if (audio.readyState > 0) {
                    try {
                        audio.currentTime = target;
                    } catch (error) {
                        pendingSeek = target;
                    }
                } else pendingSeek = target;
            }
            paint();
        }
        wave.addEventListener("click", seek);
        if (fixedPhaseFourAudio && phaseFourMotherAudiosComplete(contact)) {
            btn.disabled = true;
            btn.setAttribute("aria-label", "Este áudio já foi ouvido");
            wave.classList.add("is-locked");
            lockPhaseFourMotherAudios(contact);
        }
        paint();
        bubble.appendChild(btn);
        bubble.appendChild(col);
        bubble.appendChild(accessory);
        bubble.appendChild(audio);
        return bubble;
    }
    function buildImage(message, bubble) {
        bubble.classList.add("bubble--image");
        var img = document.createElement("img");
        img.className = "bubble__img";
        img.alt = message.caption || "foto";
        img.draggable = false;
        img.loading = "lazy";
        img.src = message.src || "";
        var imageStatus = M.el("div", { className: "bubble__media-status" });
        var imageStatusText = M.el("span", { role: "status", text: "Imagem indisponível" });
        var imageRetry = M.el("button", { type: "button", text: "Tentar novamente" });
        imageStatus.hidden = true;
        imageStatus.appendChild(imageStatusText);
        imageStatus.appendChild(imageRetry);
        img.addEventListener("error", function() {
            imageStatus.hidden = false;
            img.hidden = true;
        });
        imageRetry.addEventListener("click", function(event) {
            event.stopPropagation();
            var retryUrl = new URL(message.src || "", document.baseURI);
            retryUrl.searchParams.set("retry", Date.now());
            imageStatusText.textContent = "Tentando carregar a imagem…";
            imageStatus.hidden = false;
            img.hidden = false;
            img.src = retryUrl.href;
        });
        img.addEventListener("load", function() { imageStatus.hidden = true; });
        img.addEventListener("click", function(event) {
            event.stopPropagation();
            if (!imageViewerEl) {
                imageViewerEl = M.el("div", {
                    className: "image-viewer",
                    role: "dialog",
                    "aria-modal": "true"
                });
                imageViewerEl.addEventListener("click", function() {
                    imageViewerEl.hidden = true;
                });
                document.addEventListener("keydown", function(keyEvent) {
                    if (keyEvent.key === "Escape" && imageViewerEl) imageViewerEl.hidden = true;
                });
                document.body.appendChild(imageViewerEl);
            }
            imageViewerEl.textContent = "";
            var enlarged = document.createElement("img");
            enlarged.src = message.src || "";
            enlarged.alt = img.alt;
            imageViewerEl.appendChild(enlarged);
            imageViewerEl.hidden = false;
        });
        bubble.appendChild(img);
        bubble.appendChild(imageStatus);
        if (message.caption) {
            var caption = M.el("div", {
                className: "bubble__caption"
            });
            buildText({
                text: message.caption
            }, caption);
            bubble.appendChild(caption);
        }
        return bubble;
    }
    function buildSticker(message, bubble) {
        bubble.classList.add("bubble--sticker");
        if (message.forwarded) bubble.appendChild(M.el("span", {
            className: "sticker__forwarded",
            text: "↪ Encaminhada"
        }));
        var image = document.createElement("img");
        image.className = "bubble__sticker";
        image.alt = message.caption || "Figurinha";
        image.loading = "lazy";
        image.src = message.src;
        image.addEventListener("load", function() { bubble.classList.remove("bubble--media-error"); });
        image.addEventListener("error", function() {
            image.hidden = true;
            bubble.classList.add("bubble--media-error");
            bubble.appendChild(M.el("span", {
                className: "bubble__media-status",
                role: "status",
                text: "Figurinha indisponível"
            }));
        });
        bubble.appendChild(image);
        if (message.caption) bubble.appendChild(M.el("div", {
            className: "bubble__caption",
            text: message.caption
        }));
        return bubble;
    }
    function findReplyTarget(reply, currentIndex) {
        if (!reply || !historyEl) return null;
        var bubbles = historyEl.querySelectorAll(".bubble");
        var quotedText = String(reply.text || "").trim().toLowerCase();
        function matches(candidate) {
            var target = candidate.__chatMessage;
            if (!target) return false;
            var author = String(reply.author || "").toLowerCase();
            var authorMatches = !author || String(target.author || "").toLowerCase() === author;
            if (!authorMatches && reply.sender) authorMatches = target.sender === reply.sender;
            if (!authorMatches) return false;
            if (reply.time && String(target.time || "") !== String(reply.time)) return false;
            var targetText = [ target.text, target.caption, target.name ].join(" ").trim().toLowerCase();
            if (!quotedText || targetText && (targetText.indexOf(quotedText) !== -1 || quotedText.indexOf(targetText) !== -1)) return true;
            if (quotedText.indexOf("figurinha") !== -1) return target.type === "sticker";
            if (quotedText.indexOf("áudio") !== -1 || quotedText.indexOf("audio") !== -1) return target.type === "audio";
            if (quotedText.indexOf("foto") !== -1 || quotedText.indexOf("imagem") !== -1 || quotedText === "mídia") return target.type === "image";
            if (quotedText.indexOf("arquivo") !== -1) return target.type === "file";
            return false;
        }
        for (var i = bubbles.length - 1; i >= 0; i--) {
            var candidate = bubbles[i];
            if (candidate.__chatIndex < currentIndex && matches(candidate)) return candidate;
        }
        for (var j = bubbles.length - 1; j >= 0; j--) {
            if (matches(bubbles[j])) return bubbles[j];
        }
        return null;
    }
    function highlightReplyTarget(target) {
        if (!target) return;
        historyEl.querySelectorAll(".bubble--reply-target").forEach(function(bubble) {
            bubble.classList.remove("bubble--reply-target");
            if (bubble.__replyHighlightTimer) clearTimeout(bubble.__replyHighlightTimer);
        });
        target.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
        target.classList.remove("bubble--reply-target");
        void target.offsetWidth;
        target.classList.add("bubble--reply-target");
        target.__replyHighlightTimer = setTimeout(function() {
            target.classList.remove("bubble--reply-target");
            target.__replyHighlightTimer = 0;
        }, 1900);
    }
    function renderReply(message, bubble, messageIndex) {
        if (!message.reply) return;
        var quote = M.el("div", {
            className: "bubble__reply",
            role: "button",
            tabindex: "0",
            title: "Ver mensagem respondida"
        });
        quote.appendChild(M.el("b", {
            text: message.reply.author || message.reply.sender || "Mensagem"
        }));
        quote.appendChild(M.el("span", {
            text: message.reply.text || "Mídia"
        }));
        quote.addEventListener("click", function(event) {
            event.stopPropagation();
            highlightReplyTarget(findReplyTarget(message.reply, messageIndex));
        });
        quote.addEventListener("keydown", function(event) {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            highlightReplyTarget(findReplyTarget(message.reply, messageIndex));
        });
        bubble.insertBefore(quote, bubble.firstChild);
    }
    function buildFile(message, bubble) {
        bubble.classList.add("bubble--file");
        bubble.appendChild(M.el("span", {
            className: "file__icon",
            text: "📎"
        }));
        var info = M.el("span", {
            className: "file__info"
        });
        info.appendChild(M.el("span", {
            className: "file__name",
            text: message.name || "arquivo"
        }));
        if (message.size) info.appendChild(M.el("span", {
            className: "file__size",
            text: message.size
        }));
        bubble.appendChild(info);
        return bubble;
    }
    function buildContact(message, bubble) {
        bubble.classList.add("bubble--contact");
        var card = M.el("button", {
            className: "contact-card",
            type: "button",
            on: {
                click: async function(event) {event.stopPropagation();try{await M.data.unlockContact(message.src||'beth',message.ticket);await M.chat.open(message.src||'beth');}catch(e){}
                }
            }
        });
        var contactAvatar = document.createElement("img");
        contactAvatar.className = "contact-card__avatar";
        contactAvatar.src = "pfp/imagem-009.svg";
        contactAvatar.alt = "";
        card.appendChild(contactAvatar);
        var info = M.el("span", {
            className: "contact-card__info"
        });
        info.appendChild(M.el("b", {
            className: "contact-card__name",
            text: message.name || "Contato"
        }));
        info.appendChild(M.el("span", {
            className: "contact-card__action",
            text: "Conversar"
        }));
        card.appendChild(info);
        bubble.appendChild(card);
        return bubble;
    }
    function renderHistory(contact, startAtTop) {
        stopOthers(null);
        if (pessyReadObserver) {
            pessyReadObserver.disconnect();
            pessyReadObserver = null;
        }
        pessyReadObserverTargets.forEach(function(bubble) {
            bubble.__pessyIsVisible = false;
            if (bubble.__pessyReadTimer) clearTimeout(bubble.__pessyReadTimer);
            bubble.__pessyReadTimer = 0;
        });
        pessyReadObserverTargets = [];
        historyEl.innerHTML = "";
        var inPessyConversationFour = false;
        var inTorajoConversationFour = false;
        var pessyMessagesToObserve = [];
        historyEl.appendChild(M.el("div", {
            className: "chat__notice",
            text: "Backup incompleto. Algumas mensagens podem não ter sido recuperadas."
        }));
        contact.messages.forEach(function(message, messageIndex) {
            var type = message.type || "text";
            if (type === "day") {
                if (contact.id === "pessy") {
                    if (/Teoria da Pessy$/.test(message.text || "") || message.text === "08/08/2026") inPessyConversationFour = true; else if (inPessyConversationFour && !/^\d{2}\/\d{2}\/\d{4}$/.test(message.text || "")) inPessyConversationFour = false;
                }
                if (contact.id === "torajo") inTorajoConversationFour = message.text === "Ontem";
                historyEl.appendChild(M.el("div", {
                    className: "day-divider",
                    text: M.data.relativeDate ? M.data.relativeDate(message.displayText || message.text) : message.displayText || message.text
                }));
                return;
            }
            if (type === "system-italic") {
                var italicNotice = M.el("div", {
                    className: "event-bar event-bar--italic"
                });
                italicNotice.appendChild(M.el("em", {
                    text: message.text
                }));
                historyEl.appendChild(italicNotice);
                return;
            }
            if (type === "call" || type === "system") {
                historyEl.appendChild(M.el("div", {
                    className: "event-bar" + (type === "call" ? " event-bar--call" : ""),
                    text: (type === "call" ? "☎  Chamada perdida" : message.text) + (message.time ? " · " + message.time : "")
                }));
                return;
            }
            var receiptRead = contact.id !== "pessy" || !inPessyConversationFour || message.read;
            var classes = "bubble bubble--" + (message.sender === "me" ? "me" : "them");
            if (type === "unsent") classes += " bubble--unsent";
            if (message.ephemeral) classes += " bubble--glitch";
            if (message.creepy) classes += " bubble--creepy";
            if (message.text === "Não foi possível carregar essa mensagem, tente mais tarde." || message.text === "não foi possivel carregar essa mensagem, tente novamente mais tarde") classes += " bubble--load-error";
            var bubble = M.el("div", {
                className: classes
            });
            bubble.__chatMessage = message;
            bubble.__chatIndex = messageIndex;
            if (type === "audio") buildAudio(message, bubble, contact); else if (type === "contact") buildContact(message, bubble); else if (type === "sticker") buildSticker(message, bubble); else if (type === "image") buildImage(message, bubble); else if (type === "file") buildFile(message, bubble); else buildText(message, bubble);
            if (type === "unsent") bubble.appendChild(M.el("span", {
                className: "bubble__unsent-label",
                text: "não enviada"
            }));
            renderReply(message, bubble, messageIndex);
            if (contact.isGroup && message.author && message.author !== "Morajo" && message.author !== "Você" && type !== "system" && type !== "call") {
                var groupMember = M.data.all().filter(function(member) {
                    return member.name === message.author;
                })[0];
                if (groupMember) {
                    bubble.classList.add("bubble--group-member");
                    var memberAvatar = M.el("span", {
                        className: "group-message-avatar",
                        title: message.author,
                        "aria-label": "Foto de " + message.author
                    });
                    setAvatar(memberAvatar, groupMember.avatar);
                    bubble.appendChild(memberAvatar);
                }
            }
            if (message.author && message.sender !== "me" && contact.isGroup) {
                var authorClass = String(message.author).toLowerCase().replace(/[^a-z0-9_-]/g, "");
                if (type === "audio") bubble.classList.add("bubble--group-audio");
                bubble.insertBefore(M.el("b", {
                    className: "bubble__author bubble__author--" + authorClass,
                    text: message.author
                }), bubble.firstChild);
            }
            if (message.time && type !== "audio") {
                var meta = M.el("span", {
                    className: "bubble__time"
                });
                meta.appendChild(document.createTextNode(message.time));
                if (message.sender === "me" || message.sender === "them") meta.appendChild(M.el("span", {
                    className: "message-receipt" + (receiptRead ? " message-receipt--read" : ""),
                    text: message.ephemeral ? " ✓" : " ✓✓",
                    title: receiptRead ? "Lida" : "Entregue",
                    "aria-label": receiptRead ? "Lida" : "Entregue"
                }));
                bubble.appendChild(meta);
            }
            historyEl.appendChild(bubble);
            if ((contact.id === "pessy" && inPessyConversationFour || contact.id === "torajo" && inTorajoConversationFour) && (message.sender === "me" || message.sender === "them") && message.time) {
                pessyMessagesToObserve.push({
                    bubble,
                    message
                });
            }
            if (contact.id === "pessy" && type === "unsent") watchPessyUnsentMessage(message, bubble);
        });
        if (pessyMessagesToObserve.length && typeof window.IntersectionObserver === "function") {
            pessyReadObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    var bubble = entry.target;
                    bubble.__pessyIsVisible = entry.isIntersecting;
                    if (!entry.isIntersecting) {
                        if (bubble.__pessyReadTimer) clearTimeout(bubble.__pessyReadTimer);
                        bubble.__pessyReadTimer = 0;
                        return;
                    }
                    if (bubble.__pessyReadTimer) return;
                    bubble.__pessyReadTimer = setTimeout(function() {
                        bubble.__pessyReadTimer = 0;
                        if (!bubble.__pessyIsVisible || !bubble.isConnected) return;
                        if (contact.id === "torajo") M.data.markTorajoMessageRead(bubble.__pessyReadMessage); else M.data.markPessyMessageRead(bubble.__pessyReadMessage);
                        var receipt = bubble.querySelector(".message-receipt");
                        if (receipt) {
                            receipt.classList.add("message-receipt--read");
                            receipt.title = "Lida";
                            receipt.setAttribute("aria-label", "Lida");
                        }
                        pessyReadObserver.unobserve(bubble);
                    }, 1e3);
                });
            }, {
                root: historyEl,
                threshold: .25
            });
            pessyMessagesToObserve.forEach(function(item) {
                item.bubble.__pessyReadMessage = item.message;
                if (!item.message.read) {
                    pessyReadObserverTargets.push(item.bubble);
                    pessyReadObserver.observe(item.bubble);
                }
            });
        }
        if (startAtTop) historyEl.scrollTop = 0; else scrollDown();
    }
    function renderChoices(contact) {
        choicesEl.innerHTML = "";
        var node = M.data.node(contact.id);
        var choices = node && node.choices || [];
        if (!choices.length) {
            choicesEl.hidden = true;
            return;
        }
        choicesEl.hidden = false;
        choices.forEach(function(choice, index) {
            choicesEl.appendChild(M.el("button", {
                className: "choice",
                style: "animation-delay:" + index * 60 + "ms",
                text: choice.text,
                on: {
                    click: function() {
                        M.chat.choose(choice);
                    }
                }
            }));
        });
    }
    M.chat = {
        init: function() {
            chatEl = M.$("#chat");
            historyEl = M.$("#history");
            choicesEl = M.$("#choices");
            typingEl = M.$("#typing");
            nameEl = M.$("#chatName");
            statusEl = M.$("#chatStatus");
            avatarEl = M.$("#chatAvatar");
            document.addEventListener("pointerdown", retryBlockedAudio, true);
            document.addEventListener("keydown", retryBlockedAudio, true);
            var form = M.$("#composer");
            var input = M.$("#messageInput");
            form.addEventListener("submit", function(event) {
                event.preventDefault();
                var text = input.value.slice(0, 500).trim();
                if (!text || !openId) return;
                M.chat.sendEphemeral(text);
                input.value = "";
            });
        },
        setDeviceAudio: function(volume, muted) {
            deviceVolume = Math.max(0, Math.min(1, Number(volume) || 0));
            deviceMuted = !!muted;
            historyEl.querySelectorAll("audio").forEach(function(audio) {
                audio.volume = deviceVolume;
                audio.muted = deviceMuted;
            });
        },
        isOpen: function() {
            return !!openId;
        },
        contactId: function() {
            return openId;
        },
        open: async function(id) {
            var contact;try{contact=await M.data.open(id);}catch(e){return;}
            if (!contact) return;
            if (M.profile && M.profile.isOpen()) M.profile.close();
            openId = id;
            contact.unread = 0;
            var peer = M.$("#chatPeer");
            if (peer) peer.setAttribute("data-contact", id);
            var head = M.$("#chatHead");
            if (head) head.setAttribute("data-contact", id);
            setAvatar(avatarEl, contact.avatar);
            nameEl.textContent = contact.name;
            statusEl.textContent = contact.status === "online" ? "online" : "offline";
            statusEl.classList.toggle("is-online", contact.status === "online");
            chatEl.hidden = false;
            chatEl.classList.remove("is-leaving");
            renderHistory(contact, true);
            renderChoices(contact);
            M.chat.renderStickers();
            M.list.render();
            M.main.publishUnread();
        },
        close: function() {
            if (!openId) return;
            clearTimeout(replyTimer);
            replyTimer = 0;
            typingEl.hidden = true;
            stopOthers(null);
            openId = null;
            chatEl.classList.add("is-leaving");
            setTimeout(function() {
                chatEl.hidden = true;
                chatEl.classList.remove("is-leaving");
            }, 240);
            M.list.render();
        },
        refresh: function() {
            if (!openId) return;
            var contact = M.data.get(openId);
            if (!contact) return;
            contact.unread = 0;
            renderHistory(contact);
            M.list.render();
            M.main.publishUnread();
        },
        receive: function(id, text, creepy) {
            var contact = M.data.get(id);
            if (!contact) return;
            var stored;
            if (text && typeof text === "object") stored = M.data.addMessage(id, text); else stored = M.data.addMessage(id, "them", text, creepy);
            var notifyText = M.list ? M.list.preview(stored) : stored.text || "";
            if (openId === id && M.focused) {
                renderHistory(contact);
            } else {
                contact.unread += 1;
                M.host.emit("message", {
                    title: contact.name,
                    text: notifyText,
                    creepy: !!stored.creepy
                });
            }
            M.list.render();
            M.main.publishUnread();
        },
        send: function(message) {
            if (!openId) return;
            message.time = M.time();
            M.data.addMessage(openId, message);
            M.$("#stickerPicker").hidden = true;
            renderHistory(M.data.get(openId));
            M.list.render();
        },
        sendEphemeral: function(text) {
            if (!openId || !text || spamTriggered) return;
            var now = Date.now();
            recentSends = recentSends.filter(function(sentAt) {
                return now - sentAt < 4e3;
            });
            recentSends.push(now);
            if (recentSends.length > 8) {
                spamTriggered = true;
                M.host.emit("spam-glitch-home");
                return;
            }
            var id = openId;
            var contact = M.data.get(id);
            var message = M.data.addMessage(id, {
                sender: "me",
                author: "Morajo",
                type: "text",
                text,
                read: false,
                ephemeral: true
            });
            renderHistory(contact);
            M.list.render();
            window.setTimeout(function() {
                var index = contact.messages.indexOf(message);
                if (index !== -1) contact.messages.splice(index, 1);
                M.data.persist();
                if (openId === id) renderHistory(contact);
                M.list.render();
            }, 1600);
        },
        resetSpamLimit: function() {
            spamTriggered = false;
            recentSends = [];
        },
        renderStickers: function() {
            var picker = M.$("#stickerPicker");
            if (!picker || !openId) return;
            picker.innerHTML = "";
            var id = openId === "grupo" ? "Grupo" : {
                mae: "Maya",
                pai: "Arthur"
            }[openId] || openId.charAt(0).toUpperCase() + openId.slice(1);
            var known = {
                torajo: 3,
                zulmi: 3,
                linn: 11,
                azedo: 10,
                pessy: 0,
                margo: 1,
                jay: 3,
                mae: 3,
                pai: 1,
                grupo: 9
            }[openId] || 0;
            if (!known) {
                picker.appendChild(M.el("span", {
                    className: "sticker-picker__empty",
                    text: "Sem figurinhas nesta conversa"
                }));
                return;
            }
            for (var i = 1; i <= known; i++) {
                var stickerIndex = i + (openId === "zulmi" ? 1 : 0);
                if (openId === "margo") stickerIndex = 2;
                var path = id + "/imagem-" + ("000" + stickerIndex).slice(-3) + ".webp";
                var button = M.el("button", {
                    className: "sticker-option",
                    type: "button",
                    title: "Enviar figurinha " + i
                });
                var image = document.createElement("img");
                image.src = "img/stickers/" + path;
                image.alt = "Figurinha " + i;
                image.loading = "lazy";
                button.appendChild(image);
                button.disabled = true;
                picker.appendChild(button);
            }
        },
        choose: async function(choice) {var contact=M.data.get(openId);if(!contact)return;var index=(M.data.node(contact.id)?.choices||[]).indexOf(choice);if(index<0)return;try{var result=await M.data.choose(contact.id,index);renderHistory(M.data.get(contact.id));renderChoices(M.data.get(contact.id));if(result.triggerCall)M.host.emit('call',{contact:result.triggerCall});}catch(e){}}
    };
})(window.Msg = window.Msg || {});
