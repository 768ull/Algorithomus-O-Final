                                   
                                                               

                                                                       
                                                                         

(function (M) {

    'use strict';

                                                                             
                                                                      
    var sheet = null;
    var nameEl = null;
    var subEl = null;
    var field = null;
    var input = null;
    var eye = null;
    var errorEl = null;
    var goBtn = null;

    var alvo = null;                                         
    var timer = 0;                                      

    function normalizePassword() {
        var cursor = input.selectionStart;
        var before = typeof cursor === 'number' ? input.value.slice(0, cursor) : input.value;
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
        if (input.setSelectionRange && typeof cursor === 'number') {
            var position = Math.min(input.value.length, before.toUpperCase().replace(/[^A-Z0-9]/g, '').length);
            input.setSelectionRange(position, position);
        }
        return input.value;
    }

                                       

    function netRow(net) {
        var bars = M.el('span', {
            className: 'net__bars',
            html: '<i></i><i></i><i></i>',
            attrs: { 'data-nivel': String(net.sinal) }
        });

        var name = M.el('div', { className: 'net__name' }, [
            M.el('span', { className: net.corrompida ? 'net__signal-name' : '', text: net.nome })
        ]);
        if (net.segura) {
            name.appendChild(M.el('span', { className: 'net__lock', html: M.icon('lock') }));
        }

        var meta = [net.banda || '2.4 GHz', 'canal ' + net.canal];
        if (net.sinal === 1) meta.push('fraco');
        if (net.corrompida) meta = ['sinal corrompido', 'rede protegida'];

        return M.el('div', {
            className: 'net' + (net.corrompida ? ' net--corrupted device' : ''),
            attrs: { 'data-action': 'net', 'data-id': net.id }
        }, [
            net.corrompida ? M.el('div', { className: 'net__corrupt-icon', html: M.icon('wifi'), attrs: { 'aria-hidden': 'true' } }) : null,
            M.el('div', { className: 'net__info' }, [
                name,
                M.el('div', { className: 'net__meta', text: meta.join(' · ') })
            ]),
            bars,
            net.corrompida ? M.el('div', { className: 'screen__glitch', attrs: { 'aria-hidden': 'true' } }, [
                M.el('div', { className: 'glitch__static' }),
                M.el('div', { className: 'glitch__slice glitch__slice--1' }),
                M.el('div', { className: 'glitch__slice glitch__slice--2' }),
                M.el('div', { className: 'glitch__slice glitch__slice--3' }),
                M.el('div', { className: 'glitch__slice glitch__slice--4' })
            ]) : null
        ]);
    }

                                     

    function closeSheet() {
        clearTimeout(timer);
        timer = 0;
        alvo = null;
        sheet.hidden = true;
        M.wifiNoise.sheet(null);
        input.value = '';
        input.type = 'password';
        eye.classList.remove('is-on');
        field.classList.remove('is-bad');
        errorEl.hidden = true;
    }

    function openSheet(net) {
        alvo = net;

        nameEl.textContent = net.nome;
        nameEl.classList.toggle('net__signal-name', !!net.corrompida);
        subEl.textContent = net.segura ? 'a rede pede senha' : 'rede aberta';

        errorEl.hidden = true;
        field.classList.remove('is-bad');
        goBtn.disabled = false;
        goBtn.classList.remove('is-busy');
        input.value = '';
        input.type = 'password';
        eye.classList.remove('is-on');

        sheet.hidden = false;
        M.wifiNoise.sheet(net.corrompida ? nameEl : null);
        input.focus();
    }

    function fail(message) {
        goBtn.disabled = false;
        goBtn.classList.remove('is-busy');
        field.classList.add('is-bad');
        errorEl.textContent = '';
        errorEl.appendChild(M.el('span', { html: M.icon('warn') }));
        errorEl.appendChild(M.el('span', { text: message }));
        errorEl.hidden = false;
        input.focus();
        input.select();
    }

                                                                               
    function attempt(net, typed) {
        clearTimeout(timer);
        goBtn.disabled = true;
        goBtn.classList.add('is-busy');
        field.classList.remove('is-bad');
        errorEl.hidden = true;

        timer = setTimeout(async function () {
            timer = 0;

            try {
                var response = await fetch('/api/wifi-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:typed})});
                if (!response.ok) throw Error('connection');
                var result = await response.json();
                if (result.ok) {
                    M.data.conectada = net.id;
                    M.host.emit('wifi-connection', {connected:true});
                    closeSheet(); M.router.refresh(); return;
                }
            } catch(e) { fail('Falha de conexão. Tente novamente.'); return; }
            fail('Senha incorreta. Tente de novo.');
        }, M.TIME.connect);
    }

                                      

    function render() {
        var page = M.el('div', { className: 'page' });

        var net = M.data.redeConectada();

        if (net) {
            var head = M.controls.group(net.segura ? 'Conectado' : 'Conectado (rede aberta)');
            var rows = M.el('div', { className: 'group' });
            rows.appendChild(netRow(net));
            rows.appendChild(M.el('div', {
                className: 'row',
                attrs: { 'data-action': 'forget' }
            }, [
                M.el('span', { className: 'row__icon', style: '--row-accent:var(--danger)', html: M.icon('lock') }),
                M.el('div', { className: 'row__text' }, [
                    M.el('div', { className: 'row__label', text: 'Esquecer rede' })
                ])
            ]));
            page.appendChild(head);
            page.appendChild(rows);
            return page;
        }

        var disponiveis = M.controls.group('Redes disponíveis');
        var box = M.el('div', { className: 'group' });

        M.data.redes.forEach(function (item) { box.appendChild(netRow(item)); });
        disponiveis.appendChild(box);

        page.appendChild(disponiveis);
        page.appendChild(M.controls.note(
            'Nenhuma rede conectada. A rede disponível pede senha.'));
        return page;
    }

                                             
    function summary() {
        if (M.data.conectada) return M.data.redeConectada().nome;
        return M.plural(M.data.redes.length, 'rede disponível', 'redes disponíveis');
    }

    M.wifi = {

        init: function () {
            sheet = M.$('#sheet');
            nameEl = M.$('#sheetName');
            subEl = M.$('#sheetSub');
            field = M.$('.field');
            input = M.$('#sheetPass');
            input.addEventListener('input', normalizePassword);
            eye = M.$('.field__eye');
            errorEl = M.$('#sheetError');
            goBtn = M.$('#sheetGo');

                                                                             
                                                                              
            goBtn.innerHTML = '';
            goBtn.appendChild(M.el('span', { className: 'btn__spin' }));
            goBtn.appendChild(M.el('span', { className: 'btn__text', text: 'Conectar' }));
        },

        render: render,
        summary: summary,

        isSheetOpen: function () {
            return !sheet.hidden;
        },

        closeSheet: closeSheet,

        openSheet: openSheet,

        attempt: function () {
            if (!alvo) return;
            attempt(alvo, normalizePassword());
        },

        toggleEye: function () {
            var on = input.type === 'password';
            input.type = on ? 'text' : 'password';
            eye.classList.toggle('is-on', on);
        }

    };

})(window.Cfg = window.Cfg || {});
