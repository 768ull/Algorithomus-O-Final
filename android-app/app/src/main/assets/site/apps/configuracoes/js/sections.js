(function(M) {
    "use strict";
    function bluetoothPage() {
        var page = M.el("div", {
            className: "page"
        });
        var head = M.controls.group("Bluetooth");
        head.appendChild(M.el("div", {
            className: "group"
        }, [ M.controls.switchRow({
            icon: "bluetooth",
            accent: "var(--blue)",
            label: "Bluetooth",
            liveHint: function(on) {
                return on ? "visível para os aparelhos por perto" : "desligado";
            },
            key: "bluetooth"
        }) ]));
        page.appendChild(head);
        if (!M.store.get("bluetooth")) {
            page.appendChild(M.controls.empty("bluetooth", "Bluetooth desligado", "Ligue o Bluetooth para ver os aparelhos pareados."));
            return page;
        }
        var pareados = M.controls.group("Aparelhos pareados");
        var box = M.el("div", {
            className: "group"
        });
        M.data.pareados.forEach(function(device) {
            box.appendChild(M.el("div", {
                className: "row"
            }, [ M.el("span", {
                className: "row__icon",
                style: "--row-accent:var(--green)",
                html: M.icon("bluetooth")
            }), M.el("div", {
                className: "row__text"
            }, [ M.el("div", {
                className: "row__label",
                text: device.nome
            }), M.el("div", {
                className: "row__hint",
                text: device.detalhe
            }) ]) ]));
        });
        pareados.appendChild(box);
        page.appendChild(pareados);
        return page;
    }
    function somPage() {
        var page = M.el("div", {
            className: "page"
        });
        var alarme = M.controls.group("Toques");
        var alarmeBox = M.el("div", {
            className: "group"
        }, [ M.controls.switchRow({
            icon: "volume",
            accent: "var(--pink)",
            label: "Silencioso",
            liveHint: function(on) {
                return on ? "sem som nenhum" : "som ligado";
            },
            key: "silencioso"
        }) ]);
        alarme.appendChild(alarmeBox);
        page.appendChild(alarme);
        var volume = M.controls.group("Volume");
        volume.appendChild(M.el("div", {
            className: "group"
        }, [ M.controls.sliderRow({
            icon: "volume",
            accent: "var(--pink)",
            label: "Volume",
            key: "volume"
        }) ]));
        page.appendChild(volume);
        var vibracao = M.controls.group("Vibração");
        vibracao.appendChild(M.el("div", {
            className: "group"
        }, [ M.controls.switchRow({
            icon: "vibrate",
            accent: "var(--purple)",
            label: "Vibrar",
            liveHint: function(on) {
                return on ? "vibra junto com o som" : "vibração desligada";
            },
            key: "vibracao"
        }) ]));
        page.appendChild(vibracao);
        return page;
    }
    function telaPage() {
        var page = M.el("div", {
            className: "page"
        });
        var brilho = M.controls.group("Brilho");
        brilho.appendChild(M.el("div", {
            className: "group"
        }, [ M.controls.sliderRow({
            icon: "sun",
            accent: "var(--yellow)",
            label: "Brilho",
            key: "brilho"
        }) ]));
        page.appendChild(brilho);
        var bloqueio = M.controls.group("Tela travada");
        bloqueio.appendChild(M.el("div", {
            className: "group"
        }, [ M.controls.segmentedRow({
            icon: "phone",
            accent: "var(--gray)",
            label: "Tempo",
            key: "bloqueio",
            options: M.data.bloqueios
        }) ]));
        page.appendChild(bloqueio);
        page.appendChild(M.controls.note("A senha da tela é a mesma de sempre, o triângulo da grade."));
        return page;
    }
    function sobrePage() {
        var page = M.el("div", {
            className: "page"
        });
        var ficha = M.controls.kvGroup([ [ "Nome", M.data.aparelho.nome ], [ "Modelo", M.data.aparelho.modelo ], [ "Versão", M.data.aparelho.versao ], [ "Atualizações", M.data.aparelho.atualizacao, "muted" ] ]);
        page.appendChild(ficha);
        var net = M.data.redeConectada();
        var ligado = true;
        var rede = M.controls.group("Rede");
        rede.appendChild(M.controls.kvGroup([ [ "Wi-Fi", ligado ? "ligado" : "desligado", ligado ? "good" : "danger" ], [ "Rede", net ? net.nome : "não conectada", net ? "good" : "muted" ], [ "Endereço IP", net ? "192.168.0." + net.canal : "—", net ? null : "muted" ] ]));
        page.appendChild(rede);
        return page;
    }
    M.sections = {
        bluetooth: bluetoothPage,
        som: somPage,
        tela: telaPage,
        sobre: sobrePage
    };
})(window.Cfg = window.Cfg || {});