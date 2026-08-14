package com.mahfel.app;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.VideoView;

/** مینی‌پلیر نیتیو PiP برای پخش ویدیو در پس‌زمینه — فقط ویدیو، بدون هیچ دکمه/المان */
public class PipActivity extends Activity {

    public static final String EXTRA_URL = "url";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_POSITION = "positionMs";
    public static final String EXTRA_WIDTH = "w";
    public static final String EXTRA_HEIGHT = "h";

    /** نمونه زنده فعالیت برای به‌روزرسانی همان پنجره PiP (فقط یک PiP در هر لحظه) */
    public static volatile PipActivity instance;

    private VideoView videoView;
    private boolean pipEntered = false;
    private String title = "پخش ویدیو";
    private int videoW = 16;
    private int videoH = 9;
    private long pendingPositionMs = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        videoView = new VideoView(this);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
        lp.gravity = Gravity.CENTER;
        root.addView(videoView, lp);
        setContentView(root);

        final String url = getIntent().getStringExtra(EXTRA_URL);
        pendingPositionMs = getIntent().getLongExtra(EXTRA_POSITION, 0);
        videoW = Math.max(1, getIntent().getIntExtra(EXTRA_WIDTH, 16));
        videoH = Math.max(1, getIntent().getIntExtra(EXTRA_HEIGHT, 9));
        title = getIntent().getStringExtra(EXTRA_TITLE);
        if (title == null || title.isEmpty()) title = "پخش ویدیو";
        if (url == null || url.isEmpty()) {
            finish();
            return;
        }

        // ورود فوری به PiP — بدون نمایش تمام‌صفحه سیاه
        enterPip();

        videoView.setVideoURI(Uri.parse(url));
        videoView.setOnPreparedListener(mp -> {
            try {
                mp.setScreenOnWhilePlaying(true);
                if (mp.getVideoWidth() > 0 && mp.getVideoHeight() > 0) {
                    videoW = mp.getVideoWidth();
                    videoH = mp.getVideoHeight();
                }
                if (pendingPositionMs > 0) videoView.seekTo((int) pendingPositionMs);
            } catch (Exception ignored) {
            }
            videoView.start();
            updatePipParams();
        });
        videoView.setOnErrorListener((mp, what, extra) -> {
            finish();
            return true;
        });
    }

    /** به‌روزرسانی پنجره PiP موجود با ویدیوی جدید — بدون باز کردن پنجره دوم */
    public void updateVideo(final String newUrl, final String newTitle, final long newPositionMs, final int w, final int h) {
        runOnUiThread(() -> {
            try {
                if (newUrl == null || newUrl.isEmpty()) return;
                if (newTitle != null && !newTitle.isEmpty()) title = newTitle;
                if (w > 8 && h > 8) {
                    videoW = w;
                    videoH = h;
                }
                pendingPositionMs = Math.max(0, newPositionMs);
                updatePipParams();
                videoView.stopPlayback();
                videoView.setVideoURI(Uri.parse(newUrl));
                videoView.start();
            } catch (Exception ignored) {
            }
        });
    }

    /** ارسال وضعیت به وب (play/pause/position) برای سینک با پلیر اپ */
    private void sendStateToWeb(String cmd) {
        try {
            long pos = (videoView != null) ? videoView.getCurrentPosition() : 0;
            Intent i = new Intent(this, PlaybackService.class);
            i.setAction(PlaybackService.ACTION_NATIVE_CMD);
            i.putExtra("json", "{\"cmd\":\"" + cmd + "\",\"positionMs\":" + pos + "}");
            if (Build.VERSION.SDK_INT >= 26) {
                startForegroundService(i);
            } else {
                startService(i);
            }
        } catch (Exception ignored) {
        }
    }

    private void enterPip() {
        if (pipEntered || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        pipEntered = true;
        try {
            PictureInPictureParams.Builder b = new PictureInPictureParams.Builder();
            b.setAspectRatio(new Rational(videoW, videoH));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try { b.setSeamlessResizeEnabled(true); } catch (Exception ignored) {}
                try {
                    PictureInPictureParams.Builder.class
                            .getMethod("setTitle", CharSequence.class)
                            .invoke(b, title);
                } catch (Exception ignored) {
                }
            }
            enterPictureInPictureMode(b.build());
        } catch (Exception ignored) {
        }
    }

    /** به‌روزرسانی زنده نسبت تصویر و عنوان پنجره PiP بعد از آماده‌شدن ویدیو */
    private void updatePipParams() {
        if (!pipEntered || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            PictureInPictureParams.Builder b = new PictureInPictureParams.Builder();
            b.setAspectRatio(new Rational(Math.max(1, videoW), Math.max(1, videoH)));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try { b.setSeamlessResizeEnabled(true); } catch (Exception ignored) {}
                try {
                    PictureInPictureParams.Builder.class
                            .getMethod("setTitle", CharSequence.class)
                            .invoke(b, title);
                } catch (Exception ignored) {
                }
            }
            setPictureInPictureParams(b.build());
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        enterPip();
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && pipEntered) {
            if (!isInPictureInPictureMode) {
                // خروج از PiP → برگشت به اپ — ابتدا position دقیق رو بفرست
                sendStateToWeb("vstop");
                try {
                    Intent i = new Intent(this, MainActivity.class);
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    startActivity(i);
                } catch (Exception ignored) {
                }
                finish();
            } else {
                // ورود به PiP → اطلاع به وب
                sendStateToWeb("pip-enter");
            }
        }
    }

    @Override
    public void onBackPressed() {
        sendStateToWeb("vstop");
        finish();
    }

    @Override
    protected void onDestroy() {
        if (instance == this) instance = null;
        try {
            long pos = 0;
            if (videoView != null) {
                pos = videoView.getCurrentPosition();
                videoView.stopPlayback();
                videoView = null;
            }
            Intent i = new Intent(this, PlaybackService.class);
            i.setAction(PlaybackService.ACTION_NATIVE_CMD);
            i.putExtra("json", "{\"cmd\":\"vstop\",\"positionMs\":" + pos + "}");
            if (Build.VERSION.SDK_INT >= 26) {
                startForegroundService(i);
            } else {
                startService(i);
            }
        } catch (Exception ignored) {
        }
        super.onDestroy();
    }
}