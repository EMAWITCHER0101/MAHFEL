interface BridgeLike {
  isApp?: () => boolean;
  startPlayback?: (type: string) => void;
  stopPlayback?: () => void;
  enterPip?: () => void;
  showNotification?: (title: string, body: string) => void;
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
let audioPlaying = false;

const getBridge = (): BridgeLike | null => {
  if (typeof window === 'undefined') return null;
  if (!bridge) bridge = (window as any).AndroidBridge || null;
  return bridge;
};

export const isApp = (): boolean => {
  const b = getBridge();
  return !!b && typeof b.isApp === 'function' && b.isApp() === true;
};

export const sendNativeNotification = (title: string, body: string) => {
  const b = getBridge();
  if (b && typeof b.showNotification === 'function') {
    try { b.showNotification(title, body); } catch { /* ignore */ }
  }
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

/* ---------- دکمه: پخش در پسزمینه (صوت) ---------- */
const applyMediaSession = (meta: BackgroundMediaMeta) => {
  try {
    const ms = (navigator as any).mediaSession;
    if (!ms) return;
    ms.metadata = new (window as any).MediaMetadata({
      title: meta.title || '',
      artist: meta.artist || 'محفل',
      album: meta.album || '',
      artwork: meta.artwork ? [{ src: meta.artwork, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    const setHandler = (action: string, fn: (() => void) | null) => {
      try { ms.setActionHandler(action, fn); } catch { /* unsupported action */ }
    };
    setHandler('play', () => meta.onPlay?.());
    setHandler('pause', () => meta.onPause?.());
    setHandler('seekto', (details: any) => { if (details && typeof details.seekTime === 'number') meta.onSeek?.(details.seekTime); });
    setHandler('nexttrack', () => meta.onNext?.());
    setHandler('previoustrack', () => meta.onPrev?.());
  } catch { /* ignore */ }
};

export const playInBackgroundAudio = (meta: BackgroundMediaMeta) => {
  audioPlaying = true;
  applyMediaSession(meta);
  const b = getBridge();
  if (b) {
    try { b.startPlayback?.('audio'); } catch { /* ignore */ }
    if (meta.title) { try { b.showNotification?.('پخش در پسزمینه', meta.title); } catch { /* ignore */ } }
  }
};

export const stopBackgroundAudio = () => {
  audioPlaying = false;
  stopServiceIfIdle();
};

/* ---------- دکمه: پخش در پسزمینه (ویدیو / PiP) ---------- */
export const enterBackgroundVideo = async (videoEl: HTMLVideoElement | null): Promise<boolean> => {
  if (!videoEl) return false;
  activeVideo = videoEl;
  const b = getBridge();
  if (b && !document.pictureInPictureElement) {
    try { b.enterPip?.(); } catch { /* ignore */ }
    return true;
  }
  if (typeof document !== 'undefined' && (document as any).pictureInPictureEnabled && !videoInPip()) {
    try {
      await (videoEl as any).requestPictureInPicture?.();
      return true;
    } catch { return false; }
  }
  if (b) {
    try { b.enterPip?.(); return true; } catch { /* ignore */ }
  }
  return false;
};

/* ---------- خودکار قبلی (محفوظ برای سازگاری) ---------- */
export const initBackgroundPlayback = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.addEventListener('play', (e) => {
    const t = (e.target as HTMLElement) || null;
    if (!t || typeof t.tagName !== 'string') return;
    if (t.tagName === 'VIDEO') {
      activeVideo = t as HTMLVideoElement;
      const v = t as HTMLVideoElement;
      if ((v as any).autoPictureInPicture !== false) (v as any).autoPictureInPicture = true;
      stopServiceIfIdle();
    } else if (t.tagName === 'AUDIO') {
      audioPlaying = true;
      if (document.hidden) {
        const b = getBridge();
        if (b) { try { b.startPlayback?.('audio'); } catch { /* ignore */ } }
      }
    }
  }, true);

  document.addEventListener('pause', (e) => {
    const t = (e.target as HTMLElement) || null;
    if (!t || typeof t.tagName !== 'string') return;
    if (t.tagName === 'AUDIO') {
      audioPlaying = false;
      if (!document.hidden) stopServiceIfIdle();
    }
  }, true);

  document.addEventListener('ended', () => {
    audioPlaying = false;
    activeVideo = null;
    stopServiceIfIdle();
  }, true);

  document.addEventListener('visibilitychange', () => {
    const b = getBridge();
    if (document.hidden) {
      const v = activeVideo;
      if (b && v && !v.paused && !videoInPip()) {
        try { b.enterPip?.(); } catch { /* ignore */ }
      }
      if (b && audioPlaying && !(v && !v.paused)) {
        try { b.startPlayback?.('audio'); } catch { /* ignore */ }
      }
    } else {
      stopServiceIfIdle();
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