package com.mahfel.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * سرویس پیش‌زمینه پخش — «پلیر خفن» APK
 *
 * صدا: پخش نیتیو با MediaPlayer (handoff از WebView هنگام پس‌زمینه رفتن) → پخش حتی
 * بعد از کشته شدن اپ ادامه دارد (مثل اسپاتیفای). وضعیت در SharedPreferences ذخیره
 * می‌شود تا بعد از ری‌استارت سرویس، پخش از همان نقطه ادامه یابد.
 *
 * ویدیو: فقط رابط نوتیفیکیشن/کنترل (پخش واقعی در WebView با PiP انجام می‌شود).
 */
public class PlaybackService extends Service {

    public static final String CHANNEL_ID = "mahfel_playback";
    public static final String ACTION_START = "com.mahfel.app.START_PLAYBACK";
    public static final String ACTION_STOP = "com.mahfel.app.STOP_PLAYBACK";
    public static final String ACTION_CMD = "com.mahfel.app.CMD";
    public static final String ACTION_UPDATE_META = "com.mahfel.app.UPDATE_META";
    public static final String ACTION_UPDATE_STATE = "com.mahfel.app.UPDATE_STATE";
    public static final String ACTION_NATIVE_CMD = "com.mahfel.app.NATIVE_CMD";
    public static final String EXTRA_CMD = "cmd";

    private static final int NOTIF_ID = 1;
    private static final String PREFS = "mahfel_playback_state";
    private static final String KEY_URL = "url", KEY_POS = "pos", KEY_TITLE = "title",
            KEY_ARTIST = "artist", KEY_ART = "artwork", KEY_PODCAST = "podcastId", KEY_EP = "episodeIndex",
            KEY_IS_VIDEO = "isVideo";

    private MediaSessionCompat mediaSession;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean startedForeground = false;
    private int tickCounter = 0;

    // Audio focus برای پخش نیتیو (مثل اسپاتیفای: مکالمه/اپ دیگر → توقف خودکار)
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private boolean focusGranted = false;
    private boolean resumeAfterTransient = false;

    private String title = "محفل";
    private String artist = "سرای هنر و اندیشه";
    private String album = "";
    private String artworkUrl = "";
    private Bitmap artwork = null;
    private long durationMs = 0;
    private long positionMs = 0;
    private boolean isPlaying = false;
    private boolean isVideo = false;

    // پخش نیتیو صوتی (اسپاتیفای‌مانند)
    private MediaPlayer nativePlayer = null;
    private boolean nativeMode = false;
    private String audioUrl = "";
    private String podcastId = "";
    private int episodeIndex = -1;

    // لیست اپیزودها برای دکمه‌های next/prev نیتیو (بدون وابستگی به وب)
    private final java.util.List<org.json.JSONObject> queue = new java.util.ArrayList<>();
    private int queueIndex = -1;

    // وضعیت برای بریج وب (همگام‌سازی UI هنگام بازگشایی اپ)
    private static volatile String snapshotJson = "{}";

    private final Runnable positionUpdater = new Runnable() {
        @Override
        public void run() {
            if (!isPlaying) return;
            if (nativePlayer != null) {
                try { positionMs = nativePlayer.getCurrentPosition(); } catch (Exception ignored) {}
            } else if (durationMs > 0) {
                positionMs = Math.min(positionMs + 1000, durationMs);
            } else {
                positionMs += 1000;
            }
            if (++tickCounter % 10 == 0) saveState();
            updatePlaybackState();
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        setupMediaSession();
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // ری‌استارت سرویس بعد از کشته شدن اپ → ادامه پخش از وضعیت ذخیره‌شده (مثل اسپاتیفای)
        if (intent == null) {
            resumeFromSavedState();
            return START_STICKY;
        }

        String action = intent.getAction();

        if (ACTION_STOP.equals(action)) {
            doStop();
            return START_NOT_STICKY;
        }

        if (ACTION_CMD.equals(action)) {
            ensureForeground();
            handleCommand(intent.getStringExtra(EXTRA_CMD));
            return START_STICKY;
        }

        if (ACTION_NATIVE_CMD.equals(action)) {
            boolean vid = intent.getBooleanExtra("isVideo", isVideo);
            isVideo = vid;
            ensureForeground();
            handleNativeCommand(intent.getStringExtra("json"));
            // فرمان‌های ویدیو کوتاه‌اند (بستن PiP/ارسال وضعیت) — سرویس بدون نوتیفیکیشن بلافاصله تمام شود
            if (isVideo) {
                stopSelf();
                return START_NOT_STICKY;
            }
            return START_STICKY;
        }

        if (ACTION_UPDATE_META.equals(action)) {
            isVideo = intent.getBooleanExtra("isVideo", isVideo);
            ensureForeground();
            String t = intent.getStringExtra("title");
            String a = intent.getStringExtra("artist");
            String al = intent.getStringExtra("album");
            String art = intent.getStringExtra("artworkUrl");
            long dur = intent.getLongExtra("durationMs", 0);
            if (t != null && !t.isEmpty()) title = t;
            if (a != null && !a.isEmpty()) artist = a;
            if (al != null && !al.isEmpty()) album = al;
            if (dur > 0) durationMs = dur;
            if (art != null && !art.isEmpty() && !art.equals(artworkUrl)) {
                artworkUrl = art;
                loadArtwork(art);
            }
            updateMetadata();
            updatePlaybackState();
            if (isVideo) {
                stopSelf();
                return START_NOT_STICKY;
            }
            return START_STICKY;
        }

        if (ACTION_UPDATE_STATE.equals(action)) {
            // در حالت نیتیو وضعیت توسط پلیر نیتیو کنترل می‌شود؛ ورودی وب نادیده گرفته می‌شود
            if (nativeMode) return START_STICKY;
            isVideo = intent.getBooleanExtra("isVideo", isVideo);
            ensureForeground();
            boolean playing = intent.getBooleanExtra("playing", false);
            long pos = intent.getLongExtra("positionMs", -1);
            long dur = intent.getLongExtra("durationMs", -1);
            if (dur > 0) durationMs = dur;
            if (pos >= 0) positionMs = pos;
            setPlaying(playing);
            if (isVideo) {
                stopSelf();
                return START_NOT_STICKY;
            }
            return START_STICKY;
        }

        // ACTION_START (راه‌اندازی اولیه با نوع پخش)
        String type = intent.getStringExtra("type");
        isVideo = type != null && "video".equals(type);
        String t = intent.getStringExtra("title");
        if (t != null && !t.isEmpty()) title = t;
        if (isVideo) {
            artist = "پخش ویدیو در پس‌زمینه";
            updateMetadata();
            if (mediaSession != null) {
                mediaSession.setActive(false);
            }
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.cancel(NOTIF_ID);
            return START_STICKY;
        }
        updateMetadata();
        startForegroundCompat(buildNotification());
        return START_STICKY;
    }

    /* ---------- مدیریت دستورها ---------- */

    private void handleCommand(String cmd) {
        if (cmd == null) return;
        boolean fvpShown = isVideo && FloatingVideoPlayer.get(this).isShown();
        // در حالت نیتیو: پخش/توقف/پرش مستقیماً روی پلیر نیتیو (و همزمان اطلاع به وب)
        if ("play".equals(cmd)) {
            if (fvpShown) {
                // ویدیو در پلیر شناور → ادامه پخش
                FloatingVideoPlayer.get(this).resume();
                isPlaying = true;
                updatePlaybackState();
            } else if (nativePlayer != null) {
                try {
                    nativePlayer.start();
                    isPlaying = true;
                    nativeMode = true;
                    requestAudioFocus();
                    startPositionUpdater();
                    updatePlaybackState();
                } catch (Exception ignored) {
                }
            }
            dispatchToWeb("play");
            return;
        }
        if ("pause".equals(cmd)) {
            if (fvpShown) {
                // ویدیو در پلیر شناور → توقف
                FloatingVideoPlayer.get(this).pause();
                isPlaying = false;
                updatePlaybackState();
            } else if (nativePlayer != null) {
                pauseNative();
            }
            dispatchToWeb("pause");
            return;
        }
        if (cmd.startsWith("seekto:")) {
            try {
                long ms = Long.parseLong(cmd.substring(7));
                positionMs = ms;
                if (nativePlayer != null) {
                    try {
                        nativePlayer.seekTo((int) ms);
                    } catch (Exception ignored) {
                    }
                    updatePlaybackState();
                } else {
                    dispatchToWeb(cmd);
                }
            } catch (NumberFormatException ignored) {
            }
            return;
        }
        if ("seekback".equals(cmd) || "seekforward".equals(cmd)) { dispatchToWeb(cmd); return; }
        if ("next".equals(cmd)) {
            // ویدیو: دکمه‌های نوتیفیکیشن → پلیر شناور نیتیو
            if (isVideo && FloatingVideoPlayer.get(this).isShown()) {
                FloatingVideoPlayer.get(this).next();
            } else {
                playQueueRelative(1);
            }
            return;
        }
        if ("prev".equals(cmd)) {
            // ویدیو: دکمه‌های نوتیفیکیشن → پلیر شناور نیتیو
            if (isVideo && FloatingVideoPlayer.get(this).isShown()) {
                FloatingVideoPlayer.get(this).prev();
            } else {
                playQueueRelative(-1);
            }
            return;
        }
        if ("stop".equals(cmd)) { dispatchToWeb("stop"); stopNative(); doStop(); }
    }

    /** فرمان‌های پلیر نیتیو از وب (handoff اسپاتیفای‌مانند) */
    private void handleNativeCommand(String json) {
        if (json == null) return;
        try {
            JSONObject o = new JSONObject(json);
            String cmd = o.optString("cmd");

            // ══ ویدیو: پلیر شناور نیتیو (مثل یوتیوب — تایم‌لاین + دکمه‌های کامل) ══
            if ("vplay".equals(cmd)) {
                String url = o.optString("url", "");
                String title = o.optString("title", "پخش ویدیو");
                podcastId = o.optString("podcastId", "");
                episodeIndex = o.optInt("episodeIndex", -1);
                // عنوان ویدیو برای نوتیفیکیشن/لاک‌اسکرین
                if (title != null && !title.isEmpty()) {
                    this.title = title;
                    artist = "پخش ویدیو در پس‌زمینه";
                    updateMetadata();
                }
                // ذخیره صف ویدیوها برای دکمه‌های قبلی/بعدی
                FloatingVideoPlayer fvp = FloatingVideoPlayer.get(this);
                java.util.List<FloatingVideoPlayer.VideoItem> items = new java.util.ArrayList<>();
                org.json.JSONArray q = o.optJSONArray("queue");
                if (q != null) {
                    for (int i = 0; i < q.length(); i++) {
                        try {
                            org.json.JSONObject it = q.getJSONObject(i);
                            FloatingVideoPlayer.VideoItem vi = new FloatingVideoPlayer.VideoItem();
                            vi.url = it.optString("url", "");
                            vi.title = it.optString("title", "");
                            items.add(vi);
                        } catch (Exception ignored) {}
                    }
                }
                int idx = o.has("queueIndex") ? o.optInt("queueIndex", episodeIndex) : episodeIndex;
                fvp.setQueue(items, idx);
                if (!url.isEmpty()) {
                    boolean started = fvp.playVideo(url, title, idx);
                    if (started) {
                        isVideo = true;
                        isPlaying = true;
                        updatePlaybackState();
                        // اطلاع به وب که پخش به پلیر نیتیو رفت
                        dispatchToWeb("video-native-start");
                    }
                    // اگر پنجره شناور باز نشد (بدون مجوز overlay) → خود playVideo قبلاً no-overlay فرستاده
                }
                return;
            }
            if ("vpause".equals(cmd)) {
                FloatingVideoPlayer.get(this).pause();
                return;
            }
            if ("vresume".equals(cmd)) {
                FloatingVideoPlayer.get(this).resume();
                return;
            }
            if ("vseek".equals(cmd)) {
                long pos = (long) o.optDouble("positionMs", 0);
                FloatingVideoPlayer.get(this).seekTo((int) pos);
                return;
            }
            if ("vnext".equals(cmd)) {
                FloatingVideoPlayer.get(this).next();
                return;
            }
            if ("vprev".equals(cmd)) {
                FloatingVideoPlayer.get(this).prev();
                return;
            }
            if ("vstop".equals(cmd)) {
                // توقف از دکمه وب → بستن پنجره PiP (onDestroy آن وضعیت نهایی را ارسال می‌کند)
                PipActivity pip = PipActivity.instance;
                if (pip != null && !pip.isFinishing()) {
                    try { pip.finish(); } catch (Exception ignored) {}
                    return;
                }
                FloatingVideoPlayer.get(this).stop((long) o.optDouble("positionMs", 0));
                return;
            }
            if ("vexpand".equals(cmd)) {
                FloatingVideoPlayer.get(this).expand();
                return;
            }
            if ("pip-enter".equals(cmd)) {
                isVideo = true;
                dispatchToWeb("pip-enter");
                return;
            }

            if ("play".equals(cmd)) {
                String url = o.optString("url", "");
                long pos = (long) o.optDouble("positionMs", 0);
                podcastId = o.optString("podcastId", "");
                episodeIndex = o.optInt("episodeIndex", -1);
                // ذخیره لیست اپیزودها برای دکمه‌های next/prev نیتیو (نوتیفیکیشن/لاک‌اسکرین)
                queue.clear();
                org.json.JSONArray q = o.optJSONArray("queue");
                if (q != null) {
                    for (int i = 0; i < q.length(); i++) {
                        try { queue.add(q.getJSONObject(i)); } catch (Exception ignored) {}
                    }
                }
                if (o.has("queueIndex")) queueIndex = o.optInt("queueIndex", episodeIndex);
                else queueIndex = episodeIndex;
                if (!url.isEmpty()) {
                    startNativePlayback(url, pos);
                } else if (nativePlayer != null) {
                    nativePlayer.start();
                    isPlaying = true;
                    nativeMode = true;
                    startPositionUpdater();
                    updatePlaybackState();
                }
            } else if ("pause".equals(cmd)) {
                pauseNative();
            } else if ("resume".equals(cmd)) {
                if (nativePlayer != null) {
                    try {
                        nativePlayer.start();
                        isPlaying = true;
                        nativeMode = true;
                        requestAudioFocus();
                        startPositionUpdater();
                        updatePlaybackState();
                    } catch (Exception ignored) {
                    }
                }
            } else if ("seek".equals(cmd)) {
                long pos = (long) o.optDouble("positionMs", 0);
                positionMs = pos;
                if (nativePlayer != null) {
                    try { nativePlayer.seekTo((int) pos); } catch (Exception ignored) {}
                }
                updatePlaybackState();
            } else if ("stop".equals(cmd)) {
                stopNative();
                doStop();
            } else if ("handback".equals(cmd)) {
                // بازگرداندن پخش به وب (WebView) با حفظ موقعیت
                if (nativePlayer != null) {
                    try { positionMs = nativePlayer.getCurrentPosition(); } catch (Exception ignored) {}
                    nativePlayer.release();
                    nativePlayer = null;
                }
                nativeMode = false;
                isPlaying = false;
                handler.removeCallbacks(positionUpdater);
                abandonAudioFocus();
                saveState();
                updatePlaybackState();
            }
        } catch (Exception ignored) {
        }
    }

    /** برای اکشن‌های PiP (BroadcastReceiver) */
    public static void onExternalCommand(android.content.Context context, String cmd) {
        try {
            Intent i = new Intent(context, PlaybackService.class);
            i.setAction(ACTION_CMD);
            i.putExtra(EXTRA_CMD, cmd);
            if (Build.VERSION.SDK_INT >= 26) {
                context.startForegroundService(i);
            } else {
                context.startService(i);
            }
        } catch (Exception ignored) {
        }
    }

    private void setPlaying(boolean playing) {
        if (isPlaying == playing) {
            if (playing) updatePlaybackState();
            return;
        }
        isPlaying = playing;
        if (playing) startPositionUpdater();
        else handler.removeCallbacks(positionUpdater);
        updatePlaybackState();
    }

    /* ---------- دکمه‌های next/prev نیتیو (اسپاتیفای‌مانند، مستقل از وب) ---------- */

    private void playQueueRelative(int delta) {
        if (queue.isEmpty()) {
            // بدون لیست → وب تصمیم می‌گیرد (repeat/shuffle در وب است)
            dispatchToWeb(delta > 0 ? "next" : "prev");
            return;
        }
        int next = queueIndex + delta;
        if (next < 0 || next >= queue.size()) {
            // خارج محدوده → وب تصمیم می‌گیرد
            dispatchToWeb(delta > 0 ? "next" : "prev");
            return;
        }
        playQueueItem(next);
        // اطلاع به وب برای همگام‌سازی UI (بدون پخش دوباره)
        dispatchToWeb("track:" + next);
    }

    private void playQueueItem(int idx) {
        queueIndex = idx;
        try {
            org.json.JSONObject item = queue.get(idx);
            String url = item.optString("url", "");
            if (url.isEmpty()) { dispatchToWeb("next"); return; }
            String t = item.optString("title", "");
            if (!t.isEmpty()) title = t;
            String a = item.optString("artist", "");
            if (!a.isEmpty()) artist = a;
            String art = item.optString("artwork", "");
            if (!art.isEmpty() && !art.equals(artworkUrl)) {
                artworkUrl = art;
                artwork = null;
                loadArtwork(art);
            }
            podcastId = item.optString("podcastId", podcastId);
            episodeIndex = idx;
            updateMetadata();
            startNativePlayback(url, 0);
            saveState();
        } catch (Exception ignored) {
            dispatchToWeb("next");
        }
    }

    private void startPositionUpdater() {
        handler.removeCallbacks(positionUpdater);
        handler.post(positionUpdater);
    }

    private void ensureForeground() {
        // ویدیو: بدون هیچ نوتیفیکیشنی (درخواست کاربر) — سرویس فقط فرمان‌ها را کوتاه اجرا می‌کند
        if (isVideo) return;
        if (!startedForeground) {
            startForegroundCompat(buildNotification());
        }
    }

    /* ---------- پخش نیتیو (اسپاتیفای‌مانند) ---------- */

    private void startNativePlayback(String url, long startPos) {
        stopNative();
        nativeMode = true;
        audioUrl = url;
        try {
            nativePlayer = new MediaPlayer();
            nativePlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            nativePlayer.setDataSource(this, Uri.parse(url));
            nativePlayer.setOnPreparedListener(mp -> {
                long dur = mp.getDuration();
                if (dur > 0) durationMs = dur;
                if (startPos > 0) {
                    try { mp.seekTo((int) startPos); } catch (Exception ignored) {}
                    positionMs = startPos;
                }
                mp.start();
                isPlaying = true;
                nativeMode = true;
                requestAudioFocus();
                startPositionUpdater();
                updateMetadata();
                updatePlaybackState();
                saveState();
            });
            nativePlayer.setOnCompletionListener(mp -> {
                isPlaying = false;
                try { positionMs = mp.getDuration(); } catch (Exception ignored) {}
                handler.removeCallbacks(positionUpdater);
                updatePlaybackState();
                saveState();
                // اپیزود تمام شد → اپیزود بعدی
                dispatchToWeb("next");
            });
            nativePlayer.setOnErrorListener((mp, what, extra) -> {
                releaseNative();
                dispatchToWeb("next");
                return true;
            });
            nativePlayer.prepareAsync();
        } catch (Exception e) {
            releaseNative();
            dispatchToWeb("next");
        }
    }

    private void pauseNative() {
        if (nativePlayer != null && isPlaying) {
            try { nativePlayer.pause(); } catch (Exception ignored) {}
        }
        isPlaying = false;
        handler.removeCallbacks(positionUpdater);
        abandonAudioFocus();
        saveState();
        updatePlaybackState();
    }

    private void stopNative() {
        releaseNative();
        nativeMode = false;
        isPlaying = false;
        handler.removeCallbacks(positionUpdater);
        abandonAudioFocus();
    }

    /* ---------- Audio Focus (مثل اسپاتیفای) ---------- */

    private void requestAudioFocus() {
        if (audioManager == null || focusGranted) return;
        try {
            int result;
            if (Build.VERSION.SDK_INT >= 26) {
                if (audioFocusRequest == null) {
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                            .setAudioAttributes(new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_MEDIA)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                    .build())
                            .setOnAudioFocusChangeListener(this::onAudioFocusChange)
                            .build();
                }
                result = audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                result = audioManager.requestAudioFocus(this::onAudioFocusChange, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
            focusGranted = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } catch (Exception ignored) {
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null || !focusGranted) return;
        try {
            if (Build.VERSION.SDK_INT >= 26 && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            } else {
                audioManager.abandonAudioFocus(this::onAudioFocusChange);
            }
            focusGranted = false;
        } catch (Exception ignored) {
        }
    }

    private void onAudioFocusChange(int change) {
        switch (change) {
            case AudioManager.AUDIOFOCUS_LOSS:
                // اپ دیگری پخش را گرفت → توقف
                resumeAfterTransient = false;
                if (nativePlayer != null) pauseNative();
                dispatchToWeb("pause");
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                // مکالمه/اعلان → توقف موقت، بعداً ادامه
                resumeAfterTransient = true;
                if (nativePlayer != null) pauseNative();
                dispatchToWeb("pause");
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // فقط کاهش صدا — WebView/نیتیو خودش مدیریت می‌کند
                break;
            case AudioManager.AUDIOFOCUS_GAIN:
                if (resumeAfterTransient && nativePlayer != null && !isPlaying) {
                    resumeAfterTransient = false;
                    try {
                        nativePlayer.start();
                        isPlaying = true;
                        startPositionUpdater();
                        updatePlaybackState();
                        dispatchToWeb("play");
                    } catch (Exception ignored) {
                    }
                }
                break;
        }
    }

    private void releaseNative() {
        if (nativePlayer != null) {
            try { nativePlayer.release(); } catch (Exception ignored) {}
            nativePlayer = null;
        }
    }

    /** ادامه پخش بعد از کشته شدن اپ — از SharedPreferences */
    private void resumeFromSavedState() {
        try {
            SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
            String url = sp.getString(KEY_URL, "");
            if (url.isEmpty() || nativePlayer != null) return;
            if (!sp.contains(KEY_IS_VIDEO)) {
                sp.edit().clear().apply();
                if (mediaSession != null) mediaSession.setActive(false);
                NotificationManager nm = getSystemService(NotificationManager.class);
                if (nm != null) nm.cancel(NOTIF_ID);
                return;
            }
            boolean savedIsVideo = sp.getBoolean(KEY_IS_VIDEO, false);
            if (savedIsVideo) {
                sp.edit().clear().apply();
                if (mediaSession != null) mediaSession.setActive(false);
                NotificationManager nm = getSystemService(NotificationManager.class);
                if (nm != null) nm.cancel(NOTIF_ID);
                return;
            }
            positionMs = sp.getLong(KEY_POS, 0);
            title = sp.getString(KEY_TITLE, "محفل");
            artist = sp.getString(KEY_ARTIST, "سرای هنر و اندیشه");
            artworkUrl = sp.getString(KEY_ART, "");
            podcastId = sp.getString(KEY_PODCAST, "");
            episodeIndex = sp.getInt(KEY_EP, -1);
            if (!artworkUrl.isEmpty() && artwork == null) loadArtwork(artworkUrl);
            updateMetadata();
            startForegroundCompat(buildNotification());
            startNativePlayback(url, positionMs);
        } catch (Exception ignored) {
        }
    }

    private void saveState() {
        try {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putString(KEY_URL, audioUrl)
                    .putLong(KEY_POS, positionMs)
                    .putString(KEY_TITLE, title)
                    .putString(KEY_ARTIST, artist)
                    .putString(KEY_ART, artworkUrl)
                    .putString(KEY_PODCAST, podcastId)
                    .putInt(KEY_EP, episodeIndex)
                    .putBoolean(KEY_IS_VIDEO, isVideo)
                    .apply();
        } catch (Exception ignored) {
        }
    }

    /* ---------- وضعیت برای بریج وب ---------- */

    public static String getSnapshotJson() {
        return snapshotJson;
    }

    private void updateSnapshot() {
        try {
            JSONObject o = new JSONObject();
            o.put("playing", isPlaying);
            o.put("nativeMode", nativeMode);
            o.put("title", title);
            o.put("artist", artist);
            o.put("url", audioUrl);
            o.put("positionMs", positionMs);
            o.put("durationMs", durationMs);
            o.put("podcastId", podcastId);
            o.put("episodeIndex", episodeIndex);
            snapshotJson = o.toString();
        } catch (Exception ignored) {
        }
    }

    /* ---------- MediaSession ---------- */

    private void setupMediaSession() {
        if (mediaSession != null) {
            try { mediaSession.release(); } catch (Exception ignored) {}
        }
        mediaSession = new MediaSessionCompat(this, "MahfelPlayback");
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() { handleCommand("play"); }

            @Override
            public void onPause() { handleCommand("pause"); }

            @Override
            public void onSkipToNext() { handleCommand("next"); }

            @Override
            public void onSkipToPrevious() { handleCommand("prev"); }

            @Override
            public void onSeekTo(long pos) { handleCommand("seekto:" + pos); }

            @Override
            public void onStop() { stopNative(); doStop(); }
        });
        mediaSession.setActive(true);
        updateMetadata();
    }

    private void updateMetadata() {
        if (mediaSession == null) return;
        MediaMetadataCompat.Builder mb =
                new MediaMetadataCompat.Builder()
                        .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                        .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist);
        if (album != null && !album.isEmpty()) {
            mb.putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album);
        }
        if (durationMs > 0) {
            mb.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);
        }
        if (artwork != null) {
            mb.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork);
        } else if (!artworkUrl.isEmpty()) {
            mb.putString(MediaMetadataCompat.METADATA_KEY_ART_URI, artworkUrl);
        }
        mediaSession.setMetadata(mb.build());
    }

    private void updatePlaybackState() {
        if (mediaSession == null) return;
        long actions = PlaybackStateCompat.ACTION_PLAY_PAUSE
                | PlaybackStateCompat.ACTION_STOP
                | PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID;
        if (!isVideo) {
            actions |= PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                    | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                    | PlaybackStateCompat.ACTION_SEEK_TO;
        }
        // ویدیو: بدون دکمه‌های بعدی/قبلی (فقط پخش/توقف) — درخواست کاربر
        int state = isPlaying
                ? PlaybackStateCompat.STATE_PLAYING
                : PlaybackStateCompat.STATE_PAUSED;
        PlaybackStateCompat.Builder sb = new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, positionMs, 1.0f, SystemClock.elapsedRealtime());
        mediaSession.setPlaybackState(sb.build());
        updateNotification();
        updateSnapshot();
    }

    /* ---------- نوتیفیکیشن ---------- */

    private Notification buildNotification() {
        // گارد: اگر سرویس ری‌استارت شده و session ساخته نشده باشد
        if (mediaSession == null) setupMediaSession();
        Intent openApp = new Intent(this, MainActivity.class);
        PendingIntent contentPi = PendingIntent.getActivity(this, 0, openApp, PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(artist)
                .setLargeIcon(artwork)
                .setOngoing(isPlaying)
                .setOnlyAlertOnce(true)
                .setContentIntent(contentPi)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        if (isVideo) {
            // ویدیو: بدون دکمه‌های بعدی/قبلی — فقط پخش/توقف (درخواست کاربر)
            b.addAction(isPlaying ? R.drawable.ic_media_pause : R.drawable.ic_media_play,
                    isPlaying ? "توقف" : "پخش",
                    mediaPi(isPlaying ? "pause" : "play"));
            b.setStyle(new MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0));
            return b.build();
        }

        // صوت: نوتیفیکیشن کامل مثل پلیر آهنگ — تایم‌لاین (نوار پیشرفت) + بعدی/قبلی/پخش
        b.addAction(R.drawable.ic_media_prev, "قبلی", mediaPi("prev"));
        b.addAction(isPlaying ? R.drawable.ic_media_pause : R.drawable.ic_media_play,
                isPlaying ? "توقف" : "پخش",
                mediaPi(isPlaying ? "pause" : "play"));
        b.addAction(R.drawable.ic_media_next, "بعدی", mediaPi("next"));
        b.setStyle(new MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));
        return b.build();
    }

    private PendingIntent mediaPi(String cmd) {
        Intent i = new Intent(this, PlaybackService.class);
        i.setAction(ACTION_CMD);
        i.putExtra(EXTRA_CMD, cmd);
        return PendingIntent.getService(this, cmd.hashCode(), i,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private void updateNotification() {
        try {
            if (isVideo) return; // ویدیو: بدون نوتیفیکیشن
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(NOTIF_ID, buildNotification());
        } catch (Exception ignored) {
        }
    }

    /* ---------- آرتورک ---------- */

    private void loadArtwork(final String url) {
        new Thread(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setInstanceFollowRedirects(true);
                InputStream in = conn.getInputStream();
                Bitmap bmp = BitmapFactory.decodeStream(in);
                in.close();
                conn.disconnect();
                if (bmp != null) {
                    int max = 512;
                    int w = bmp.getWidth();
                    int h = bmp.getHeight();
                    if (w > max || h > max) {
                        float scale = Math.min((float) max / w, (float) max / h);
                        bmp = Bitmap.createScaledBitmap(bmp, Math.max(1, (int) (w * scale)), Math.max(1, (int) (h * scale)), true);
                    }
                    final Bitmap finalBmp = bmp;
                    handler.post(() -> {
                        artwork = finalBmp;
                        updateMetadata();
                        updatePlaybackState();
                    });
                }
            } catch (Exception ignored) {
            }
        }).start();
    }

    /* ---------- پایه ---------- */

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "پخش در پس‌زمینه", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("کنترل پخش ویدیو و صدا در پس‌زمینه");
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }

    private void startForegroundCompat(Notification n) {
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ServiceCompat.startForeground(this, NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIF_ID, n);
            }
            startedForeground = true;
        } catch (Exception ignored) {
        }
    }

    private void stopForegroundCompat() {
        try {
            stopForeground(true);
        } catch (Exception ignored) {
        }
        startedForeground = false;
    }

    private void doStop() {
        stopNative();
        handler.removeCallbacks(positionUpdater);
        // پاک کردن وضعیت ذخیره‌شده تا ری‌استارت ناخواسته (START_STICKY) پخش را زنده نکند
        try {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().clear().apply();
        } catch (Exception ignored) {
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        stopForegroundCompat();
        stopSelf();
    }

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

    // وقتی کاربر اپ را از لیست اخیر حذف می‌کند، سرویس ادامه می‌دهد (مثل اسپاتیفای)
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // کاری نکن — سرویس پیش‌زمینه زنده می‌ماند و پخش ادامه دارد
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(positionUpdater);
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
