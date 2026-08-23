package com.bloodmanager.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    private static final int MAX_RETRIES = 15;
    private static final long RETRY_DELAY_MS = 1000;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // registerPlugin(UpdateInstallerPlugin.class); // TODO: re-enable once plugin class is added

        // ── Cookie persistence fix ──────────────────────────────
        // Login session cookie thik moto save rakhar jonno
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);

        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w("FCM_TOKEN", "Fetching FCM token failed", task.getException());
                    return;
                }
                String token = task.getResult();
                Log.d("FCM_TOKEN", "Token: " + token);
                sendTokenToWebViewWithRetry(token, 0);
            });

        enableThirdPartyCookiesWithRetry(0);
    }

    // ── Third-party cookie enable (WebView ready hote somoy lagte pare) ──
    private void enableThirdPartyCookiesWithRetry(int attempt) {
        WebView webView = this.getBridge() != null ? this.getBridge().getWebView() : null;
        if (webView == null) {
            if (attempt >= MAX_RETRIES) {
                Log.w("COOKIE_FIX", "Giving up enabling third-party cookies");
                return;
            }
            new Handler(Looper.getMainLooper()).postDelayed(
                () -> enableThirdPartyCookiesWithRetry(attempt + 1),
                RETRY_DELAY_MS
            );
            return;
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        Log.d("COOKIE_FIX", "Third-party cookies enabled");
    }

    // ── App background/close hoyar somoy cookie disk-e save (flush) kora ──
    @Override
    public void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    public void onStop() {
        super.onStop();
        CookieManager.getInstance().flush();
    }

    private void sendTokenToWebViewWithRetry(String token, int attempt) {
        WebView webView = this.getBridge() != null ? this.getBridge().getWebView() : null;
        if (webView == null) {
            Log.w("FCM_TOKEN", "WebView not ready, cannot send token (attempt " + attempt + ")");
            scheduleRetry(token, attempt);
            return;
        }

        webView.post(() -> {
            String js =
                "(function(){"
                    + "if (window.receiveFcmToken) {"
                    + "  window.receiveFcmToken('" + token + "');"
                    + "  return true;"
                    + "} else {"
                    + "  return false;"
                    + "}"
                    + "})();";

            webView.evaluateJavascript(js, result -> {
                boolean delivered = result != null && result.equals("true");
                Log.d("FCM_TOKEN", "Delivery attempt " + attempt + " result: " + result);
                if (!delivered) {
                    scheduleRetry(token, attempt);
                }
            });
        });
    }

    private void scheduleRetry(String token, int attempt) {
        if (attempt >= MAX_RETRIES) {
            Log.w("FCM_TOKEN", "Giving up after " + MAX_RETRIES + " attempts");
            return;
        }
        new Handler(Looper.getMainLooper()).postDelayed(
            () -> sendTokenToWebViewWithRetry(token, attempt + 1),
            RETRY_DELAY_MS
        );
    }
}