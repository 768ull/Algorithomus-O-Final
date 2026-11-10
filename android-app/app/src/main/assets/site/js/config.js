(function(S) {
    "use strict";
    S.VERSION = 1;
    S.INCOMING_CALLS_ENABLED = false;
    S.APPS = [ {
        id: "mensagens",
        name: "Mensagens",
        icon: "chat",
        image: "assets/img/Icones/mensagens.webp?v=1",
        accent: "#25d366",
        url: "apps/mensagens/?v=12"
    }, {
        id: "y",
        name: "Y",
        icon: "y",
        image: "assets/img/Icones/twitter.webp?v=1",
        accent: "#1d9bf0",
        url: "apps/y/?v=5"
    }, {
        id: "telefone",
        name: "Telefone",
        icon: "phone",
        image: "assets/img/Icones/telefone.webp?v=1",
        accent: "#34c759",
        url: "apps/telefone/?v=2"
    }, {
        id: "galeria",
        name: "Galeria",
        icon: "image",
        image: "assets/img/Icones/galeria.webp?v=1",
        accent: "#f56040",
        url: "apps/galeria/?v=9"
    }, {
        id: "tetris",
        name: "Frutris",
        icon: "game",
        image: "assets/img/Icones/tetris.webp?v=1",
        accent: "#9c27b0",
        url: "apps/tetris/?v=2"
    }, {
        id: "cobrinha",
        name: "Cobrinha",
        icon: "snake",
        image: "assets/img/Icones/cobrinha.webp?v=1",
        accent: "#39ff6a",
        url: "apps/cobrinha/?v=2"
    }, {
        id: "calculadora",
        name: "Calculadora",
        icon: "calculator",
        image: "assets/img/Icones/calculadora.webp?v=1",
        accent: "#6e6e80",
        url: "apps/calculadora/?v=2"
    }, {
        id: "configuracoes",
        name: "Configurações",
        icon: "gear",
        image: "assets/img/Icones/configuracoes.webp?v=1",
        accent: "#8e8e93",
        url: "apps/configuracoes/?v=10"
    }, {
        id: "sem-nome",
        name: "Diário Pessoal",
        icon: "app-new",
        image: "assets/img/Icones/anotações.webp?v=1",
        accent: "#8b7bff",
        url: "apps/sem-nome/?v=5",
        launchable: true,
        hiddenUntilUnlocked: true
    } ];
    S.APP = {};
    S.APPS.forEach(function(app) {
        S.APP[app.id] = app;
    });
    S.TIMING = {
        ring: 1e4,
        callStatic: 3e3,
        toast: 2200,
        toastEnter: 350,
        toastExpand: 400,
        toastTextOut: 220,
        toastCollapse: 450,
        toastExit: 300,
        appIn: 460,
        appOut: 260,
        tetrisTriggers: 5e3,
        messageToCall: 2500,
        glitch: 1500,
        glitchToCall: 1e3,
        batteryTick: 6e4,
        batteryDrain: 1,
        batteryFloor: 5,
        lockWrong: 620,
        sosRing: 2200,
        networkFirstNotice: 3e3,
        networkNoticeGap: 4e3,
        networkUpdateDuration: 3e4
    };
    S.LOCK = {
        
        hit: 20
    };
    S.SOS = [ {
        number: "190",
        name: "Polícia Federal",
        creepy: false
    }, {
        number: "192",
        name: "SAMU",
        creepy: false
    }, {
        number: "193",
        name: "Bombeiros",
        creepy: false
    }, {
        number: "100",
        name: "Direitos Humanos",
        creepy: false
    }, {
        number: "180",
        name: "Central da Mulher",
        creepy: false
    }, {
        number: "188",
        name: "CVV",
        creepy: false
    }, {
        number: "1746",
        name: "CVV",
        creepy: false
    }, {
        number: "156",
        name: "Ouvidoria",
        creepy: false
    }, {
        number: "112",
        name: "Emergência (Europa)",
        creepy: false
    }, {
        number: "911",
        name: "Emergência (EUA)",
        creepy: false
    } ];
    S.VOLUME = 1;
})(window.Celular = window.Celular || {});
