(function () {
    "use strict";

    var mosaico = document.querySelector(".tile-animado");
    var arquivos = [ "frame1.png", "frame2.png", "frame3.png", "frame4.png", "frame5.png" ];
    var assetBase = document.currentScript && document.currentScript.src
        ? new URL(".", document.currentScript.src)
        : null;
    var imagens = [];
    var tamanhoTile = 256 * .65;
    var atual = 0;
    var timer = 0;
    var ativo = window.parent === window;

    function preencherTela() {
        var colunas = Math.ceil(window.innerWidth / tamanhoTile) + 1;
        var linhas = Math.ceil(window.innerHeight / tamanhoTile) + 1;
        var quantidade = colunas * linhas;
        mosaico.style.setProperty("--colunas", colunas);
        mosaico.style.setProperty("--tile-size", tamanhoTile + "px");

        while (imagens.length < quantidade) {
            var imagem = document.createElement("img");
            imagem.setAttribute("src", assetBase ? new URL(arquivos[atual], assetBase).href : arquivos[atual]);
            imagem.alt = "";
            imagem.setAttribute("aria-hidden", "true");
            mosaico.appendChild(imagem);
            imagens.push(imagem);
        }

        while (imagens.length > quantidade) mosaico.removeChild(imagens.pop());
    }

    function avancarQuadro() {
        atual = (atual + 1 + Math.floor(Math.random() * (arquivos.length - 1))) % arquivos.length;
        imagens.forEach(function (imagem) {
            imagem.setAttribute("src", assetBase ? new URL(arquivos[atual], assetBase).href : arquivos[atual]);
        });
    }

    function sincronizarAnimacao() {
        if (!ativo || document.hidden) {
            if (timer) window.clearInterval(timer);
            timer = 0;
            return;
        }
        preencherTela();
        if (!timer) timer = window.setInterval(avancarQuadro, 180);
    }

    window.addEventListener("resize", function () {
        if (ativo) preencherTela();
    });
    window.addEventListener("message", function (event) {
        var message = event.data;
        if (event.source !== window.parent || !message || message.type !== "rabiscos:visibility") return;
        ativo = !!message.active;
        sincronizarAnimacao();
    });
    document.addEventListener("visibilitychange", sincronizarAnimacao);
    sincronizarAnimacao();
})();
