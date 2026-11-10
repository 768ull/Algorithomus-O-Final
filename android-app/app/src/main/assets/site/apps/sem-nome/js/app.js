        (function () {
            "use strict";
            var list = document.getElementById("notes");
            var listView = document.getElementById("listView");
            var detailView = document.getElementById("detailView");
            var detailTitle = document.getElementById("detailTitle");
            var app = document.querySelector(".app");
            var shadeLayer = document.querySelector(".shade-layer");
            var audioPlay = document.getElementById("audioPlay");
            var audioProgressFill = document.getElementById("audioProgressFill");
            var audioCurrent = document.getElementById("audioCurrent");
            var audioDuration = document.getElementById("audioDuration");
            var audioLabel = document.getElementById("audioLabel");
            var audioStatus = document.getElementById("audioStatus");
            var voicePlayer = document.querySelector(".voice");
            var transcript = document.getElementById("transcript");
            var audioPlayer = new Audio();
            audioPlayer.preload = "metadata";
            var transcriptSegments = [];
            var transcriptFrameId = null;
            var shadeAnimation;
            var activeDay = 0;
            var unlockedDay = 0;
            var protectedDay=null,finishTicket=null,loadingDay=false,requestChain=Promise.resolve();
            function request(action,data){var next=requestChain.then(async function(){var response=await fetch('/api/diary/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});if(!response.ok)throw Error('Conteúdo bloqueado ou conexão indisponível.');return response.json();});requestChain=next.catch(function(){});return next;}
            var dayButtons = [];
            var finalSequenceStarted = false;
            function formatTime(seconds) {
                if (!Number.isFinite(seconds)) return "0:00";
                var minutes = Math.floor(seconds / 60);
                var remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
                return minutes + ":" + remainingSeconds;
            }
            function updateAudioProgress() {
                var duration = audioPlayer.duration;
                var progress = Number.isFinite(duration) && duration > 0 ? audioPlayer.currentTime / duration * 100 : 0;
                audioProgressFill.style.width = progress + "%";
                audioCurrent.textContent = formatTime(audioPlayer.currentTime);
                audioDuration.textContent = formatTime(duration);
            }
            function updateAudioPlaybackState() {
                var playing = !audioPlayer.paused;
                voicePlayer.classList.toggle("is-playing", playing);
                var cannotPause = playing && activeDay >= 5;
                audioPlay.setAttribute("aria-label", cannotPause
                    ? "O áudio do Dia" + activeDay + " não pode ser pausado"
                    : (playing ? "Pausar" : "Reproduzir") + " áudio do Dia" + activeDay);
                audioPlay.setAttribute("aria-disabled", String(cannotPause));
                audioPlay.innerHTML = playing
                    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM15 5h4v14h-4z"/></svg>'
                    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5c0-.8.9-1.3 1.6-.8l9.1 6.1a1.4 1.4 0 0 1 0 2.4l-9.1 6.1c-.7.5-1.6 0-1.6-.8z"/></svg>';
            }
            function notifyPhoneZoom(playing, ended) {
                if (window.DiaryBridge && window.DiaryBridge.emit) {
                    var duration = audioPlayer.duration;
                    var progress = Number.isFinite(duration) && duration > 0 ? audioPlayer.currentTime / duration : 0;
                    window.DiaryBridge.emit("diary-audio-playback", {
                        playing: !!playing,
                        ended: !!ended,
                        progress: Math.max(0, Math.min(1, progress)),
                        currentTime: Number.isFinite(audioPlayer.currentTime) ? audioPlayer.currentTime : 0,
                        duration: Number.isFinite(duration) ? duration : 0,
                        day: activeDay
                    });
                }
            }
            function censorProfanity(text) {
                return text.replace(/merda|borra|bosta|caralho/gi, function (word) {
                    return word.charAt(0) + "*".repeat(word.length - 1);
                });
            }
            function loadDayAudio(day) {
                audioPlayer.pause();
                audioPlayer.src = protectedDay.audio;
                audioPlayer.load();
                audioLabel.textContent = "Áudio · Dia " + day;
                audioStatus.textContent = "Preparando áudio…";
                voicePlayer.classList.remove("has-error");
                updateAudioProgress();
                updateAudioPlaybackState();
            }
            function loadDayTranscript(day) {
                transcript.replaceChildren();
                transcriptSegments = [];
                var words = protectedDay && protectedDay.words;
                if (!words || !words.length) {
                    transcript.textContent = "A transcrição deste dia não está disponível.";
                    return;
                }
                var paragraphs = {};
                words.forEach(function (word) {
                    var paragraph = paragraphs[word.line];
                    if (!paragraph) {
                        paragraph = document.createElement("p");
                        paragraph.className = "transcript-line";
                        paragraph.hidden = true;
                        paragraphs[word.line] = paragraph;
                        transcript.appendChild(paragraph);
                    }
                    var element = document.createElement("span");
                    element.className = "transcript-word";
                    element.hidden = true;
                    element.textContent = censorProfanity(word.text);
                    if (/merda|borra|bosta|caralho/i.test(word.text)) {
                        element.classList.add("transcript-word--censored");
                        element.setAttribute("aria-label", "palavrão censurado");
                    }
                    paragraph.appendChild(element);
                    paragraph.appendChild(document.createTextNode(" "));
                    transcriptSegments.push({ start: word.start, end: word.end, element: element, paragraph: paragraph });
                });
                syncTranscript(audioPlayer.currentTime);
            }
            function syncTranscript(currentTime) {
                var latestStartedWord = null;
                var revealedNewWord = false;
                transcriptSegments.forEach(function (segment) {
                    var hasStarted = currentTime >= segment.start;
                    if (hasStarted && segment.element.hidden) revealedNewWord = true;
                    segment.element.hidden = !hasStarted;
                    if (hasStarted) {
                        segment.paragraph.hidden = false;
                        latestStartedWord = segment.element;
                    }
                    segment.element.classList.toggle("is-speaking", currentTime >= segment.start && currentTime <= segment.end);
                });
                if (revealedNewWord && latestStartedWord) {
                    var viewport = transcript.getBoundingClientRect();
                    var wordBounds = latestStartedWord.getBoundingClientRect();
                    if (wordBounds.bottom > viewport.bottom - 4 || wordBounds.top < viewport.top) {
                        transcript.scrollTop = transcript.scrollHeight;
                    }
                }
            }
            function syncTranscriptFrame() {
                transcriptFrameId = null;
                if (audioPlayer.paused) return;
                syncTranscript(audioPlayer.currentTime);
                transcriptFrameId = window.requestAnimationFrame(syncTranscriptFrame);
            }
            function revealDiaryPage(animateOpening) {
                listView.hidden = true;
                detailView.hidden = false;
                detailView.scrollTop = 0;
                var paper = detailView.querySelector(".paper");
                if (!animateOpening || !paper.animate) return;
                var opening = paper.animate([
                    { opacity: .08, transform: "rotateY(-78deg) translateX(-24px)", filter: "brightness(.72)", boxShadow: "inset 0 0 24px rgba(0,0,0,.55), 0 9px 20px rgba(0,0,0,.22)" },
                    { offset: .58, opacity: 1, transform: "rotateY(8deg) translateX(3px)", filter: "brightness(1.08)" },
                    { offset: .8, opacity: 1, transform: "rotateY(-2deg)", filter: "brightness(1)" },
                    { opacity: 1, transform: "rotateY(0deg) translateX(0)", filter: "none" }
                ], { duration: 820, easing: "cubic-bezier(.18,.78,.25,1)", fill: "forwards" });
                opening.onfinish = function () { opening.cancel(); };
            }
            function transitionDiaryPage() {
                if (!listView.animate) {
                    revealDiaryPage(false);
                    return;
                }
                var closing = listView.animate([
                    { opacity: 1, transform: "perspective(1100px) rotateY(0deg) translateX(0)", filter: "brightness(1)" },
                    { offset: .38, opacity: 1, transform: "perspective(1100px) rotateY(-8deg) translateX(-5px)", filter: "brightness(.96)" },
                    { opacity: 0, transform: "perspective(1100px) rotateY(-16deg) translateX(-14px)", filter: "brightness(.82)" }
                ], { duration: 360, easing: "cubic-bezier(.48,0,.75,.3)", fill: "forwards" });
                closing.onfinish = function () {
                    closing.cancel();
                    revealDiaryPage(true);
                };
            }
            function returnToDiaryList() {
                var paper = detailView.querySelector(".paper");
                function revealList(animateOpening) {
                    detailView.hidden = true;
                    listView.hidden = false;
                    updateProgress(true);
                    if (unlockedDay === 6) startDaySixFinale();
                    if (animateOpening && listView.animate) {
                        var opening = listView.animate([
                            { opacity: 0, transform: "perspective(1100px) rotateY(-14deg) translateX(-12px)", filter: "brightness(.84)" },
                            { offset: .68, opacity: 1, transform: "perspective(1100px) rotateY(3deg) translateX(2px)", filter: "brightness(1.04)" },
                            { opacity: 1, transform: "perspective(1100px) rotateY(0deg) translateX(0)", filter: "none" }
                        ], { duration: 420, easing: "cubic-bezier(.2,.72,.25,1)", fill: "forwards" });
                        opening.onfinish = function () { opening.cancel(); };
                    }
                    list.querySelector(".note:not([hidden])")?.focus();
                }
                if (!paper.animate) {
                    revealList(false);
                    return;
                }
                var closing = paper.animate([
                    { opacity: 1, transform: "rotateY(0deg) translateX(0)", filter: "brightness(1)" },
                    { offset: .38, opacity: 1, transform: "rotateY(-9deg) translateX(-3px)", filter: "brightness(.96)" },
                    { opacity: .08, transform: "rotateY(-78deg) translateX(-24px)", filter: "brightness(.72)", boxShadow: "inset 0 0 24px rgba(0,0,0,.55), 0 9px 20px rgba(0,0,0,.22)" }
                ], { duration: 620, easing: "cubic-bezier(.48,0,.75,.3)", fill: "forwards" });
                closing.onfinish = function () {
                    closing.cancel();
                    revealList(true);
                };
            }
            async function finishActiveDay() {
                try{var state=await request('finish',{ticket:finishTicket});unlockedDay=state.day;}catch(e){audioStatus.textContent='Não foi possível salvar o progresso. Recarregue e tente novamente.';return;}
                activeDay = 0;
                app.className = "app day-" + Math.max(1, unlockedDay - 1) + (unlockedDay >= 6 ? " day-six-awakening" : "");
                returnToDiaryList();
            }
            function startDaySixFinale() {
                if (finalSequenceStarted) return;
                finalSequenceStarted = true;
                var finalNote = dayButtons[5];
                finalNote.disabled = true;
                finalNote.setAttribute("aria-label", "Dia 6 sendo revelado");
                app.classList.add("day-six-waiting");
                window.setTimeout(function () {
                    app.classList.remove("day-six-waiting");
                    app.classList.add("day-six-glitching");
                    var disappearingNotes = dayButtons.slice(0, 5);
                    disappearingNotes.forEach(function (button, index) {
                        button.style.setProperty("--purge-delay", index * 110 + "ms");
                        button.classList.add("note--purging");
                    });
                    window.setTimeout(function () {
                        var startPosition = finalNote.getBoundingClientRect();
                        disappearingNotes.forEach(function (button) { button.remove(); });
                        finalNote.classList.add("note--final-day");
                        finalNote.disabled = false;
                        finalNote.setAttribute("aria-label", "Abrir Dia 6");
                        dayButtons = [finalNote];
                        list.classList.add("notes--final");
                        app.classList.remove("day-six-glitching");
                        var endPosition = finalNote.getBoundingClientRect();
                        var offsetX = startPosition.left - endPosition.left;
                        var offsetY = startPosition.top - endPosition.top;
                        if (finalNote.animate && (offsetX || offsetY)) {
                            var toCenter = finalNote.animate([
                                { translate: offsetX + "px " + offsetY + "px" },
                                { translate: "0px 0px" }
                            ], { duration: 850, easing: "cubic-bezier(.2,.72,.25,1)", fill: "forwards" });
                            toCenter.onfinish = function () { toCenter.cancel(); };
                        }
                        finalNote.focus();
                    }, 1550);
                }, 1250);
            }
            audioPlay.addEventListener("click", function () {
                if (!audioPlayer.src) loadDayAudio(activeDay || 1);
                if (audioPlayer.paused) {
                    audioStatus.textContent = "";
                    audioPlayer.play().catch(function () {
                        audioStatus.textContent = "Não foi possível reproduzir este áudio.";
                        voicePlayer.classList.add("has-error");
                    });
                } else {
                    if (activeDay >= 5) return;
                    audioPlayer.pause();
                }
            });
            audioPlayer.addEventListener("timeupdate", updateAudioProgress);
            audioPlayer.addEventListener("timeupdate", function () { syncTranscript(audioPlayer.currentTime); });
            audioPlayer.addEventListener("loadedmetadata", function () {
                audioStatus.textContent = "";
                voicePlayer.classList.remove("has-error");
                updateAudioProgress();
            });
            audioPlayer.addEventListener("canplay", function () {
                audioStatus.textContent = "";
                voicePlayer.classList.remove("has-error");
            });
            audioPlayer.addEventListener("waiting", function () {
                audioStatus.textContent = "Preparando áudio…";
            });
            audioPlayer.addEventListener("ended", function () {
                notifyPhoneZoom(false, true);
                finishActiveDay();
            });
            audioPlayer.addEventListener("play", function () {
                audioStatus.textContent = "";
                voicePlayer.classList.remove("has-error");
                updateAudioPlaybackState();
                notifyPhoneZoom(true);
                if (transcriptFrameId === null) transcriptFrameId = window.requestAnimationFrame(syncTranscriptFrame);
            });
            audioPlayer.addEventListener("timeupdate", function () {
                if (!audioPlayer.paused) notifyPhoneZoom(true);
            });
            audioPlayer.addEventListener("pause", function () {
                updateAudioPlaybackState();
                notifyPhoneZoom(false);
                if (transcriptFrameId !== null) window.cancelAnimationFrame(transcriptFrameId);
                transcriptFrameId = null;
            });
            audioPlayer.addEventListener("ended", function () {
                updateAudioProgress();
                updateAudioPlaybackState();
                audioStatus.textContent = "Áudio concluído.";
            });
            audioPlayer.addEventListener("error", function () {
                if (!audioPlayer.src) return;
                audioStatus.textContent = "Não foi possível carregar o áudio deste dia.";
                voicePlayer.classList.add("has-error");
                updateAudioPlaybackState();
            });
            function animateShade(opacity, size, duration) {
                var current = getComputedStyle(shadeLayer);
                if (shadeAnimation) shadeAnimation.cancel();
                shadeAnimation = shadeLayer.animate([
                    { opacity: current.opacity, backgroundSize: current.backgroundSize },
                    { opacity: opacity, backgroundSize: "100% " + size + "%" }
                ], { duration: duration || 1100, easing: "cubic-bezier(.2,.75,.25,1)", fill: "forwards" });
            }
            function updateProgress(animate) {
                dayButtons.forEach(function (button, index) {
                    var number = Number(button.dataset.day) || index + 1;
                    var locked = number < unlockedDay;
                    var future = number > unlockedDay;
                    var wasHidden = button.hidden;
                    button.disabled = locked || future;
                    button.classList.toggle("note--locked", locked);
                    button.hidden = future;
                    if (!future && wasHidden) {
                        button.classList.add("note--new");
                        button.addEventListener("animationend", function () { button.classList.remove("note--new"); }, { once: true });
                    }
                    button.setAttribute("aria-label", locked ? "Dia" + number + ", trancado" : "Abrir Dia" + number);
                    button.querySelector(".note-hint").textContent = number < unlockedDay ? "Dia concluído · trancado" : "Toque para abrir esta página";
                });
                var completed = unlockedDay - 1;
                var strength = completed / 6 * .96;
                var size = 100 + completed * 40;
                if (animate) animateShade(strength.toFixed(2), size, 1500);
                else {
                    shadeLayer.style.opacity = String(strength);
                    shadeLayer.style.backgroundSize = "100% " + size + "%";
                }
            }
            for (var day = 1; day <= 6; day += 1) {
                (function (number) {
                    var name = "Dia" + number;
                    var button = document.createElement("button");
                    button.type = "button";
                    button.className = "note";
                    button.dataset.day = String(number);
                    button.setAttribute("aria-label", "Abrir " + name);
                    button.innerHTML = '<span class="note-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.8h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5.3A1.5 1.5 0 0 1 7.5 3.8Z"/><path d="M14 4v4h4M9 13h6M9 16.5h6"/></svg></span><span class="note-copy"><span class="note-title">' + name + '</span><span class="note-hint">Toque para abrir esta página</span></span><span class="arrow" aria-hidden="true">›</span>';
                    button.addEventListener("click", async function () {
                        if (number !== unlockedDay||loadingDay) return;
                        loadingDay=true;try{protectedDay=await request('open',{day:number});finishTicket=protectedDay.finish;}catch(e){audioStatus.textContent=e.message;loadingDay=false;return;}loadingDay=false;
                        activeDay = number;
                        detailTitle.textContent = name;
                        loadDayAudio(number);
                        loadDayTranscript(number);
                        animateShade(0, 100, 450);
                        app.className = "app day-" + number + (unlockedDay >= 6 ? " day-six-awakening" : "");
                        transitionDiaryPage();
                    });
                    list.appendChild(button);
                    dayButtons.push(button);
                }(day));
            }
            updateProgress(false);
            function refreshProtectedState(){return request('state').then(function(state){var blocked=list.querySelector('#protectedStatus');if(blocked)blocked.remove();unlockedDay=state.day;updateProgress(false);if(unlockedDay===6)startDaySixFinale();}).catch(function(){list.querySelectorAll('button').forEach(function(button){button.hidden=true;});if(!list.querySelector('#protectedStatus')){var status=document.createElement('p');status.id='protectedStatus';status.setAttribute('role','status');status.textContent='Conclua o teste de segurança para abrir o diário.';list.appendChild(status);}});}
            window.addEventListener('message',function(event){var message=event.data;if(event.source!==window.parent||event.origin!==window.location.origin||!message||message.v!==1||message.from!=='shell')return;if(message.type==='app:state'&&message.name==='open'&&!activeDay)refreshProtectedState();});
            refreshProtectedState();
        }());
