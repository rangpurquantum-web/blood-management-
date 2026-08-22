package com.bloodmanager.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // FCM token নেওয়া এবং log করা (backend-এ পাঠানোর কোড পরের ধাপে যোগ হবে)
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w("FCM_TOKEN", "Fetching FCM token failed", task.getException());
                    return;
                }
                String token = task.getResult();
                Log.d("FCM_TOKEN", "Token: " + token);
            });
    }
}
