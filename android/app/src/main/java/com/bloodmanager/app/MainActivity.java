package com.bloodmanager.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // FCM token নেওয়ার পর log করা (backend-এ পাঠানোর কাজ এখন হয়)
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w("FCM_TOKEN", "Fetching FCM token failed", task.getException());
                    return;
                }
                String token = task.getResult();
                Log.d("FCM_TOKEN", "Token: " + token);
                sendTokenToWebView(token);
            });
    }

    // WebView-এর ভেতরের web app-কে token পাঠানো একটা JS ফাংশন কল করে
    private void sendTokenToWebView(String token) {
        WebView webView = this.getBridge().getWebView();
        if (webView == null) {
            Log.w("FCM_TOKEN", "WebView not ready, cannot send token");
            return;
        }
        webView.post(() -> {
            String js = "if (window.receiveFcmToken) { window.receiveFcmToken('" + token + "'); }";
            webView.evaluateJavascript(js, null);
        });
    }
}
