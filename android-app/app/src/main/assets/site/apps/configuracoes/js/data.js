(function(M) {
    "use strict";
    M.TIME = {
        connect: 900,
        noiseMin: 20,
        noiseMax: 40,
        noiseReducedMin: 60,
        noiseReducedMax: 100,
        glitchGapMin: 700,
        glitchGapMax: 1600
    };
    M.data = {
        redes: [ {
            id: "sinal-corrompido",
            nome: "N3T_#?//_0xF",
            corrompida: true,
            sinal: 3,
            canal: 6,
            segura: true,
            senha: null
        } ],
        conectada: null,
        rede: function(id) {
            var found = null;
            M.data.redes.forEach(function(net) {
                if (net.id === id) found = net;
            });
            return found;
        },
        redeConectada: function() {
            return M.data.conectada ? M.data.rede(M.data.conectada) : null;
        },
        pareados: [ {
            id: "morajo",
            nome: "Morajo",
            detalhe: "este aparelho"
        }, {
            id: "fone",
            nome: "Fone Bluetooth",
            detalhe: "pareado"
        }, {
            id: "caixa",
            nome: "Caixa de som",
            detalhe: "pareado"
        } ],
        aparelho: {
            nome: "Morajo",
            modelo: "APH-1",
            versao: "1.0",
            atualizacao: "nenhuma pendente"
        },
        bloqueios: [ "15s", "30s", "1m", "2m", "5m" ]
    };
})(window.Cfg = window.Cfg || {});