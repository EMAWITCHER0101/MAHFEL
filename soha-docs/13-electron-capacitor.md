# بخش ۱۳: اپ دسکتاپ و موبایل — تحلیل Electron و Capacitor

## فهرست مطالب
- [مقدمه](#مقدمه)
- [Electron — اپ دسکتاپ ویندوز](#electron)
  - [main.js — فرآیند اصلی](#mainjs)
  - [preload.js — پل امنیتی](#preloadjs)
  - [مدیریت پنجره](#مدیریت-پنجره)
  - [سیستم اعلان (Notification)](#سیستم-اعلان)
  - [IPC Communication](#ipc-communication)
  - [آفلاین و کش](#آفلاین-و-کش)
- [Capacitor — اپ اندروید](#capacitor)
  - [capacitor.config.ts](#capacitor-config)
  - [ساختار پروژه اندروید](#android-structure)
  - [ پل نیتیو اندروید](#android-bridge)
  - [سرویس پخش در پس‌زمینه](#background-audio)
  - [FCM و نوتیفیکیشن push](#fcm)
- [سرویس backgroundPlayback.ts](#backgroundplayback)
  - [مدیریت حالت نیتیو](#native-mode)
  - [کنترل مدیا سشن](#media-session)
  - [آپدیت خودکار](#auto-update)
- [اتصال به App.tsx](#اتصال-به-apptx)

---

## مقدمه

اپلیکیشن «محفل» روی سه پلتفرم اجرا می‌شود:
1. **وب (مرورگر):** نسخه اصلی با React
2. **دسکتاپ (ویندوز):** از طریق Electron
3. **موبایل (اندروید):** از طریق Capacitor

هر سه پلتفرم از یک کد پایه React مشترک استفاده می‌کنند و تفاوت‌ها در لایه نیتیو مدیریت می‌شوند.

---

## Electron — اپ دسکتاپ ویندوز

### main.js

**مسیر فایل:** `electron/main.js` — ۱۲۲ سطر

#### هدف
فرآیند اصلی Electron که مدیریت پنجره، اعلان‌ها، و ارتباط با فرآیند رندرر را بر عهده دارد.

#### واردات و تنظیمات اولیه

```javascript
const { app, BrowserWindow, session, powerSaveBlocker, shell, ipcMain, Notification } = require('electron');
const path = require('path');

const APP_URL = 'https://app.soha-sima.ir';
const allowedPermissions = [
  'notifications', 'media', 'fullscreen',
  'clipboard-read', 'clipboard-sanitized-write'
];

app.setAppUserModelId('com.mahfel.app');
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('disable-http-cache');
```

- **APP_URL:** آدرس وب اپلیکیشن که در الکترون بارگذاری می‌شود
- **allowedPermissions:** مجوزهای مجاز مرورگر الکترون
- **no-proxy-server:** غیرفعال کردن پراکسی سیستم
- **disable-http-cache:** غیرفعال کردن کش HTTP برای همیشه تازه بودن محتوا

#### ایجاد پنجره

```javascript
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#0b0b0f',
    title: 'محفل',
    icon: path.join(__dirname, 'logo.png'),
    webPreferences: {
      nodeIntegration: false,      // غیرفعال کردن Node.js در رندرر
      contextIsolation: true,     // جداسازی context (امنیت)
      backgroundThrottling: false, // پخش صدا در پس‌زمینه
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.setMenuBarVisibility(false);
  win.loadURL(APP_URL);
}
```

**نکات امنیتی:**
- `nodeIntegration: false`: کد Node.js در رندرر اجرا نمی‌شود
- `contextIsolation: true`: رندرر و فرآیند اصلی جدا هستند
- `backgroundThrottling: false`: پخش صدا هنگام مینیمایز ادامه دارد

#### مدیریت خطا و آفلاین

```javascript
win.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
  if (isMainFrame && code !== -3) {  // کد -3 = ERR_ABORTED (عادی)
    showOfflinePage();
  }
});

function showOfflinePage() {
  if (!win || win.isDestroyed() || showingOffline) return;
  showingOffline = true;
  win.loadFile(path.join(__dirname, 'offline.html'), { query: { url: APP_URL } });
}
```

#### قفل نمونه تکی

```javascript
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}
```

این کد تضمین می‌کند فقط یک نمونه از اپ اجرا شود. اگر کاربر دوباره اپ را باز کند، پنجره موجود فعال می‌شود.

#### پاکسازی کش در شروع

```javascript
app.whenReady().then(async () => {
  powerSaveBlocker.start('prevent-app-suspension');
  const ses = session.defaultSession;
  await ses.clearCache();
  await ses.clearCodeCaches({});
  // ...
});
```

- **powerSaveBlocker:** جلوگیری از حالت صرفه‌جویی انرژی
- **clearCache:** پاکسازی کش مرورگر در هر بار شروع

---

### preload.js

**مسیر فایل:** `electron/preload.js` — ۱۴ سطر

#### هدف
پل امنیتی بین فرآیند اصلی و رندرر. API‌های امن در اختیار رندرر قرار می‌دهد.

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mahfelDesktop', {
  isElectron: true,
  appVersion: ipcRenderer.sendSync('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showNotification: (title, body, link) => ipcRenderer.send('show-notif', { title, body, link }),
});

ipcRenderer.on('open-notif', (_e, link) => {
  window.dispatchEvent(new CustomEvent('mahfel-open-notif', { detail: link }));
});
```

#### API در دسترس رندرر

| ویژگی | نوع | توضیح |
|--------|------|--------|
| `mahfelDesktop.isElectron` | boolean | آیا در الکترون اجرا می‌شود |
| `mahfelDesktop.appVersion` | string | نسخه اپلیکیشن |
| `mahfelDesktop.openExternal(url)` | function | باز کردن لینک در مرورگر خارجی |
| `mahfelDesktop.showNotification(title, body, link)` | function | نمایش اعلان سیستمی ویندوز |

#### رویداد بازگشتی
وقتی کاربر روی اعلان کلیک کند، `open-notif` به رندرر ارسال شده و اپ به صفحه مرتبط می‌رود.

---

### سیستم اعلان

```javascript
ipcMain.on('show-notif', (_e, data) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({
    title: (data && data.title) || 'محفل',
    body: (data && data.body) || '',
    icon: path.join(__dirname, 'logo.png'),
    silent: false,
  });
  n.on('click', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      if (data && data.link) win.webContents.send('open-notif', data.link);
    }
  });
  n.show();
});
```

**جریان:**
1. رندرر → `mahfelDesktop.showNotification()` → `ipcRenderer.send('show-notif')`
2. فرآیند اصلی → `new Notification()` → نمایش اعلان ویندوز
3. کلیک کاربر → `win.webContents.send('open-notif')` → رندرر → رویداد `mahfel-open-notif`

---

### IPC Communication

| کانال | جهت | توضیح |
|--------|------|--------|
| `get-app-version` | رندرر → اصلی | دریافت نسخه اپ (sync) |
| `open-external` | رندرر → اصلی | باز کردن لینک خارجی |
| `show-notif` | رندرر → اصلی | نمایش اعلان سیستمی |
| `open-notif` | اصلی → رندرر | کلیک روی اعلان |

---

## Capacitor — اپ اندروید

### capacitor.config.ts

**مسیر فایل:** `capacitor.config.ts` — ۱۵ سطر

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mahfel.app',
  appName: 'MAHFEL',
  webDir: 'out',
  server: {
    url: 'https://app.soha-sima.ir',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: ['87.248.145.44', 'soha-sima.ir', '*.soha-sima.ir']
  }
};

export default config;
```

**تنظیمات:**
- **appId:** شناسه یکتا اپلیکیشن (`com.mahfel.app`)
- **webDir:** فولدر خروجی Next.js (`out`)
- **server.url:** آدرس وب اصلی (Capacitor WebView این URL را بارگذاری می‌کند)
- **allowNavigation:** آدرس‌های مجاز برای WebView

### ساختار پروژه اندروید

```
android/
├── app/
│   ├── src/main/java/com/mahfel/app/
│   │   └── MainActivity.java       — اکتیویتی اصلی
│   ├── build.gradle                 — تنظیمات بیلد
│   └── src/main/AndroidManifest.xml
├── build.gradle                     — تنظیمات پروژه
├── gradle.properties
└── settings.gradle
```

### پل نیتیو اندروید

Capacitor به‌طور خودکار یک `MainActivity` ایجاد می‌کند. پلاگین‌های Capacitor (مثل `@capacitor/local-notifications`, `@capacitor/push-notifications`) پل بین JavaScript و کد Java/Kotlin نیتیو هستند.

#### MainActivity.java (الگو)

```java
package com.mahfel.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
}
```

Capacitor پلاگین‌های نیتیو را از `build.gradle` مدیریت می‌کند:

```gradle
dependencies {
    implementation project(':capacitor-android')
    // سایر پلاگین‌ها
}
```

---

### سرویس پخش در پس‌زمینه

یکی از مهم‌ترین ویژگی‌های اندروید، پخش صوت در پس‌زمینه است. این قابلیت از طریق **Media Session** و **Foreground Service** اندروید پیاده‌سازی شده.

#### مکانیزم

1. **JavaScript:** هنگام پخش صوت، اطلاعات متادیتا به نیتیو ارسال می‌شود
2. **Capacitor Plugin:** اطلاعات را به سرویس نیتیو منتقل می‌کند
3. **Foreground Service:** سرویس اندروید در نوتیفیکیشن اجرا می‌شود
4. **Media Session:** کنترل‌های لاک‌اسکرین و نوتیفیکیشن مدیریت می‌شوند

---

### FCM و نوتیفیکیشن push

برای نوتیفیکیشن push در اندروید از **Firebase Cloud Messaging (FCM)** استفاده شده.

#### ثبت توکن

```typescript
// در backgroundPlayback.ts
export const getFcmToken = (): string | null => {
  // دریافت توکن FCM از Capacitor Push Notifications
};

// در App.tsx
const syncFcmToken = useCallback(async () => {
  const token = getFcmToken();
  if (!token || !userRef.current) return;
  await registerFcmToken(token);  // ارسال به سرور
}, []);
```

#### مدیریت توکن در مدل User

```javascript
// models/User.js
fcmTokens: [{ type: String }],  // آرایه توکن‌ها (چند دستگاه)
```

#### ارسال نوتیفیکیشن

سرور از طریق Firebase Admin SDK به توکن‌های FCM پیام ارسال می‌کند:
```javascript
// server/utils/webpush.js
// ارسال به توکن‌های FCM
```

---

## سرویس backgroundPlayback.ts

### هدف
مدیریت پخش صوت/ویدیو در پس‌زمینه و ارتباط با لایه نیتیو.

### توابع اصلی

#### initBackgroundPlayback
```typescript
export const initBackgroundPlayback = () => {
  // مقداردهی اولیه سرویس پخش پس‌زمینه
};
```

#### playInBackgroundAudio
```typescript
export const playInBackgroundAudio = (config: {
  title: string;
  artist: string;
  album: string;
  artwork?: string;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onNext: () => void;
  onPrev: () => void;
}) => {
  // فعال‌سازی پخش در پس‌زمینه
};
```

#### nativeCommand
```typescript
export const nativeCommand = (cmd: {
  cmd: 'play' | 'pause' | 'resume' | 'stop' | 'next' | 'prev';
  url?: string;
  positionMs?: number;
  podcastId?: string;
  episodeIndex?: number;
  queueIndex?: number;
  queue?: any[];
}) => {
  // ارسال دستور به سرویس نیتیو
};
```

### تشخیص پلتفرم

```typescript
export const isApp = (): boolean => {
  // آیا در Capacitor (اندروید) اجرا می‌شود
};

export const isDesktop = (): boolean => {
  // آیا در Electron (دسکتاپ) اجرا می‌شود
};

export const isNativeMode = (): boolean => {
  // آیا از پلیر نیتیو استفاده می‌شود (نه HTML Audio)
};
```

### مدیریت حالت نیتیو

وقتی پخش در حالت نیتیو باشد:
- HTML Audio element استفاده نمی‌شود
- تمام کنترل‌ها از طریق `nativeCommand` انجام می‌شود
- متادیتا از طریق `updateAudioBackgroundMeta` به‌روز می‌شود
- وضعیت پخش از طریق `updateAudioBackgroundState` همگام می‌شود

### آپدیت خودکار

```typescript
export const getAppVersion = (): string => {
  // دریافت نسخه فعلی اپ
};

export const getDesktopVersion = (): string => {
  // دریافت نسخه دسکتاپ
};

export const isVersionNewer = (newVersion: string, currentVersion: string): boolean => {
  // مقایسه نسخه‌ها
};
```

**جریان آپدیت:**
1. اپ هر ۱۰ دقیقه نسخه را از `/api/app-update` بررسی می‌کند
2. اگر نسخه جدیدتر موجود باشد، `UpdateDialog` نمایش داده می‌شود
3. کاربر می‌تواند دانلود کند یا رد کند (در localStorage ذخیره می‌شود)

---

### کنترل مدیا سشن

```typescript
export const clearWebMediaSession = () => {
  // غیرفعال کردن Media Session مرورگر در WebView
};
```

در اندروید، وقتی پخش از حالت وب به نیتیو تغییر کند:
1. Media Session مرورگر غیرفعال می‌شود
2. Media Session نیتیو فعال می‌شود
3. نوتیفیکیشن نیتیو جایگزین نوتیفیکیشن مرورگر می‌شود

---

## اتصال به App.tsx

### نحوه استفاده در AppInner

```typescript
// App.tsx - خط ۱۰
import {
  initBackgroundPlayback, isApp, isIos, sendNativeNotification,
  playInBackgroundAudio, stopBackgroundAudio, updateAudioBackgroundMeta,
  updateAudioBackgroundState, stopPlaybackService, isNativeMode,
  setNativeModeActive, nativeCommand, getNativeSnapshot,
  isVideoBackgroundActive, stopVideoBackground, getAppVersion,
  isDesktop, getDesktopVersion, isVersionNewer, clearWebMediaSession,
  getFcmToken, desktopShowNotification
} from './services/backgroundPlayback';
```

### موارد استفاده

1. **شروع اپ:** `initBackgroundPlayback()` در `useEffect` اولیه
2. **پخش صوت:** اگر `isApp() && isNativeMode()` → استفاده از `nativeCommand`
3. **اعلان دسکتاپ:** `desktopShowNotification()` از طریق IPC
4. **آپدیت:** `getAppVersion()` و `isVersionNewer()` برای بررسی نسخه
5. **FCM:** `getFcmToken()` و `registerFcmToken()` برای نوتیفیکیشن push

### الگوی تشخیص پلتفرم

```typescript
// App.tsx - خط ۹۳۹
if (isApp() && isNativeMode()) {
  // استفاده از پلیر نیتیو اندروید
  nativeCommand({ cmd: 'play', url: ..., podcastId: ... });
} else {
  // استفاده از HTML Audio (وب یا دسکتاپ)
  audioRef.current.src = proxyUrl;
  audioRef.current.play();
}
```

### فرآیند کامل پخش صوت

1. کاربر اپیزودی را انتخاب می‌کند
2. `playEpisode()` فراخوانی می‌شود
3. اگر اندروید باشد:
   - `updateAudioBackgroundMeta()` اطلاعات را به سرویس نیتیو ارسال می‌کند
   - `nativeCommand({ cmd: 'play', ... })` پخش را شروع می‌کند
   - نوتیفیکیشن با کنترل‌های play/pause/next/prev نمایش داده می‌شود
4. اگر وب/دسکتاپ باشد:
   - `audioRef.current.src = proxyUrl` تنظیم می‌شود
   - `audioRef.current.play()` پخش شروع می‌شود
   - Media Session مرورگر کنترل‌ها را نمایش می‌دهد

### فرآیند کامل پخش ویدیو در پس‌زمینه (APK)

1. کاربر دکمه PiP را می‌زند
2. `handlePlayInBackground()` فراخوانی می‌شود
3. `stopVideoBackground()` ویدیوی فعلی متوقف می‌شود
4. `playInBackgroundAudio()` با متادیتای ویدیو فعال می‌شود
5. ادامه پخش صوتی بدون نمایش ویدیو
