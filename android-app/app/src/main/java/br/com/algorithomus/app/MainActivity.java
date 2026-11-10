package br.com.algorithomus.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

/**
 * Algorithomus - aplicativo hibrido (v1.8).
 *
 * Com internet: carrega o site original (https://algorithomus.com.br/),
 * preservando o funcionamento dos servidores do jogo.
 * Sem internet: TODO o site e servido pelos arquivos embutidos no APK
 * (paginas, estilos, scripts, manifesto de midias, audios, videos,
 * galeria e icones), atraves da interceptacao de requisicoes, de modo
 * que o jogo roda localmente sob o mesmo endereco original.
 *
 * Correcoes proprias do aplicativo (aplicadas nos dois modos):
 * - a senha do wi-fi do jogo e validada no servidor do site; o aplicativo
 *   serve copias corrigidas dos tres arquivos do wi-fi, identicas ao site
 *   quando o servidor responde, mas que aceitam a conexao, lembram o
 *   estado no aparelho e nao travam a historia quando o servidor esta
 *   inacessivel (por exemplo, no modo offline);
 * - alguns aparelhos deixam a pagina marcada como oculta mesmo depois
 *   de o jogo voltar ao primeiro plano, o que congela os aplicativos
 *   internos do simulador; ao retornar, o aplicativo forc a pagina a se
 *   reportar como visivel, notifica o retorno, retoma o audio e
 *   reexecuta o modo tela cheia;
 * - nenhum som do jogo toca fora do aplicativo: ao sair, todo o audio
 *   e pausado e os contextos de som suspensos; ao voltar, os sons que
 *   estavam tocando sao retomados automaticamente.
 *
 * Aplicativo 100% nativo de WebView, sem dependencias externas,
 * tela cheia imersiva e suporte a dispositivos do SDK 21 ao mais recente.
 */
public class MainActivity extends Activity {

    private static final String SITE_ORIGIN = "https://algorithomus.com.br";
    private static final String SITE_URL = "https://algorithomus.com.br/";
    private static final String LOCAL_ENTRY = "site/index.html";
    private static final String LOCAL_FALLBACK = "offline/index.html";

    /**
     * CSS injetado em todas as paginas: trava a rolagem do documento,
     * oculta qualquer barra de rolagem, remove a selecao de texto do
     * navegador e desativa a chamada de toque. As areas internas do
     * jogo que precisam rolar (conversas, notificacoes) continuam
     * funcionando normalmente, pois apenas o documento e travado.
     */
    private static final String LOCK_SCROLL_CSS =
            "(function(){var d=document;if(!d.getElementById('algo-lock-style')){"
                    + "var s=d.createElement('style');s.id='algo-lock-style';s.textContent='"
                    + "html,body{overflow:hidden!important;overscroll-behavior:none!important;"
                    + "margin:0!important;width:100%!important;height:100%!important;"
                    + "-webkit-user-select:none!important;user-select:none!important;"
                    + "-webkit-touch-callout:none!important;touch-action:manipulation!important}"
                    + "input,textarea{-webkit-user-select:text!important;user-select:text!important}"
                    + "::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}"
                    + "';d.head.appendChild(s);}})();";

    /**
     * Correcao do retorno ao primeiro plano: em alguns aparelhos, quando o
     * jogo e reaberto depois de ficar em segundo plano, a pagina continua
     * marcada como oculta (document.hidden travado em true), o que faz o
     * jogo ignora os toques nos aplicativos internos do simulador. Este
     * bloco: (1) forc a pagina a se reportar como visivel, (2) notifica a
     * mudanca de visibilidade, o foco e a reexibicao, (3) retoma qualquer
     * contexto de audio suspenso, retomando tambem os sons que tocavam
     * antes de o aplicativo ir ao fundo, e (4) repassa o foco as molduras
     * internas (iframes) usadas pelos aplicativos do jogo.
     */
    private static final String RESUME_NUDGE_JS =
            "(function(){try{"
                    + "try{Object.defineProperty(document,'visibilityState',"
                    + "{get:function(){return 'visible'},configurable:true});}catch(e){}"
                    + "try{Object.defineProperty(document,'hidden',"
                    + "{get:function(){return false},configurable:true});}catch(e){}"
                    + "try{Object.defineProperty(document,'webkitVisibilityState',"
                    + "{get:function(){return 'visible'},configurable:true});}catch(e){}"
                    + "try{Object.defineProperty(document,'webkitHidden',"
                    + "{get:function(){return false},configurable:true});}catch(e){}"
                    + "document.dispatchEvent(new Event('visibilitychange'));"
                    + "window.dispatchEvent(new Event('focus'));"
                    + "window.dispatchEvent(new Event('pageshow'));"
                    + "try{for(var k in window){try{var v=window[k];"
                    + "if(v&&v.state==='suspended'&&typeof v.resume==='function'){v.resume();}}catch(e2){}}}catch(e){}"
                    + "try{var fs=document.querySelectorAll('iframe');"
                    + "for(var i=0;i<fs.length;i++){try{fs[i].contentWindow.dispatchEvent(new Event('focus'));"
                    + "fs[i].contentWindow.dispatchEvent(new Event('pageshow'));}catch(e3){}}}catch(e){}"
                    + "try{var els=document.querySelectorAll('audio,video');"
                    + "for(var j=0;j<els.length;j++){try{var m=els[j];"
                    + "if(m.dataset&&m.dataset.algoPlaying==='1'){"
                    + "try{delete m.dataset.algoPlaying;}catch(e4){}"
                    + "var p=m.play();if(p&&p.catch){p.catch(function(){});}}}catch(e5){}}}catch(e){}"
                    + "}catch(e0){}})();";

    /**
     * Silencio ao sair do aplicativo: pausa todos os elementos de audio e
     * video da pagina (marcando os que estavam tocando, para retoma-los ao
     * voltar) e suspende os contextos de audio. Com isso, nenhum som do
     * jogo continua tocando enquanto o usuario esta fora do aplicativo.
     */
    private static final String PAUSE_NUDGE_JS =
            "(function(){try{"
                    + "try{var els=document.querySelectorAll('audio,video');"
                    + "for(var i=0;i<els.length;i++){try{var m=els[i];"
                    + "if(!m.paused&&!m.ended){try{m.dataset.algoPlaying='1';}catch(e1){}}"
                    + "m.pause();}catch(e2){}}}catch(e){}"
                    + "try{for(var k in window){try{var v=window[k];"
                    + "if(v&&v.state==='running'&&typeof v.suspend==='function'){v.suspend();}}catch(e3){}}}catch(e){}"
                    + "window.dispatchEvent(new Event('blur'));"
                    + "}catch(e0){}})();";

    private WebView webView;
    private WebViewAssetLoader assetLoader;

    /** Verdadeiro quando o aparelho esta sem internet e o jogo roda local. */
    private boolean offlineMode = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        webView.setBackgroundColor(Color.BLACK);
        setContentView(webView);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        // Fim das barras de rolagem e das tremidas: nenhuma rolagem no documento.
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setScrollContainer(false);
        webView.setHapticFeedbackEnabled(false);

        // Remove o ultimo vestigio do navegador: selecao de texto ao segurar a tela.
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true;
            }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSaveFormData(false);
        settings.setGeolocationEnabled(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new HybridWebViewClient());
        applyFullscreen();

        offlineMode = !isOnline();
        if (offlineMode) {
            startOffline();
        } else {
            webView.loadUrl(SITE_URL);
        }
    }

    /** Verifica a conectividade com a internet de forma compativel com SDK 21+. */
    private boolean isOnline() {
        ConnectivityManager manager =
                (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (manager == null) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= 23) {
            NetworkCapabilities capabilities =
                    manager.getNetworkCapabilities(manager.getActiveNetwork());
            return capabilities != null
                    && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        }
        return manager.getActiveNetworkInfo() != null
                && manager.getActiveNetworkInfo().isConnectedOrConnecting();
    }

    /**
     * Inicia o modo offline: a pagina inicial e carregada pelo endereco
     * original, porem todas as requisicoes ao site sao respondidas com a
     * copia local embutida no APK. Se a copia local nao existir, exibe o
     * aviso offline.
     */
    private void startOffline() {
        if (assetExists(LOCAL_ENTRY)) {
            webView.loadUrl(SITE_URL);
        } else {
            webView.loadUrl(BuildConfig.OFFLINE_ASSET_URL);
        }
    }

    private boolean assetExists(String path) {
        try {
            InputStream in = getAssets().open(path);
            in.close();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Tela cheia imersiva: oculta barra de status e navegacao em todas as versoes. */
    private void applyFullscreen() {
        Window window = getWindow();
        if (window == null) {
            return;
        }
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars()
                        | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    /**
     * Ao tocar no icone com o jogo ja aberto em segundo plano, a tela e
     * apenas trazida de volta; garante tela cheia e, se a pagina tiver
     * sido perdida, recarrega o jogo.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        applyFullscreen();
        if (webView == null) {
            return;
        }
        String current = webView.getUrl();
        if (current == null || current.equals("about:blank")) {
            if (offlineMode) {
                startOffline();
            } else {
                webView.loadUrl(SITE_URL);
            }
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyFullscreen();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
            if (offlineMode && isOnline()) {
                offlineMode = false;
                webView.loadUrl(SITE_URL);
            } else {
                // Restaura visibilidade, foco e áudio ao retornar do segundo plano.
                webView.evaluateJavascript(RESUME_NUDGE_JS, null);
            }
        }
        applyFullscreen();
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            // Silencia o jogo e suspende o processamento ao sair: nenhum
            // som ou temporizador continua ativo fora do aplicativo.
            webView.evaluateJavascript(PAUSE_NUDGE_JS, null);
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    /**
     * Cliente hibrido:
     * - nunca sai para um navegador externo (toda a navegacao e interna);
     * - injeta o CSS de travamento em toda pagina carregada;
     * - no modo offline, intercepta TODAS as requisicoes ao site original
     *   e responde com os arquivos embutidos no pacote;
     * - no modo online, intercepta apenas os tres arquivos do wi-fi,
     *   servindo as copias corrigidas (validacao original do servidor com
     *   um caminho local quando o servidor esta inacessivel);
     * - se a conexao cair durante o uso, passa automaticamente ao modo
     *   offline e recarrega a pagina inicial localmente.
     */
    private class HybridWebViewClient extends WebViewClient {

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return false;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            view.evaluateJavascript(LOCK_SCROLL_CSS, null);
            // Aplica desde o carregamento a correcao de visibilidade, para
            // que o jogo nunca fique preso no estado oculto.
            view.evaluateJavascript(RESUME_NUDGE_JS, null);
            applyFullscreen();
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if ("appassets.androidplatform.net".equals(request.getUrl().getHost())) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            if (!isSiteUrl(url)) {
                return null;
            }
            if (offlineMode) {
                return serveLocal(url);
            }
            return null;
        }

        @SuppressLint("NewApi")
        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            boolean mainFrame = request.isForMainFrame();
            if (mainFrame && isSiteUrl(request.getUrl().toString())) {
                offlineMode = true;
                startOffline();
            }
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            if (Build.VERSION.SDK_INT < 23) {
                boolean mainFrame = failingUrl != null && failingUrl.equals(webView.getUrl());
                if (mainFrame && isSiteUrl(failingUrl)) {
                    offlineMode = true;
                    startOffline();
                }
            }
        }
    }

    /** Verifica se uma URL pertence ao site original do jogo. */
    private boolean isSiteUrl(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || host == null) return false;
        boolean webScheme = "https".equalsIgnoreCase(scheme)
                || "http".equalsIgnoreCase(scheme);
        boolean officialHost = "algorithomus.com.br".equalsIgnoreCase(host)
                || "www.algorithomus.com.br".equalsIgnoreCase(host);
        return webScheme && officialHost;
    }

    /**
     * Verifica se e um dos tres arquivos do wi-fi com a correcao: a
     * digitacao e a validacao continuam exatamente as do site quando o
     * servidor responde; a correcao apenas aceita a conexao, lembra o
     * estado no aparelho e nao trava a historia quando o servidor esta
     * inacessivel (por exemplo, offline).
     */
    /** Converte uma URL do site original no caminho relativo do arquivo local. */
    private String sitePathOf(String url) {
        String path = url;
        String[] prefixes = {
                SITE_ORIGIN + "/",
                "https://www.algorithomus.com.br/",
                "http://algorithomus.com.br/",
                "http://www.algorithomus.com.br/"
        };
        for (String prefix : prefixes) {
            if (path.startsWith(prefix)) {
                path = path.substring(prefix.length());
                break;
            }
        }
        if (path.equals("https://algorithomus.com.br")
                || path.equals("https://www.algorithomus.com.br")
                || path.equals("http://algorithomus.com.br")
                || path.equals("http://www.algorithomus.com.br")) {
            path = "";
        }
        int query = path.indexOf('?');
        if (query >= 0) {
            path = path.substring(0, query);
        }
        try {
            path = URLDecoder.decode(path, "UTF-8");
        } catch (Exception ignored) {
        }
        if (path.isEmpty() || path.endsWith("/")) {
            path = path + "index.html";
        }
        if (path.equals("..") || path.startsWith("../") || path.contains("/../")) {
            return "";
        }
        return path;
    }

    /** Responde uma URL do site original com o arquivo local embutido no APK. */
    private WebResourceResponse serveLocal(String url) {
        String path = sitePathOf(url);
        if (path.isEmpty()) {
            return new WebResourceResponse("text/plain", "utf-8",
                    new ByteArrayInputStream(new byte[0]));
        }
        AssetManager assets = getAssets();
        try {
            InputStream stream = assets.open("site/" + path);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            return new WebResourceResponse(mimeFor(path), null, 200, "OK", headers, stream);
        } catch (Exception e) {
            // Arquivo inexistente na copia local: resposta 404 limpa, sem
            // tocar a rede (que esta offline de qualquer forma).
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            InputStream empty = new ByteArrayInputStream(new byte[0]);
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, empty);
        }
    }

    private String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".oga")) return "audio/ogg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".m4a")) return "audio/mp4";
        if (p.endsWith(".aac")) return "audio/aac";
        if (p.endsWith(".flac")) return "audio/flac";
        if (p.endsWith(".webm")) return "video/webm";
        if (p.endsWith(".mp4")) return "video/mp4";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".otf")) return "font/otf";
        if (p.endsWith(".vtt")) return "text/vtt";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
}
