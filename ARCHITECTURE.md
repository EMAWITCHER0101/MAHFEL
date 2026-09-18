# محفل (Mahfel) — Architecture Documentation

## 1. Project Overview

**محفل** (Mahfel) is a Persian-language media platform for podcasts, video, books, and community content. It uses **Firebase Phone OTP authentication**, Persian/RTL UI, and is published under the domain `soha-sima.ir`.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS 3 |
| Backend | Node.js + Express 5, MongoDB (Mongoose 8) |
| Auth | Firebase Phone OTP + JWT tokens |
| AI | OpenRouter API (Gemini 3 Flash Lite primary, Gemini 3.1 Pro fallback) |
| Desktop | Electron 40+ (auto-updater via GitHub Releases) |
| Mobile | Capacitor 7 (Android/iOS) |
| Realtime | WebSocket (ws) for notifications |
| Storage | Google Cloud Storage (GCS) for media files |
| Deploy | systemd services, SSH-based deploy script |

### Project Structure

```
soha/
├── App.tsx                    # Main SPA (1442 lines) — core routing & state
├── index.html                 # Vite HTML entry (Electron desktop)
├── main.tsx                   # React root mount
├── vite.config.ts             # Vite dev server config (port 5000)
├── capacitor.config.ts        # Capacitor mobile config
├── types.ts                   # TypeScript interfaces (345 lines)
├── package.json               # Dependencies
├── manifest.json              # PWA manifest
├── tsconfig.json / jsconfig.json
├── tailwind.config.js         # Tailwind config (RTL, custom colors)
├── .env.development           # Environment variables
├── components/                # 189 component files
│   ├── FullScreenPlayer.tsx   # Audio player (1417 lines)
│   ├── MiniPlayer.tsx         # Persistent bottom mini-player
│   ├── PlaylistCard.tsx       # Playlist card for home grids
│   ├── EpisodeCard.tsx        # Episode row for playlists
│   ├── CommentsSection.tsx    # Comment system (Firebase-style)
│   ├── ReactionBar.tsx        # Emoji reactions (❤️🔥👏)
│   ├── WelcomeVideo.tsx       # First-visit welcome popup
│   ├── Header.tsx             # Top navigation (auth buttons, version)
│   ├── Navbar.tsx             # Bottom mobile nav (4 tabs)
│   ├── AdminPage.tsx          # Admin panel (~2400 lines)
│   ├── LoginPage.tsx          # Phone OTP login modal
│   ├── FeatureFlagsPanel.tsx  # Feature flag management
│   ├── UserPresenceIndicator.tsx # WebSocket-based user presence
│   ├── ConnectionStatusIndicator.tsx # Connection status UI
│   ├── UserPresenceDebug.tsx  # Debug panel for presence
│   ├── OfflineBanner.tsx      # Offline mode banner
│   ├── UpdateDialog.tsx       # App update notification
│   ├── AddToHomeScreenBanner.tsx # PWA install prompt
│   ├── BeginnerModeIndicator.tsx # Beginner mode indicator
│   └── ... (168 more)
├── views/                     # Page components
│   ├── HomePage.tsx           # Home (LatestAudio + LatestVideo)
│   ├── PodcastPage.tsx        # Podcast detail
│   ├── PlaylistPage.tsx       # Playlist detail (436 lines)
│   ├── AudioPage.tsx          # All podcasts listing
│   ├── VideoPage.tsx          # All videos listing
│   ├── BookPage.tsx           # Book detail
│   ├── BookReader.tsx         # In-app book reader
│   ├── PdfViewer.tsx          # PDF viewer
│   ├── ProfilePage.tsx        # User profile
│   ├── BookmarksPage.tsx      # Bookmarks
│   ├── SearchPage.tsx         # Global search
│   ├── AiPage.tsx             # AI assistant
│   ├── CommunityPage.tsx      # Community features
│   ├── FeaturedPage.tsx       # Featured content
│   ├── ReadingPage.tsx        # Reading section
│   └── AdminPage.tsx          # Admin panel
├── contexts/
│   └── BeginnerModeContext.tsx # Beginner mode state
├── hooks/                     # 76 custom hooks
│   ├── useCache.ts            # Memory + IndexedDB cache
│   ├── useCacheManager.ts     # Cache monitoring
│   ├── useLogger.ts           # Frontend logging
│   ├── useMetrics.ts          # API performance metrics
│   ├── useConnectionDiagnostics.ts # Network diagnostics
│   ├── useGestureNavigation.ts # Swipe gestures
│   ├── useMemoryManager.ts    # Memory optimization
│   ├── useBeginnerMode.ts     # Beginner mode hook
│   ├── useOptimisticNavigation.ts # Optimistic routing
│   ├── useServerHealth.ts     # Backend health monitoring
│   └── useToast.ts            # Toast notifications
├── services/
│   ├── api.ts                 # API client (308 lines)
│   ├── auth.ts                # Auth service
│   ├── firebase.ts            # Firebase config
│   ├── podcastApi.ts          # Podcast API functions
│   ├── localCache.ts          # localStorage caching
│   ├── downloadManager.ts     # Offline download manager
│   ├── searchService.ts       # Search service
│   ├── contentRecommendation.ts # AI recommendations
│   ├── backgroundPlayback.ts  # Background audio + version check
│   ├── networkResilience.ts   # Network retry logic
│   ├── emergency.ts           # Emergency mode
│   └── notifications.ts       # Push notifications
├── utils/
│   ├── logger.ts              # Frontend logger (batched API transport)
│   ├── migration.ts           # Migration scripts
│   ├── analytics.ts           # Analytics
│   └── monitor.ts             # Monitoring
├── lib/
│   └── cache.ts               # Cache utilities
├── server/                    # Backend (123 files)
│   ├── server.js              # Express entry (593 lines)
│   ├── package.json           # Backend dependencies
│   ├── routes/                # 30 route modules
│   ├── models/                # 8 Mongoose models
│   ├── services/              # 14 service modules
│   ├── utils/                 # 14 utility modules
│   ├── middleware/             # 3 middleware modules
│   ├── uploads/               # Uploaded media
│   └── logs/                  # Server logs
├── scripts/                   # Deployment scripts (7 files)
├── electron/                  # Electron desktop (10 files)
├── android/                   # Capacitor Android (206 files)
├── ios/                       # Capacitor iOS
├── public/                    # Static assets
├── uploads/                   # Local uploads
├── static/                    # Compiled static JS
├── data/                      # Local data (SQLite, etc.)
└── deploy/                    # Deploy scripts + env
```

---

## 2. Backend (server/)

### Entry Point: `server/server.js`

The Express server starts on port **5000** (configurable via `PORT` env var).

**Middleware stack** (order matters):
1. `requestLogger` — Logs every request with timestamps
2. `securityMiddleware` — Sets security headers
3. `requestId` — Attaches unique `X-Request-Id` to each request
4. `cors` — Configured for `localhost:3000`, `localhost:5000`, `soha-sima.ir`, `app.soha-sima.ir`
5. `responseLogger` — Logs response status after completion
6. `express.json({ limit: '50mb' })` — JSON body parser
7. `express.urlencoded({ extended: true, limit: '50mb' })` — URL-encoded parser
8. `compression` — gzip/deflate responses
9. Static file serving: `/opt/soha/soha-static`, `/opt/soha/soha-public`, `/soha-uploads` → `/uploads`
10. Optional: `checkFirebaseConnection` (if `REQUIRE_FIREBASE_AUTH=true`)
11. Optional: `trackApiUsage` (if `ENABLE_USAGE_TRACKING=true`)
12. Optional: `heatmapMiddleware`, `sessionMiddleware` (if analytics enabled)
13. Cache headers: 1 hour for cacheable API paths, 1 year for static assets
14. Security headers: `X-Frame-Options: DENY`, `CSP: default-src 'self'`

**Special endpoints in server.js:**
- `GET /` — SPA fallback, serves `index.html`
- `GET /api/health` — Health check with response time
- `GET /api/metrics` — Server metrics (uptime, memory, cache stats)
- `DELETE /api/cache/:type` — Clear specific cache type
- `DELETE /api/cache` — Clear all caches
- `POST /api/notifications/send` — Send push notifications (POST only)

**Routes registered:**
```
/api/ai/*          → routes/ai.js
/api/content       → routes/content.js
/api/admin/*       → routes/admin.js
/api/media/*       → routes/media.js
/api/podcasts/*    → routes/podcasts.js (aliased as /api/podcast)
/api/podcasts      → routes/podcasts.js (direct)
/api/videos        → routes/videos.js
/api/books         → routes/books.js (aliased as /api/books-api)
/api/ai-usage      → routes/aiUsage.js
/api/analytics     → routes/analytics.js
/api/audit         → routes/audit.js
/api/auth          → routes/auth.js
/api/banners       → routes/banners.js (aliased as /api/banners-api)
/api/comments      → routes/comments.js
/api/communities   → routes/communities.js
/api/contact       → routes/contact.js (alias → contact-messages)
/api/contact-messages → routes/contactMessages.js
/api/dashboard     → routes/dashboard.js
/api/debug         → routes/debug.js
/api/downloads     → routes/downloads.js
/api/episodes      → routes/episodes.js
/api/featured      → routes/featured.js (alias → featured-content)
/api/featured-content → routes/featuredContent.js
/api/leaderboard   → routes/leaderboard.js
/api/learning      → routes/learning.js
/api/learning-paths → routes/learningPaths.js
/api/logs          → routes/logs.js
/api/notifications → routes/notifications.js
/api/playlists     → routes/playlists.js (aliased as /api/playlist)
/api/polls         → routes/polls.js
/api/podcasts-api  → routes/podcasts.js
/api/progress      → routes/progress.js
/api/progress-api  → routes/progress-api.js
/api/quiz          → routes/quiz.js
/api/reading       → routes/reading.js
/api/reports       → routes/reports.js
/api/search        → routes/search.js
/api/sections      → routes/sections.js
/api/social        → routes/social.js
/api/stats         → routes/stats.js
/api/storage       → routes/storage.js
/api/surveys       → routes/surveys.js
/api/tags          → routes/tags.js
/api/texts         → routes/texts.js
/api/users         → routes/users.js
/api/users-api     → routes/usersApi.js
/api/websocket     → routes/websocket.js
```

**WebSocket server** (attached to HTTP server):
- Path: `/notifications`
- Handles: `join`, `leave`, `ping`, `pong`
- Broadcasts user presence updates

### Models (server/models/)

**File-based models** (no MongoDB, use local JSON files):

| Model | File | Key Fields |
|-------|------|-----------|
| `User` | `user.js` | id, username, displayName, phone, photoURL, bio, level, points, badges, bookmarks, favoritePodcasts, favoriteVideos, favoriteBooks, comments, createdAt |
| `Episode` | `episode.js` | id, title, description, audioSrc, thumbnailUrl, duration, podcastId, type, order, playCount, likeCount, tags |
| `Podcast` | `podcast.js` | id, title, description, author, thumbnailUrl, bannerUrl, category, episodeCount, totalDuration, tags, featured |
| `Audio` | `audio.js` | id, title, description, audioSrc, thumbnailUrl, duration, category, type |
| `Video` | `video.js` | id, title, description, videoSrc, thumbnailUrl, duration, category, youtubeId |
| `Book` | `book.js` | id, title, author, description, coverImage, category, tags, audioChapters, chapters, readingTime, pdfFile, externalUrl |

**MongoDB models** (server/models/):

| Model | Collection | Key Fields |
|-------|-----------|-----------|
| `Banner` | banners | title, imageUrl, linkUrl, type, active, priority |
| `Community` | communities | name, description, members, posts, events |
| `Content` | contents | title, body, type, tags, status, featured |
| `Notification` | notifications | userId, title, body, type, read, data |
| `Podcast` (DB) | podcasts | Legacy model, file-based preferred |
| `Section` | sections | name, description, items |
| `Tag` | tags | name, category, count |
| `Text` | texts | title, body, category |

### Services (server/services/)

| Service | Purpose |
|---------|---------|
| `cache.js` | Memory cache with TTL, LRU eviction, hit/miss tracking |
| `featureFlags.js` | Feature flag management |
| `quotaManager.js` | API usage quotas per IP |
| `mediaOptimizer.js` | Image/video optimization |
| `searchService.js` | Full-text search with fuzzy matching |
| `notificationService.js` | Push notification delivery |
| `rateLimiter.js` | Rate limiting |
| `whitelist.js` | Access control whitelists |
| `whitelistManager.js` | Whitelist management |
| `cacheManager.js` | Cache statistics and monitoring |
| `appUpdates.js` | App update management |

### Utils (server/utils/)

| Utility | Purpose |
|---------|---------|
| `aiClient.js` | OpenRouter/Gemini AI gateway |
| `apiResponse.js` | Standardized API responses |
| `backup.js` | Database backup utilities |
| `corpus.js` | RAG system — 3000+ content items, 664K chars of Persian text |
| `dataUtils.js` | File read/write operations |
| `firebaseAuth.js` | Firebase token verification |
| `firebaseAdmin.js` | Firebase Admin SDK |
| `idUtils.js` | ID generation and validation |
| `mediaUtils.js` | Media file utilities |
| `memoryCache.js` | In-memory cache |
| `metrics.js` | Performance metrics collection |
| `performanceMonitor.js` | Request timing |
| `phoneVerification.js` | Phone OTP verification |
| `streamingResponse.js` | SSE streaming for AI |
| `telegramNotifier.js` | Telegram notifications |
| `textUtils.js` | Text processing |
| `urlUtils.js` | URL validation |
| `validation.js` | Request validation |

### Middleware (server/middleware/)

| Middleware | Purpose |
|-----------|---------|
| `rateLimiter.js` | Per-IP rate limiting |
| `validation.js` | Request body validation |
| `whitelist.js` | Access control |

### Authentication Flow

1. User enters phone number in `LoginPage.tsx`
2. Firebase sends OTP via SMS
3. User enters OTP → Firebase verifies → returns Firebase ID token
4. Frontend sends Firebase token to `POST /api/auth/verify`
5. Backend verifies token via `firebase-admin`, creates/updates user in local JSON DB
6. Backend issues JWT token (15-minute expiry)
7. Frontend stores JWT in `localStorage` as `auth_token`
8. All authenticated API requests include `Authorization: Bearer <jwt>`
9. Token refresh: `GET /api/auth/status` with current JWT → returns new JWT if valid

---

## 3. Frontend (SoHa-SPA)

### Core Architecture

The app is a **single-page application** with client-side routing via React state (not React Router).

**`App.tsx`** (1442 lines) is the central orchestrator:
- **State management**: ~50+ `useState` hooks (no Redux/Zustand)
- **Routing**: `currentView` state determines which page renders (home, search, podcast, playlist, audio, video, book, profile, admin, etc.)
- **Deep linking**: `initializeDeepLink()` parses URL hash/routes on load
- **Auth**: `authStateChanged()` Firebase listener → auto-login from localStorage
- **Data loading**: `loadContent()` fetches all content on mount (books, podcasts, playlists, banners, etc.)
- **Audio**: `audioRef` (HTMLAudioElement), `setPlayingEpisode()`, `setPlayingEpisodeAtTime()`
- **Background playback**: `useBackgroundPlayback()` hook for mobile native audio

### Page Navigation (SPA Routes)

| View | Route | Component |
|------|-------|-----------|
| Home | `home` | `HomePage` |
| Audio | `audio` | `AudioPage` |
| Video | `video` | `VideoPage` |
| Books | `books` | `BookPage` |
| Podcasts | `podcasts` | `PodcastPage` |
| Playlists | `playlists` | `PlaylistPage` |
| Featured | `featured` | `FeaturedPage` |
| AI Assistant | `ai` | `AiPage` |
| Search | `search` | `SearchPage` |
| Profile | `profile` | `ProfilePage` |
| Bookmarks | `bookmarks` | `BookmarksPage` |
| Community | `community` | `CommunityPage` |
| Reading | `reading` | `ReadingPage` |
| Admin | `admin` | `AdminPage` |
| PDF Viewer | `pdf-viewer` | `PdfViewer` |
| Book Reader | `book-reader` | `BookReader` |
| Login | `login` | `LoginPage` |

### Key Components

#### Audio System

- **`FullScreenPlayer.tsx`** (1417 lines): Main audio player
  - Desktop: horizontal layout with cover art, controls, progress, queue
  - Mobile: vertical layout with glowing cover art, swipeable lyrics
  - Tabs: Notes, Lyrics, Suggested Playlists, Comments
  - Wave animation behind cover art
  - Swipe gestures for navigation
  - Keyboard shortcuts (Space, ArrowRight/Left)
  - `onPlayEpisodeAtTime()` for resuming at specific timestamp

- **`MiniPlayer.tsx`** (528 lines): Persistent bottom player
  - Shows playing episode info, play/pause, progress bar
  - Click to open full player
  - Duration state with auto-hiding
  - Shows in all views except full player

- **`PlaylistPage.tsx`** (436 lines): Playlist detail with tabs
  - About tab, Episodes tab, Comments tab
  - Comments tab: episode selector + comment list
  - Auto-plays first episode when comments tab opened

#### Content Components

- **`PodcastCard.tsx`**: Podcast card for grids
- **`PlaylistCard.tsx`**: Playlist card (shows episode count, duration, progress)
- **`EpisodeCard.tsx`**: Episode row with play button, download, share
- **`BookCard.tsx`**: Book card for grids
- **`VideoCard.tsx`**: Video card with thumbnail

#### Community Features

- **`CommentsSection.tsx`**: Full comment system with replies
- **`ReactionBar.tsx`**: Emoji reactions (❤️🔥👏)
- **`UserPresenceIndicator.tsx`**: Shows online users via WebSocket
- **`CommunityPage.tsx`**: Community hub with posts and events

#### UI Components

- **`Header.tsx`**: Top nav — back button, title, search, admin, notifications, login
- **`Navbar.tsx`**: Bottom mobile nav — Home, Audio, Video, Books, Community (5 tabs)
- **`WelcomeVideo.tsx`**: First-visit welcome popup with video, Windows-style card
- **`UpdateDialog.tsx`**: App update notification with download progress
- **`OfflineBanner.tsx`**: Shows when backend unreachable
- **`AdvancedSettingsPanel.tsx`**: Offline mode, language, cache, logs, debug

### State Management

All state lives in `App.tsx` via `useState` hooks. Key state groups:

```typescript
// Content
content, podcasts, playlistAudio, playlistVideos, books

// Current playing
currentEpisode, currentPlaylist, isPlaying, currentTime, duration

// UI state
currentView, isPlayerExpanded, showMobileAdvancedMenu, showWelcomeVideo

// Auth
user, token, isGuest

// Feature flags
featureFlags

// Update state
latestApkVersion, latestDesktopVersion, apkUpdateDismissed, desktopUpdateDismissed
```

### API Service (`services/api.ts`)

All API calls go through `fetchApi()` wrapper:
- Base URL from `API_BASE` constant
- JWT token attached automatically
- Error handling with toast notifications
- Handles offline mode gracefully

### Styling

- **Tailwind CSS 3** with RTL support
- Custom colors: `soha-cyan`, `soha-blue`, `soha-light`
- Dark mode via class toggle
- Persian fonts: Vazirmatn
- Mobile-first responsive design

---

## 4. AI System

### Architecture

The AI system is a **unified OpenRouter gateway** supporting multiple models:

**Primary model**: `google/gemini-3.1-flash-lite-preview`
**Fallback model**: `google/gemini-2.5-flash-preview`

### Backend AI: `server/utils/aiClient.js`

**Class**: `OpenRouterAIClient`
- Manages API key rotation across 4 keys
- Automatic failover on 401/403/429/500 errors
- JWT token generation for OpenRouter API
- Request timeout: 30 seconds
- Retry logic: up to 2 retries per key

**Key functions**:
- `askAI(messages, options)` — Standard AI query
- `askAIStream(messages, options)` — Streaming AI query (SSE)
- `getModelStats()` — Model usage statistics

### AI Routes: `server/routes/ai.js`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/chat` | POST | Standard chat (non-streaming) |
| `/api/ai/chat/stream` | POST | Streaming chat (SSE) |
| `/api/ai/recommend` | POST | Content recommendations |
| `/api/ai/explain` | POST | Topic explanation |
| `/api/ai/summarize` | POST | Text summarization |
| `/api/ai/quiz` | POST | Quiz generation |
| `/api/ai/concept-map` | POST | Concept mapping |
| `/api/ai/compare` | POST | Comparison |
| `/api/ai/daily-lesson` | POST | Daily lesson |
| `/api/ai/podcast-qa` | POST | Podcast Q&A |
| `/api/ai/system-status` | GET | System health check |

### RAG System: `server/utils/corpus.js`

**Corpus**: 3000+ content items, 664K chars of Persian text

**Three specialized systems**:
1. `FullCorpus` — Complete corpus (3000+ items)
2. `BookCorpus` — Books and reading content only
3. `SmartCorpus` — Search-optimized (3259 items)

**Content coverage**: Literature, philosophy, science, history, art, spirituality, self-knowledge, mysticism

**Key functions**:
- `smartSearch(query, options)` — Full-text search with scoring
- `getBookContent(query, options)` — Book-specific search
- `getContextForQuery(query, maxLength)` — RAG context retrieval
- `getStats()` — Corpus statistics

### AI Service: `server/routes/ai.js`

The `AIService` class:
- Session management (in-memory Map with 30-min expiry)
- User learning profile tracking (topics, level, history)
- System prompt with RAG context injection
- Platform detection (web/desktop/android/ios)
- Streaming support via SSE

---

## 5. Authentication & Security

### Firebase Integration

- **Config**: `firebaseConfig` in `services/firebase.ts`
- **Phone Auth**: `signInWithPhoneNumber()` with reCAPTCHA verification
- **Guest Mode**: `signInAnonymously()` for unauthenticated access
- **Token Verification**: Backend verifies Firebase tokens via `firebase-admin`

### JWT System

- **Secret**: `JWT_SECRET` env var (fallback: `mahfel-secret-key-2024`)
- **Expiry**: 15 minutes
- **Payload**: `{ userId, phone, displayName, username }`
- **Refresh**: Auto-refresh via `GET /api/auth/status`

### Security Measures

1. **CORS**: Whitelisted origins only
2. **Rate Limiting**: Per-IP limits on sensitive routes
3. **Request Validation**: Joi/Zod validation on all inputs
4. **Security Headers**: CSP, X-Frame-Options, HSTS
5. **Firebase Auth Required**: Optional middleware for protected routes
6. **Input Sanitization**: XSS prevention
7. **File Upload Limits**: 50MB max

---

## 6. Desktop App (Electron)

### Files

| File | Purpose |
|------|---------|
| `electron/main.js` | Main process (289 lines) |
| `electron/preload.js` | Context bridge |
| `electron/updater.js` | Auto-updater |
| `electron/menu.js` | App menu |
| `electron/tray.js` | System tray |
| `electron/window.js` | Window management |
| `electron/fix-path.js` | PATH fix for macOS |
| `electron/logger.js` | Logging |
| `electron/feedback.js` | User feedback |
| `electron/icon.js` | App icon |
| `electron/debug.js` | Debug tools |
| `electron/security.js` | Security hardening |
| `electron/watchdog.js` | Health monitoring |
| `electron/telemetry.js` | Usage telemetry |

### Window Management (`electron/window.js`)

- **Window ID**: `mahfel-main-window`
- **Window State**: Saved to `~/.config/soha/window-state.json`
- **Default size**: 1200x800
- **Features**: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- **IPC Channels**: `window-control` (minimize/maximize/close), `window-state-change` (maximize/unmaximize)
- **Deep linking**: Handles `soha://` protocol URLs

### Auto-Updater (`electron/updater.js`)

- **Source**: GitHub Releases (`EMADCH1/soha`)
- **Pre-release**: Allowed
- **Check interval**: Every 30 minutes (background), manual on demand
- **User interaction**: Always waits for user confirmation via `UpdateDialog`
- **Download progress**: Real-time via IPC
- **Skip version**: Remembers skipped versions in local storage
- **Install options**: Immediate or delayed
- **Notifications**: Native OS notifications

### Build

```bash
npm run build:electron    # Builds to dist-electron/
```

Output: `Mahfel-Setup-x.x.x.exe` (Windows), `Mahfel-x.x.x.dmg` (macOS), `Mahfel-x.x.x.AppImage` (Linux)

### Menu (`electron/menu.js`)

- File menu: About, Settings, Quit
- Edit menu: Undo, Redo, Cut, Copy, Paste
- View menu: Reload, Force Reload, DevTools, Zoom, Fullscreen
- Window menu: Minimize, Close
- Help menu: Documentation, GitHub, Report Issue

### Tray (`electron/tray.js`)

- System tray icon
- Context menu: Show/Hide window, Play/Pause, Quit
- Double-click to show window

---

## 7. Mobile App (Capacitor)

### Configuration: `capacitor.config.ts`

```typescript
appId: 'ir.sohasima.app'
appName: 'محفل'
webDir: 'dist'
server: {
  url: 'https://app.soha-sima.ir',
  cleartext: false
}
```

### Android Build

```bash
npm run build:android    # Vite build + sync
npm run open:android     # Open in Android Studio
npm run build:android:apk  # Build APK
```

### Key Features

- **Native Audio**: Uses `@capacitor-community/background-audio` for background playback
- **Splash Screen**: 2-second delay, fade-out
- **Status Bar**: Custom dark theme
- **Keyboard**: Resize body on show/hide
- **App Updates**: Manual download via `UpdateDialog` (APK URL from backend)

### Update Flow

1. `checkForUpdate()` polls `/api/app-updates/latest` every 10 minutes
2. Compares versions via `isVersionNewer()`
3. If update available, shows `UpdateDialog`
4. User clicks "دانلود" → downloads APK via `CapacitorHttp`
5. Installs via `capacitor-updater` or opens URL

---

## 8. Data Layer

### Local Cache (File-based JSON)

**Location**: `server/data/*.json`

| File | Purpose |
|------|---------|
| `users.json` | User accounts |
| `episodes.json` | Audio episodes |
| `podcasts.json` | Podcast collections |
| `playlists.json` | Curated playlists |
| `videos.json` | Video content |
| `books.json` | Book metadata |
| `audio.json` | Audio tracks |
| `ai-usage.json` | AI API usage tracking |
| `app-updates.json` | App version info |
| `banners.json` | Banner ads |
| `featured-content.json` | Featured items |
| `communities.json` | Community data |
| `sections.json` | Content sections |
| `notifications.json` | User notifications |
| `text-audio-map.json` | Text-to-audio mappings |
| `logging-settings.json` | Logging configuration |

### Frontend Cache (`services/localCache.ts`)

- **Memory cache**: LRU with configurable TTL
- **IndexedDB**: Persistent cache for large data
- **localStorage**: User preferences, auth tokens
- **Cache keys**: `content_*`, `podcasts_*`, `playlists_*`, `books_*`, `videos_*`

### Cache Strategy

1. **Memory cache** (fastest): API responses, user data
2. **IndexedDB** (persistent): Media metadata, offline content
3. **localStorage** (smallest): Settings, tokens, flags
4. **Backend cache** (shared): `cache.js` service with LRU eviction

---

## 9. Content Management

### Admin Panel (`AdminPage.tsx`)

**Tabs**:
1. ** manage** (مدیریت): Content CRUD for podcasts, playlists, videos, books
2. **Updates** (آپدیت‌ها): APK/Windows version management
3. **Analytics** (تحلیل‌ها): Usage stats, user activity
4. **Users** (کاربران): User management
5. **Settings** (تنظیمات): Feature flags, system config

**Version Management**:
- Separate APK and Desktop update forms
- Version, download URL, release notes, file size, changelog
- "حذف انتشار" (Delete Release) clears version and auto-saves
- Manual save via "ذخیره اطلاعات نسخه" button

### Content Types

| Type | Fields | Storage |
|------|--------|---------|
| Podcast | title, description, author, thumbnail, episodes | File-based JSON |
| Playlist | title, description, episodes, thumbnail | File-based JSON |
| Episode | title, description, audioSrc, duration, podcastId | File-based JSON |
| Video | title, description, videoSrc, thumbnail, youtubeId | File-based JSON |
| Book | title, author, coverImage, chapters, pdfFile, audioChapters | File-based JSON |
| Banner | title, imageUrl, linkUrl, type, priority | MongoDB |
| Content | title, body, type, tags, status | MongoDB |

---

## 10. Deployment

### Server Setup

**Remote server**: `87.248.145.44`
**SSH**: `root@87.248.145.44`

**Systemd services**:
- `soha-backend` — Node.js backend (port 5000)
- `soha-frontend` — Static file server (port 3000)
- `soha-caddy` — Caddy reverse proxy

**Directory structure on server**:
```
/opt/soha/
├── soha-backend/        # Backend files
├── soha-static/         # Compiled frontend (dist/)
├── soha-public/         # Public assets
├── soha-uploads/        # User uploads
└── .env                 # Environment variables
```

### Deploy Script: `deploy/deploy-fe-only-quick.js`

**What it does**:
1. `npm run build` — Builds frontend
2. Creates `soha-fe.tar.gz` — `dist/` folder (78MB)
3. Creates `soha-static.tar.gz` — `static/` folder (4MB)
4. Creates `soha-public.tar.gz` — `public/` folder (8KB)
5. Uploads via SCP to `/opt/soha/`
6. Extracts on server
7. Restarts `soha-frontend` service
8. Cleans up temporary files

**Run**:
```bash
node deploy/deploy-fe-only-quick.js
```

**Credentials**: Stored in `deploy/.env.deploy` (gitignored)

### Full Deploy: `scripts/deploy.sh`

For complete deployments including backend:
```bash
./scripts/deploy.sh
```

### Environment Variables

**Backend** (`.env`):
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/soha
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
JWT_SECRET=...
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
REQUIRE_FIREBASE_AUTH=false
ENABLE_USAGE_TRACKING=true
ENABLE_ANALYTICS=true
```

---

## 11. Monitoring & Logging

### Frontend Logger (`utils/logger.ts`)

- **Log levels**: debug, info, warn, error, fatal
- **Transport**: Batched API calls (every 10 seconds)
- **Endpoint**: `POST /api/logs`
- **Buffer size**: Max 50 logs per batch
- **Rate limiting**: 3 logs/second, 50MB storage limit
- **Tags**: `auth`, `comments`, `ai`, `recommendations`, `navigation`, `performance`, `cache`

### Backend Logging

- **Request logging**: Every request logged with timestamps
- **Performance**: Request duration tracking
- **Error logging**: Stack traces for 500 errors
- **Health checks**: `/api/health` endpoint

### Metrics

- **API response times**: Tracked per endpoint
- **Cache hit rates**: Monitored via `cacheManager.js`
- **User activity**: Session tracking, feature usage
- **AI usage**: Token counts, model usage, costs

---

## 12. Performance Optimizations

### Frontend

1. **React.lazy**: Code splitting for all views
2. **useMemo/useCallback**: Expensive computations memoized
3. **Image lazy loading**: `loading="lazy"` on all images
4. **Skeleton loading**: Progressive content display
5. **Virtual scrolling**: Long lists virtualized
6. **Service worker**: Offline support via `sw.js`

### Backend

1. **Memory cache**: LRU with TTL for API responses
2. **Compression**: gzip/deflate responses
3. **Static file caching**: 1-year cache headers
4. **Connection pooling**: MongoDB connection reuse
5. **Request deduplication**: Same-request merging
6. **Streaming**: AI responses via SSE

### Network

1. **Retry logic**: Automatic retries on failure
2. **Circuit breaker**: Prevents cascade failures
3. **Fallback data**: Local cache when backend down
4. **Offline mode**: Full functionality without server
5. **Service worker**: Asset caching

---

## 13. Feature Flags

**Location**: `server/services/featureFlags.js` + `components/FeatureFlagsPanel.tsx`

**Available flags**:
- `bookmarks_system` — Enhanced bookmarks
- `comment_replies` — Comment reply system
- `reading_section` — Reading section
- `podcast_subscriptions` — Podcast subscriptions
- `ai_assistant` — AI features
- `community` — Community features
- `notifications` — Push notifications
- `offline_mode` — Offline support
- `dark_mode` — Dark theme
- `beginner_mode` — Simplified UI

---

## 14. API Reference

### Auth Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/verify` | Verify Firebase token, issue JWT |
| GET | `/api/auth/status` | Check auth status, refresh JWT |
| POST | `/api/auth/logout` | Logout |

### Content Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/content` | Get all content |
| GET | `/api/content/:type` | Get content by type |
| POST | `/api/content` | Create content (admin) |
| PUT | `/api/content/:id` | Update content (admin) |
| DELETE | `/api/content/:id` | Delete content (admin) |

### Podcast/Playlist Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/podcasts` | List podcasts |
| GET | `/api/podcasts/:id` | Get podcast |
| GET | `/api/podcasts/:id/episodes` | Get episodes |
| GET | `/api/playlists` | List playlists |
| GET | `/api/playlists/:id` | Get playlist |

### Comment Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/comments/:contentType/:contentId` | Get comments |
| POST | `/api/comments/:contentType/:contentId` | Add comment |
| POST | `/api/comments/:commentId/react` | Add reaction |
| POST | `/api/comments/:commentId/reply` | Reply to comment |

### AI Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ai/chat` | Chat with AI |
| POST | `/api/ai/chat/stream` | Streaming chat |
| POST | `/api/ai/recommend` | Get recommendations |
| POST | `/api/ai/explain` | Explain topic |
| POST | `/api/ai/summarize` | Summarize text |
| POST | `/api/ai/quiz` | Generate quiz |

### App Update Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/app-updates/latest` | Get latest versions |
| POST | `/api/app-updates/apk` | Update APK version (admin) |
| POST | `/api/app-updates/desktop` | Update desktop version (admin) |

### Admin Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/*` | Admin operations |
| POST | `/api/admin/*` | Admin mutations |

---

## 15. Development

### Prerequisites

- Node.js 18+
- MongoDB (for backend)
- Firebase project (for auth)
- OpenRouter API key (for AI)

### Setup

```bash
# Install dependencies
npm install
cd server && npm install

# Environment variables
cp .env.example .env
# Edit .env with your keys

# Start backend
cd server && node server.js

# Start frontend (new terminal)
npm run dev

# Open browser
open http://localhost:5000
```

### Scripts

```bash
npm run dev          # Vite dev server (port 5000)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run build:electron  # Build Electron
npm run build:android   # Build Android
```

### Testing

```bash
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

---

## 16. Troubleshooting

### Common Issues

1. **Port 5000 in use**: Kill process or change port in `vite.config.ts`
2. **Firebase auth fails**: Check `FIREBASE_*` env vars
3. **AI errors**: Verify `OPENROUTER_API_KEY`
4. **WebSocket fails**: Check firewall, port 5000
5. **Build fails**: Clear `node_modules`, reinstall

### Debug Mode

```bash
# Enable debug logging
DEBUG=true npm run dev

# Backend debug
cd server && DEBUG=true node server.js
```

### Logs

- **Frontend**: Browser console + `POST /api/logs`
- **Backend**: `server/logs/` directory
- **Systemd**: `journalctl -u soha-backend -f`

---

## 17. Contributing

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Persian comments for complex logic
- RTL-aware CSS

### Commit Messages

- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation
- `test:` Tests
- `chore:` Maintenance

### PR Process

1. Create feature branch
2. Write tests
3. Update documentation
4. Submit PR
5. Code review
6. Merge

---

## 18. License

Private project — All rights reserved.

---

**Last Updated**: September 2026
**Version**: 1.0.0
**Maintainer**: EMAD CH
