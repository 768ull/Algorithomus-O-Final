#!/usr/bin/env python3
"""Correcao do wi-fi do jogo nos aplicativos (Android, Windows e PWA).

O jogo original valida a senha do wi-fi no servidor (POST /api/wifi-check)
e entrega as pistas por endpoints do servidor (/api/wifi-clues e
/api/wifi-state). Fora do navegador -- aplicativo Android offline, EXE do
Windows e PWA -- esses endpoints nao existem, de modo que TODA tentativa
de conexao falhava com "Falha de conexao", mesmo com a senha correta.

Este patch nao muda nada quando o servidor responde: com internet, a
senha continua validada pelo servidor exatamente como no site, com a
digitacao original do jogo (maiusculas, ate 7 caracteres). Ele apenas
acrescenta um caminho local para quando o servidor esta inacessivel:

- wifi.js: se o servidor nao responde, a conexao e aceita com a senha
  digitada e o estado e lembrado no aparelho;
- main.js (configuracoes): esquecer a rede tambem limpa o estado lembrado;
- wifi-puzzle.js (pagina principal): com o servidor inacessivel,
  wifi-state responde com o estado lembrado e wifi-clues com as pistas
  salvas da ultima vez online (sem pistas salvas, lista vazia).

Aplicado apos o espelhamento, nos tres modos de construcao. Se algum
padrao nao for encontrado (site atualizado), o arquivo original e
mantido sem alteracao e um aviso e impresso.
"""
import io
import re

WIFI = "android-app/app/src/main/assets/site/apps/configuracoes/js/wifi.js"
MAIN = "android-app/app/src/main/assets/site/apps/configuracoes/js/main.js"
HOST = "android-app/app/src/main/assets/site/js/core/wifi-puzzle.js"

LEMBRA = "try{localStorage.setItem('algo_wifi_ok','1');}catch(e1){}"
LIMPA = "try{localStorage.removeItem('algo_wifi_ok');}catch(e1){}"

FALLBACK_WIFI = (
    "catch(e) {\n"
    "                    if (typed) {\n"
    "                        " + LEMBRA + "\n"
    "                        M.data.conectada = net.id;\n"
    "                        M.host.emit('wifi-connection', {connected:true});\n"
    "                        closeSheet(); M.router.refresh(); return;\n"
    "                    }\n"
    "                    fail('Falha de conex\u00e3o. Tente novamente.'); return;\n"
    "                }"
)

HOST_BLOCO = (
    "async function(){"
    "try{var response=await fetch('/api/'+action,"
    "{method:'POST',headers:{'Content-Type':'application/json'},"
    "body:JSON.stringify(data||{})});"
    "if(!response.ok)throw Error('Falha de conex\u00e3o');"
    "var result=await response.json();"
    "if(action==='wifi-clues'){"
    "try{localStorage.setItem('algo_wifi_clues',"
    "JSON.stringify(result||{images:[]}));}catch(e2){}}"
    "return result;}"
    "catch(err){"
    "if(action==='wifi-state'){"
    "try{return {connected:localStorage.getItem('algo_wifi_ok')==='1'};}"
    "catch(e3){}return {connected:false};}"
    "if(action==='wifi-clues'){"
    "try{var saved=localStorage.getItem('algo_wifi_clues');"
    "if(saved){return JSON.parse(saved);}}catch(e4){}"
    "return {images:[]};}"
    "throw err;}"
)

REGRAS = [
    (WIFI, [
        # conexao aceita pelo servidor: lembrar o estado no aparelho
        (re.compile(r"(if \(result\.ok\) \{\s*)M\.data\.conectada = net\.id;"),
         lambda m: m.group(1) + "M.data.conectada = net.id;\n"
                   + " " * 20 + LEMBRA),
        # servidor inacessivel: aceitar a senha digitada (fallback local)
        (re.compile(r"catch\(e\) \{ fail\('[^']*'\); return; \}"),
         lambda m: FALLBACK_WIFI),
    ]),
    (MAIN, [
        # esquecer a rede: limpar tambem o estado lembrado no aparelho
        (re.compile(r"forget: function \(\) \{\s*M\.data\.conectada = null;"),
         lambda m: m.group(0) + "\n            " + LIMPA),
    ]),
    (HOST, [
        # wifi-state e wifi-clues com o servidor inacessivel: resposta local
        (re.compile(
            r"async function\(\)\{var response=await fetch\('/api/'\+action,"
            r"\{method:'POST',headers:\{'Content-Type':'application/json'\},"
            r"body:JSON\.stringify\(data\|\|\{\}\)\}\);"
            r"if\(!response\.ok\)throw Error\('[^']*'\);"
            r"return response\.json\(\);"),
         lambda m: HOST_BLOCO),
    ]),
]

def aplicar(caminho, regras):
    try:
        with io.open(caminho, encoding="utf-8") as handle:
            texto = handle.read()
    except OSError:
        print("[patch-wifi] %s ausente; nada a fazer" % caminho)
        return
    total = 0
    for padrao, troca in regras:
        if len(padrao.findall(texto)) != 1:
            print("[patch-wifi] AVISO em %s: padrao nao encontrado ou ambiguo; regra ignorada" % caminho)
            continue
        texto = padrao.sub(troca, texto, count=1)
        total += 1
    if total:
        with io.open(caminho, "w", encoding="utf-8") as handle:
            handle.write(texto)
    print("[patch-wifi] %s: %d correcoes aplicadas" % (caminho, total))

def main():
    for caminho, regras in REGRAS:
        aplicar(caminho, regras)

if __name__ == "__main__":
    main()
