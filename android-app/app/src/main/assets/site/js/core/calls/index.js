                                     

(function (global) {
    'use strict';

    var S = global.Celular;
    var decoder = global.CallsDecoder;
    var effects = global.CallsEffects;

    var screen = null;
    var initialEl = null;
    var kindEl = null;
    var nameEl = null;
    var numberEl = null;
    var timerEl = null;
    var device = null;

    var calling = null;
    var CALLED_NUMBERS_KEY = 'celular:emergency-called:v1';

    function loadCalledNumbers() {
        try {
            var saved = JSON.parse(global.localStorage.getItem(CALLED_NUMBERS_KEY) || '[]');
            if (!Array.isArray(saved)) return [];
            return saved.filter(function (number, index) {
                return typeof number === 'string' && saved.indexOf(number) === index;
            }).slice(0, 40);
        } catch (error) { return []; }
    }

    var calledNumbers = loadCalledNumbers();
    try { S.discoveredContacts = JSON.parse(global.localStorage.getItem('celular:discovered-contacts') || '{}'); } catch(e) { S.discoveredContacts = {}; }


    function saveCalledNumbers() {
        try { global.localStorage.setItem(CALLED_NUMBERS_KEY, JSON.stringify(calledNumbers)); }
        catch (error) {                                                        }
    }
    var startedAt = 0;
    var ringTimer = 0;
    var tickTimer = 0;
    var beepTimer = 0;
    var speakTimer = 0;

    var BEEP_MS = 620;

    function sound() {
        return global.sound || null;
    }

    function stopRing() {
        var audio = sound();
        if (audio && audio.stopRing) audio.stopRing();
    }

    function nextAd(who) {
        if (!who || !who.ad || !who.ad.length) return null;
        var index = who.adAt || 0;
        who.adAt = (index + 1) % who.ad.length;
        return who.ad[index];
    }

    function speak(who) {
        var audio = sound();
        var file = nextAd(who);
        if (!file || !audio || !audio.playAd) return;

        audio.playAd(file, function () {
            if (!calling) return;
            if (who.beep === false) {
                kindEl.textContent = 'encerrando';
                clearTimeout(beepTimer);
                beepTimer = setTimeout(function () { S.emergencyCalls.hangUp(); }, BEEP_MS);
                return;
            }
            endWithBeep();
        });
    }

    function endWithBeep() {
        var audio = sound();
        kindEl.textContent = 'encerrando';

        if (!audio || !audio.playBeep) {
            S.emergencyCalls.hangUp();
            return;
        }

        audio.playBeep();
        clearTimeout(beepTimer);
        beepTimer = setTimeout(function () { S.emergencyCalls.hangUp(); }, BEEP_MS);
    }

    function connect() {
        var who = decoder.whoIs(calling);
        if (!calling) return;

        clearTimeout(ringTimer);
        ringTimer = 0;
        decoder.stopNoise();
        stopRing();

        effects.fadeGlitch();

        if (decoder.isSecret()) {
            decoder.startNoise(who, 0);
        }

        screen.classList.remove('is-ringing');
        screen.classList.add('is-talking');
        device.classList.remove('is-ringing');
        device.classList.add('is-in-call');

        if (decoder.isSecret()) {
            nameEl.textContent = '';
            initialEl.textContent = '';
        } else {
            nameEl.textContent = who ? who.name : '-';
            if (who) initialEl.textContent = who.initial;
        }

        kindEl.textContent = 'em chamada';
        timerEl.textContent = '00:00';

        startedAt = Date.now();
        tickTimer = setInterval(function () {
            timerEl.textContent = S.duration(Date.now() - startedAt);
        }, 1000);

        S.haptic(30);

        clearTimeout(speakTimer);
        speakTimer = setTimeout(function () {
            if (!calling) return;
            speak(who);
        }, S.TIMING.callPickup || 0);
    }

    function ringFor() {
        var span = S.TIMING.sosRingMax - S.TIMING.sosRingMin;
        return S.TIMING.sosRingMin + Math.floor(Math.random() * (span + 1));
    }

    function ringBursts(who) {
        var times = ringFor();
        var audio = sound();
        var total = audio && audio.ringMs ? audio.ringMs(times) : 5200;

        if (audio && audio.startRing) audio.startRing(times);
        decoder.startNoise(who, total);

        return total;
    }

    function emergencyContactList() {
        return calledNumbers.map(function (number) {
            var contact = (S.discoveredContacts || {})[number] || {};
            return { number: number, name: contact.name || 'desconhecido' };
        });
    }

    S.emergencyCalls = {
        init: function () {
            screen = S.$('#callSos');
            initialEl = S.$('#sosInitial');
            kindEl = S.$('#sosKind');
            nameEl = S.$('#sosName');
            numberEl = S.$('#sosNumber');
            timerEl = S.$('#sosTimer');
            device = S.$('#device');

            decoder.init({ nameEl: nameEl, initialEl: initialEl });
        },

        isOpen: function () {
            return screen.classList.contains('is-open');
        },

        calledNumbers: function () { return emergencyContactList(); },

        dial: async function (number) {
            if (calling || S.dialPending) return false;
            S.dialPending = true;
            var result;
            try { result = await S.request('call', {number:number}); }
            catch (e) { return false; }
            finally { S.dialPending = false; }
            if (!result.ok) return false;
            S.discoveredContacts = S.discoveredContacts || {};
            S.discoveredContacts[number] = result.who;
            try { var savedContacts = {}; Object.keys(S.discoveredContacts).forEach(function(n) { var contact=S.discoveredContacts[n]; savedContacts[n]={name:contact.name,initial:contact.initial,secret:contact.secret}; }); global.localStorage.setItem('celular:discovered-contacts',JSON.stringify(savedContacts)); } catch(e) {}

            var who = result.who;

            calledNumbers = calledNumbers.filter(function (item) { return item !== number; });
            calledNumbers.unshift(number);
            calledNumbers = calledNumbers.slice(0, 40);
            saveCalledNumbers();
            S.bridge.emit('telefone', 'emergency-contacts', emergencyContactList());

            calling = number;
            decoder.setCalling(number);
            effects.setCalling(number);
            initialEl.textContent = '';
            nameEl.textContent = '';
            numberEl.textContent = number;
            kindEl.textContent = 'chamando...';
            timerEl.textContent = '';

            screen.classList.add('is-open', 'is-ringing');
            device.classList.add('is-ringing');
            S.haptic(60);

            ringTimer = setTimeout(connect, ringBursts(who));
            effects.syncGlitch();

            return true;
        },

        hangUp: function () {
            if (!calling) return;

            clearTimeout(ringTimer);
            clearTimeout(beepTimer);
            clearTimeout(speakTimer);
            clearInterval(tickTimer);
            ringTimer = beepTimer = speakTimer = tickTimer = 0;

            stopRing();
            decoder.stopNoise();
            effects.stopGlitch();

            var audio = sound();
            if (audio) {
                if (audio.stopAd) audio.stopAd();
                if (audio.stopBeep) audio.stopBeep();
            }

            screen.classList.remove('is-open', 'is-ringing', 'is-talking');
            device.classList.remove('is-ringing', 'is-in-call');

            calling = null;
            decoder.setCalling(null);
            effects.setCalling(null);
            S.haptic(40);
        }
    };

})(window);
