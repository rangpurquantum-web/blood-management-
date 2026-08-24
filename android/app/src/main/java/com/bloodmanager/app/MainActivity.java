package com.bloodmanager.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    private static final int MAX_RETRIES = 15;
    private static final long RETRY_DELAY_MS = 1000;
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 9001;

    private PermissionRequest pendingWebPermissionRequest;
    private ValueCallback<Uri[]> filePathCallback;

    // ============================================================
    // FILE CHOOSER
    // ============================================================

    private final ActivityResultLauncher<Intent> fileChooserLauncher =
        registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {

                if (filePathCallback == null) {
                    return;
                }

                Uri[] resultUris = null;

                if (
                    result.getResultCode() == RESULT_OK &&
                    result.getData() != null
                ) {

                    Uri data =
                        result.getData().getData();

                    if (data != null) {
                        resultUris =
                            new Uri[]{data};
                    }
                }

                filePathCallback.onReceiveValue(
                    resultUris
                );

                filePathCallback = null;
            }
        );


    // ============================================================
    // ON CREATE
    // ============================================================

    @Override
    public void onCreate(
        Bundle savedInstanceState
    ) {

        // IMPORTANT:
        // Register custom native QR saver BEFORE super.onCreate()
        registerPlugin(QrFileSaverPlugin.class);

        super.onCreate(savedInstanceState);

        // ========================================================
        // COOKIE
        // ========================================================

        CookieManager cookieManager =
            CookieManager.getInstance();

        cookieManager.setAcceptCookie(true);


        // ========================================================
        // FCM TOKEN
        // ========================================================

        FirebaseMessaging.getInstance()
            .getToken()
            .addOnCompleteListener(task -> {

                if (!task.isSuccessful()) {

                    Log.w(
                        "FCM_TOKEN",
                        "Fetching FCM token failed",
                        task.getException()
                    );

                    return;
                }

                String token =
                    task.getResult();

                Log.d(
                    "FCM_TOKEN",
                    "Token: " + token
                );

                sendTokenToWebViewWithRetry(
                    token,
                    0
                );
            });


        // ========================================================
        // THIRD PARTY COOKIES
        // ========================================================

        enableThirdPartyCookiesWithRetry(0);


        // ========================================================
        // CAMERA + FILE CHOOSER
        // ========================================================

        enableCameraPermissionWithRetry(0);
    }


    // ============================================================
    // THIRD PARTY COOKIES
    // ============================================================

    private void enableThirdPartyCookiesWithRetry(
        int attempt
    ) {

        WebView webView =
            this.getBridge() != null
                ? this.getBridge().getWebView()
                : null;

        if (webView == null) {

            if (attempt >= MAX_RETRIES) {

                Log.w(
                    "COOKIE_FIX",
                    "Giving up enabling third-party cookies"
                );

                return;
            }

            new Handler(
                Looper.getMainLooper()
            ).postDelayed(
                () ->
                    enableThirdPartyCookiesWithRetry(
                        attempt + 1
                    ),
                RETRY_DELAY_MS
            );

            return;
        }

        CookieManager
            .getInstance()
            .setAcceptThirdPartyCookies(
                webView,
                true
            );

        Log.d(
            "COOKIE_FIX",
            "Third-party cookies enabled"
        );
    }


    // ============================================================
    // CAMERA + AUTOPLAY + FILE CHOOSER
    // ============================================================

    private void enableCameraPermissionWithRetry(
        int attempt
    ) {

        WebView webView =
            this.getBridge() != null
                ? this.getBridge().getWebView()
                : null;

        if (webView == null) {

            if (attempt >= MAX_RETRIES) {

                Log.w(
                    "CAMERA_FIX",
                    "Giving up enabling camera permission"
                );

                return;
            }

            new Handler(
                Looper.getMainLooper()
            ).postDelayed(
                () ->
                    enableCameraPermissionWithRetry(
                        attempt + 1
                    ),
                RETRY_DELAY_MS
            );

            return;
        }


        // ========================================================
        // AUTOPLAY
        // ========================================================

        webView
            .getSettings()
            .setMediaPlaybackRequiresUserGesture(
                false
            );


        // ========================================================
        // WEB CHROME CLIENT
        // ========================================================

        webView.setWebChromeClient(
            new WebChromeClient() {

                // ==================================================
                // CAMERA PERMISSION
                // ==================================================

                @Override
                public void onPermissionRequest(
                    final PermissionRequest request
                ) {

                    runOnUiThread(() -> {

                        boolean hasOsPermission =
                            ContextCompat.checkSelfPermission(
                                MainActivity.this,
                                Manifest.permission.CAMERA
                            ) ==
                            PackageManager.PERMISSION_GRANTED;

                        if (hasOsPermission) {

                            request.grant(
                                request.getResources()
                            );

                        } else {

                            pendingWebPermissionRequest =
                                request;

                            ActivityCompat.requestPermissions(
                                MainActivity.this,
                                new String[]{
                                    Manifest.permission.CAMERA
                                },
                                CAMERA_PERMISSION_REQUEST_CODE
                            );
                        }
                    });
                }


                // ==================================================
                // FILE CHOOSER
                // ==================================================

                @Override
                public boolean onShowFileChooser(
                    WebView webViewParam,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams fileChooserParams
                ) {

                    filePathCallback =
                        callback;

                    Intent intent =
                        new Intent(
                            Intent.ACTION_GET_CONTENT
                        );

                    intent.addCategory(
                        Intent.CATEGORY_OPENABLE
                    );

                    intent.setType("*/*");

                    String[] acceptTypes =
                        fileChooserParams
                            .getAcceptTypes();

                    if (
                        acceptTypes != null &&
                        acceptTypes.length > 0 &&
                        acceptTypes[0] != null &&
                        !acceptTypes[0].isEmpty()
                    ) {

                        intent.setType(
                            acceptTypes[0]
                        );
                    }

                    try {

                        fileChooserLauncher.launch(
                            Intent.createChooser(
                                intent,
                                "Select File"
                            )
                        );

                    } catch (Exception e) {

                        Log.e(
                            "FILE_CHOOSER",
                            "Failed to launch file chooser",
                            e
                        );

                        filePathCallback = null;

                        return false;
                    }

                    return true;
                }
            }
        );

        Log.d(
            "CAMERA_FIX",
            "WebChromeClient configured"
        );
    }


    // ============================================================
    // CAMERA PERMISSION RESULT
    // ============================================================

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        String[] permissions,
        int[] grantResults
    ) {

        super.onRequestPermissionsResult(
            requestCode,
            permissions,
            grantResults
        );

        if (
            requestCode ==
                CAMERA_PERMISSION_REQUEST_CODE &&
            pendingWebPermissionRequest != null
        ) {

            boolean granted =
                grantResults.length > 0 &&
                grantResults[0] ==
                    PackageManager.PERMISSION_GRANTED;

            if (granted) {

                pendingWebPermissionRequest.grant(
                    pendingWebPermissionRequest
                        .getResources()
                );

                Log.d(
                    "CAMERA_FIX",
                    "Camera permission granted"
                );

            } else {

                pendingWebPermissionRequest.deny();

                Log.w(
                    "CAMERA_FIX",
                    "Camera permission denied"
                );
            }

            pendingWebPermissionRequest = null;
        }
    }


    // ============================================================
    // COOKIE FLUSH
    // ============================================================

    @Override
    public void onPause() {

        super.onPause();

        CookieManager
            .getInstance()
            .flush();
    }


    @Override
    public void onStop() {

        super.onStop();

        CookieManager
            .getInstance()
            .flush();
    }


    // ============================================================
    // SEND FCM TOKEN
    // ============================================================

    private void sendTokenToWebViewWithRetry(
        String token,
        int attempt
    ) {

        WebView webView =
            this.getBridge() != null
                ? this.getBridge().getWebView()
                : null;

        if (webView == null) {

            Log.w(
                "FCM_TOKEN",
                "WebView not ready, attempt "
                    + attempt
            );

            scheduleRetry(
                token,
                attempt
            );

            return;
        }

        webView.post(() -> {

            String safeToken =
                token
                    .replace("\\", "\\\\")
                    .replace("'", "\\'")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r");

            String js =
                "(function(){"
                    + "if (window.receiveFcmToken) {"
                    + "window.receiveFcmToken('"
                    + safeToken
                    + "');"
                    + "return true;"
                    + "}"
                    + "return false;"
                    + "})();";

            webView.evaluateJavascript(
                js,
                result -> {

                    boolean delivered =
                        result != null &&
                        result.equals("true");

                    Log.d(
                        "FCM_TOKEN",
                        "Delivery attempt "
                            + attempt
                            + " result: "
                            + result
                    );

                    if (!delivered) {

                        scheduleRetry(
                            token,
                            attempt
                        );
                    }
                }
            );
        });
    }


    // ============================================================
    // FCM RETRY
    // ============================================================

    private void scheduleRetry(
        String token,
        int attempt
    ) {

        if (attempt >= MAX_RETRIES) {

            Log.w(
                "FCM_TOKEN",
                "Giving up after "
                    + MAX_RETRIES
                    + " attempts"
            );

            return;
        }

        new Handler(
            Looper.getMainLooper()
        ).postDelayed(
            () ->
                sendTokenToWebViewWithRetry(
                    token,
                    attempt + 1
                ),
            RETRY_DELAY_MS
        );
    }
}