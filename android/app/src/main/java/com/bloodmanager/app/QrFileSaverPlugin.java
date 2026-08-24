package com.bloodmanager.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "QrFileSaver")
public class QrFileSaverPlugin extends Plugin {

    // ============================================================
    // SAVE PNG QR CODE
    // ============================================================

    @PluginMethod
    public void savePng(PluginCall call) {

        String base64 = call.getString("base64");
        String fileName = call.getString("fileName");

        if (base64 == null || base64.trim().isEmpty()) {
            call.reject("QR image data পাওয়া যায়নি");
            return;
        }

        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "quantum-login-qr.png";
        }

        // Remove data URL prefix if present
        if (base64.contains(",")) {
            base64 = base64.substring(base64.indexOf(",") + 1);
        }

        try {

            byte[] imageBytes = Base64.decode(
                base64,
                Base64.DEFAULT
            );

            if (imageBytes.length == 0) {
                call.reject("QR image data empty");
                return;
            }

            ContentResolver resolver =
                getContext().getContentResolver();

            ContentValues values =
                new ContentValues();

            values.put(
                MediaStore.Images.Media.DISPLAY_NAME,
                fileName
            );

            values.put(
                MediaStore.Images.Media.MIME_TYPE,
                "image/png"
            );

            // Android 10+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

                values.put(
                    MediaStore.Images.Media.RELATIVE_PATH,
                    Environment.DIRECTORY_PICTURES
                        + "/Quantum Blood Donor Pool"
                );

                values.put(
                    MediaStore.Images.Media.IS_PENDING,
                    1
                );
            }

            Uri uri = resolver.insert(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                values
            );

            if (uri == null) {
                call.reject(
                    "Gallery-তে QR Code save করা যায়নি"
                );
                return;
            }

            try (
                OutputStream outputStream =
                    resolver.openOutputStream(uri)
            ) {

                if (outputStream == null) {
                    throw new Exception(
                        "Output stream পাওয়া যায়নি"
                    );
                }

                outputStream.write(imageBytes);
                outputStream.flush();
            }

            // Publish file on Android 10+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

                ContentValues complete =
                    new ContentValues();

                complete.put(
                    MediaStore.Images.Media.IS_PENDING,
                    0
                );

                resolver.update(
                    uri,
                    complete,
                    null,
                    null
                );
            }

            JSObject result =
                new JSObject();

            result.put(
                "success",
                true
            );

            result.put(
                "uri",
                uri.toString()
            );

            result.put(
                "fileName",
                fileName
            );

            call.resolve(result);

        } catch (Exception e) {

            call.reject(
                "QR Code save করা যায়নি: "
                    + (
                        e.getMessage() != null
                            ? e.getMessage()
                            : "Unknown error"
                    ),
                e
            );
        }
    }


    // ============================================================
    // SAVE PDF
    // ============================================================

    @PluginMethod
    public void savePdf(PluginCall call) {

        String base64 = call.getString("base64");
        String fileName = call.getString("fileName");

        if (base64 == null || base64.trim().isEmpty()) {
            call.reject("PDF data পাওয়া যায়নি");
            return;
        }

        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "quantum-login-qr.pdf";
        }

        // Remove data URL prefix
        if (base64.contains(",")) {
            base64 = base64.substring(base64.indexOf(",") + 1);
        }

        try {

            byte[] pdfBytes = Base64.decode(
                base64,
                Base64.DEFAULT
            );

            if (pdfBytes.length == 0) {
                call.reject("PDF data empty");
                return;
            }

            ContentResolver resolver =
                getContext().getContentResolver();

            ContentValues values =
                new ContentValues();

            values.put(
                MediaStore.Downloads.DISPLAY_NAME,
                fileName
            );

            values.put(
                MediaStore.Downloads.MIME_TYPE,
                "application/pdf"
            );

            // Android 10+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

                values.put(
                    MediaStore.Downloads.RELATIVE_PATH,
                    Environment.DIRECTORY_DOWNLOADS
                        + "/Quantum Blood Donor Pool"
                );

                values.put(
                    MediaStore.Downloads.IS_PENDING,
                    1
                );
            }

            Uri uri = resolver.insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                values
            );

            if (uri == null) {
                call.reject(
                    "PDF save করা যায়নি"
                );
                return;
            }

            try (
                OutputStream outputStream =
                    resolver.openOutputStream(uri)
            ) {

                if (outputStream == null) {
                    throw new Exception(
                        "PDF output stream পাওয়া যায়নি"
                    );
                }

                outputStream.write(pdfBytes);
                outputStream.flush();
            }

            // Publish file on Android 10+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

                ContentValues complete =
                    new ContentValues();

                complete.put(
                    MediaStore.Downloads.IS_PENDING,
                    0
                );

                resolver.update(
                    uri,
                    complete,
                    null,
                    null
                );
            }

            JSObject result =
                new JSObject();

            result.put(
                "success",
                true
            );

            result.put(
                "uri",
                uri.toString()
            );

            result.put(
                "fileName",
                fileName
            );

            call.resolve(result);

        } catch (Exception e) {

            call.reject(
                "PDF save করা যায়নি: "
                    + (
                        e.getMessage() != null
                            ? e.getMessage()
                            : "Unknown error"
                    ),
                e
            );
        }
    }
}