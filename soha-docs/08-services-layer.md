# بخش ۸: لایه سرویس‌ها — تحلیل فایل‌های services/

**مسیر فایل‌ها:** `services/*.ts`  
**هدف:** تحلیل جزئی سرویس‌های کلاینت شامل پخش پس‌زمینه، ارتباط لحظه‌ای، هوش مصنوعی و Push Notification

---

## فهرست مطالب

1. [مقدمه](#مقدمه)
2. [backgroundPlayback.ts — سرویس پخش پس‌زمینه (۷۲۷ خط)](#backgroundplaybackts-سرویس-پخش-پس‌زمینه-۷۲۷-خط)
   - [رابط BridgeLike و شناسایی پلتفرم](#رابط-bridgelike-و-شناسایی-پلتفرم)
   - [مدیریت وضعیت](#مدیریت-وضعیت)
   - [توابع ابزاری پلتفرم](#توابع-ابزاری-پلتفرم)
   - [پخش صوتی پس‌زمینه](#پخش-صوتی-پس‌زمینه)
   - [پخش ویدیویی پس‌زمینه (PiP)](#پخش-ویدیویی-پس‌زمینه-pip)
   - [سیستم هندآف (Handoff/Handback)](#سیستم-هندآف-handoffhandback)
   - [رویدادهای DOM و لایف‌سایکل](#رویدادهای-dom-و-لایف‌سایکل)
3. [realtime.ts — سرویس WebSocket (۶۸ خط)](#realtimets-سرویس-websocket-۶۸-خط)
4. [ai.ts — سرویس هوش مصنوعی (۱۵۲ خط)](#aits-سرویس-هوش-مصنوعی-۱۵۲-خط)
5. [webPush.ts — سرویس Push Notification (۱۴۰ خط)](#webpushts-سرویس-push-notification-۱۴۰-خط)
6. [api.ts — لایه API (۱۰۷۲ خط)](#apits-لایه-api-۱۰۷۲-خط)
7. [الگوهای طراحی و اتصالات](#الگوهای-طراحی-و-اتصالات)

---

## مقدمه

لایه سرویس‌ها در پوشه `services/` شامل فایل‌های TypeScript است که بین UI (React) و سرور (Express) عمل می‌کنند. این سرویس‌ها مسئول:

1. **پخش پس‌زمینه** — کنترل پخش صوتی و ویدیویی در پس‌زمینه (مثل Spotify/YouTube)
2. **ارتباط لحظه‌ای** — WebSocket برای به‌روزرسانی فوری داده‌ها
3. **هوش مصنوعی** — چت‌بات AI و خلاصه‌سازی محتوا
4. **Push Notification** — مدیریت Web Push و Service Worker
5. **API Client** — لایه انتزاعی برای تمام درخواست‌های HTTP

---

## backgroundPlayback.ts — سرویس پخش پس‌زمینه (۷۲۷ خط)

**مسیر فایل:** `services/backgroundPlayback.ts`  
**تعداد خطوط:** ۷۲۷  
**بزرگترین فایل سرویس‌ها**

### رابط BridgeLike و شناسایی پلتفرم

```typescript
interface BridgeLike {
  isApp?: () => boolean;
  startPlayback?: (type: string) => void;
  stopPlayback?: () => void;
  enterPip?: () => void;
  showNotification?: (title: string, body: string, link?: string) => void;
  updateMediaMeta?: (title: string, artist: string, album: string, artworkUrl: string, durationMs: number) => void;
  setMediaPlaying?: (playing: boolean, positionMs: number, durationMs: number) => void;
  updateAudioMeta?: (title: string, artist: string, album: string, artworkUrl: string, durationMs: number) => void;
  setAudioPlaying?: (playing: boolean, positionMs: number, durationMs: number) => void;
  setVideoPlaying?: (playing: boolean) => void;
  setVideoMeta?: (title: string, width: number, height: number) => void;
  floatingVideoCommand?: (json: string) => void;
  canDrawOverlays?: () => boolean;
  requestOverlayPermission?: () => void;
  requestNotificationPermission?: () => void;
  enterVideoPip?: (json: string) => void;
  getAppVersion?: () => string;
  downloadAndInstallApk?: (url: string) => void;
  getFcmToken?: () => string;
  startOtpAutofill?: () => boolean;
}
```

**تحلیل:** `BridgeLike` یک **interface** است که رابط بین JavaScript و پلتفرم‌های بومی (Android/iOS) را تعریف می‌کند. تمام متدها اختیاری (`?`) هستند چون ممکن است در همه پلتفرم‌ها در دسترس نباشند.

**پلتفرم‌های پشتیبانی شده:**

| پلتفرم | Bridge | ویژگی‌ها |
|---------|--------|----------|
| Android (APK) | `window.AndroidBridge` | PiP نیتیو، نوتیفیکیشن نیتیو، FCM، OTP Autofill |
| iOS | `window.MahfelIosBridge` | نوتیفیکیشن نیتیو |
| Desktop (Electron) | `window.mahfelDesktop` | نوتیفیکیشن سیستمی، باز کردن لینک خارجی |
| Web | — | PiP مرورگر، MediaSession API |

#### تابع getBridge (خط ۵۰-۵۵)

```typescript
const getBridge = (): BridgeLike | null => {
  if (typeof window === 'undefined') return null;
  const live = (window as any).AndroidBridge || (window as any).MahfelIosBridge || null;
  if (live) bridge = live;
  return live || bridge;
};
```

**تحلیل:** به صورت lazy bridge عمل می‌کند. ابتدا `AndroidBridge` و سپس `MahfelIosBridge` را بررسی می‌کند. نتیجه در متغیر سراسری `bridge` کش می‌شود.

### مدیریت وضعیت

```typescript
let bridge: BridgeLike | null = null;
let activeVideo: HTMLVideoElement | null = null;
let activeAudio: HTMLAudioElement | null = null;
let audioPlaying = false;
let nativeMode = false;
```

| متغیر | نوع | توضیح |
|-------|------|-------|
| `bridge` | BridgeLike \| null | رابط پلتفرم بومی (کش شده) |
| `activeVideo` | HTMLVideoElement \| null | ویدیوی در حال پخش |
| `activeAudio` | HTMLAudioElement \| null | صوت در حال پخش |
| `audioPlaying` | boolean | آیا صوت در حال پخش است |
| `nativeMode` | boolean | آیا پخش در پلیر نیتیو است (نه WebView) |

### توابع ابزاری پلتفرم

#### شناسایی اپلیکیشن (خط ۵۷-۶۰)

```typescript
export const isApp = (): boolean => {
  const b = getBridge();
  return !!b && typeof b.isApp === 'function' && b.isApp() === true;
};
```

#### شناسایی iOS (خط ۶۳-۷۱)

```typescript
export const isIos = (): boolean => {
  const b = getBridge();
  if (b && typeof (b as any).isIos === 'function') {
    try {
      return (b as any).isIos() === true;
    } catch { /* ignore */ }
  }
  return false;
};
```

#### شناسایی Desktop (خط ۱۱۹-۱۲۶)

```typescript
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return !!(window as any).mahfelDesktop?.isElectron;
  } catch {
    return /Electron/i.test(navigator.userAgent);
  }
};
```

#### دریافت نسخه اپ (خط ۸۴-۹۳)

```typescript
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
```

#### مقایسه نسخه (خط ۱۷۵-۱۹۱)

```typescript
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
```

**تحلیل:** مقایسه نسخه‌ها به فرمت `x.y.z`. مثال: `2.1.0` جدیدتر از `2.0.9` است. از چپ به راست مقایسه می‌کند و اگر هر بخشی بزرگتر باشد، `true` برمی‌گرداند.

#### توکن FCM (خط ۱۰۸-۱۱۶)

```typescript
export const getFcmToken = (): string => {
  const b = getBridge();
  if (b && typeof b.getFcmToken === 'function') {
    try {
      return b.getFcmToken() || '';
    } catch { /* ignore */ }
  }
  return '';
};
```

**تحلیل:** توکن FCM (Firebase Cloud Messaging) برای ارسال نوتیفیکیشن به اندروید وقتی اپ بسته است.

### پخش صوتی پس‌زمینه

#### updateBackgroundMeta (خط ۲۰۹-۲۲۱)

```typescript
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
```

**تحلیل:** اطلاعات متا (عنوان، هنرمند، آلبوم، کاور، مدت زمان) را به سرویس نیتیو اندروید ارسال می‌کند. این اطلاعات در نوتیفیکیشن پخش پس‌زمینه و صفحه قفل نمایش داده می‌شوند.

#### playInBackgroundAudio (خط ۳۹۶-۴۱۱)

```typescript
export const playInBackgroundAudio = (meta: BackgroundMediaMeta) => {
  audioPlaying = true;
  const b = getBridge();
  if (b) {
    clearWebMediaSession();
    try { b.startPlayback?.('audio'); } catch { /* ignore */ }
    updateAudioBackgroundMeta(meta);
    updateAudioBackgroundState(true, 0, Math.round((meta.duration || 0) * 1000));
    return;
  }
  applyMediaSession(meta);
};
```

**تحلیل:** دو مسیر عملکرد:
1. **APK:** مدیا سشن وب غیرفعال شده و سرویس نیتیو اندروید کنترل را بر عهده می‌گیرد
2. **وب:** MediaSession API مرورگر برای نمایش نوتیفیکیشن پخش استفاده می‌شود

#### clearWebMediaSession (خط ۳۵۸-۳۶۸)

```typescript
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
```

**تحلیل:** مدیا سشن وب را غیرفعال می‌کند تا WebView نوتیفیکیشن خودش را نشان ندهد (چون نوتیفیکیشن توسط سرویس نیتیو اندروید ساخته می‌شود).

### پخش ویدیویی پس‌زمینه (PiP)

#### رابط VideoBgSource (خط ۴۲۰-۴۲۹)

```typescript
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
```

**تحلیل:** اطلاعات منبع ویدیویی برای پخش در پس‌زمینه. شامل لیست پخش (queue) برای پشتیبانی از پخش متوالی.

#### startVideoBackground (خط ۴۸۰-۵۳۶)

```typescript
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
    try {
      const w = videoEl.videoWidth || src.width || 16;
      const h = videoEl.videoHeight || src.height || 9;
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
  // وب: PiP استاندارد مرورگر
  if (typeof document !== 'undefined' && (document as any).pictureInPictureEnabled) {
    // ...
  }
  return 'none';
};
```

**تحلیل:** سه مرحله اجرا:
1. **APK:** PiP نیتیو اندروید (PipActivity) — فقط ویدیو، بدون دکمه
2. **وب:** PiP استاندارد مرورگر — فقط ویدیو
3. **هیچ‌کدام:** `'none'`

### سیستم هندآف (Handoff/Handback)

#### handoffAudioToNative (خط ۳۱۹-۳۳۶)

```typescript
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
```

**تحلیل:** وقتی کاربر اپ را به پس‌زمینه می‌برد:
1. پخش WebView متوقف می‌شود
2. `nativeMode = true` تنظیم می‌شود
3. مدیا سشن وب غیرفعال می‌شود
4. فرمان `play` به پلیر نیتیو ارسال می‌شود
5. اطلاعات موقعیت فعلی (URL، زمان، شناسه پادکست) ارسال می‌شود

#### handbackAudioFromNative (خط ۳۳۹-۳۵۴)

```typescript
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
      audioPlaying = true;
      audioEl.play().catch(() => { /* ignore */ });
    }
  } catch { /* ignore */ }
};
```

**تحلیل:** وقتی کاربر اپ را به جلو برمی‌گرداند:
1. وضعیت نیتیو از پلیر خوانده می‌شود (snapshot)
2. فرمان `handback` ارسال می‌شود
3. URL و موقعیت بازیابی می‌شوند
4. پخش در WebView ادامه می‌یابد

### رویدادهای DOM و لایف‌سایکل

#### initBackgroundPlayback (خط ۵۷۳-۷۲۷)

این تابع تمام listener های DOM را ثبت می‌کند:

**رویداد play (خط ۵۷۶-۶۰۶):**
```javascript
document.addEventListener('play', (e) => {
  const t = (e.target as HTMLElement) || null;
  if (t.tagName === 'VIDEO') {
    activeVideo = t as HTMLVideoElement;
    // فعال‌سازی autoPictureInPicture
  } else if (t.tagName === 'AUDIO') {
    activeAudio = t as HTMLAudioElement;
    audioPlaying = true;
    if (document.hidden) {
      // هندآف به پلیر نیتیو
    }
  }
}, true);
```

**رویداد visibilitychange (خط ۶۴۹-۶۸۲):**
```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // ویدیو → هندآف خودکار مثل یوتیوب
    // صوت → هندآف به پلیر نیتیو
  } else {
    // برگشت → بازگرداندن پخش به وب
    // ویدیو PiP → توقف PiP و ادامه در اپ
  }
});
```

**رویداد mahfel-media-command (خط ۶۸۵-۷۱۷):**

```javascript
window.addEventListener('mahfel-media-command', (e) => {
  const detail = ((e as CustomEvent).detail || '') as string;
  if (detail === 'video-native-start') {
    videoBgActive = true;
  } else if (detail === 'pip-enter') {
    videoBgActive = true;
  } else if (detail === 'stop' || detail.startsWith('stop:')) {
    const pos = detail.startsWith('stop:') ? parseInt(detail.slice(5), 10) || 0 : 0;
    // توقف و بازنشانی وضعیت
  } else if (detail.startsWith('track:')) {
    const idx = parseInt(detail.slice(6), 10);
    // تغییر آهنگ
  } else if (detail === 'play') {
    videoBgHandlers?.onPlay?.();
  } else if (detail === 'pause') {
    videoBgHandlers?.onPause?.();
  }
});
```

**تحلیل:** رویدادهای سفارشی از پلیر نیتیو اندروید دریافت می‌شوند. این رویدادها از طریق `AndroidBridge` به WebView ارسال می‌شوند.

---

## realtime.ts — سرویس WebSocket (۶۸ خط)

**مسیر فایل:** `services/realtime.ts`  
**تعداد خطوط:** ۶۸

### ساختار کلی

```typescript
type RealtimeHandlers = { onDataChanged: (type: string, payload?: any) => void };

let ws: WebSocket | null = null;
let retryDelay = 1000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let handlers: RealtimeHandlers | null = null;
```

**تحلیل:** یک کلاینت WebSocket ساده با سیستم **اتصال مجدد خودکار (Auto-reconnect)**.

### URL سرور WebSocket (خط ۹-۱۲)

```typescript
const getWsUrl = (): string => {
  const base = window.location.origin.replace(/^http/, 'ws');
  return `${base}/ws`;
};
```

**تحلیل:** آدرس WebSocket از آدرس فعلی صفحه ساخته می‌شود. `http` به `ws` و `https` به `wss` تبدیل می‌شود.

### سیستم اتصال مجدد (خط ۱۴-۱۹)

```typescript
const scheduleReconnect = () => {
  if (!handlers) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 3000);
};
```

**تحلیل:** از الگوی **Exponential Backoff** استفاده می‌کند:
- اولین تلاش: ۱ ثانیه
- دومین تلاش: ۲ ثانیه
- سومین تلاش: ۳ ثانیه (حداکثر)

### اتصال (خط ۲۱-۴۳)

```typescript
const connect = () => {
  if (!handlers) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  try {
    ws = new WebSocket(getWsUrl());
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onopen = () => { retryDelay = 1000; };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string);
      if (msg.event === 'data-changed' && msg.data?.type && handlers) {
        handlers.onDataChanged(String(msg.data.type), msg.data);
      }
    } catch { /* ignore */ }
  };
  ws.onclose = () => scheduleReconnect();
  ws.onerror = () => {
    try { ws?.close(); } catch { /* ignore */ }
  };
};
```

**تحلیل:** وقتی پیام `data-changed` از سرور دریافت می‌شود، callback `onDataChanged` فراخوانی می‌شود. این پیام‌ها توسط `broadcast.js` در سرور ارسال می‌شوند.

### API عمومی

```typescript
export const reconnectNow = () => {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  retryDelay = 1000;
  if (ws) {
    try { if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) return; ws.close(); } catch { /* ignore */ }
  }
  connect();
};

export const startRealtime = (h: RealtimeHandlers) => {
  handlers = h;
  connect();
};

export const stopRealtime = () => {
  handlers = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  try { ws?.close(); } catch { /* ignore */ }
  ws = null;
};

export const isRealtimeConnected = (): boolean => !!ws && ws.readyState === WebSocket.OPEN;
```

---

## ai.ts — سرویس هوش مصنوعی (۱۵۲ خط)

**مسیر فایل:** `services/ai.ts`  
**تعداد خطوط:** ۱۵۲

### ساختار کلی

```typescript
import { Podcast, Video, Post, PublishedBook, Author } from '../types';
import { getApiBase } from './api';

const AI_CHAT_URL = () => `${getApiBase()}/ai/chat`;
```

**تحلیل:** تمام درخواست‌های AI از طریق سرور بک‌اند ارسال می‌شوند (نه مستقیماً به OpenRouter). این برای امنیت کلید API ضروری است.

### سیستم RAG (Retrieval-Augmented Generation)

#### chatViaServer (خط ۱۱-۳۱)

```typescript
async function chatViaServer(messages: ChatMessage[], options?: { grounding?: boolean; model?: string; maxTokens?: number }): Promise<{ content: string; sources: any[]; grounded: boolean }> {
  const res = await fetch(AI_CHAT_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      grounding: options?.grounding ?? false,
      model: options?.model || 'google/gemini-2.0-flash-001',
      maxTokens: options?.maxTokens || 4096,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `خطای سرور: ${res.status}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'AI Error');
  lastSources = data.sources || [];
  const content = data.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.';
  return { content, sources: lastSources, grounded: !!data.grounded };
}
```

**تحلیل:** درخواست‌ها به سرور ارسال می‌شوند و سرور آن‌ها را به OpenRouter/Gemini forwarding می‌کند. گزینه `grounding` مشخص می‌کند آیا از داده‌های دیتابیس (corpus) برای پاسخ‌دهی استفاده شود.

#### buildCompactCatalog (خط ۳۳-۶۰)

```typescript
function buildCompactCatalog(data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): string {
  const lines: string[] = [];
  lines.push('=== پادکست‌ها ===');
  data.podcasts.forEach((p, i) => {
    const eps = p.episodes.map((ep, j) => `${j + 1}.${ep.title}`).join(', ');
    lines.push(`${i + 1}. [${p.id}] "${p.title}" - ${p.description?.slice(0, 80) || ''} (${p.episodes.length}جلسه: ${eps})`);
  });
  // ... ویدیوها، کتاب‌ها، پست‌ها
  return lines.join('\n');
}
```

**تحلیل:** کاتالوگ فشرده‌ای از تمام محتوای محفل برای ارسال به AI می‌سازد. این کاتالوگ در **System Prompt** قرار می‌گیرد تا AI بتواند به سوالات درباره محتوا پاسخ دهد.

#### getSystemPrompt (خط ۶۲-۸۳)

```typescript
function getSystemPrompt(data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): string {
  const catalog = buildCompactCatalog(data);
  return `تو "محفل AI" هستی، دستیار هوشمند پلتفرم "محفل" (سرای هنر و اندیشه)...

تو دو نوع کار انجام میدی:
۱. پاسخ به سوالات عمومی (هر موضوعی)
۲. کمک با محتوای محفل (جستجو، معرفی، خلاصه و تحلیل)

قانون‌ها:
- اگه سوال درباره محتوای محفله → از داده‌های زیر تحلیل کن
- اگه سوال عمومیه → با دانش خودت پاسخ بده
- پاسخ رو مرتب و تحلیلی بده
- در انتهای هر پاسخ، ۲-۳ سوال پیشنهادی مرتبط بده
- به فارسی روان پاسخ بده

⚡ کدهای دکمه (وقتی محتوای محفل پیدا کردی):
[PODCAST:ID] | [EPISODE:PODCAST_ID:شماره_جلسه] | [VIDEO:ID] | [BOOK:ID]

محتوای محفل:
${catalog}`;
}
```

**تحلیل:** System Prompt شامل:
1. هویت AI (محفل AI)
2. دو نوع کار (عمومی + محتوای محفل)
3. قوانین پاسخ‌دهی
4. کدهای دکمه برای لینک‌دهی به محتوا
5. کاتالوگ محتوا

### توابع عمومی

#### aiAssistant (خط ۹۰-۹۵)

```typescript
export async function aiAssistant(message: string, data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): Promise<string> {
  return chat([
    { role: 'system', content: getSystemPrompt(data) },
    { role: 'user', content: message }
  ]);
}
```

#### ragChat (خط ۹۷-۰۲)

```typescript
export async function ragChat(message: string, data?: { ... }): Promise<{ content: string; sources: any[]; grounded: boolean }> {
  return chatViaServer([
    ...(data ? [{ role: 'system' as const, content: getSystemPrompt(data) }] : []),
    { role: 'user' as const, content: message },
  ], { grounding: true });
}
```

**تحلیل:** RAG Chat با `grounding: true` — یعنی ابتدا از دیتابیس جستجو شده و سپس AI بر اساس نتایج پاسخ می‌دهد.

#### توابع خلاصه‌سازی (خط ۱۰۴-۱۳۰)

```typescript
export async function summarizePodcast(podcast: Podcast, episodeIndex?: number): Promise<string> { ... }
export async function summarizeVideo(video: Video): Promise<string> { ... }
export async function summarizeBook(book: PublishedBook): Promise<string> { ... }
```

**تحلیل:** هر تابع اطلاعات محتوا را به صورت متن ساختاریافته آماده کرده و به AI ارسال می‌کند.

#### smartSearch (خط ۱۳۲-۱۳۸)

```typescript
export async function smartSearch(query: string, data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[] }): Promise<string> {
  const catalog = buildCompactCatalog({ ...data, authors: [] });
  return (await chatViaServer([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی...' },
    { role: 'user', content: `جستجو: ${query}\n\nکاتالوگ موجود:\n${catalog}` }
  ], { grounding: false })).content;
}
```

---

## webPush.ts — سرویس Push Notification (۱۴۰ خط)

**مسیر فایل:** `services/webPush.ts`  
**تعداد خطوط:** ۱۴۰

### متغیرهای localStorage

```typescript
const PUSH_KEY = 'soha_push_enabled';
const NOTIF_KEY = 'soha_notif_enabled';
```

**تحلیل:** وضعیت فعال/غیرفعال بودن Push Notification در localStorage ذخیره می‌شود.

### تشخیص اپلیکیشن بومی (خط ۱۶-۲۱)

```typescript
const isNativeApp = (): boolean => {
  try {
    const b = (window as any).Capacitor;
    return !!(b && b.isNativePlatform && b.isNativePlatform());
  } catch { return false; }
};
```

**تحلیل:** در اپلیکیشن‌های بومی (Capacitor)، Service Worker فعال نمی‌شود بنابراین Web Push غیرفعال است.

### enableWebPush (خط ۶۲-۱۰۷)

```typescript
export const enableWebPush = async (): Promise<boolean> => {
  try {
    if (isNativeApp() || !isPushSecureContext() || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushEnabled(false);
      return false;
    }
    const publicKey = await getPushPublicKey();
    if (!publicKey) {
      setPushEnabled(false);
      return false;
    }

    let reg = await registerServiceWorker();
    if (!reg) {
      setPushEnabled(false);
      return false;
    }
    if (!reg.active) {
      await new Promise<void>((resolve) => {
        const check = () => (reg?.active ? resolve() : setTimeout(check, 200));
        check();
      });
      reg = (await navigator.serviceWorker.getRegistration()) || reg;
    }

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushEnabled(false);
        return false;
      }
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const ok = await subscribeToPush(subscription);
    setPushEnabled(ok);
    return ok;
  } catch {
    setPushEnabled(false);
    return false;
  }
};
```

**تحلیل جریان:**
1. بررسی شرایط (غیر بومی، Secure Context، Service Worker، PushManager)
2. دریافت کلید عمومی VAPID از سرور
3. ثبت Service Worker
4. صبر برای فعال شدن Service Worker
5. دریافت درخواست مجوز نوتیفیکیشن از کاربر
6. ایجاد اشتراک Push
7. ارسال اشتراک به سرور

### urlBase64ToUint8Array (خط ۴۲-۵۱)

```typescript
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
```

**تحلیل:** تبدیل کلید VAPID از فرمت Base64URL به Uint8Array. این تبدیل برای API Push Manager مرورگر ضروری است.

---

## api.ts — لایه API (۱۰۷۲ خط)

**مسیر فایل:** `services/api.ts`  
**تعداد خطوط:** ۱۰۷۲

### ساختار کلی

```typescript
export const getApiBase = (): string => {
  const saved = localStorage.getItem('mahfel_server_url');
  if (saved) return saved;
  return '/api';
};

const getToken = (): string | null => localStorage.getItem('soha_token');

const headers = (includeAuth = true): Record<string, string> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
};

const apiFetch = async <T>(endpoint: string, options?: RequestInit): Promise<T | null> => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers(), ...options?.headers },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'خطای سرور' }));
      if (err.banned) return { error: err.error, banned: true } as any;
      if (err.warnings) return { error: err.error, warnings: err.warnings } as any;
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return null;
  }
};
```

**تحلیل:**
- **`getApiBase`** — آدرس API از localStorage خوانده می‌شود (قابل تغییر در دیباگ)
- **`headers`** — هدر Authorization به صورت خودکار اضافه می‌شود
- **`apiFetch`** — تابع مرکزی برای تمام درخواست‌ها. خطاهای بن و اخطار به صورت ویژه مدیریت می‌شوند

### دسته‌بندی توابع API

| دسته | توابع | تعداد |
|------|-------|-------|
| Auth | register, login, sendOtp, verifyOtp, resetPassword, completeProfile, getMe, updateInterests, updateLibrary, updateProfile | ۱۰ |
| Podcasts | getPodcasts, getPodcast, recordPodcastPlay, likePodcast | ۴ |
| Videos | getVideos, recordVideoView, likeVideo, prefetchStream, getVideoStream | ۵ |
| Playlists | getVideoPlaylists, getVideoPlaylist, getAdminVideoPlaylists, createVideoPlaylist, updateVideoPlaylist, deleteVideoPlaylist | ۶ |
| Books | getBooks, getPublishedBooks, getMyNotes, createPublishedBook, updatePublishedBook, deletePublishedBook, toggleNoteLike, getAuthorNotes | ۸ |
| Comments | getComments, addComment, deleteComment, updateComment, likeComment | ۵ |
| Posts | getPosts, createPost, shareToMahfel, deletePost, updatePost, likePost, addPostComment, deletePostComment, updatePostComment | ۹ |
| Albums | getAlbums, createAlbum, updateAlbum, deleteAlbum | ۴ |
| Admin | getAdminStats, getAdminUsers, updateUserRole, updateUser, deleteUser, getAdminPosts, adminDeletePost, adminUpdatePost, getAdminComments, adminDeleteComment, adminUpdateComment, getAdminAnalytics, getAdminAnalyticsSegments, getAdminInsights, getAdminActivity, adminExportData, adminSearchGlobal, adminBulkUsers, adminBulkPosts, adminPurgePosts, adminBulkComments | ۲۱ |
| Notifications | getNotifications, registerFcmToken, unregisterFcmToken, adminSendNotification, adminDeleteNotification | ۵ |
| Purchase | createPurchaseRequest, getMyPurchaseRequests, adminGetPurchaseRequests, adminUpdatePurchaseRequest, adminGetPurchaseStats | ۵ |
| Expenses | adminGetExpenses, adminCreateExpense, adminDeleteExpense | ۳ |
| Support | submitSupportMessage, getSupportMessages, markSupportMessageRead, deleteSupportMessage | ۴ |
| App Update | getAppUpdate, adminSaveAppUpdate, adminUploadApk | ۳ |
| Web Push | getPushPublicKey, subscribeToPush, unsubscribeFromPush | ۳ |
| Admin Roles | requestAdminAccess, getMyAdminRequest, getAdminRequests, approveAdminRequest, rejectAdminRequest, changeUserRole, removeAdmin, getAdminList, updateAdminPermissions, getMyPermissions, getRolePermissions, updateRolePermissions, getUserPermissions, resetUserPermissions | ۱۴ |

**تعداد کل توابع API:** ۱۰۰+ تابع

---

## الگوهای طراحی و اتصالات

### الگوهای استفاده شده

| الگو | سرویس | توضیح |
|------|-------|-------|
| **Bridge Pattern** | backgroundPlayback | انتزاع رابط با پلتفرم بومی |
| **Exponential Backoff** | realtime | اتصال مجدد با تأخیر فزاینده |
| **State Machine** | backgroundPlayback | مدیریت وضعیت nativeMode |
| **Observer Pattern** | backgroundPlayback | رویدادهای سفارشی DOM |
| **Service Layer** | api.ts | انتزاع لایه API |
| **RAG** | ai.ts | جستجو + تولید پاسخ |
| **VAPID** | webPush | احراز هویت Web Push |

### اتصال به فایل‌های دیگر

| سرویس | اتصال به |
|-------|----------|
| `backgroundPlayback.ts` | `types.ts` (انترفیس‌ها) |
| `realtime.ts` | سرور WebSocket (پورت ۵۰۰۱) |
| `ai.ts` | `api.ts` (getApiBase)، `types.ts` |
| `webPush.ts` | `api.ts` (getPushPublicKey, subscribeToPush) |
| `api.ts` | `types.ts` (انترفیس‌ها) |

---

**تعداد کل خطوط:** ۷۲۷ + ۶۸ + ۱۵۲ + ۱۴۰ + ۱۰۷۲ = **۲۱۵۹ خط**
