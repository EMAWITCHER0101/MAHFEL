package com.mahfel.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.PixelFormat;
import android.graphics.SurfaceTexture;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/**
 * پلیر شناور نیتیو ویدیو — دقیقاً مثل یوتیوب.
 *
 * یک پنجره شناور روی همه اپ‌ها (SYSTEM_ALERT_WINDOW) که خود اندروید ویدیو را با
 * MediaPlayer پخش می‌کند — کاملاً مستقل از WebView/وب. دارای:
 *  - تایم‌لاین ویدیو (SeekBar قابل کشیدن)
 *  - دکمه‌های قبلی / پخش-توقف / بعدی
 *  - تمام‌صفحه (دکمه هدر) + بازگشت به پنجره کوچک
 *  - محو شدن خودکار هدر/کنترل بعد از چند ثانیه (با لمس دوباره ظاهر می‌شوند)
 *  - قابلیت جابه‌جایی با درگ
 */
public class FloatingVideoPlayer {

    private static FloatingVideoPlayer instance;

    private final Context context;
    private final WindowManager windowManager;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private View root;
    private View headerView;
    private View controlsView;
    private View videoArea;
    private TextureView textureView;
    private ImageView playPauseBtn;
    private ImageView prevBtn;
    private ImageView nextBtn;
    private ImageView expandBtn;
    private ImageView closeBtn;
    private SeekBar seekBar;
    private TextView currentTv;
    private TextView durationTv;
    private TextView titleTv;
    private ProgressBar bufferingBar;

    private MediaPlayer player;
    private Surface surface;
    private boolean surfaceReady = false;

    // صف ویدیوها (برای دکمه‌های قبلی/بعدی) — ارسال از وب
    private final List<VideoItem> queue = new ArrayList<>();
    private int queueIndex = -1;

    private boolean isPlaying = false;
    private boolean isDraggingSeek = false;
    private boolean fullscreen = false;
    private boolean shown = false;

    // ابعاد پنجره
    private int windowWidth;
    private int frameHeight;

    // هدر/کنترل محو شونده
    private final Runnable hideChromeRunnable = this::hideChrome;
    private static final long CHROME_TIMEOUT_MS = 3000;

    public static class VideoItem {
        public String url;
        public String title;
    }

    public static FloatingVideoPlayer get(Context context) {
        if (instance == null) {
            instance = new FloatingVideoPlayer(context.getApplicationContext());
        }
        return instance;
    }

    private FloatingVideoPlayer(Context ctx) {
        this.context = ctx;
        this.windowManager = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
    }

    /* ============ نمایش پنجره ============ */

    @SuppressLint("InflateParams")
    public boolean show() {
        if (shown) return true;
        try {
            if (!SettingsOverlay.canDrawOverlays(context)) return false;

            LayoutInflater inflater = LayoutInflater.from(context);
            root = inflater.inflate(R.layout.floating_video_player, null);

            headerView = root.findViewById(R.id.floating_header);
            controlsView = root.findViewById(R.id.floating_controls);
            videoArea = root.findViewById(R.id.floating_video_area);
            textureView = root.findViewById(R.id.floating_texture);
            playPauseBtn = root.findViewById(R.id.floating_playpause);
            prevBtn = root.findViewById(R.id.floating_prev);
            nextBtn = root.findViewById(R.id.floating_next);
            expandBtn = root.findViewById(R.id.floating_expand);
            closeBtn = root.findViewById(R.id.floating_close);
            seekBar = root.findViewById(R.id.floating_seek);
            currentTv = root.findViewById(R.id.floating_current);
            durationTv = root.findViewById(R.id.floating_duration);
            titleTv = root.findViewById(R.id.floating_title);
            bufferingBar = root.findViewById(R.id.floating_buffering);

            setupTexture();
            setupControls();
            setupDrag();

            // عرض ۲۳۰dp — قاب ویدیو (۱۴۰) + هدر (۴۲) + کنترل (۱۱۲) → پنجره شناور کوچک
            windowWidth = dp(230);
            frameHeight = dp(140);

            int type = Build.VERSION.SDK_INT >= 26
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE;
            @SuppressLint("WrongConstant") WindowManager.LayoutParams params =
                    new WindowManager.LayoutParams(
                            windowWidth,
                            dp(140) + dp(42) + dp(112),
                            type,
                            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                                    | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                            PixelFormat.TRANSLUCENT);
            params.gravity = Gravity.TOP | Gravity.END;
            params.x = 0;
            params.y = dp(100);

            windowManager.addView(root, params);
            shown = true;
            showChrome();
            return true;
        } catch (Exception e) {
            shown = false;
            return false;
        }
    }

    public void dismiss() {
        if (!shown) return;
        try {
            stopInternal();
            windowManager.removeView(root);
        } catch (Exception ignored) {
        }
        shown = false;
        root = null;
    }

    /* ============ تمام‌صفحه ============ */

    /** تغییر حالت تمام‌صفحه (ویدیو کل صفحه) — مثل یوتیوب */
    public void toggleFullscreen() {
        if (root == null || !shown) return;
        try {
            WindowManager.LayoutParams lp =
                    (WindowManager.LayoutParams) root.getLayoutParams();
            if (!fullscreen) {
                // ذخیره وضعیت فعلی
                fullscreen = true;
                lp.width = WindowManager.LayoutParams.MATCH_PARENT;
                lp.height = WindowManager.LayoutParams.MATCH_PARENT;
                lp.x = 0;
                lp.y = 0;
                windowManager.updateViewLayout(root, lp);
                // هدر و کنترل روی ویدیو شناور می‌مانند؛ ویدیو کل صفحه
                ViewGroup.LayoutParams al = videoArea.getLayoutParams();
                al.width = ViewGroup.LayoutParams.MATCH_PARENT;
                al.height = ViewGroup.LayoutParams.MATCH_PARENT;
                videoArea.setLayoutParams(al);
                showChrome();
            } else {
                fullscreen = false;
                lp.width = windowWidth;
                lp.height = frameHeight + dp(42) + dp(112);
                lp.x = 0;
                lp.y = dp(100);
                windowManager.updateViewLayout(root, lp);
                ViewGroup.LayoutParams al = videoArea.getLayoutParams();
                al.width = ViewGroup.LayoutParams.MATCH_PARENT;
                al.height = ViewGroup.LayoutParams.MATCH_PARENT;
                videoArea.setLayoutParams(al);
                showChrome();
            }
            handler.postDelayed(this::applyLetterbox, 120);
        } catch (Exception ignored) {
        }
    }

    public boolean isFullscreen() {
        return fullscreen;
    }

    /* ============ هدر/کنترل محو شونده ============ */

    /** نمایش هدر و کنترل — و زمان‌بندی محو شدن بعد از ۳ ثانیه */
    private void showChrome() {
        if (headerView == null || controlsView == null) return;
        headerView.setVisibility(View.VISIBLE);
        controlsView.setVisibility(View.VISIBLE);
        headerView.setAlpha(1f);
        controlsView.setAlpha(1f);
        handler.removeCallbacks(hideChromeRunnable);
        handler.postDelayed(hideChromeRunnable, CHROME_TIMEOUT_MS);
    }

    /** محو کردن آرام هدر و کنترل (فقط در حال پخش — هنگام توقف همیشه نمایان) */
    private void hideChrome() {
        if (headerView == null || controlsView == null || !shown) return;
        if (!isPlaying) return;
        if (isDraggingSeek) {
            handler.postDelayed(hideChromeRunnable, CHROME_TIMEOUT_MS);
            return;
        }
        try {
            headerView.animate().alpha(0f).setDuration(350).start();
            controlsView.animate().alpha(0f).setDuration(350).start();
        } catch (Exception ignored) {
        }
    }

    /** لمس ویدیو → نمایش مجدد کنترل‌ها */
    private void pokeChrome() {
        if (headerView == null || controlsView == null) return;
        headerView.setAlpha(1f);
        controlsView.setAlpha(1f);
        headerView.setVisibility(View.VISIBLE);
        controlsView.setVisibility(View.VISIBLE);
        handler.removeCallbacks(hideChromeRunnable);
        handler.postDelayed(hideChromeRunnable, CHROME_TIMEOUT_MS);
    }

    /* ============ TextureView / MediaPlayer ============ */

    private void setupTexture() {
        textureView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
            @Override
            public void onSurfaceTextureAvailable(SurfaceTexture st, int width, int height) {
                surface = new Surface(st);
                surfaceReady = true;
                if (player != null) {
                    player.setSurface(surface);
                }
                applyLetterbox();
            }

            @Override
            public void onSurfaceTextureSizeChanged(SurfaceTexture st, int width, int height) {
                handler.postDelayed(FloatingVideoPlayer.this::applyLetterbox, 60);
            }

            @Override
            public boolean onSurfaceTextureDestroyed(SurfaceTexture st) {
                surfaceReady = false;
                if (surface != null) {
                    surface.release();
                    surface = null;
                }
                return true;
            }

            @Override
            public void onSurfaceTextureUpdated(SurfaceTexture st) {
            }
        });
    }

    private MediaPlayer createPlayer() {
        releasePlayer();
        MediaPlayer mp = new MediaPlayer();
        try {
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                    .build());
            mp.setOnPreparedListener(p -> {
                bufferingBar.setVisibility(View.GONE);
                if (surface != null) p.setSurface(surface);
                // نسبت تصویر واقعی ویدیو → ابعاد قاب تنظیم می‌شود تا کشیده/افقی نباشد
                try {
                    int vw = p.getVideoWidth();
                    int vh = p.getVideoHeight();
                    if (vw > 0 && vh > 0) adjustWindowAspect(vw, vh);
                } catch (Exception ignored) {
                }
                p.start();
                isPlaying = true;
                updatePlayPauseIcon();
                int dur = p.getDuration();
                if (dur > 0) durationTv.setText(formatTime(dur));
                handler.post(ticker);
                showChrome();
            });
            // تغییر زنده اندازه ویدیو (بعضی استریم‌ها بعد از prepare ابعاد را می‌فرستند)
            if (android.os.Build.VERSION.SDK_INT >= 21) {
                try {
                    mp.setOnVideoSizeChangedListener((p, width, height) -> {
                        if (width > 0 && height > 0) {
                            try {
                                adjustWindowAspect(width, height);
                            } catch (Exception ignored) {
                            }
                        }
                    });
                } catch (Exception ignored) {
                }
            }
            mp.setOnBufferingUpdateListener((p, percent) -> {
                if (percent < 100 && !isPlaying) {
                    bufferingBar.setVisibility(View.VISIBLE);
                }
            });
            mp.setOnInfoListener((p, what, extra) -> {
                if (what == MediaPlayer.MEDIA_INFO_BUFFERING_START) {
                    bufferingBar.setVisibility(View.VISIBLE);
                } else if (what == MediaPlayer.MEDIA_INFO_BUFFERING_END) {
                    bufferingBar.setVisibility(View.GONE);
                }
                return false;
            });
            mp.setOnCompletionListener(p -> next());
            mp.setOnErrorListener((p, what, extra) -> {
                bufferingBar.setVisibility(View.GONE);
                next();
                return true;
            });
        } catch (Exception ignored) {
        }
        return mp;
    }

    private void releasePlayer() {
        handler.removeCallbacks(ticker);
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
            }
            try {
                player.release();
            } catch (Exception ignored) {
            }
            player = null;
        }
        isPlaying = false;
    }

    /* ============ کنترل پخش ============ */

    /** @return true اگر پنجره شناور با موفقیت باز شد و پخش شروع شد */
    public boolean playVideo(String url, String title, int index) {
        if (!shown && !show()) {
            // بدون مجوز overlay → به وب اطلاع بده که PiP استاندارد استفاده شود
            dispatchToWeb("no-overlay");
            return false;
        }
        if (title != null && !title.isEmpty()) titleTv.setText(title);

        queueIndex = index;
        bufferingBar.setVisibility(View.VISIBLE);
        player = createPlayer();
        try {
            player.setDataSource(url);
            if (surfaceReady && surface != null) {
                player.setSurface(surface);
            }
            player.prepareAsync();
            return true;
        } catch (Exception e) {
            bufferingBar.setVisibility(View.GONE);
            return false;
        }
    }

    public void setQueue(List<VideoItem> items, int index) {
        queue.clear();
        if (items != null) queue.addAll(items);
        queueIndex = index;
    }

    public void pause() {
        if (player != null && isPlaying) {
            try {
                player.pause();
            } catch (Exception ignored) {
            }
            isPlaying = false;
            updatePlayPauseIcon();
            handler.removeCallbacks(ticker);
            // هنگام توقف کنترل‌ها همیشه نمایان بمانند
            if (headerView != null) {
                headerView.setAlpha(1f);
                headerView.setVisibility(View.VISIBLE);
            }
            if (controlsView != null) {
                controlsView.setAlpha(1f);
                controlsView.setVisibility(View.VISIBLE);
            }
            handler.removeCallbacks(hideChromeRunnable);
        }
    }

    public void resume() {
        if (player != null && !isPlaying) {
            try {
                player.start();
            } catch (Exception ignored) {
            }
            isPlaying = true;
            updatePlayPauseIcon();
            handler.post(ticker);
            showChrome();
        }
    }

    public void togglePlayPause() {
        if (isPlaying) {
            pause();
        } else {
            resume();
        }
    }

    public void seekTo(int ms) {
        if (player != null) {
            try {
                player.seekTo(ms);
            } catch (Exception ignored) {
            }
        }
    }

    public void next() {
        if (queue.isEmpty() || queueIndex < 0) return;
        int ni = queueIndex + 1;
        if (ni >= queue.size()) {
            // مثل یوتیوب: به اول لیست برگرد
            ni = 0;
        }
        queueIndex = ni;
        VideoItem item = queue.get(ni);
        playVideo(item.url, item.title, ni);
        // به وب برای همگام‌سازی UI
        dispatchToWeb("track:" + ni);
    }

    public void prev() {
        if (queue.isEmpty() || queueIndex < 0) return;
        int pi = queueIndex - 1;
        if (pi < 0) {
            // مثل یوتیوب: به آخر لیست برگرد
            pi = queue.size() - 1;
        }
        queueIndex = pi;
        VideoItem item = queue.get(pi);
        playVideo(item.url, item.title, pi);
        dispatchToWeb("track:" + pi);
    }

    public void stop() {
        stop(0);
    }

    /** توقف پخش و بازگرداندن وضعیت به وب — positionMs: جای دقیق پخش برای ادامه در صفحه وب */
    public void stop(long positionMs) {
        stopInternal();
        dismiss();
        dispatchToWeb("stop" + (positionMs > 0 ? ":" + positionMs : ""));
    }

    private void stopInternal() {
        handler.removeCallbacks(ticker);
        handler.removeCallbacks(hideChromeRunnable);
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
            }
            try {
                player.release();
            } catch (Exception ignored) {
            }
            player = null;
        }
        isPlaying = false;
    }

    /** قاب ویدیو را با نسبت تصویر واقعی ویدیو هماهنگ می‌کند (حداکثر 16:9 — عمودی/مربعی هم درست نمایش داده می‌شود) */
    private void adjustWindowAspect(int vw, int vh) {
        if (vw <= 0 || vh <= 0 || root == null || fullscreen) return;
        try {
            // نسبت تصویر ویدیو (سقف 16:9 تا پنجره خیلی بلند نشود)
            float ratio = (float) vw / vh;
            float maxRatio = 16f / 9f;
            if (ratio > maxRatio) ratio = maxRatio;
            int newFrame = Math.max(dp(84), Math.round(windowWidth / ratio));
            if (newFrame == frameHeight) return;
            frameHeight = newFrame;

            WindowManager.LayoutParams lp =
                    (WindowManager.LayoutParams) root.getLayoutParams();
            lp.height = frameHeight + dp(42) + dp(112);
            windowManager.updateViewLayout(root, lp);
            // گوشه‌های گرد بعد از تغییر اندازه حفظ شوند
            try {
                videoArea.setClipToOutline(true);
                videoArea.setOutlineProvider(android.view.ViewOutlineProvider.BACKGROUND);
            } catch (Exception ignored) {
            }
        } catch (Exception ignored) {
        }
        handler.postDelayed(this::applyLetterbox, 100);
    }

    /** ویدیو را بدون کشیدگی داخل قاب نشان می‌دهد (نوارهای سیاه برای نسبت‌های دیگر) */
    private void applyLetterbox() {
        if (textureView == null || player == null || !shown) return;
        try {
            int vw = player.getVideoWidth();
            int vh = player.getVideoHeight();
            if (vw <= 0 || vh <= 0) return;
            int tw = textureView.getWidth();
            int th = textureView.getHeight();
            if (tw <= 0 || th <= 0) return;

            float videoRatio = (float) vw / vh;
            float viewRatio = (float) tw / th;
            android.graphics.Matrix m = new android.graphics.Matrix();
            float scale;
            if (videoRatio > viewRatio) {
                // ویدیو عریض‌تر از قاب → عرض را پر کن
                scale = (float) tw / vw;
                float newH = vh * scale;
                m.postTranslate(0, (th - newH) / 2f);
            } else {
                // ویدیو بلندتر از قاب → ارتفاع را پر کن
                scale = (float) th / vh;
                float newW = vw * scale;
                m.postTranslate((tw - newW) / 2f, 0);
            }
            m.postScale(scale, scale);
            textureView.setTransform(m);
        } catch (Exception ignored) {
        }
    }

    public boolean isShown() {
        return shown;
    }

    public boolean isPlaying() {
        return isPlaying;
    }

    /* ============ تایم‌لاین ============ */

    private final Runnable ticker = new Runnable() {
        @Override
        public void run() {
            if (player == null) return;
            try {
                int pos = player.getCurrentPosition();
                int dur = player.getDuration();
                if (dur > 0) {
                    if (!isDraggingSeek) {
                        seekBar.setProgress((int) ((long) pos * 1000 / dur));
                    }
                    currentTv.setText(formatTime(pos));
                    durationTv.setText(formatTime(dur));
                }
            } catch (Exception ignored) {
            }
            handler.postDelayed(this, 500);
        }
    };

    private String formatTime(int ms) {
        int totalSec = ms / 1000;
        int h = totalSec / 3600;
        int m = (totalSec % 3600) / 60;
        int s = totalSec % 60;
        if (h > 0) {
            return String.format(java.util.Locale.US, "%d:%02d:%02d", h, m, s);
        }
        return String.format(java.util.Locale.US, "%02d:%02d", m, s);
    }

    /* ============ کنترل‌ها ============ */

    private void setupControls() {
        playPauseBtn.setOnClickListener(v -> {
            togglePlayPause();
            pokeChrome();
        });
        prevBtn.setOnClickListener(v -> {
            prev();
            pokeChrome();
        });
        nextBtn.setOnClickListener(v -> {
            next();
            pokeChrome();
        });

        closeBtn.setOnClickListener(v -> {
            stopInternal();
            dismiss();
            dispatchToWeb("stop");
        });

        expandBtn.setOnClickListener(v -> {
            toggleFullscreen();
            pokeChrome();
        });

        // لمس روی ویدیو → نمایش مجدد کنترل‌ها (مثل یوتیوب)
        videoArea.setOnClickListener(v -> pokeChrome());
        textureView.setOnClickListener(v -> pokeChrome());

        seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar sb, int progress, boolean fromUser) {
                if (fromUser && player != null) {
                    try {
                        long dur = player.getDuration();
                        if (dur > 0) {
                            int ms = (int) (dur * progress / 1000L);
                            currentTv.setText(formatTime(ms));
                        }
                    } catch (Exception ignored) {
                    }
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar sb) {
                isDraggingSeek = true;
            }

            @Override
            public void onStopTrackingTouch(SeekBar sb) {
                isDraggingSeek = false;
                if (player != null) {
                    try {
                        long dur = player.getDuration();
                        if (dur > 0) {
                            int ms = (int) (dur * sb.getProgress() / 1000L);
                            player.seekTo(ms);
                            currentTv.setText(formatTime(ms));
                        }
                    } catch (Exception ignored) {
                    }
                }
                pokeChrome();
            }
        });
    }

    /** بزرگ‌کردن: بازگشت به اپ (بستن پنجره شناور) — موقعیت فعلی پخش به وب فرستاده می‌شود تا از همان‌جا ادامه دهد */
    public void expand() {
        int pos = 0;
        if (player != null) {
            try {
                pos = player.getCurrentPosition();
            } catch (Exception ignored) {
            }
        }
        stopInternal();
        dismiss();
        dispatchToWeb("expand:" + pos);
    }

    /* ============ درگ برای جابه‌جایی ============ */

    private void setupDrag() {
        // درگ فقط از روی هدر (بدون تداخل با دکمه‌ها) — مثل یوتیوب
        final float[] lastTouch = new float[2];
        headerView.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN
                    && event.getRawX() > headerView.getWidth() - dp(90)) {
                // لمس روی دکمه‌های بستن/تمام‌صفحه → درگ نکن
                return false;
            }
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    lastTouch[0] = event.getRawX();
                    lastTouch[1] = event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE: {
                    try {
                        WindowManager.LayoutParams lp =
                                (WindowManager.LayoutParams) root.getLayoutParams();
                        float dx = event.getRawX() - lastTouch[0];
                        float dy = event.getRawY() - lastTouch[1];
                        lp.x += (int) dx;
                        lp.y += (int) dy;
                        lastTouch[0] = event.getRawX();
                        lastTouch[1] = event.getRawY();
                        windowManager.updateViewLayout(root, lp);
                    } catch (Exception ignored) {
                    }
                    return true;
                }
                case MotionEvent.ACTION_UP:
                    pokeChrome();
                    return true;
            }
            return false;
        });
    }

    private void updatePlayPauseIcon() {
        playPauseBtn.setImageResource(isPlaying ? R.drawable.ic_media_pause : R.drawable.ic_media_play);
    }

    private int dp(int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    /* ============ ارتباط با وب ============ */

    private void dispatchToWeb(String cmd) {
        try {
            com.getcapacitor.Bridge b = MainActivity.staticBridge;
            if (b == null) return;
            android.webkit.WebView wv = b.getWebView();
            if (wv != null) {
                wv.post(() -> wv.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('mahfel-media-command',{detail:'" + cmd + "'}))",
                        null));
            }
        } catch (Exception ignored) {
        }
    }
}
