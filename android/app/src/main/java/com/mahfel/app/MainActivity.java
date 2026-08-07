package com.mahfel.app;

import android.Manifest;
import android.app.PictureInPictureParams;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private static final long LOAD_TIMEOUT_MS = 15000;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean pageLoaded = false;
    private boolean errorOverlayVisible = false;
    private boolean vpnWarningShown = false;
    private LinearLayout overlay;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestNotificationPermissionIfNeeded();
        handler.post(this::setupWebView);
        showVpnWarningIfConnected();
    }

    private void setupWebView() {
        WebView wv = getBridge().getWebView();
        if (wv == null) return;

        final WebViewClientImpl client = new WebViewClientImpl();
        wv.setWebViewClient(client);
        wv.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        handler.postDelayed(() -> {
            if (!pageLoaded && !errorOverlayVisible) {
                showErrorOverlay("مشکلی در اتصال به وجود آمد",
                        "بارگذاری صفحه بیش از حد طول کشید.\nاینترنت یا شبکه خود را بررسی کنید و دوباره تلاش کنید.",
                        true);
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
            if (!errorOverlayVisible) {
                pageLoaded = false;
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            pageLoaded = true;
            if (errorOverlayVisible) hideOverlay();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request != null && request.isForMainFrame()) {
                pageLoaded = false;
                showErrorOverlay("خطا در اتصال به سرور",
                        "امکان دسترسی به سایت وجود ندارد.\nاینترنت خود را بررسی کنید یا دوباره تلاش کنید.",
                        true);
            }
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            super.onReceivedError(view, errorCode, description, failingUrl);
            pageLoaded = false;
            showErrorOverlay("خطا در اتصال به سرور",
                    "امکان دسترسی به سایت وجود ندارد.\nاینترنت خود را بررسی کنید یا دوباره تلاش کنید.",
                    true);
        }
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
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
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

    private class AndroidBridge {
        @JavascriptInterface
        public boolean isApp() {
            return true;
        }

        @JavascriptInterface
        public void startPlayback(String type) {
            Intent intent = new Intent(MainActivity.this, AudioPlaybackService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }
        }

        @JavascriptInterface
        public void stopPlayback() {
            stopService(new Intent(MainActivity.this, AudioPlaybackService.class));
        }

        @JavascriptInterface
        public void enterPip() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                    builder.setAspectRatio(new Rational(16, 9));
                    enterPictureInPictureMode(builder.build());
                } catch (Exception ignored) {
                }
            }
        }

        @JavascriptInterface
        public void showNotification(String title, String body) {
            try {
                if (Build.VERSION.SDK_INT >= 33 &&
                        checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestNotificationPermissionIfNeeded();
                    return;
                }
                Intent intent = new Intent(MainActivity.this, MainActivity.class);
                PendingIntent pi = PendingIntent.getActivity(MainActivity.this, 0, intent, PendingIntent.FLAG_IMMUTABLE);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, AudioPlaybackService.CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_notification)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setContentIntent(pi);
                NotificationManagerCompat nm = NotificationManagerCompat.from(MainActivity.this);
                if (nm.areNotificationsEnabled()) {
                    nm.notify((int) (System.currentTimeMillis() % 10000), builder.build());
                }
            } catch (Exception ignored) {
            }
        }
    }
}
