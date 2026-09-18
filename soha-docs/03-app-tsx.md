# بخش ۳: فایل اصلی App.tsx — تحلیل خط به خط

## مسیر فایل
`E:\soha\App.tsx` — 2292 خط

## خلاصه
فایل `App.tsx` قلب تپنده اپلیکیشن است. تمام state‌های سراسری، مسیریابی، پخش صوت/ویدیو، مدیریت کامنت‌ها، سیستم نوتیفیکیشن، و رندر صفحات از اینجا کنترل می‌شود.

## ساختار کلی

### 1. ایمپورت‌ها (خطوط ۱-۴۸)

```typescript
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
```

- **React.lazy**: برای بارگذاری تنبل (lazy loading) صفحاتی مانند `FullScreenPlayer`، `AdminPage`، `LoginPage` و غیره استفاده می‌شود. این باعث کاهش حجم باندل اولیه می‌شود.
- **ایمپورت‌های services**: توابع API از `services/api.ts` برای دریافت و ارسال داده به سرور
- **ایمپورت‌های backgroundPlayback**: توابع تشخیص پلتفرم (اندروید/دسکتاپ/iOS) و کنترل پخش پس‌زمینه

### 2. توابع کمکی نوتیفیکیشن (خطوط 49-80)

```typescript
const notifLastSeenKey = (): string => {
    let uid = '';
    try { 
        const u = JSON.parse(localStorage.getItem('user_data') || 'null'); 
        uid = String(u?.id ?? u?._id ?? ''); 
    } catch { /* ignore */ }
    return uid ? `mahfel_last_notif_id_${uid}` : 'mahfel_last_notif_id_guest';
};
```

**توضیح**: کلید localStorage برای ردیابی آخرین نوتیفیکیشن دیده‌شده. جداگانه برای هر کاربر و مهمان ذخیره می‌شود تا بعد از لاگین/لاگ‌اوت باگ نمایش نوتیفیکیشن ایجاد نشود.

**توابع مرتبط:**
- `getShownNotifs()`: مجموعه‌ای از idهای نوتیفیکیشن‌های نمایش داده شده
- `hasShownNotif(id)`: بررسی آیا نوتیفیکیشن قبلاً نمایش داده شده
- `markShownNotif(id)`: علامت‌گذاری نوتیفیکیشن به عنوان نمایش داده شده (حداکثر 60 تا ذخیره می‌شود)

### 3. کامپوننت اصلی AppInner (خط 82)

```typescript
const AppInner: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
```

این کامپوننت تمام state‌های سراسری را مدیریت می‌کند:

#### State‌های اصلی:
| State | نوع | توضیح |
|-------|------|--------|
| `appState` | `'initializing' \| 'login' \| 'interests' \| 'ready' \| 'admin'` | وضعیت فعلی اپلیکیشن |
| `podcasts` | `Podcast[]` | لیست تمام پادکست‌ها |
| `authors` | `Author[]` | لیست نویسندگان |
| `videos` | `Video[]` | لیست ویدیوها |
| `comments` | `Comment[]` | تمام کامنت‌ها (درختی) |
| `posts` | `Post[]` | پست‌های اجتماعی |
| `books` | `Book[]` | کتاب‌ها |
| `publishedBooks` | `PublishedBook[]` | کتاب‌های منتشر شده |
| `user` | `User \| null` | کاربر فعلی |
| `isAuthenticated` | `boolean` | آیا کاربر لاگین است |
| `currentTrack` | `{ podcast, episode, episodeIndex } \| null` | آهنگ در حال پخش |
| `isPlaying` | `boolean` | آیا در حال پخش است |
| `audioProgress` | `number` | پیشرفت پخش (0-1) |
| `audioDuration` | `number` | مدت زمان کل |
| `isPlayerExpanded` | `boolean` | آیا پلیر تمام صفحه باز است |

### 4. سیستم Back Button (خطوط 170-257)

```typescript
const layerStackRef = useRef<string[]>([]);
const closeLayerRef = useRef<(tag: string) => void>(() => {});
```

**مکانیزم**: یک stack از لایه‌های باز (مثل `admin`, `writing`, `profile`, `search`, `video`, `podcast`, `player`) نگه داشته می‌شود. با هر باز شدن لایه جدید، `history.pushState` فراخوانی می‌شود. با فشردن دکمه برگشت مرورگر، `popstate` event رخ می‌دهد و لایه بالایی بسته می‌شود.

**لایه‌ها:**
```
admin → writing → instant → profile → search → msidebar → sidebar → 
video-mini → video → post-comments → video-comments → note → book → 
author → podcast → player → chat → vault
```

### 5. بارگذاری اولیه داده‌ها (خطوط 325-443)

```typescript
const loadInitialData = async () => {
    const [p, b, a, v, c, po, pb] = await Promise.all([
        getPodcasts(), getBooks(), getAuthors(), getVideos(), 
        getComments(), getPosts(), getPublishedBooks(),
    ]);
```

**توضیح**: در اولین رندر، تمام داده‌ها به صورت موازی از سرور دریافت می‌شوند. سپس:
1. داده‌های کاربر از `localStorage` بازیابی می‌شود
2. اگر کاربر وجود داشته باشد و نقش admin باشد → `appState = 'admin'`
3. اگر علاقه‌مندی‌ها تنظیم شده باشد → `appState = 'ready'`
4. در غیر این صورت → `appState = 'interests'`
5. ویدیوی خوش‌آمدگویی و راهنمای onboarding بررسی می‌شوند

### 6. سیستم نوتیفیکیشن و به‌روزرسانی (خطوط 389-436)

```typescript
const checkForUpdate = async () => {
    const info = await getAppUpdate();
    if (mobile && !isIos() && info.apkVersion) {
        const current = getAppVersion();
        if ((!current || isVersionNewer(info.apkVersion, current)) && 
            dismissed !== info.apkVersion) {
            setUpdateInfo(info);
            setShowUpdateDialog(true);
        }
    }
};
```

**توضیح**: هر 10 دقیقه نسخه اپلیکیشن بررسی می‌شود. اگر نسخه جدیدتری موجود باشد، دیالوگ به‌روزرسانی نمایش داده می‌شود. کاربر می‌تواند آن را نادیده بگیرد که در `localStorage` ذخیره می‌شود.

### 7. سیستم Realtime (خطوط 609-731)

```typescript
const applyRealtimePayload = useCallback((type: string, payload: any) => {
    if (type === 'posts') {
        if (action === 'create' && payload.item) {
            setPosts(prev => [payload.item, ...prev]);
        }
    }
    if (type === 'comments') {
        // درج کامنت در درخت
    }
    if (type === 'notifications') {
        // نمایش نوتیفیکیشن
    }
}, [refreshAllData, notifyDisplay]);
```

**توضیح**: سیستم WebSocket از طریق `services/realtime.ts` به سرور متصل می‌شود. هر تغییر در دیتابیس (ایجاد/ویرایش/حذف پست، کامنت، نوتیفیکیشن) از طریق `broadcast` به تمام کلاینت‌ها ارسال می‌شود و state محلی به‌روزرسانی می‌شود.

### 8. سیستم پخش صوت (خطوط 926-1097)

```typescript
const playEpisode = useCallback((podcast: Podcast, index: number) => {
    const episode = podcast.episodes[index];
    if (!episode || !episode.audioUrl) return;
    
    // قطع پخش پس‌زمینه ویدیو
    if (isVideoBackgroundActive()) stopVideoBackground();
    
    setCurrentTrack({ podcast, episode, episodeIndex: index });
    setIsPlayerExpanded(true);
    
    const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`;
    recordPodcastPlay(String(podcast.id), index);
    
    // در APK: ارسال به پلیر نیتیو
    if (isApp() && isNativeMode()) {
        nativeCommand({ cmd: 'play', url: queue[index]?.url, ... });
        return;
    }
    
    // در وب: استفاده از HTMLAudioElement
    audioRef.current.src = proxyUrl;
    audioRef.current.play();
}, [authors]);
```

**توضیح**: 
- صدا از طریق `/api/proxy/audio` پروکسی می‌شود (برای دور زدن CORS)
- در اندروید، اگر پلیر نیتیو فعال باشد، از `nativeCommand` استفاده می‌شود
- در وب، از `HTMLAudioElement` استفاده می‌شود
- `recordPodcastPlay` تعداد پخش را ثبت می‌کند (فقط یک بار در هر نشست)

### 9. سیستم پخش پس‌زمینه (خطوط 1089-1107)

```typescript
const handlePlayInBackground = useCallback(() => {
    playInBackgroundAudio({
        title: episode.title,
        artist: author?.name,
        album: podcast.title,
        artwork,
        duration: audioDuration,
        onPlay: () => { audioRef.current?.play(); },
        onPause: () => { audioRef.current?.pause(); },
        onSeek: (t) => { audioRef.current.currentTime = t; },
        onNext: () => playNext(),
        onPrev: () => playPrev(),
    });
}, [currentTrack, authors, audioDuration, playNext, playPrev]);
```

**توضیح**: در اندروید، پخش پس‌زمینه از طریق AndroidBridge انجام می‌شود. نوتیفیکیشن لاک‌اسکرین دکمه‌های پخش/توقف/بعدی/قبلی دارد. کنترل‌ها به `audioRef` وصل می‌شوند.

### 10. سیستم صف پخش (خطوط 1214-1284)

```typescript
const playQueueNext = useCallback(() => {
    const q = queueRef.current;
    if (!q || q.length === 0) return false;
    const [next, ...rest] = q;
    queueRef.current = rest;
    setPlayQueue(rest);
    playQueueItem(next);
    return true;
}, [playQueueItem]);
```

**توضیح**: صف پخش برای کتابخانه شخصی طراحی شده. آیتم‌ها می‌توانند صوتی (پادکست) یا ویدیویی باشند. با پایان هر آیتم، آیتم بعدی به صورت خودکار پخش می‌شود.

### 11. رندر شرطی صفحات (خطوط 1784-2022)

```typescript
const renderActivePage = () => {
    if (selectedPostForComments) return <PostCommentsPage ... />;
    if (selectedVideoComment) return <PostCommentsPage ... />;
    if (selectedPodcast) return <PlaylistPage ... />;
    if (selectedAuthor) return <AuthorPage ... />;
    if (selectedBook) return <BookPage ... />;
    if (selectedPublishedBook) return <NoteDetailView / BookDetailView />;
    if (activeVideo && !isVideoMini) return <VideoPlayerPage ... />;
    
    switch (activeTab) {
        case 'mahfel': return <MahfelPage ... />;
        case 'sowt': return <SowtPage ... />;
        case 'matn': return <MatnPage ... />;
        case 'videos': return <VideoVaultPage ... />;
        case 'nashr': return <NashrPage ... />;
        case 'library': return <LibraryPage ... />;
        case 'support': return <SupportPage ... />;
        case 'ai': return <AiAssistantPage ... />;
    }
};
```

**توضیح**: اولویت نمایش:
1. صفحه جزئیات پست (اگر پستی انتخاب شده)
2. صفحه جزئیات ویدیو (اگر ویدیویی انتخاب شده)
3. صفحه پلی‌لیست پادکست
4. صفحه پروفایل نویسنده
5. صفحه کتاب
6. صفحه یادداشت/کتاب منتشر شده
7. پلیر ویدیو تمام صفحه
8. صفحه اصلی (بر اساس تب فعال)

### 12. ساختار JSX نهایی (خطوط 2033-2279)

```jsx
<ErrorBoundary>
    <ThemeProvider>
        <OfflineDetector>
            <AppInner />
        </OfflineDetector>
    </ThemeProvider>
</ErrorBoundary>
```

**لایه‌های حفاظتی:**
1. `ErrorBoundary`: جلوگیری از کرش کل اپ
2. `ThemeProvider`: مدیریت تم تاریک/روشن
3. `OfflineDetector`: تشخیص قطع اینترنت

**ساختار DOM:**
```
<div dir="rtl">
    <IranAccessWarning />          # هشدار VPN
    <VPNBanner />                  # بنر VPN
    <Sidebar />                    # سایدبار دسکتاپ
    <main>
        {renderActivePage()}       # محتوای اصلی
    </main>
    {isWriting && <WriteModal />}  # مودال نوشتن
    {editingPost && <EditModal />} # مودال ویرایش
    {currentTrack && <Player />}   # پلیر صوت
    {activeVideo && <VideoPlayer />} # پلیر ویدیو
    <SearchModal />                # مودال جستجو
    <BottomTabs />                 # تب‌های پایین (موبایل)
    <MahfelSidebar />              # سایدبار محفل (موبایل)
    <Toast />                      # اعلان‌ها
    <UpdateDialog />               # دیالوگ به‌روزرسانی
    <NotificationBanner />         # بنر نوتیفیکیشن
    <WelcomeVideo />               # ویدیوی خوش‌آمدگویی
    <OnboardingGuide />            # راهنمای onboarding
</div>
```

## الگوهای مهم

### Optimistic Updates
اکثر عملیات (لایک، ذخیره در کتابخانه، ارسال پست) ابتدا state محلی را به‌روزرسانی می‌کنند و سپس درخواست API ارسال می‌شود. اگر خطا رخ دهد، state به حالت قبلی بازمی‌گردد.

### Ref برای مقادیر cached
از `useRef` برای مقادیری استفاده می‌شود که در callback‌ها نیاز هستند اما نباید باعث re-render شوند:
- `userRef`: اطلاعات کاربر فعلی
- `queueRef`: صف پخش فعلی
- `audioRef`: المان HTMLAudioElement

### Lazy Loading
اکثر صفحات با `React.lazy` و `Suspense` بارگذاری می‌شوند تا باندل اولیه کوچک‌تر باشد.
