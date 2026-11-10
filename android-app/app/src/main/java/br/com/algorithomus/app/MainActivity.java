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
import android.os.Handler;
import android.os.Looper;
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
import android.webkit.RenderProcessGoneDetail;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

/**
 * Activity Android nativa que hospeda o simulador Algorithomus.
 *
 * Online: abre o site oficial e mantém suas requisições ao servidor.
 * Offline: mantém a origem algorithomus.com.br e responde as requisições
 * de arquivos do site a partir de assets/site dentro do APK.
 * A tela local de contingência é servida por AndroidX WebViewAssetLoader.
 *
 * As rotas /api/* ainda dependem do servidor quando não houver uma implementação
 * local verificada. O patch de Wi-Fi da versão anterior foi preservado à parte
 * para revisão e não é aplicado automaticamente nesta build.
 *
 * O ciclo de vida também pausa/retoma áudio e estado de visibilidade da página.
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
    /**
     * Retoma o som somente depois que o WebView voltou ao primeiro plano.
     * O mesmo comando percorre os iframes do simulador (todos same-origin).
     */
    private static final String RESUME_NUDGE_JS =
            "(function(){"
            + "function visit(w,depth){if(!w||depth>8)return;var d;"
            + "try{d=w.document;}catch(e){return;}"
            + "try{if(d){"
            + "try{Object.defineProperty(d,'visibilityState',{get:function(){return 'visible'},configurable:true});}catch(e1){}"
            + "try{Object.defineProperty(d,'hidden',{get:function(){return false},configurable:true});}catch(e2){}"
            + "try{Object.defineProperty(d,'webkitVisibilityState',{get:function(){return 'visible'},configurable:true});}catch(e3){}"
            + "try{Object.defineProperty(d,'webkitHidden',{get:function(){return false},configurable:true});}catch(e4){}"
            + "} }catch(e){}"
            + "try{w.__algoNativePaused=false;}catch(e){}"
            + "try{if(w.sound&&typeof w.sound.resumeNative==='function')w.sound.resumeNative();}catch(e){}"
            + "try{if(d)d.dispatchEvent(new Event('visibilitychange'));w.dispatchEvent(new Event('focus'));w.dispatchEvent(new Event('pageshow'));}catch(e){}"
            + "try{if(d){var els=d.querySelectorAll('audio,video');for(var i=0;i<els.length;i++){try{var m=els[i];"
            + "if(m.getAttribute('data-algo-native-playing')==='1'){m.removeAttribute('data-algo-native-playing');"
            + "if(m.paused&&!m.ended){var p=m.play();if(p&&p.catch)p.catch(function(){});}}}catch(e5){}}}}catch(e){}"
            + "try{for(var f=0;f<w.frames.length;f++)visit(w.frames[f],depth+1);}catch(e){}"
            + "}"
            + "visit(window,0);"
            + "})();";

    /**
     * Pausa os elementos HTMLMedia e suspende o AudioContext privado de sound.js.
     * Marca a posicao dos sons em execucao para que possam continuar de onde
     * pararam quando o aplicativo voltar ao primeiro plano.
     */
    private static final String PAUSE_NUDGE_JS =
            "(function(){"
            + "function visit(w,depth){if(!w||depth>8)return;var d;"
            + "try{d=w.document;}catch(e){return;}"
            + "try{w.__algoNativePaused=true;}catch(e){}"
            + "try{if(d){var els=d.querySelectorAll('audio,video');for(var i=0;i<els.length;i++){try{var m=els[i];"
            + "if(!m.paused&&!m.ended)m.setAttribute('data-algo-native-playing','1');}catch(e1){}}}}catch(e){}"
            + "try{if(w.sound&&typeof w.sound.suspendNative==='function')w.sound.suspendNative();}catch(e){}"
            + "try{w.dispatchEvent(new Event('blur'));w.dispatchEvent(new Event('pagehide'));w.dispatchEvent(new Event('freeze'));}catch(e){}"
            + "try{if(d){var all=d.querySelectorAll('audio,video');for(var j=0;j<all.length;j++){try{all[j].pause();}catch(e2){}}}}catch(e){}"
            + "try{for(var f=0;f<w.frames.length;f++)visit(w.frames[f],depth+1);}catch(e){}"
            + "}"
            + "visit(window,0);"
            + "})();";

    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private volatile boolean appInForeground = true;

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
            // A rede local pode alcançar um servidor privado sem validacao de
            // internet publica. Tente a origem oficial em Wi-Fi/Ethernet ativo;
            // onReceivedError ativa o snapshot local se o host nao responder.
            return capabilities != null
                    && (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                        || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                        || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR));
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
        appInForeground = true;
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
            // Não recarrega o site ao voltar: conserva a tela, o estado e a
            // navegação do simulador que estavam abertos antes de sair.
            webView.evaluateJavascript(RESUME_NUDGE_JS, null);
        }
        applyFullscreen();
    }

    @Override
    protected void onPause() {
        appInForeground = false;
        final WebView pausingView = webView;
        if (pausingView != null) {
            // Primeiro aguarda o JavaScript pausar HTMLMedia e AudioContext.
            // Só depois congela o WebView e seus timers. O fallback cobre
            // dispositivos nos quais o callback do renderer demora a chegar.
            final boolean[] freezeDone = new boolean[] { false };
            final Runnable freezeWebView = new Runnable() {
                @Override
                public void run() {
                    if (freezeDone[0]) return;
                    freezeDone[0] = true;
                    if (!appInForeground && webView == pausingView) {
                        pausingView.onPause();
                        pausingView.pauseTimers();
                    }
                }
            };
            mainHandler.postDelayed(freezeWebView, 250);
            pausingView.evaluateJavascript(PAUSE_NUDGE_JS, value -> {
                mainHandler.removeCallbacks(freezeWebView);
                freezeWebView.run();
            });
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
            // Usa a versão local do motor de áudio também no modo online.
            // Ela é compatível com o site atual e expõe suspend/resume nativos.
            if ("GET".equalsIgnoreCase(request.getMethod())
                    && "/js/sound.js".equals(request.getUrl().getPath())) {
                return serveLocal(url);
            }
            String relativePath = sitePathOf(url);
            if (isBundledMediaPath(relativePath) && assetExists("site/" + relativePath)) {
                // Usa os bytes originais incluídos no APK para imagens, áudios,
                // vídeos e fontes também quando o servidor está acessível.
                return serveLocal(url);
            }
            if (offlineMode) {
                return serveLocal(url);
            }
            return null;
        }

        @SuppressLint("NewApi")
        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // O renderer do WebView pode ser encerrado pelo Android em pressão de memória.
            // Recriar a Activity evita deixar o simulador preso em uma tela vazia.
            recreate();
            return true;
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

    private boolean isBundledMediaPath(String path) {
        if (path == null) return false;
        String p = path.toLowerCase();
        return p.endsWith(".png") || p.endsWith(".webp") || p.endsWith(".jpg")
                || p.endsWith(".jpeg") || p.endsWith(".gif") || p.endsWith(".svg")
                || p.endsWith(".ico") || p.endsWith(".bmp") || p.endsWith(".avif")
                || p.endsWith(".mp3") || p.endsWith(".ogg") || p.endsWith(".oga")
                || p.endsWith(".wav") || p.endsWith(".m4a") || p.endsWith(".aac")
                || p.endsWith(".flac") || p.endsWith(".opus") || p.endsWith(".mid")
                || p.endsWith(".midi") || p.endsWith(".mp4") || p.endsWith(".webm")
                || p.endsWith(".m4v") || p.endsWith(".mov") || p.endsWith(".3gp")
                || p.endsWith(".woff") || p.endsWith(".woff2") || p.endsWith(".ttf")
                || p.endsWith(".otf");
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
        if (p.endsWith(".bmp")) return "image/bmp";
        if (p.endsWith(".avif")) return "image/avif";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ogg") || p.endsWith(".oga")) return "audio/ogg";
        if (p.endsWith(".opus")) return "audio/opus";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".m4a")) return "audio/mp4";
        if (p.endsWith(".aac")) return "audio/aac";
        if (p.endsWith(".flac")) return "audio/flac";
        if (p.endsWith(".mid") || p.endsWith(".midi")) return "audio/midi";
        if (p.endsWith(".mp4")) return "video/mp4";
        if (p.endsWith(".webm")) return "video/webm";
        if (p.endsWith(".m4v")) return "video/x-m4v";
        if (p.endsWith(".mov")) return "video/quicktime";
        if (p.endsWith(".3gp")) return "video/3gpp";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".otf")) return "font/otf";
        if (p.endsWith(".vtt")) return "text/vtt";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
}
