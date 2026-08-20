interface BridgeLike {
  isApp?: () => boolean;
  startPlayback?: (type: string) => void;
  stopPlayback?: () => void;
  enterPip?: () => void;
  showNotification?: (title: string, body: string, link?: string) => void;
  // player bg APK: sync meta/state to native service
  updateMediaMeta?: (title: string, artist: string, album: string, artworkUrl: string, durationMs: number) => void;
  setMediaPlaying?: (playing: boolean, positionMs: number, durationMs: number) => void;
  updateAudioMeta?: (title: string, artist: string, album: string, artworkUrl: string, durationMs: number) => void;
  setAudioPlaying?: (playing: boolean, positionMs: number, durationMs: number) => void;
  setVideoPlaying?: (playing: boolean) => void;
  // PiP mini player: title + real video dimensions for the floating window
  setVideoMeta?: (title: string, width: number, height: number) => void;
  // native floating video player (like YouTube)
  floatingVideoCommand?: (json: string) => void;
  canDrawOverlays?: () => boolean;
  requestOverlayPermission?: () => void;
  requestNotificationPermission?: () => void;
  // native PiP mini player: just the video, no controls
  enterVideoPip?: (json: string) => void;
  // app update: current installed version + apk download/install
  getAppVersion?: () => string;
  downloadAndInstallApk?: (url: string) => void;
  // FCM: توکن گوشی برای push وقتی اپ بسته است
  getFcmToken?: () => string;
  // OTP auto-fill
  startOtpAutofill?: () => boolean;
}

export interface BackgroundMediaMeta {
  title: string;
  artist?: string;
  album?: string;
  artwork?: string;
  duration?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

let bridge: BridgeLike | null = null;
let activeVideo: HTMLVideoElement | null = null;
let activeAudio: HTMLAudioElement | null = null;
let audioPlaying = false;
let nativeMode = false;

const getBridge = (): BridgeLike | null => {
  if (typeof window === 'undefined') return null;
  const live = (window as any).AndroidBridge || (window as any).MahfelIosBridge || null;
  if (live) bridge = live;
  return live || bridge;
};

export const isApp = (): boolean => {
  const b = getBridge();
  return !!b && typeof b.isApp === 'function' && b.isApp() === true;
};

// --- محیط iOS ---
export const isIos = (): boolean => {
  const b = getBridge();
  if (b && typeof (b as any).isIos === 'function') {
    try {
      return (b as any).isIos() === true;
    } catch { /* ignore */ }
  }
  return false;
};

export const sendNativeNotification = (title: string, body: string, link?: string) => {
  const b = getBridge();
  if (b && typeof b.showNotification === 'function') {
    try {
      if (link) { b.showNotification(title, body, link); }
      else { b.showNotification(title, body); }
    } catch { /* ignore */ }
  }
};

// --- نسخه نصب‌شده اپ اندروید ---
export const getAppVersion = (): string => {
  const b = getBridge();
  if (b && typeof b.getAppVersion === 'function') {
    try {
      const v = b.getAppVersion();
      if (v) return v;
    } catch { /* ignore */ }
  }
  return '';
};

// --- دانلود و نصب خودکار APK ---
export const downloadAndInstallApk = (url: string) => {
  const b = getBridge();
  if (b && typeof b.downloadAndInstallApk === 'function') {
    try {
      b.downloadAndInstallApk(url);
      return true;
    } catch { /* ignore */ }
  }
  return false;
};

// --- توکن FCM (اندروید): خالی یعنی FCM در دسترس نیست ---
export const getFcmToken = (): string => {
  const b = getBridge();
  if (b && typeof b.getFcmToken === 'function') {
    try {
      return b.getFcmToken() || '';
    } catch { /* ignore */ }
  }
  return '';
};

// --- محیط دسکتاپ (Electron) ---
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return !!(window as any).mahfelDesktop?.isElectron;
  } catch {
    return /Electron/i.test(navigator.userAgent);
  }
};

export const getDesktopVersion = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return String((window as any).mahfelDesktop?.appVersion || '');
  } catch {
    return '';
  }
};

// فعال‌سازی OTP اتوفیل در اندروید: رسیور پیامک را فعال می‌کند (فقط در صورت داشتن مجوز)
export const startOtpAutofill = (): boolean => {
  const b = getBridge();
  if (b && typeof b.startOtpAutofill === 'function') {
    try {
      return b.startOtpAutofill() === true;
    } catch {
      return false;
    }
  }
  return false;
};

export const desktopOpenExternal = (url: string) => {
  if (typeof window === 'undefined') return false;
  try {
    if ((window as any).mahfelDesktop?.openExternal) {
      (window as any).mahfelDesktop.openExternal(url);
      return true;
    }
  } catch { /* ignore */ }
  return false;
};

// --- اعلان سیستمی دسکتاپ (Electron main process) — نسخهٔ جدید EXE ---
export const desktopShowNotification = (title: string, body: string, link?: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const d = (window as any).mahfelDesktop;
    if (d && typeof d.showNotification === 'function') {
      d.showNotification(title, body, link || '');
      return true;
    }
  } catch { /* ignore */ }
  return false;
};

// --- مقایسه نسخه (x.y.z) ---
export const isVersionNewer = (latest: string, current: string): boolean => {
  const toParts = (v: string): number[] =>
    String(v || '')
      .trim()
      .split('.')
      .map((p) => parseInt(p, 10) || 0);
  const a = toParts(latest);
  const b = toParts(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
};

const videoInPip = (): boolean => {
  try { return !!document.pictureInPictureElement; } catch { return false; }
};

const stopServiceIfIdle = () => {
  const b = getBridge();
  if (!b) return;
  const videoActive = activeVideo && !activeVideo.paused;
  if (!audioPlaying && !videoActive && !videoInPip()) {
    try { b.stopPlayback?.(); } catch { /* ignore */ }
  }
};

/* ===== player bg APK: native sync ===== */

/** send media metadata (title/artist/cover/duration) to native service - lock screen & notification */
export const updateBackgroundMeta = (meta: BackgroundMediaMeta) => {
  const b = getBridge();
  if (!b || typeof b.updateMediaMeta !== 'function') return;
  try {
    b.updateMediaMeta(
      meta.title || '',
      meta.artist || '',
      meta.album || '',
      meta.artwork || '',
      Math.round((meta.duration || 0) * 1000)
    );
  } catch { /* ignore */ }
};

/** send playback state to native service (play/pause icon + notification seek bar) */
export const updateBackgroundState = (playing: boolean, positionMs: number, durationMs: number) => {
  const b = getBridge();
  if (!b || typeof b.setMediaPlaying !== 'function') return;
  try {
    b.setMediaPlaying(playing, Math.max(0, Math.round(positionMs)), Math.max(0, Math.round(durationMs)));
  } catch { /* ignore */ }
};

/** audio-only: metadata for the background-play notification (no video flag) */
export const updateAudioBackgroundMeta = (meta: BackgroundMediaMeta) => {
  const b = getBridge();
  if (!b || typeof b.updateAudioMeta !== 'function') return;
  try {
    b.updateAudioMeta(
      meta.title || '',
      meta.artist || '',
      meta.album || '',
      meta.artwork || '',
      Math.round((meta.duration || 0) * 1000)
    );
  } catch { /* ignore */ }
};

/** audio-only: playback state for the background-play notification (no video flag) */
export const updateAudioBackgroundState = (playing: boolean, positionMs: number, durationMs: number) => {
  const b = getBridge();
  if (!b || typeof b.setAudioPlaying !== 'function') return;
  try {
    b.setAudioPlaying(playing, Math.max(0, Math.round(positionMs)), Math.max(0, Math.round(durationMs)));
  } catch { /* ignore */ }
};

/** tell native a video is playing/stopped (for auto-PiP on app leave) */
export const setVideoPlayingState = (playing: boolean) => {
  const b = getBridge();
  if (!b || typeof b.setVideoPlaying !== 'function') return;
  try { b.setVideoPlaying(playing); } catch { /* ignore */ }
};

/** fully stop the native background service */
export const stopPlaybackService = () => {
  const b = getBridge();
  if (b && typeof b.stopPlayback === 'function') {
    try { b.stopPlayback(); } catch { /* ignore */ }
  }
};

/* ═══════════ پلیر نیتیو اسپاتیفای‌مانند (handoff) ═══════════ */

/** آیا پخش فعلاً در پلیر نیتیو اندروید است (نه WebView)؟ */
export const isNativeMode = (): boolean => nativeMode;

export const setNativeModeActive = (active: boolean) => { nativeMode = active; };

/** فرمان به پلیر نیتیو (play/pause/resume/seek/stop/handback) */
export const nativeCommand = (payload: any): boolean => {
  const b = getBridge();
  if (!b || typeof (b as any).nativeCommand !== 'function') return false;
  try { (b as any).nativeCommand(JSON.stringify(payload)); return true; } catch { return false; }
};

/** درخواست مجوز نوتیفیکیشن (اندروید ۱۳+) در لحظه شروع پخش پس‌زمینه */
export const ensureNotificationPermission = () => {
  const b = getBridge();
  if (b && typeof b.requestNotificationPermission === 'function') {
    try { b.requestNotificationPermission(); } catch { /* ignore */ }
  }
};

/** آیا مجوز نوتیفیکیشن داده شده؟ (اندروید ۱۳+) */
export const hasNotificationPermission = (): boolean => {
  const b = getBridge();
  if (!b || typeof (b as any).getNotificationPermission !== 'function') return true;
  try { return (b as any).getNotificationPermission() === true; } catch { return true; }
};

/** معافیت از بهینه‌سازی باتری (گوشی‌های واقعی: شیائومی/سامسونگ/هواوی سرویس پخش را می‌کشند) */
export const ensureBatteryOptimizationExemption = () => {
  const b = getBridge();
  if (b && typeof (b as any).requestBatteryOptimizationExemption === 'function') {
    try { (b as any).requestBatteryOptimizationExemption(); } catch { /* ignore */ }
  }
};

/** وضعیت لحظه‌ای پلیر نیتیو (برای بازیابی UI هنگام بازگشایی اپ) */
export const getNativeSnapshot = (): any => {
  const b = getBridge();
  if (!b || typeof (b as any).getNativeState !== 'function') return null;
  try {
    const s = (b as any).getNativeState();
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

/** هندآف پخش از WebView به پلیر نیتیو (وقتی اپ به پس‌زمینه می‌رود) */
export const handoffAudioToNative = (audioEl: HTMLAudioElement): boolean => {
  if (!audioEl || audioEl.paused || nativeMode) return false;
  try {
    const url = audioEl.src || '';
    if (!url) return false;
    const pos = (audioEl.currentTime || 0) * 1000;
    const pid = (audioEl as any).dataset?.podcastId || '';
    const eidx = parseInt((audioEl as any).dataset?.episodeIndex || '-1', 10);
    const b = getBridge();
    if (!b) return false;
    audioEl.pause();
    nativeMode = true;
    clearWebMediaSession();
    try { b.startPlayback?.('audio'); } catch { /* ignore */ }
    nativeCommand({ cmd: 'play', url, positionMs: Math.round(pos), podcastId: pid, episodeIndex: isFinite(eidx) ? eidx : -1 });
    return true;
  } catch { return false; }
};

/** هندبک از پلیر نیتیو به WebView (وقتی اپ به جلو می‌آید) */
export const handbackAudioFromNative = (audioEl: HTMLAudioElement | null) => {
  if (!nativeMode) return;
  nativeMode = false;
  const snap = getNativeSnapshot();
  nativeCommand({ cmd: 'handback' });
  if (!audioEl || !snap) return;
  try {
    if (snap.url && audioEl.src !== snap.url) { audioEl.src = snap.url; audioEl.load(); }
    if (snap.positionMs > 0) { try { audioEl.currentTime = snap.positionMs / 1000; } catch { /* ignore */ } }
    if (snap.playing) {
      // قبل از play علامت بزن تا stopServiceIfIdle سرویس را متوقف نکند (رویداد play async است)
      audioPlaying = true;
      audioEl.play().catch(() => { /* ignore */ });
    }
  } catch { /* ignore */ }
};

/* ---------- background play button (audio) ---------- */
/** غیرفعال کردن مدیا سشن وب تا WebView نوتیفیکیشن خودش (Video player) را نشان ندهد */
export const clearWebMediaSession = () => {
  try {
    const ms = (navigator as any).mediaSession;
    if (!ms) return;
    ms.metadata = null;
    try { ms.playbackState = 'none'; } catch { /* ignore */ }
    ['play', 'pause', 'seekto', 'nexttrack', 'previoustrack', 'seekbackward', 'seekforward'].forEach(a => {
      try { ms.setActionHandler(a, null); } catch { /* unsupported action */ }
    });
  } catch { /* ignore */ }
};

const applyMediaSession = (meta: BackgroundMediaMeta, includeNavigation = true) => {
  try {
    const ms = (navigator as any).mediaSession;
    if (!ms) return;
    ms.metadata = new (window as any).MediaMetadata({
      title: meta.title || '',
      artist: meta.artist || 'محفل',
      album: meta.album || '',
      artwork: meta.artwork ? [{ src: meta.artwork, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    const setHandler = (action: string, fn: (() => void) | ((details: any) => void) | null) => {
      try { ms.setActionHandler(action, fn as any); } catch { /* unsupported action */ }
    };
    setHandler('play', () => meta.onPlay?.());
    setHandler('pause', () => meta.onPause?.());
    setHandler('seekto', (details: any) => { if (details && typeof details.seekTime === 'number') meta.onSeek?.(details.seekTime); });
    if (includeNavigation) {
      setHandler('nexttrack', () => meta.onNext?.());
      setHandler('previoustrack', () => meta.onPrev?.());
    } else {
      setHandler('nexttrack', null);
      setHandler('previoustrack', null);
    }
  } catch { /* ignore */ }
};

export const playInBackgroundAudio = (meta: BackgroundMediaMeta) => {
  audioPlaying = true;
  const b = getBridge();
  if (b) {
    // APK: نوتیفیکیشن/لاک‌اسکرین را سرویس نیتیو می‌سازد — مدیا سشن وب را فعال نکن
    // تا WebView نوتیفیکیشن خودش (Video player) را قبل از نوتیفیکیشن صوت نشان ندهد
    clearWebMediaSession();
    // بدون هیچ درخواست مجوزی (باتری/نوتیفیکیشن) — پخش پس‌زمینه بدون اجازه کار می‌کند
    try { b.startPlayback?.('audio'); } catch { /* ignore */ }
    // push metadata & state to native service (notification + lock screen)
    updateAudioBackgroundMeta(meta);
    updateAudioBackgroundState(true, 0, Math.round((meta.duration || 0) * 1000));
    return;
  }
  applyMediaSession(meta);
};

export const stopBackgroundAudio = () => {
  audioPlaying = false;
  stopServiceIfIdle();
};

/* ---------- YouTube-like background play (video) ---------- */

export interface VideoBgSource {
  title: string;
  url: string;
  videoId?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  queue?: { url: string; title: string }[];
  queueIndex?: number;
}

let currentVideoSource: VideoBgSource | null = null;
let videoBgActive = false;
let videoBgHandlers: { onStop?: () => void; onTrackChange?: (index: number) => void; onPlay?: () => void; onPause?: () => void } | null = null;

export const isVideoBackgroundActive = (): boolean => videoBgActive;

/** ثبت منبع ویدیوی در حال پخش — برای هندآف خودکار هنگام خروج از اپ (مثل یوتیوب) */
export const registerVideoSource = (src: VideoBgSource) => {
  currentVideoSource = src;
};

export const canDrawOverlays = (): boolean => {
  const b = getBridge();
  return !!b && typeof b.canDrawOverlays === 'function' && b.canDrawOverlays();
};

/** عنوان + ابعاد ویدیو برای پنجره PiP نیتیو */
export const updateVideoPipInfo = (title: string, width: number, height: number) => {
  const b = getBridge();
  if (!b || typeof b.setVideoMeta !== 'function') return;
  try { b.setVideoMeta(title, width, height); } catch { /* ignore */ }
};

/** فرمان مستقیم به پلیر شناور نیتیو */
export const floatingVideoCommand = (payload: any): boolean => nativeCommand(payload);

const emitVideoBgState = (active: boolean) => {
  try { window.dispatchEvent(new CustomEvent('mahfel-video-bg-state', { detail: active })); } catch { /* ignore */ }
};

export type VideoBackgroundResult = 'native' | 'pip' | 'none';

const applyVideoMediaSession = (src: VideoBgSource, el: HTMLVideoElement) => {
  applyMediaSession({
    title: src.title || 'پخش ویدیو',
    artist: 'محفل — پخش ویدیو',
    album: '',
    artwork: src.thumbnail || '',
    duration: el.duration || 0,
    onPlay: () => videoBgHandlers?.onPlay?.(),
    onPause: () => videoBgHandlers?.onPause?.(),
  }, false);
};

/**
 * شروع پخش ویدیو در پس‌زمینه — فقط PiP، بدون هیچ مجوزی (باتری/overlay/نوتیفیکیشن لازم نیست).
 * APK: مینی‌پلیر نیتیو PiP (PipActivity) — فقط ویدیو، بدون هیچ دکمه/المان وبی.
 * وب: PiP استاندارد مرورگر — فقط ویدیو، بدون هیچ دکمه/المان وبی.
 */
export const startVideoBackground = async (
  videoEl: HTMLVideoElement | null,
  src: VideoBgSource | null,
  handlers?: { onStop?: (positionMs?: number) => void; onTrackChange?: (index: number) => void; onPlay?: () => void; onPause?: () => void }
): Promise<VideoBackgroundResult> => {
  if (!videoEl || !src) return 'none';
  const resolvedUrl = src.url || videoEl.currentSrc || '';
  if (!resolvedUrl) return 'none';
  activeVideo = videoEl;
  currentVideoSource = src;
  videoBgHandlers = handlers || null;
  const b = getBridge();
  if (b) {
    // APK: مینی‌پلیر نیتیو PiP — فقط ویدیو، بدون هیچ دکمه/المان وبی، بدون هیچ مجوزی
    try {
      const w = videoEl.videoWidth || src.width || 16;
      const h = videoEl.videoHeight || src.height || 9;
      // غیرفعال کردن PiP خودکار Chromium در WebView تا فقط پنجره PipActivity (بدون دکمه) باز شود
      try { (videoEl as any).disablePictureInPicture = true; } catch { /* ignore */ }
      try { (videoEl as any).autoPictureInPicture = false; } catch { /* ignore */ }
      try { videoEl.pause(); } catch { /* ignore */ }
      (b as any).enterVideoPip?.(JSON.stringify({
        url: resolvedUrl,
        title: src.title || 'پخش ویدیو',
        positionMs: Math.round((videoEl.currentTime || 0) * 1000),
        width: w,
        height: h,
      }));
      videoBgActive = true;
      emitVideoBgState(true);
      return 'native';
    } catch { /* ignore */ }
  }
  // وب: PiP استاندارد مرورگر — فقط ویدیو، بدون هیچ دکمه/المان وبی
  if (typeof document !== 'undefined' && (document as any).pictureInPictureEnabled) {
    if (videoInPip()) {
      videoBgActive = true;
      emitVideoBgState(true);
      return 'pip';
    }
    try {
      // مرورگر درخواست PiP را روی ویدیوی بدون داده (readyState=0) رد میکند —
      // مطمئن شو ویدیو بارگذاری شده و در حال پخش است (حتی بعد از بسته شدن PiP قبلی)
      if ((videoEl as any).readyState === 0 && videoEl.currentSrc) {
        try { videoEl.load(); } catch { /* ignore */ }
      }
      if (videoEl.paused) {
        try { await videoEl.play(); } catch { /* ignore */ }
      }
      await (videoEl as any).requestPictureInPicture?.();
      videoBgActive = true;
      emitVideoBgState(true);
      return 'pip';
    } catch { /* ignore */ }
  }
  return 'none';
};

/** توقف پخش پسزمینه ویدیو (پلیر شناور نیتیو یا PiP مرورگر) */
export const stopVideoBackground = () => {
  // بستن را به رویدادهای واقعی می‌سپاریم تا دکمه برگردد و ویدیو از همان لحظه ادامه یابد:
  // APK: vstop → بستن PipActivity → ارسال stop:POS → ادامه در صفحه
  // وب: خروج از PiP مرورگر → leavepictureinpicture → ادامه در صفحه
  try { nativeCommand({ cmd: 'vstop' }); } catch { /* ignore */ }
  try { (document as any).exitPictureInPicture?.().catch(() => { /* ignore */ }); } catch { /* ignore */ }
  // اطمینان: اگر بعد از ۲ ثانیه هنوز بسته نشده بود (خطا/مرورگر) → بازنشانی اجباری
  window.setTimeout(() => {
    if (videoBgActive) {
      videoBgActive = false;
      videoBgHandlers = null;
      currentVideoSource = null;
      stopServiceIfIdle();
      emitVideoBgState(false);
    }
  }, 2000);
};

/** باز/بسته کردن حالت تمامصفحه پلیر شناور نیتیو */
export const expandFloatingVideo = () => {
  if (!videoBgActive) return;
  try { nativeCommand({ cmd: 'vexpand' }); } catch { /* ignore */ }
};

/** توقف/بستن پلیر شناور نیتیو (نام قدیمی برای سازگاری) */
export const stopFloatingVideo = () => stopVideoBackground();

/** هندآف ویدیو به پسزمینه (سازگاری با نسخه قبلی) */
export const enterBackgroundVideo = async (videoEl: HTMLVideoElement | null, src?: VideoBgSource | null): Promise<boolean> => {
  const res = await startVideoBackground(videoEl, src || currentVideoSource);
  return res !== 'none';
};

/* ---------- legacy auto behavior (kept for compatibility) ---------- */
export const initBackgroundPlayback = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.addEventListener('play', (e) => {
    const t = (e.target as HTMLElement) || null;
    if (!t || typeof t.tagName !== 'string') return;
    if (t.tagName === 'VIDEO') {
      activeVideo = t as HTMLVideoElement;
      const v = t as HTMLVideoElement;
      if ((v as any).autoPictureInPicture !== false) (v as any).autoPictureInPicture = true;
      if (!currentVideoSource) {
        currentVideoSource = {
          title: 'پخش ویدیو',
          url: v.currentSrc || '',
          videoId: (v as any).dataset?.videoId || '',
          thumbnail: '',
          width: v.videoWidth || 16,
          height: v.videoHeight || 9,
        };
      }
      stopServiceIfIdle();
    } else if (t.tagName === 'AUDIO') {
      activeAudio = t as HTMLAudioElement;
      audioPlaying = true;
      if (document.hidden) {
        const b = getBridge();
        if (b) {
          // مدیا سشن وب را غیرفعال کن تا WebView نوتیفیکیشن خودش (Video player) را نشان ندهد
          clearWebMediaSession();
          try { b.startPlayback?.('audio'); } catch { /* ignore */ }
        }
      }
    }
  }, true);

  document.addEventListener('pause', (e) => {
    const t = (e.target as HTMLElement) || null;
    if (!t || typeof t.tagName !== 'string') return;
    if (t.tagName === 'AUDIO') {
      activeAudio = t as HTMLAudioElement;
      audioPlaying = false;
      if (!document.hidden) stopServiceIfIdle();
    }
  }, true);

  // بستن PiP مرورگر → بازنشانی وضعیت و ادامه پخش در صفحه (بدون نیاز به کلیک دوم)
  document.addEventListener('leavepictureinpicture', () => {
    if (videoBgActive) {
      videoBgActive = false;
      emitVideoBgState(false);
      stopServiceIfIdle();
    }
    const v = activeVideo;
    if (v && v.paused) {
      try { v.play().catch(() => { /* ignore */ }); } catch { /* ignore */ }
    }
  });

  document.addEventListener('ended', () => {
    audioPlaying = false;
    activeVideo = null;
    activeAudio = null;
    stopServiceIfIdle();
  }, true);

  // مجوز نوتیفیکیشن (اندروید ۱۳+) بعد از اجازه کاربر گرفته شد →
  // نوتیفیکیشن پخش پس‌زمینه که هنگام دیالوگ سرکوب شده بود را دوباره نمایش بده
  window.addEventListener('mahfel-permission-result', () => {
    const b = getBridge();
    if (!b) return;
    if (audioPlaying || nativeMode) {
      try { b.startPlayback?.('audio'); } catch { /* ignore */ }
      try { updateAudioBackgroundState(true, 0, 0); } catch { /* ignore */ }
    }
  });

  document.addEventListener('visibilitychange', () => {
    const b = getBridge();
    if (document.hidden) {
      // ویدیو → هندآف خودکار مثل یوتیوب (پلیر شناور نیتیو فقط با مجوز overlay — بدون PiP)
      const v = activeVideo;
      if (v && !v.paused && !videoBgActive && !videoInPip()) {
        if (b) {
          if (currentVideoSource) {
            startVideoBackground(v, currentVideoSource);
          }
          // بدون منبع ثبت‌شده → پخش در WebView ادامه می‌یابد (کنترل از نوتیفیکیشن)
        } else if ((document as any).pictureInPictureEnabled) {
          try { (v as any).requestPictureInPicture?.().catch(() => { /* ignore */ }); } catch { /* ignore */ }
        }
      }
      // صوت → هندآف به پلیر نیتیو (مثل اسپاتیفای: پخش با بستن اپ ادامه دارد)
      if (b && !nativeMode) {
        const a = activeAudio;
        if (a && !a.paused) handoffAudioToNative(a);
      }
    } else {
      // برگشت به جلو → بازگرداندن پخش به وب
      if (b && nativeMode) {
        handbackAudioFromNative(activeAudio);
      }
      // ویدیو PiP → توقف PiP و ادامه در اپ از همان موقعیت
      // handlers رو نگه میداریم تا stop:POSITION_MS event اجرا بشه و onStop callback فراخوانی بشه
      if (videoBgActive) {
        try { nativeCommand({ cmd: 'vstop' }); } catch { /* ignore */ }
        try { (document as any).exitPictureInPicture?.().catch(() => { /* ignore */ }); } catch { /* ignore */ }
      }
      stopServiceIfIdle();
    }
  });

  // رویدادهای پلیر نیتیو ویدیو (شناور / PiP)
  window.addEventListener('mahfel-media-command', (e) => {
    const detail = ((e as CustomEvent).detail || '') as string;
    if (detail === 'video-native-start') {
      videoBgActive = true;
      emitVideoBgState(true);
    } else if (detail === 'pip-enter') {
      // PiP فعال شد — اطمینان از sync وضعیت
      videoBgActive = true;
      emitVideoBgState(true);
    } else if (detail === 'no-overlay') {
      // دیگر استفاده نمی‌شود: PiP نیتیو بدون هیچ مجوزی کار می‌کند — فقط ادامه‌ی پخش در WebView
      const b2 = getBridge();
      if (activeVideo && activeVideo.paused) {
        try { activeVideo.play().catch(() => { /* ignore */ }); } catch { /* ignore */ }
      }
    } else if (detail === 'stop' || detail.startsWith('stop:')) {
      const pos = detail.startsWith('stop:') ? parseInt(detail.slice(5), 10) || 0 : 0;
      const wasActive = videoBgActive;
      videoBgActive = false;
      const h = videoBgHandlers;
      videoBgHandlers = null;
      stopServiceIfIdle();
      emitVideoBgState(false);
      if (wasActive) h?.onStop?.(pos);
    } else if (detail.startsWith('track:')) {
      const idx = parseInt(detail.slice(6), 10);
      if (isFinite(idx)) videoBgHandlers?.onTrackChange?.(idx);
    } else if (detail === 'play') {
      videoBgHandlers?.onPlay?.();
    } else if (detail === 'pause') {
      videoBgHandlers?.onPause?.();
    }
  });

  window.addEventListener('pagehide', () => {
    const v = activeVideo;
    if (v && !v.paused && (v as any).autoPictureInPicture !== true && document.pictureInPictureEnabled) {
      try {
        (v as any).requestPictureInPicture?.().catch(() => { /* ignore */ });
      } catch { /* ignore */ }
    }
  });
};
