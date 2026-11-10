                                   
                                                      

                                                                           
                                                                        

(function (M) {

    'use strict';

    var syncingDeviceAudio = false;

                                    

    function menuPage() {
        var page = M.el('div', { className: 'page' });

        var rede = M.controls.group('Rede');
        rede.appendChild(M.el('div', { className: 'group' }, [
            M.controls.navRow({
                icon: 'wifi',
                accent: 'var(--blue)',
                label: 'Wi-Fi',
                liveValue: M.wifi.summary,
                page: 'wifi'
            })
        ]));
        page.appendChild(rede);

        var conexoes = M.controls.group('Conexões');
        conexoes.appendChild(M.el('div', { className: 'group' }, [
            M.controls.navRow({
                icon: 'bluetooth',
                accent: 'var(--blue)',
                label: 'Bluetooth',
                value: M.store.get('bluetooth') ? 'ligado' : 'desligado',
                page: 'bluetooth'
            })
        ]));
        page.appendChild(conexoes);

        var aparelho = M.controls.group('Aparelho');
        aparelho.appendChild(M.el('div', { className: 'group' }, [
            M.controls.navRow({
                icon: 'volume',
                accent: 'var(--pink)',
                label: 'Som e vibração',
                page: 'som'
            }),
            M.controls.navRow({
                icon: 'sun',
                accent: 'var(--gray)',
                label: 'Tela',
                page: 'tela'
            })
        ]));
        page.appendChild(aparelho);

        var sobre = M.controls.group('Sistema');
        sobre.appendChild(M.el('div', { className: 'group' }, [
            M.controls.navRow({
                icon: 'gear',
                accent: 'var(--gray)',
                label: 'Sobre o aparelho',
                value: M.data.aparelho.nome,
                page: 'sobre'
            })
        ]));
        page.appendChild(sobre);

        return page;
    }

                                     

                                                                            
                                                                       
                                               
    var REDRAW = { wifi: true, bluetooth: true };

    function toggle(key) {
        if (!key) return;

        M.store.set(key, !M.store.get(key));

        if (REDRAW[M.router.current()]) M.router.refresh();
    }

    function segment(key, value) {
        if (!key) return;
        M.store.set(key, value);
    }

    var ACTIONS = {
        back: function () { M.router.back(); },
        open: function (target) { M.router.open(target.dataset.page); },
        toggle: function (target) { toggle(target.dataset.key); },
        segment: function (target) { segment(target.dataset.key, target.dataset.value); },

        net: function (target) {
            var net = M.data.rede(target.dataset.id);
            if (net) M.wifi.openSheet(net);
        },

        forget: function () {
            M.data.conectada = null;
            fetch('/api/wifi-forget',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(function(){M.host.emit('wifi-connection',{connected:false});});
            M.wifi.closeSheet();
            M.router.refresh();
        },

        'sheet-go': function () { M.wifi.attempt(); },
        'sheet-cancel': function () { M.wifi.closeSheet(); },
        'sheet-eye': function () { M.wifi.toggleEye(); }
    };

                                      

    function boot() {
        M.store.load();

        M.router.init();
        M.wifi.init();

        M.router.register('menu', {
            titulo: 'Configurações',
            sub: function () {
                return M.plural(M.data.redes.length, 'rede', 'redes') + ' por perto';
            },
            render: menuPage
        });

        M.router.register('wifi', {
            titulo: 'Wi-Fi',
            sub: function () { return M.plural(M.data.redes.length, 'rede', 'redes'); },
            render: M.wifi.render,
            onEnter: function (page) { M.wifiNoise.start(page); M.wifiGlitch.start(page); },
            onLeave: function () { M.wifiNoise.stop(); M.wifiGlitch.stop(); }
        });

        M.router.register('bluetooth', {
            titulo: 'Bluetooth',
            sub: function () { return M.store.get('bluetooth') ? 'ligado' : 'desligado'; },
            render: M.sections.bluetooth
        });

        M.router.register('som', {
            titulo: 'Som e vibração',
            sub: 'toques e vibração',
            render: M.sections.som
        });

        M.router.register('tela', {
            titulo: 'Tela',
            sub: 'brilho e bloqueio',
            render: M.sections.tela
        });

        M.router.register('sobre', {
            titulo: 'Sobre',
            sub: M.data.aparelho.nome,
            render: M.sections.sobre
        });

                                                                            
                                                                              
                                                                        
        document.addEventListener('click', function (event) {
            var target = event.target.closest ? event.target.closest('[data-action]') : null;
            if (!target) return;

            var action = ACTIONS[target.dataset.action];
            if (action) action(target);
        });

                                                                       
        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            if (!M.wifi.isSheetOpen()) return;
            event.preventDefault();
            M.wifi.attempt();
        });

                                                                            
                                                                      
        M.host.on(function (message) {
            if (message.type === 'app:state') {
                M.wifiNoise.setActive(message.name === 'open');
                M.wifiGlitch.setActive(message.name === 'open');
                return;
            }
            if (message.type !== 'app:event') return;
            if (message.name === 'wifi-state') {
                M.data.conectada = message.payload && message.payload.connected ? M.data.redes[0].id : null;
                M.router.refresh();
                return;
            }

            if (message.name === 'device-audio') {
                var audio = message.payload || {};
                syncingDeviceAudio = true;
                try {
                    if (typeof audio.volume === 'number') M.store.set('volume', audio.volume);
                    M.store.set('silencioso', typeof audio.silent === 'boolean' ? audio.silent : (!!audio.muted && audio.volume > 0));
                } finally {
                    syncingDeviceAudio = false;
                }
                if (M.wifiGlitch && M.wifiGlitch.setDeviceAudio) M.wifiGlitch.setDeviceAudio(audio.volume, audio.muted);
                return;
            }
            if (message.name === 'bluetooth-reset') {
                M.store.set('bluetooth', false);
                if (M.router.current() === 'bluetooth') M.router.refresh();
                return;
            }
            if (message.name === 'open-section') {
                if (!message.payload || message.payload.page !== 'wifi') return;
                M.wifi.closeSheet();
                M.router.reset();
                M.router.open('wifi');
                return;
            }
            if (message.name !== 'back') return;

            if (M.wifi.isSheetOpen()) {
                M.host.emit('back-result', { handled: true });
                M.wifi.closeSheet();
                return;
            }

            var handled = M.router.back();
            M.host.emit('back-result', { handled: handled });
        });

                                                                             
                                                                             
                                                                        
                                                     
        M.store.onChange(function (name, value) {
            if (name === 'volume' || name === 'silencioso') {
                if (syncingDeviceAudio) return;
                M.host.emit('device-audio', {
                    volume: M.store.get('volume'),
                    muted: M.store.get('silencioso'),
                    silent: M.store.get('silencioso')
                });
            }
            else if (name === 'vibracao') {
                M.host.emit('device-vibration', { enabled: !!value });
            }
            else if (name === 'bluetooth') {
                M.host.emit('bluetooth-toggle', { enabled: !!value });
            }
            else if (name === 'brilho') M.host.emit('display', { brilho: value });
        });

        M.router.reset();

                                                                           
                                                                         
                    
        M.host.emit('wifi', { on: true });
        M.host.emit('display', { brilho: M.store.get('brilho') });
        M.host.emit('device-audio', {
            volume: M.store.get('volume'),
            muted: M.store.get('silencioso'),
            silent: M.store.get('silencioso')
        });
        M.host.ready();
    }

    document.addEventListener('DOMContentLoaded', boot);

})(window.Cfg = window.Cfg || {});
