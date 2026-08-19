package com.mahfel.app;

import android.Manifest;
import android.app.AlertDialog;
import android.app.PictureInPictureParams;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.app.RemoteAction;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.Icon;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.telephony.SmsMessage;
import android.util.Rational;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {

    private static final long LOAD_TIMEOUT_MS = 15000;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean pageLoaded = false;
    private boolean errorOverlayVisible = false;
    private boolean vpnWarningShown = false;
    private String appUrl = null;
    private LinearLayout overlay;
        public static Bridge staticBridge;
    private String pendingNotifLink = null;
    // ── FCM ──

    /** توکن FCM تازه شد (یا اپ هنگام راه‌اندازی دارد) → به WebView بگو ثبت کند */
    public static void forwardFcmToken() {
        Bridge b = staticBridge;
        if (b == null) return;
        try {
            android.webkit.WebView wv = b.getWebView();
            if (wv != null) {
                wv.post(() -> wv.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('mahfel-fcm-token'))", null));
            }
        } catch (Exception ignored) {
        }
    }

    public String getStoredFcmToken() {
        try {
            return getSharedPreferences("mahfel_prefs", MODE_PRIVATE).getString("fcm_token", "");
        } catch (Exception e) {
            return "";
        }
    }
    private boolean videoPlaying = false;
    // متادیتای ویدیو برای مینی‌پلیر PiP (عنوان + ابعاد واقعی برای نسبت تصویر)
    private String pipTitle = "پخش ویدیو";
    private int pipVideoW = 16;
    private int pipVideoH = 9;
    private boolean notificationAskedOnce = false;
    private BroadcastReceiver smsReceiver = null;

    // همگام‌سازی فوری پیام‌ها حتی وقتی اپ در پس‌زمینه است: پلر سبک نیتیو
    private static final String NATIVE_POLL_URL = "https://app.soha-sima.ir/api/posts?limit=1";
    private static final long NATIVE_POLL_INTERVAL_MS = 4000;
    private boolean isForeground = true;
    private String lastNativePostId = "";
    private boolean nativePollStarted = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        staticBridge = getBridge();
        notificationAskedOnce = getSharedPreferences("mahfel_prefs", MODE_PRIVATE).getBoolean("notif_asked", false);
        processIntent(getIntent());
        handler.post(this::setupWebView);
        showVpnWarningIfConnected();
        startNativeSync();
        registerSmsReceiver();
        // مجوز نوتیفیکیشن در اولین ورود به اپ (نه هنگام پخش) — ادمین به کاربران اعلان می‌فرستد
        handler.postDelayed(this::requestPermissionsAtStartup, 1000);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        processIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        isForeground = true;
        handler.post(() -> {
            if (staticBridge != null) {
                android.webkit.WebView wv = staticBridge.getWebView();
                if (wv != null) {
                    wv.post(() -> wv.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('mahfel-native-refresh'))", null));
                }
            }
        });
    }

    @Override
    public void onPause() {
        super.onPause();
        isForeground = false;
    }

    /** پردازش اینتنت ورودی (باز شدن اپ از نوتیفیکیشن): لینک هدف را به وب تحویل می‌دهد */
    private void processIntent(Intent intent) {
        if (intent == null) return;
        String link = intent.getStringExtra("notifLink");
        if (link != null && !link.isEmpty()) {
            pendingNotifLink = link;
            dispatchPendingNotifLink();
        }
    }

    /** وقتی صفحه وب آماده شد، لینک نوتیفیکیشن را به اپ وب تحویل بده (باز شدن همان صفحه/ویدیو) */
    private void dispatchPendingNotifLink() {
        if (pendingNotifLink == null) return;
        final String link = pendingNotifLink;
        handler.post(() -> {
            try {
                Bridge b = staticBridge != null ? staticBridge : getBridge();
                WebView wv = b != null ? b.getWebView() : null;
                if (wv == null || !pageLoaded) return;
                pendingNotifLink = null;
                wv.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('mahfel-open-notif',{detail:'" + link + "'}))", null);
            } catch (Exception ignored) {
            }
        });
    }

    /** پلر نیتیو: هر ۴ ثانیه آخرین پست را می‌گیرد؛ اگر جدید بود → رفرش وب + نوتیفیکیشن (اگر اپ در پس‌زمینه است) */
    private void startNativeSync() {
        if (nativePollStarted) return;
        nativePollStarted = true;
        final Runnable poll = new Runnable() {
            @Override
            public void run() {
                new Thread(() -> {
                    String id = fetchLatestPostId();
                    if (id != null && !id.isEmpty() && !id.equals(lastNativePostId)) {
                        boolean isNew = !lastNativePostId.isEmpty();
                        lastNativePostId = id;
                        if (isNew) {
                            onNewPostDetected();
                        }
                    }
                    handler.postDelayed(this, NATIVE_POLL_INTERVAL_MS);
                }).start();
            }
        };
        handler.postDelayed(poll, NATIVE_POLL_INTERVAL_MS);
    }

    private String fetchLatestPostId() {
        try {
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection)
                    new java.net.URL(NATIVE_POLL_URL).openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.setRequestProperty("Accept", "application/json");
            int code = conn.getResponseCode();
            if (code != 200) {
                conn.disconnect();
                return null;
            }
            java.io.BufferedReader reader = new java.io.BufferedReader(
                    new java.io.InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            reader.close();
            conn.disconnect();
            org.json.JSONArray arr = new org.json.JSONArray(sb.toString());
            if (arr.length() == 0) return null;
            return arr.getJSONObject(0).optString("_id", "");
        } catch (Exception e) {
            return null;
        }
    }

    private void onNewPostDetected() {
        handler.post(() -> {
            try {
                if (staticBridge != null) {
                    android.webkit.WebView wv = staticBridge.getWebView();
                    if (wv != null) {
                        wv.post(() -> wv.evaluateJavascript(
                                "window.dispatchEvent(new CustomEvent('mahfel-native-refresh'))", null));
                    }
                }
            } catch (Exception ignored) {
            }
            if (!isForeground) showNewPostNotification();
        });
    }

    private void showNewPostNotification() {
        try {
            if (Build.VERSION.SDK_INT < 26) return;
            if (NotificationManagerCompat.from(this).areNotificationsEnabled()) {
                Intent intent = new Intent(this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pi = PendingIntent.getActivity(this, 0, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                android.app.Notification n = new android.app.Notification.Builder(this, "mahfel_notifications")
                        .setSmallIcon(android.R.drawable.ic_dialog_email)
                        .setContentTitle("📨 پیام جدید در محفل")
                        .setContentText("یک پیام جدید اضافه شد")
                        .setContentIntent(pi)
                        .setAutoCancel(true)
                        .build();
                NotificationManagerCompat.from(this).notify((int) (System.currentTimeMillis() % 100000), n);
            }
        } catch (Exception ignored) {
        }
    }

    /** درخواست خودکار مجوزها در اولین اجرا: فقط نوتیفیکیشن (دیالوگ سیستمی) — بدون راهنمای overlay */
    private void requestPermissionsAtStartup() {
        requestNotificationPermissionIfNeeded();
    }

    private void registerSmsReceiver() {
        if (smsReceiver != null) return;
        try {
            if (Build.VERSION.SDK_INT >= 23 &&
                    checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
                return;
            }
            smsReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null) return;
                    String action = intent.getAction();
                    if (!"android.provider.Telephony.SMS_RECEIVED".equals(action)) return;
                    try {
                        Object[] pdus = (Object[]) intent.getExtras().get("pdus");
                        if (pdus == null) return;
                        String format = intent.getStringExtra("format");
                        StringBuilder body = new StringBuilder();
                        for (Object pdu : pdus) {
                            SmsMessage msg = format != null
                                    ? SmsMessage.createFromPdu((byte[]) pdu, format)
                                    : SmsMessage.createFromPdu((byte[]) pdu);
                            if (msg != null && msg.getDisplayMessageBody() != null) {
                                body.append(msg.getDisplayMessageBody());
                            }
                        }
                        // ارقام فارسی/عربی پیامک را به انگلیسی تبدیل کن (قالب اکثر پیامک‌های ایرانی)
                        String text = body.toString()
                                .replace('۰', '0').replace('۱', '1').replace('۲', '2').replace('۳', '3').replace('۴', '4')
                                .replace('۵', '5').replace('۶', '6').replace('۷', '7').replace('۸', '8').replace('۹', '9')
                                .replace('٠', '0').replace('١', '1').replace('٢', '2').replace('٣', '3').replace('٤', '4')
                                .replace('٥', '5').replace('٦', '6').replace('٧', '7').replace('٨', '8').replace('٩', '9');
                        // کد تایید دقیقاً ۴ رقم است؛ عدد ۴+ رقمی (مثل شماره موبایل) را رد کن
                        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?<!\\d)\\d{4}(?!\\d)").matcher(text);
                        if (!m.find()) return;
                        final String code = m.group(0);
                        handler.post(() -> {
                            try {
                                Bridge b = staticBridge != null ? staticBridge : getBridge();
                                WebView wv = b != null ? b.getWebView() : null;
                                if (wv == null) return;
                                wv.post(() -> wv.evaluateJavascript(
                                        "window.postMessage('mahfel-otp-received|" + code + "','*')", null));
                            } catch (Exception ignored) {
                            }
                        });
                    } catch (Exception ignored) {
                    }
                }
            };
            IntentFilter filter = new IntentFilter("android.provider.Telephony.SMS_RECEIVED");
            filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
            androidx.core.content.ContextCompat.registerReceiver(this, smsReceiver, filter,
                    androidx.core.content.ContextCompat.RECEIVER_EXPORTED);
        } catch (Exception ignored) {
        }
    }

    private void unregisterSmsReceiver() {
        if (smsReceiver == null) return;
        try {
            unregisterReceiver(smsReceiver);
        } catch (Exception ignored) {
        }
        smsReceiver = null;
    }

    private void enterPipInternal() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                enterPictureInPictureMode(buildPipParams());
            } catch (Exception ignored) {
            }
        }
    }

    /** به‌روزرسانی زنده پارامترهای مینی‌پلیر (دکمه‌ها + نسبت تصویر + عنوان) هنگام تغییر حالت پخش */
    private void updatePipParams() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isInPictureInPictureMode()) {
            try {
                setPictureInPictureParams(buildPipParams());
            } catch (Exception ignored) {
            }
        }
    }

    /** پارامترهای کامل مینی‌پلیر PiP — مثل یوتیوب */
    private PictureInPictureParams buildPipParams() {
        PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
        try {
            builder.setAspectRatio(new Rational(Math.max(1, pipVideoW), Math.max(1, pipVideoH)));
        } catch (Exception ignored) {
            builder.setAspectRatio(new Rational(16, 9));
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try { builder.setSeamlessResizeEnabled(true); } catch (Exception ignored) {}
            // پنجره بزرگ‌تر در ابتدا (اندروید ۱۲ تا ۱۵ — در ۱۶+ این API حذف شده)
            if (Build.VERSION.SDK_INT < 36) {
                try {
                    PictureInPictureParams.Builder.class
                            .getMethod("setExpansionState", int.class)
                            .invoke(builder, 2); // EXPANSION_STATE_LARGE
                } catch (Exception ignored) {
                }
            }
            // عنوان ویدیو داخل پنجره PiP (اندروید ۱۳+)
            try {
                PictureInPictureParams.Builder.class
                        .getMethod("setTitle", CharSequence.class)
                        .invoke(builder, pipTitle);
            } catch (Exception ignored) {
            }
        }
        return builder.build();
    }

    private void setupWebView() {
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv == null) {
            // WebView هنوز ساخته نشده — دوباره تلاش کن (بریج نیتیو حتماً باید تزریق شود)
            handler.postDelayed(this::setupWebView, 250);
            return;
        }

        // ══ حالت کاملاً پویا: هیچ‌چیز در WebView ذخیره/کش نشود — همیشه مستقیم از سرور ══
        try {
            wv.clearCache(true);
        } catch (Exception ignored) {
        }
        try {
            android.webkit.WebSettings s = wv.getSettings();
            s.setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);
        } catch (Exception ignored) {
        }

        // سرویس‌ورکر را کاملاً غیرفعال و ذخیره‌اش را پاک کن:
        // هیچ HTML/JS کش‌شده‌ای هرگز نباید در APK استفاده شود — همیشه لود زنده از سرور
        try {
            Class<?> swcCls = Class.forName("androidx.webkit.ServiceWorkerControllerCompat");
            java.lang.reflect.Method getInstance = swcCls.getMethod("getInstance");
            Object swc = getInstance.invoke(null);
            if (swc != null) {
                Object settings = swc.getClass().getMethod("getServiceWorkerWebSettings").invoke(swc);
                settings.getClass().getMethod("setServiceWorkerEnabled", boolean.class).invoke(settings, false);
            }
        } catch (Exception ignored) {
        }
        if (Build.VERSION.SDK_INT >= 24) {
            try {
                android.webkit.ServiceWorkerController swc = android.webkit.ServiceWorkerController.getInstance();
                if (swc != null) {
                    try { swc.getClass().getMethod("clearAllServiceWorkers").invoke(swc); } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {
            }
        }

        final WebViewClientImpl client = new WebViewClientImpl();
        wv.setWebViewClient(client);
        try {
            wv.removeJavascriptInterface("AndroidBridge");
        } catch (Exception ignored) {
        }
        wv.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        handler.postDelayed(() -> {
            if (!pageLoaded && !errorOverlayVisible) {
                WebView wv2 = getBridge() != null ? getBridge().getWebView() : null;
                if (wv2 != null) {
                    client.loadErrorPage(wv2);
                }
            }
        }, LOAD_TIMEOUT_MS);
    }

    private class WebViewClientImpl extends BridgeWebViewClient {
        WebViewClientImpl() {
            super(MainActivity.this.getBridge());
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            if (appUrl == null && url != null && !url.startsWith("about:") && !url.startsWith("data:")) {
                appUrl = url;
            }
            if (!errorOverlayVisible) {
                pageLoaded = false;
            }
        }

        private boolean freshReloadDone = false;

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            pageLoaded = true;
            if (errorOverlayVisible) hideOverlay();
            // اگر اپ از نوتیفیکیشن باز شده → لینک آن را به وب تحویل بده
            dispatchPendingNotifLink();
            // اولین بارگذاری ممکن است از کش WebView آمده باشد (نسخه قدیمی سایت).
            // بعد از اتمام آن، یک‌بار بدون کش دوباره بارگذاری کن تا همیشه تازه‌ترین نسخه وب نمایش داده شود.
            if (!freshReloadDone && url != null && !url.startsWith("about:") && !url.startsWith("data:") && appUrl != null && url.startsWith(appUrl)) {
                freshReloadDone = true;
                try {
                    view.clearCache(true);
                    view.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);
                    view.reload();
                } catch (Exception ignored) {
                }
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request != null && request.isForMainFrame()) {
                pageLoaded = false;
                loadErrorPage(view);
                return;
            }
            super.onReceivedError(view, request, error);
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            pageLoaded = false;
            loadErrorPage(view);
        }

        private void loadErrorPage(WebView view) {
            errorOverlayVisible = true;
            String retryUrl = getAppUrl();
            String html = "<!DOCTYPE html><html dir='rtl' lang='fa'><head><meta charset='UTF-8'>"
                    + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                    + "<title>خطا</title><style>"
                    + "*{margin:0;padding:0;box-sizing:border-box}"
                    + "body{background:#0F172A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"
                    + "display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}"
                    + ".card{text-align:center;max-width:340px;width:100%}"
                    + ".icon{font-size:64px;margin-bottom:20px}"
                    + "h1{font-size:20px;margin-bottom:12px}"
                    + "p{color:#94A3B8;font-size:14px;line-height:1.6;margin-bottom:28px}"
                    + "button{background:#2563EB;color:#fff;border:none;padding:14px 40px;"
                    + "border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;"
                    + "transition:background .2s;width:100%}"
                    + "button:active{background:#1D4ED8}"
                    + "</style></head><body><div class='card'>"
                    + "<div class='icon'>📡</div>"
                    + "<h1>اتصال برقرار نشد</h1>"
                    + "<p>اینترنت یا شبکه خود را بررسی کنید<br>و دوباره تلاش کنید.</p>"
                    + "<p style='font-size:11px;color:#64748B;word-break:break-all;margin-top:12px;margin-bottom:12px'>در حال بارگذاری:<br>" + retryUrl + "</p>"
                    + "<button onclick=\"window.location.href='" + retryUrl + "'\">تلاش مجدد</button>"
                    + "</div></body></html>";
            view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        }
    }

    private String getAppUrl() {
        try {
            Bridge b = getBridge();
            if (b != null && b.getConfig() != null) {
                String u = b.getConfig().getServerUrl();
                if (u != null && !u.isEmpty()) {
                    return u;
                }
            }
        } catch (Exception ignored) {
        }
        if (appUrl != null) return appUrl;
        return "http://87.248.145.44/";
    }

    private void showErrorOverlay(String title, String message, boolean withRetry) {
        if (overlay != null) return;
        errorOverlayVisible = true;
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(0xFF0F172A);
        root.setPadding(dp(28), dp(28), dp(28), dp(28));

        TextView icon = new TextView(this);
        icon.setText("📡");
        icon.setTextSize(52);
        icon.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        iconLp.bottomMargin = dp(18);
        root.addView(icon, iconLp);

        TextView tTitle = new TextView(this);
        tTitle.setText(title);
        tTitle.setTextColor(Color.WHITE);
        tTitle.setTextSize(18);
        tTitle.setTypeface(Typeface.DEFAULT_BOLD);
        tTitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        titleLp.bottomMargin = dp(12);
        root.addView(tTitle, titleLp);

        TextView tMsg = new TextView(this);
        tMsg.setText(message);
        tMsg.setTextColor(0xFFCBD5E1);
        tMsg.setTextSize(14);
        tMsg.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams msgLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        msgLp.bottomMargin = dp(24);
        root.addView(tMsg, msgLp);

        if (withRetry) {
            Button retry = new Button(this);
            retry.setText("تلاش مجدد");
            retry.setTextColor(Color.WHITE);
            retry.setTextSize(14);
            retry.setTypeface(Typeface.DEFAULT_BOLD);
            retry.setBackground(bg(0xFF2563EB, 0xFF1D4ED8, 18));
            LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(50));
            btnLp.gravity = Gravity.CENTER_HORIZONTAL;
            retry.setOnClickListener(v -> {
                hideOverlay();
                WebView wv = getBridge().getWebView();
                if (wv != null) {
                    pageLoaded = false;
                    wv.reload();
                    handler.postDelayed(() -> {
                        if (!pageLoaded && !errorOverlayVisible) {
                            showErrorOverlay("مشکلی در اتصال به وجود آمد",
                                    "بارگذاری صفحه بیش از حد طول کشید.\nاینترنت یا شبکه خود را بررسی کنید و دوباره تلاش کنید.",
                                    true);
                        }
                    }, LOAD_TIMEOUT_MS);
                }
            });
            root.addView(retry, btnLp);
        } else {
            Button ok = new Button(this);
            ok.setText("متوجه شدم");
            ok.setTextColor(Color.WHITE);
            ok.setTextSize(14);
            ok.setTypeface(Typeface.DEFAULT_BOLD);
            ok.setBackground(bg(0xFF475569, 0xFF334155, 18));
            LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(50));
            btnLp.gravity = Gravity.CENTER_HORIZONTAL;
            ok.setOnClickListener(v -> hideOverlay());
            root.addView(ok, btnLp);
        }

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
        View decor = getWindow().getDecorView();
        if (decor instanceof FrameLayout) {
            ((FrameLayout) decor).addView(root, lp);
            overlay = root;
        } else {
            addContentView(root, lp);
            overlay = root;
        }
    }

    private void hideOverlay() {
        if (overlay == null) return;
        errorOverlayVisible = false;
        View decor = getWindow().getDecorView();
        if (decor instanceof FrameLayout) {
            ((FrameLayout) decor).removeView(overlay);
        }
        overlay = null;
    }

    // ══ دانلود و نصب خودکار APK نسخه جدید ══

    private void startApkDownload(final String url) {
        if (url == null || url.isEmpty()) {
            postApkProgress("{\"error\":\"لینک دانلود وجود ندارد\"}");
            return;
        }
        new Thread(() -> {
            try {
                File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "mahfel-update");
                if (!dir.exists()) dir.mkdirs();
                final File out = new File(dir, "mahfel-new.apk");
                if (out.exists()) out.delete();

                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setInstanceFollowRedirects(true);
                int code = conn.getResponseCode();
                if (code != 200) {
                    postApkProgress("{\"error\":\"خطا در دانلود (کد " + code + ")\"}");
                    conn.disconnect();
                    return;
                }
                long total = conn.getContentLengthLong();
                InputStream in = conn.getInputStream();
                FileOutputStream fos = new FileOutputStream(out);
                byte[] buf = new byte[65536];
                long downloaded = 0;
                int lastPercent = -1;
                long lastPost = 0;
                int n;
                while ((n = in.read(buf)) > 0) {
                    fos.write(buf, 0, n);
                    downloaded += n;
                    long now = System.currentTimeMillis();
                    if (total > 0 && (now - lastPost > 500 || downloaded == total)) {
                        int pct = (int) ((downloaded * 100) / total);
                        if (pct != lastPercent) {
                            lastPercent = pct;
                            lastPost = now;
                            postApkProgress("{\"percent\":" + pct + "}");
                        }
                    }
                }
                fos.flush();
                fos.close();
                in.close();
                conn.disconnect();
                postApkProgress("{\"percent\":100}");
                promptInstallApk(out);
            } catch (Exception e) {
                postApkProgress("{\"error\":\"دانلود ناموفق بود؛ اینترنت خود را بررسی کنید\"}");
            }
        }).start();
    }

    private void postApkProgress(final String json) {
        handler.post(() -> {
            try {
                Bridge b = staticBridge != null ? staticBridge : getBridge();
                WebView wv = b != null ? b.getWebView() : null;
                if (wv == null) return;
                final String js = "window.dispatchEvent(new CustomEvent('mahfel-apk-progress',{detail:" + json + "}))";
                wv.post(() -> wv.evaluateJavascript(js, null));
            } catch (Exception ignored) {
            }
        });
    }

    private void promptInstallApk(File apkFile) {
        handler.post(() -> {
            try {
                Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apkFile);
                new AlertDialog.Builder(this)
                        .setTitle("نسخه جدید دانلود شد")
                        .setMessage("نسخه جدید محفل آماده نصب است. روی «نصب» بزنید؛ نسخه قبلی خودکار جایگزین می‌شود.")
                        .setCancelable(false)
                        .setPositiveButton("نصب", (d, w) -> {
                            try {
                                Intent i = new Intent(Intent.ACTION_VIEW);
                                i.setDataAndType(uri, "application/vnd.android.package-archive");
                                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(i);
                            } catch (Exception e) {
                                postApkProgress("{\"error\":\"باز شدن نصب ممکن نشد؛ از فایل دانلودی نصب کنید\"}");
                            }
                        })
                        .setNegativeButton("بعداً", (d, w) -> d.dismiss())
                        .show();
            } catch (Exception ignored) {
            }
        });
    }

    private void showVpnWarningIfConnected() {
        if (vpnWarningShown) return;
        if (isVpnConnected()) {
            vpnWarningShown = true;
            handler.post(() -> showErrorOverlay("هشدار: اتصال VPN",
                    "به VPN یا پروکسی متصل هستید؛ ممکن است سایت به درستی باز نشود.\nدر صورت بروز مشکل، VPN را خاموش کنید.",
                    false));
        }
    }

    private boolean isVpnConnected() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            Network[] networks = cm.getAllNetworks();
            for (Network n : networks) {
                NetworkCapabilities caps = cm.getNetworkCapabilities(n);
                if (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                // فقط یک‌بار خودکار (در اولین اجرا) — از دیالوگ سیستمی اندروید
                if (!notificationAskedOnce) {
                    notificationAskedOnce = true;
                    getSharedPreferences("mahfel_prefs", MODE_PRIVATE).edit().putBoolean("notif_asked", true).apply();
                    ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
                }
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        // بعد از پاسخ کاربر به مجوز نوتیفیکیشن → به وب اطلاع بده تا در صورت لزوم پخش ادامه یابد
        if (requestCode == 1001) {
            try {
                WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                if (wv != null) {
                    wv.post(() -> wv.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('mahfel-permission-result'))",
                            null));
                }
            } catch (Exception ignored) {
            }
        }
    }

    private GradientDrawable bg(int topColor, int bottomColor, int radius) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{topColor, bottomColor});
        d.setCornerRadius(dp(radius));
        return d;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        try {
            WebView wv = getBridge() != null ? getBridge().getWebView() : null;
            if (wv != null) {
                wv.post(() -> wv.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('mahfel-pip-changed',{detail:" + isInPictureInPictureMode + "}))",
                        null));
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        unregisterSmsReceiver();
    }

    // دکمه برگشت سیستم: هیچ‌وقت از اپلیکیشن خارج نشود — پیمایش داخل اپ، و در ریشه فقط minimize
    @Override
    public void onBackPressed() {
        try {
            Bridge b = getBridge();
            WebView wv = b != null ? b.getWebView() : null;
            if (wv != null && wv.canGoBack()) {
                wv.goBack();
            } else {
                moveTaskToBack(true);
            }
        } catch (Exception ignored) {
            moveTaskToBack(true);
        }
    }

    private class AndroidBridge {
        @JavascriptInterface
        public boolean isApp() {
            return true;
        }

        // نسخه نصب‌شده اپ — برای چک‌آپدیت در وب
        @JavascriptInterface
        public String getAppVersion() {
            try {
                android.content.pm.PackageInfo info =
                        getPackageManager().getPackageInfo(getPackageName(), 0);
                return info.versionName == null ? "" : info.versionName;
            } catch (Exception e) {
                return "";
            }
        }

        // توکن FCM برای ثبت روی سرور (خالی = FCM در دسترس نیست)
        @JavascriptInterface
        public String getFcmToken() {
            return getStoredFcmToken();
        }

        @JavascriptInterface
        public void enterPip() {
            enterPipInternal();
        }

        @JavascriptInterface
        public void exitPip() {
            try {
                if (isInPictureInPictureMode()) {
                    // API عمومی برای خروج از PiP وجود ندارد → ریفلکشن روی متد مخفی
                    try {
                        java.lang.reflect.Method m = MainActivity.class.getMethod("exitPictureInPictureMode");
                        m.invoke(MainActivity.this);
                    } catch (Exception ignored2) {
                        // روش جایگزین: به‌روزرسانی پارامترها برای ترغیب خروج (در صورت پشتیبانی)
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                                builder.setAspectRatio(new Rational(16, 9));
                                setPictureInPictureParams(builder.build());
                            }
                        } catch (Exception ignored3) {
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void startPlayback(String type) {
            startPlaybackWithTitle(type, null);
        }

        @JavascriptInterface
        public void startPlayback(String type, String title) {
            startPlaybackWithTitle(type, title);
        }

        private void startPlaybackWithTitle(String type, String title) {
            try {
                Intent i = new Intent(MainActivity.this, PlaybackService.class);
                i.setAction(PlaybackService.ACTION_START);
                i.putExtra("type", type == null ? "video" : type);
                if (title != null && !title.isEmpty()) i.putExtra("title", title);
                if (Build.VERSION.SDK_INT >= 26) {
                    startForegroundService(i);
                } else {
                    startService(i);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void stopPlayback() {
            try {
                Intent i = new Intent(MainActivity.this, PlaybackService.class);
                i.setAction(PlaybackService.ACTION_STOP);
                startService(i);
            } catch (Exception ignored) {
            }
        }

        // ══ پلیر جدید پس‌زمینه: متادیتا و وضعیت پخش از وب → سرویس ══

        @JavascriptInterface
        public void updateMediaMeta(String title, String artist, String album, String artworkUrl, double durationMs) {
            try {
                Intent i = new Intent(MainActivity.this, PlaybackService.class);
                i.setAction(PlaybackService.ACTION_UPDATE_META);
                i.putExtra("title", title == null ? "" : title);
                i.putExtra("artist", artist == null ? "" : artist);
                i.putExtra("album", album == null ? "" : album);
                i.putExtra("artworkUrl", artworkUrl == null ? "" : artworkUrl);
                if (durationMs > 0) i.putExtra("durationMs", (long) durationMs);
                i.putExtra("isVideo", true);
                i.putExtra("noFg", true);
                startPlaybackServiceCompat(i);
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void setMediaPlaying(boolean playing, double positionMs, double durationMs) {
            try {
                Intent i = new Intent(MainActivity.this, PlaybackService.class);
                i.setAction(PlaybackService.ACTION_UPDATE_STATE);
                i.putExtra("playing", playing);
                i.putExtra("positionMs", (long) positionMs);
                if (durationMs > 0) i.putExtra("durationMs", (long) durationMs);
                i.putExtra("isVideo", true);
                i.putExtra("noFg", true);
                startPlaybackServiceCompat(i);
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void setVideoPlaying(boolean playing) {
            videoPlaying = playing;
            updatePipParams();
        }

        // متادیتای صوت برای نوتیفیکیشن پخش پس‌زمینه (بدون isVideo → نوتیفیکیشن صوت ساخته می‌شود)
        @JavascriptInterface
        public void updateAudioMeta(String title, String artist, String album, String artworkUrl, double durationMs) {
            try {
                Intent i = new Intent(MainActivity.this, PlaybackService.class);
                i.setAction(PlaybackService.ACTION_UPDATE_META);
                i.putExtra("title", title == null ? "" : title);
                i.putExtra("artist", artist == null ? "" : artist);
                i.putExtra("album", album == null ? "" : album);
                i.putExtra("artworkUrl", artworkUrl == null ? "" : artworkUrl);
                if (durationMs > 0) i.putExtra("durationMs", (long) durationMs);
                startPlaybackServiceCompat(i);
            } catch (Exception ignored) {
            }
        }

        // وضعیت پخش صوت برای نوتیفیکیشن پخش پس‌زمینه (بدون isVideo)
        @JavascriptInterface
        public void setAudioPlaying(boolean playing, double positionMs, double durationMs) {
            try {
                Intent i = new Intent(MainActivity.this, PlaybackService.class);
                i.setAction(PlaybackService.ACTION_UPDATE_STATE);
                i.putExtra("playing", playing);
                i.putExtra("positionMs", (long) positionMs);
                if (durationMs > 0) i.putExtra("durationMs", (long) durationMs);
                startPlaybackServiceCompat(i);
            } catch (Exception ignored) {
            }
        }

        // متادیتای ویدیو برای مینی‌پلیر PiP (عنوان + ابعاد واقعی برای نسبت تصویر)
        @JavascriptInterface
        public void setVideoMeta(String title, double width, double height) {
            if (title != null && !title.isEmpty()) pipTitle = title;
            if (width > 8 && height > 8) {
                pipVideoW = (int) width;
                pipVideoH = (int) height;
            }
            updatePipParams();
        }

        // ══ پلیر نیتیو اسپاتیفای‌مانند: فرمان از وب → سرویس ══
        @JavascriptInterface
        public void nativeCommand(String json) {
            try {
                Intent i = new Intent(MainActivity.this, PlaybackService.class);
                i.setAction(PlaybackService.ACTION_NATIVE_CMD);
                i.putExtra("json", json == null ? "" : json);
                // فرمان‌های ویدیویی: کوتاه و بدون نوتیفیکیشن
                String cmd = "";
                try {
                    cmd = new org.json.JSONObject(json == null ? "{}" : json).optString("cmd", "");
                } catch (Exception ignored) {
                }
                if (cmd.startsWith("v") || cmd.equals("vstop")) {
                    i.putExtra("isVideo", true);
                    i.putExtra("noFg", true);
                }
                startPlaybackServiceCompat(i);
            } catch (Exception ignored) {
            }
        }

        // وضعیت فعلی پلیر نیتیو برای بازیابی UI بعد از بازگشایی اپ
        @JavascriptInterface
        public String getNativeState() {
            return PlaybackService.getSnapshotJson();
        }

        private void startPlaybackServiceCompat(Intent i) {
            // ویدیو (noFg): سرویس بدون نوتیفیکیشن — از startService معمولی استفاده کن
            boolean fg = !i.getBooleanExtra("noFg", false);
            if (Build.VERSION.SDK_INT >= 26 && fg) {
                startForegroundService(i);
            } else {
                startService(i);
            }
        }

        // ══ پلیر شناور نیتیو ویدیو (مثل یوتیوب) ══

        @JavascriptInterface
        public void floatingVideoCommand(String json) {
            try {
                Intent i = new Intent(MainActivity.this, PlaybackService.class);
                i.setAction(PlaybackService.ACTION_NATIVE_CMD);
                i.putExtra("json", json == null ? "" : json);
                startPlaybackServiceCompat(i);
            } catch (Exception ignored) {
            }
        }

        // ══ مینی‌پلیر نیتیو PiP: پخش ویدیو در پس‌زمینه — فقط ویدیو، بدون هیچ دکمه/المان ══
        @JavascriptInterface
        public void enterVideoPip(String json) {
            try {
                org.json.JSONObject o = new org.json.JSONObject(json == null ? "{}" : json);
                String url = o.optString("url", "");
                String t = o.optString("title", "پخش ویدیو");
                long pos = o.optLong("positionMs", 0);
                int w = o.optInt("width", 16);
                int h = o.optInt("height", 9);
                // فقط یک پنجره PiP در هر لحظه — اگر باز است، همان با ویدیوی جدید به‌روزرسانی شود
                PipActivity existing = PipActivity.instance;
                if (existing != null && !existing.isFinishing()) {
                    existing.updateVideo(url, t, pos, w, h);
                    return;
                }
                Intent i = new Intent(MainActivity.this, PipActivity.class);
                i.putExtra(PipActivity.EXTRA_URL, url);
                i.putExtra(PipActivity.EXTRA_TITLE, t);
                i.putExtra(PipActivity.EXTRA_POSITION, pos);
                i.putExtra(PipActivity.EXTRA_WIDTH, w);
                i.putExtra(PipActivity.EXTRA_HEIGHT, h);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public boolean canDrawOverlays() {
            return SettingsOverlay.canDrawOverlays(MainActivity.this);
        }

        @JavascriptInterface
        public void requestOverlayPermission() {
            SettingsOverlay.openSettings(MainActivity.this);
        }

        @JavascriptInterface
        public void sendMediaCommand(String cmd) {
            try {
                Bridge b = staticBridge != null ? staticBridge : getBridge();
                WebView wv = b != null ? b.getWebView() : null;
                if (wv != null) {
                    wv.post(() -> wv.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('mahfel-media-command',{detail:'" + cmd + "'}))",
                            null));
                }
            } catch (Exception ignored) {
            }
        }

        // درخواست مجوز نوتیفیکیشن در لحظه شروع پخش (نه فقط هنگام اجرای اپ)
        @JavascriptInterface
        public void requestNotificationPermission() {
            handler.post(() -> {
                if (Build.VERSION.SDK_INT >= 33 &&
                        checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    try {
                        ActivityCompat.requestPermissions(MainActivity.this,
                                new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        // معافیت از بهینه‌سازی باتری — بدون آن گوشی‌های واقعی (شیائومی/سامسونگ/...) سرویس پخش را می‌کشند
        @JavascriptInterface
        public void requestBatteryOptimizationExemption() {
            handler.post(() -> {
                try {
                    android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
                    if (pm == null) return;
                    String pkg = getPackageName();
                    if (Build.VERSION.SDK_INT >= 23 && !pm.isIgnoringBatteryOptimizations(pkg)) {
                        try {
                            Intent i = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                            i.setData(android.net.Uri.parse("package:" + pkg));
                            startActivity(i);
                        } catch (Exception ignored) {
                        }
                    }
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public void showNotification(String title, String body) {
            showNotificationWithLink(title, body, null);
        }

        // ══ دانلود و نصب APK: progress به وب → دیالوگ نصب → FileProvider/ACTION_VIEW ══
        @JavascriptInterface
        public void downloadAndInstallApk(final String url) {
            handler.post(() -> startApkDownload(url));
        }

        // وقتی صفحه «ورود کد تایید» باز می‌شود: رسیور پیامک را فعال کن
        // (اگر مجوز پیامک از قبل فعال باشد کار می‌کند؛ در اندروید ۱۴+ بدون مجوز دستی ممکن نیست)
        @JavascriptInterface
        public boolean startOtpAutofill() {
            handler.post(() -> registerSmsReceiver());
            return true;
        }

        @JavascriptInterface
        public void showNotification(String title, String body, String link) {
            showNotificationWithLink(title, body, link);
        }

        private void showNotificationWithLink(String title, String body, String link) {
            try {
                if (Build.VERSION.SDK_INT >= 33 &&
                        checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestNotificationPermissionIfNeeded();
                    return;
                }
                Intent intent = new Intent(MainActivity.this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (link != null && !link.isEmpty()) intent.putExtra("notifLink", link);
                int reqCode = link != null && !link.isEmpty() ? link.hashCode() : 0;
                PendingIntent pi = PendingIntent.getActivity(MainActivity.this, reqCode, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                NotificationManagerCompat nm = NotificationManagerCompat.from(MainActivity.this);
                if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("mahfel_notifications") == null) {
                    NotificationChannel ch = new NotificationChannel("mahfel_notifications", "اعلان‌های محفل", NotificationManager.IMPORTANCE_HIGH);
                    getSystemService(NotificationManager.class).createNotificationChannel(ch);
                }
                NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, "mahfel_notifications")
                        .setSmallIcon(R.drawable.ic_notification)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setContentIntent(pi);
                if (nm.areNotificationsEnabled()) {
                    nm.notify(reqCode == 0 ? (int) (System.currentTimeMillis() % 10000) : reqCode, builder.build());
                }
            } catch (Exception ignored) {
            }
        }
    }
}
