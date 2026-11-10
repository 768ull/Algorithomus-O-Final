(function(S) {
    "use strict";
    var manifestUrl = "/media-manifest.json?v=protected-dia6";
    var manifestPromise = null;
    var mediaPromise = null;
    var preloadGroupPromises = {};
    var loadedMedia = Object.create(null);
    var knownMediaPaths = Object.create(null);
    var DIARY_SEQUENCE_URLS = [
        "apps/sem-nome/audios/DIA 1.mp3",
        "apps/sem-nome/audios/DIA 2.mp3",
        "apps/sem-nome/audios/DIA 3.mp3",
        "apps/sem-nome/audios/DIA 4.mp3",
        "apps/sem-nome/audios/DIA 5.mp3",
        "apps/sem-nome/audios/DIA 6.mp3",
        "apps/sem-nome/audios/LOOP FAÍSCAS.mp3",
        "apps/sem-nome/rabiscos/frame1.png",
        "apps/sem-nome/rabiscos/frame2.png",
        "apps/sem-nome/rabiscos/frame3.png",
        "apps/sem-nome/rabiscos/frame4.png",
        "apps/sem-nome/rabiscos/frame5.png",
        "apps/sem-nome/video/Horizontal.mp4",
        "apps/sem-nome/video/vertical.mp4",
        "apps/mensagens/audio/Maya/MAYA 1.mp3",
        "apps/mensagens/audio/Maya/MAYA 2.mp3",
        "apps/mensagens/audio/Maya/MAYA LIGAÇÃO.mp3",
        "apps/mensagens/audio/vibrando.mp3",
        "apps/mensagens/pfp/imagem-012.webp",
        "assets/img/logo/logotest.png",
        "assets/audio/audio-001.ogg",
        "assets/audio/audio-002.ogg",
        "assets/audio/audio-003.ogg",
        "assets/audio/audio-004.ogg",
        "assets/audio/audio-005.ogg",
        "assets/audio/audio-006.ogg",
        "assets/audio/audio-007.ogg",
        "assets/audio/audio-008.ogg",
        "assets/audio/audio-009.ogg"
    ];
    var CONCURRENCY = 4;
    var MANIFEST_TIMEOUT = 6e4;
    var RESOURCE_TIMEOUT = 18e4;
    var IMAGE_EXTENSIONS = /\.(?:png|jpe?g|webp|gif|svg|avif|bmp)(?:\?|$)/i;
    function report(callback, state) {
        if (typeof callback === "function") callback(state);
    }
    function loadImage(url, active) {
        return new Promise(function(resolve) {
            var image = new Image;
            var timer = setTimeout(function() {
                finish(false);
            }, RESOURCE_TIMEOUT);
            var settled = false;
            function cancel() {
                finish(false);
                try {
                    image.src = "";
                } catch (error) {}
            }
            function finish(success) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                image.onload = image.onerror = null;
                var cancelIndex = active.cancelers.indexOf(cancel);
                if (cancelIndex !== -1) active.cancelers.splice(cancelIndex, 1);
                resolve(success);
            }
            active.cancelers.push(cancel);
            image.onload = function() {
                finish(Number(image.naturalWidth) > 0 || !image.naturalWidth);
            };
            image.onerror = function() {
                finish(false);
            };
            image.src = url;
        });
    }
    function loadMediaElement(url, active) {
        if (active.cancelled) return Promise.resolve(false);
        return new Promise(function(resolve) {
            var isVideo = /\.(?:mp4|webm)(?:\?|$)/i.test(url);
            var media = document.createElement(isVideo ? "video" : "audio");
            var settled = false;
            var timer = setTimeout(function() {
                finish(false);
            }, RESOURCE_TIMEOUT);
            function cleanup() {
                clearTimeout(timer);
                media.oncanplaythrough = media.oncanplay = media.onloadeddata = media.onerror = null;
                var cancelIndex = active.cancelers.indexOf(cancel);
                if (cancelIndex !== -1) active.cancelers.splice(cancelIndex, 1);
            }
            function finish(success) {
                if (settled) return;
                settled = true;
                cleanup();
                if (!success) {
                    try {
                        media.pause();
                        media.removeAttribute("src");
                        media.load();
                    } catch (error) {}
                }
                resolve(success);
            }
            function cancel() {
                finish(false);
            }
            active.cancelers.push(cancel);
            media.preload = "auto";
            if (isVideo) {
                media.muted = true;
                media.playsInline = true;
            }
            media.oncanplaythrough = function() { finish(true); };
            media.oncanplay = function() { if (media.readyState >= 3) finish(true); };
            media.onloadeddata = function() {
                if (media.readyState >= 3) finish(true);
            };
            media.onerror = function() {
                finish(false);
            };
            media.src = url;
            try {
                media.load();
            } catch (error) {
                finish(false);
            }
        });
    }
    function selectAsset(asset) {
        var source = asset.url;
        var size = Number(asset.size || 0);
        var unsupportedOgg = window.AudioFormats && !(window.AudioFormats.supportsVorbis && window.AudioFormats.supportsOpus);
        if (/\.ogg$/i.test(source) && unsupportedOgg && asset.fallbackUrl) {
            source = window.audioSource ? window.audioSource(source) : asset.fallbackUrl;
            size = Number(asset.fallbackSize || size);
        } else if (/\.ogg$/i.test(source) && window.audioSource) {
            source = window.audioSource(source);
        }
        var url;
        try {
            url = new URL(source, window.location.href);
            if (url.origin !== window.location.origin) return { url: null, size: size, logicalUrl: asset.url };
        } catch (error) {
            return { url: null, size: size, logicalUrl: asset.url };
        }
        return { url: url.href, size: size, logicalUrl: asset.url };
    }
    function resolveUrl(url) {
        var parsed;
        try {
            parsed = new URL(url, window.location.href);
            if (parsed.origin !== window.location.origin) return null;
        } catch (error) {
            return null;
        }
        if (/\.ogg(?:\?|$)/i.test(parsed.href) && window.audioSource) {
            try { parsed = new URL(window.audioSource(parsed.href), window.location.href); } catch (error) {}
        }
        return { url: parsed.href, size: 0, logicalUrl: parsed.pathname };
    }
    function readResponse(response, onBytes, resetTimeout) {
        if (!response.ok) return Promise.resolve(false);
        if (!response.body || !response.body.getReader) {
            return response.arrayBuffer().then(function(buffer) {
                onBytes(buffer.byteLength || 0);
                return true;
            });
        }
        var reader = response.body.getReader();
        var loaded = 0;
        function next() {
            return reader.read().then(function(result) {
                if (result.done) return true;
                loaded += result.value ? result.value.byteLength : 0;
                resetTimeout();
                onBytes(loaded);
                return next();
            });
        }
        return next();
    }
    function loadFile(url, active, onBytes, logicalUrl) {
        var info = typeof url === "string" ? resolveUrl(url) : url;
        if (!info || active.cancelled) return Promise.resolve(false);
        if (loadedMedia[info.url]) {
            if (onBytes) onBytes(info.size || 0);
            return Promise.resolve(true);
        }
        var isImage = IMAGE_EXTENSIONS.test(info.url);
        var isAudioOrVideo = /\.(?:ogg|mp3|wav|m4a|aac|mp4|webm)(?:\?|$)/i.test(info.url);
        var controller = window.AbortController ? new AbortController : null;
        var fetchSucceeded = false;
        var fetchPromise = new Promise(function(resolve) {
            var settled = false;
            var timer = 0;
            function clearRequest() {
                clearTimeout(timer);
                var index = active.cancelers.indexOf(cancel);
                if (index !== -1) active.cancelers.splice(index, 1);
            }
            function finish(success) {
                if (settled) return;
                settled = true;
                clearRequest();
                resolve(success);
            }
            function resetTimeout() {
                clearTimeout(timer);
                timer = setTimeout(cancel, RESOURCE_TIMEOUT);
            }
            function cancel() {
                if (controller) controller.abort();
                finish(false);
            }
            active.cancelers.push(cancel);
            resetTimeout();
            Promise.resolve().then(function() {
                return fetch(info.url, {
                    credentials: "same-origin",
                    cache: "force-cache",
                    signal: controller ? controller.signal : undefined
                });
            }).then(function(response) {
                if (!response.ok) return false;
                fetchSucceeded = true;
                return readResponse(response, function(bytes) {
                    if (onBytes) onBytes(bytes);
                }, resetTimeout);
            }).then(finish, function() { finish(false); });
        });
        return fetchPromise.then(function(success) {
            if (!success) {
                if (active.cancelled || (!isAudioOrVideo && !isImage) || fetchSucceeded) return false;
                if (isImage) return loadImage(info.url, active).then(function(imageReady) {
                    if (imageReady) loadedMedia[info.url] = true;
                    if (imageReady && onBytes) onBytes(info.size || 0);
                    return imageReady;
                });
                return loadMediaElement(info.url, active).then(function(mediaReady) {
                    if (mediaReady) loadedMedia[info.url] = true;
                    if (mediaReady && onBytes) onBytes(info.size || 0);
                    return mediaReady;
                });
            }
            if (!isAudioOrVideo) {
                if (!isImage) {
                    loadedMedia[info.url] = true;
                    if (onBytes) onBytes(info.size || 0);
                    return true;
                }
                return loadImage(info.url, active).then(function(imageReady) {
                    if (imageReady) loadedMedia[info.url] = true;
                    if (imageReady && onBytes) onBytes(info.size || 0);
                    return imageReady;
                });
            }
            // The complete response is already in the browser cache. Avoid creating
            // and decoding a second audio/video element for every preloaded asset;
            // the app's real media element can decode it on demand from cache.
            loadedMedia[info.url] = true;
            if (onBytes) onBytes(info.size || 0);
            return true;
        });
    }
    function loadManifest() {
        if (manifestPromise) return manifestPromise;
        var controller = window.AbortController ? new AbortController : null;
        var timer = 0;
        var request = Promise.resolve().then(function() {
            return fetch(manifestUrl, {
                credentials: "same-origin",
                cache: "no-cache",
                signal: controller ? controller.signal : undefined
            });
        }).then(function(response) {
            if (!response.ok) throw new Error("Não foi possível carregar o manifesto de mídia.");
            return response.json();
        });
        var timeout = new Promise(function(resolve, reject) {
            timer = setTimeout(function() {
                if (controller) controller.abort();
                reject(new Error("Tempo limite ao carregar o manifesto de mídia."));
            }, MANIFEST_TIMEOUT);
        });
        manifestPromise = Promise.race([ request, timeout ]).then(function(manifest) {
            if (!manifest || !Array.isArray(manifest.assets)) throw new Error("Manifesto de mídia inválido.");
            return manifest.assets.filter(function(asset) {
                return asset && typeof asset.url === "string" && asset.url && Number(asset.size) >= 0;
            });
        }).then(function(assets) {
            clearTimeout(timer);
            return assets;
        }, function(error) {
            clearTimeout(timer);
            throw error;
        });
        manifestPromise = manifestPromise.catch(function(error) {
            manifestPromise = null;
            throw error;
        });
        return manifestPromise;
    }
    function preloadMedia(onProgress) {
        if (mediaPromise) return mediaPromise;
        mediaPromise = loadManifest().then(function(manifestAssets) {
            var assets = manifestAssets.filter(function(asset) { return asset.preload !== false; }).map(selectAsset);
            var completed = 0;
            var failed = 0;
            var failedUrls = [];
            var cursor = 0;
            var active = {
                cancelled: false,
                cancelers: []
            };
            var totalBytes = assets.reduce(function(sum, asset) {
                return sum + asset.size;
            }, 0);
            var settledBytes = 0;
            var inFlightBytes = Object.create(null);
            function emitProgress(label) {
                var bytes = settledBytes;
                Object.keys(inFlightBytes).forEach(function(key) { bytes += inFlightBytes[key]; });
                report(onProgress, {
                    percent: totalBytes ? Math.min(99, bytes / totalBytes * 100) : completed / Math.max(1, assets.length) * 100,
                    completed: completed,
                    total: assets.length,
                    failed: failed,
                    failedUrls: failedUrls.slice(),
                    label: label || "carregando mídias"
                });
            }
            report(onProgress, {
                percent: assets.length ? 0 : 100,
                completed: 0,
                total: assets.length,
                failed: 0,
                failedUrls: [],
                label: "carregando mídias"
            });
            function worker() {
                if (cursor >= assets.length) return Promise.resolve();
                var asset = assets[cursor++];
                if (active.cancelled) {
                    completed++;
                    failed++;
                    failedUrls.push(asset.logicalUrl);
                    settledBytes += asset.size;
                    emitProgress();
                    return worker();
                }
                return loadFile(asset, active, function(bytes) {
                    inFlightBytes[asset.url] = Math.min(asset.size, Number(bytes) || 0);
                    emitProgress();
                }).then(function(success) {
                    completed++;
                    settledBytes += asset.size;
                    delete inFlightBytes[asset.url];
                    if (!success) {
                        failed++;
                        failedUrls.push(asset.logicalUrl);
                    }
                    emitProgress();
                }).then(worker);
            }
            var workers = [];
            for (var i = 0; i < Math.min(CONCURRENCY, assets.length); i++) workers.push(worker());
            return Promise.all(workers).then(function() {
                report(onProgress, {
                    percent: failed ? 99 : 100,
                    completed,
                    total: assets.length,
                    failed,
                    failedUrls: failedUrls.slice(),
                    label: failed ? "falha ao preparar mídias" : "mídias preparadas"
                });
                return {
                    completed,
                    total: assets.length,
                    failed,
                    failedUrls: failedUrls
                };
            });
        }).catch(function() {
            mediaPromise = null;
            report(onProgress, {
                percent: 0,
                completed: 0,
                total: 0,
                failed: 1,
                failedUrls: [ manifestUrl ],
                label: "manifesto indisponível"
            });
            return {
                completed: 0,
                total: 0,
                failed: 1,
                failedUrls: [ manifestUrl ]
            };
        });
        mediaPromise = mediaPromise.then(function(result) {
            if (result.failed) mediaPromise = null;
            return result;
        });
        return mediaPromise;
    }

    function preloadGroup(groupName, onProgress) {
        if (!groupName) return Promise.resolve({
            completed: 0,
            total: 0,
            failed: 1
        });
        if (preloadGroupPromises[groupName]) return preloadGroupPromises[groupName];

        var groupPromise = loadManifest().catch(function() {
            return [];
        }).then(function(manifestAssets) {
            var assets = manifestAssets.filter(function(asset) {
                if (Array.isArray(asset.preloadGroups) && asset.preloadGroups.indexOf(groupName) !== -1) return true;
                return groupName === "diary-sequence" && isDiarySequenceAsset(asset.url);
            });
            if (groupName === "diary-sequence") {
                var included = {};
                assets.forEach(function(asset) {
                    included[asset.url] = true;
                });
                DIARY_SEQUENCE_URLS.forEach(function(url) {
                    if (!included[url]) assets.push({ url: url, size: 0 });
                });
            }
            var completed = 0;
            var failed = 0;
            var failedUrls = [];
            var cursor = 0;
            var totalBytes = assets.reduce(function(sum, asset) {
                return sum + Number(asset.size || 0);
            }, 0);
            var settledBytes = 0;
            var active = {
                cancelled: false,
                cancelers: []
            };

            function report(label) {
                reportProgress({
                    percent: totalBytes ? Math.min(100, settledBytes / totalBytes * 100) : completed / Math.max(1, assets.length) * 100,
                    completed: completed,
                    total: assets.length,
                    failed: failed,
                    failedUrls: failedUrls,
                    label: label
                });
            }

            function reportProgress(state) {
                if (typeof onProgress === "function") onProgress(state);
            }

            if (!assets.length) {
                reportProgress({ percent: 100, completed: 0, total: 0, failed: 0, label: "mídias do Diário preparadas" });
                return { completed: 0, total: 0, failed: 0 };
            }

            report("preparando mídias do Diário");

            function worker() {
                if (cursor >= assets.length) return Promise.resolve();
                var asset = assets[cursor++];
                if (active.cancelled) {
                    completed++;
                    failed++;
                    failedUrls.push(asset.url);
                    settledBytes += Number(asset.size || 0);
                    report("preparando mídias do Diário");
                    return worker();
                }

                var url;
                try {
                    var assetUrl = asset.url;
                    if (/^assets\/audio\/audio-00[1-9]\.ogg$/i.test(assetUrl)) assetUrl += "?v=5";
                    url = new URL(assetUrl, window.location.href);
                    if (url.origin !== window.location.origin) throw new Error("Origem externa ignorada.");
                } catch (error) {
                    completed++;
                    failed++;
                    failedUrls.push(asset.url);
                    settledBytes += Number(asset.size || 0);
                    report("preparando mídias do Diário");
                    return worker();
                }

                return loadFile(url.href, active).then(function(success) {
                    completed++;
                    settledBytes += Number(asset.size || 0);
                    if (!success) {
                        failed++;
                        failedUrls.push(asset.url);
                    }
                    report("preparando mídias do Diário");
                }).then(worker);
            }

            var workers = [];
            for (var i = 0; i < Math.min(CONCURRENCY, assets.length); i++) workers.push(worker());
            var timeout = setTimeout(function() {
                active.cancelled = true;
                active.cancelers.slice().forEach(function(cancel) {
                    cancel();
                });
            }, 5 * 60e3);

            return Promise.all(workers).then(function() {
                clearTimeout(timeout);
                report(failed ? "não foi possível carregar todas as mídias" : "mídias do Diário preparadas");
                return {
                    completed: completed,
                    total: assets.length,
                    failed: failed,
                    failedUrls: failedUrls
                };
            });
        }).catch(function() {
            reportProgress({ percent: 0, completed: 0, total: 0, failed: 1, label: "não foi possível acessar o manifesto de mídias" });
            return { completed: 0, total: 0, failed: 1 };
        });

        preloadGroupPromises[groupName] = groupPromise.then(function(result) {
            if (result.failed) delete preloadGroupPromises[groupName];
            return result;
        });
        return preloadGroupPromises[groupName];

        function reportProgress(state) {
            if (typeof onProgress === "function") onProgress(state);
        }
    }

    function isDiarySequenceAsset(url) {
        return typeof url === "string" && (
            url.indexOf("apps/sem-nome/") === 0
            || url.indexOf("apps/mensagens/audio/Maya/") === 0
            || url === "apps/mensagens/audio/vibrando.mp3"
            || url === "apps/mensagens/pfp/imagem-012.webp"
            || /^assets\/audio\/audio-00[1-9]\.ogg$/i.test(url)
            || url === "assets/img/logo/logotest.png"
        );
    }

    S.bootLoader = {
        preloadMedia,
        preloadGroup
    };
})(window.Celular = window.Celular || {});
