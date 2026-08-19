package com.mahfel.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * FCM: نوتیفیکیشن لحظه‌ای حتی وقتی اپ بسته/کشته است.
 * پوش از سرور (firebase-admin) می‌آید → اینجا اعلان سیستمی نشان داده می‌شود.
 */
public class FcmService extends FirebaseMessagingService {

    private static final String TAG = "FcmService";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        // اپ زنده است (باز یا در پس‌زمینه) → نوتیفیکیشن از طریق WS/پل نیتیو می‌رسد؛
        // FCM نمایش ندهد تا یک اعلان دوبار ارسال نشود. فقط وقتی اپ کاملاً کشته شده، FCM نمایش می‌دهد.
        if (MainActivity.staticBridge != null) return;
        try {
            String title = null;
            String body = null;
            String url = null;
            String id = "";

            if (message.getNotification() != null) {
                title = message.getNotification().getTitle();
                body = message.getNotification().getBody();
            }
            if (message.getData() != null) {
                if (title == null) title = message.getData().get("title");
                if (body == null) body = message.getData().get("body");
                url = message.getData().get("url");
                id = message.getData().get("id");
            }

            // صفره آید → اگر اپ فعال است بنر داخلی همان را نشان می‌دهد (SW/WS)؛
            // نمایش دوبارهٔ سیستمی فقط برای وقتی است که اپ بسته باشد — اما FCM دیتای url/id همیشه دارد
            showNotif(title, body, url, id);
        } catch (Exception e) {
            Log.e(TAG, "onMessageReceived error", e);
        }
    }

    private void showNotif(String title, String body, String url, String id) {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            return;
        }
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (url != null && !url.isEmpty()) intent.putExtra("notifLink", url);
        int reqCode = (url != null && !url.isEmpty()) ? url.hashCode() : (int) (System.currentTimeMillis() % 10000);
        PendingIntent pi = PendingIntent.getActivity(this, reqCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationManagerCompat nm = NotificationManagerCompat.from(this);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("mahfel_notifications") == null) {
            android.app.NotificationChannel ch = new android.app.NotificationChannel(
                    "mahfel_notifications", "اعلان‌های محفل",
                    android.app.NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("اعلان‌های لحظه‌ای فعالیت‌های محفل");
            getSystemService(android.app.NotificationManager.class).createNotificationChannel(ch);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "mahfel_notifications")
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title != null && !title.isEmpty() ? title : "محفل")
                .setContentText(body != null ? body : "")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);
        if (!id.isEmpty()) builder.setGroup("mahfel-" + id);

        if (nm.areNotificationsEnabled()) {
            nm.notify(id.hashCode() == 0 ? reqCode : id.hashCode(), builder.build());
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        try {
            Log.d(TAG, "new fcm token");
            SharedPreferences prefs = getSharedPreferences("mahfel_prefs", MODE_PRIVATE);
            prefs.edit().putString("fcm_token", token).apply();
            // اگر اپ باز است به WebView اطلاع بده تا توکن ثبت شود
            MainActivity.forwardFcmToken();
        } catch (Exception e) {
            Log.e(TAG, "onNewToken error", e);
        }
    }
}
