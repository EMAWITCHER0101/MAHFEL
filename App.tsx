
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Podcast, Episode, Comment, Page, Post, Book, Author, PublishedBook, User, Video } from './types';
import { getPodcasts, getBooks, getAuthors, getVideos, getComments, getPosts, getPublishedBooks, createPost, deletePost as apiDeletePost, addPostComment, updatePost, deleteComment as apiDeleteComment, addComment, likeComment, updateLibrary, prefetchStream, getMe, deletePostComment, updatePostComment, getNotifications, recordPodcastPlay, getMyNotes, createPublishedBook, updatePublishedBook, deletePublishedBook, shareToMahfel, getAuthorNotes, getAlbums, createAlbum, updateAlbum, deleteAlbum, toggleNoteLike, registerFcmToken, unregisterFcmToken } from './services/api';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import OnboardingGuide from './components/OnboardingGuide';
import WelcomeVideo from './components/WelcomeVideo';
import { ADMIN_STEPS, USER_STEPS, AUTHOR_STEPS } from './data/guideSteps';
import ErrorBoundary from './components/ErrorBoundary';
import { initBackgroundPlayback, isApp, isIos, sendNativeNotification, playInBackgroundAudio, stopBackgroundAudio, updateAudioBackgroundMeta, updateAudioBackgroundState, stopPlaybackService, isNativeMode, setNativeModeActive, nativeCommand, getNativeSnapshot, isVideoBackgroundActive, stopVideoBackground, getAppVersion, isDesktop, getDesktopVersion, isVersionNewer, clearWebMediaSession, getFcmToken, desktopShowNotification } from './services/backgroundPlayback';
import { getAppUpdate, AppUpdateInfo } from './services/api';
import UpdateDialog from './components/UpdateDialog';
import { getPushEnabled, syncWebPushSubscription, getAppNotifEnabled } from './services/webPush';
import { OfflineDetector, NetworkErrorPage, VPNBanner, useVPNDetection } from './components/ErrorPages';
import SearchModal from './components/SearchModal';

import Sidebar from './components/Sidebar';
import BottomTabs from './components/BottomTabs';
import MahfelSidebar from './components/MahfelSidebar';
import Toast from './components/Toast';
import NotificationBanner from './components/NotificationBanner';
import LoadingPage from './views/LoadingPage';
import NashrPage, { NoteDetailView, BookDetailView } from './views/NashrPage';
import MinimizedPlayer from './components/MinimizedPlayer';
const FullScreenPlayer = React.lazy(() => import('./components/FullScreenPlayer'));
import IranAccessWarning from './components/IranAccessWarning';
import InstantView from './components/InstantView';
import AlbumViewer from './components/AlbumViewer';

const SowtPage = React.lazy(() => import('./views/SowtPage'));
const MatnPage = React.lazy(() => import('./views/MatnPage'));
const VideoListPage = React.lazy(() => import('./views/VideoListPage'));
const VideoVaultPage = React.lazy(() => import('./views/VideoVaultPage'));
const VideoPlayerPage = React.lazy(() => import('./views/VideoPlayerPage'));
const LibraryPage = React.lazy(() => import('./views/LibraryPage'));
const MahfelPage = React.lazy(() => import('./views/CommentsCommunityPage'));
const SupportPage = React.lazy(() => import('./views/SupportPage'));
const PlaylistPage = React.lazy(() => import('./views/PlaylistPage'));
const AdminPage = React.lazy(() => import('./views/AdminPage'));
const LoginPage = React.lazy(() => import('./views/LoginPage'));
const UserProfilePage = React.lazy(() => import('./views/UserProfilePage'));
const AiAssistantPage = React.lazy(() => import('./views/AiAssistantPage'));
const InterestsPage = React.lazy(() => import('./views/InterestsPage'));
const AuthorPage = React.lazy(() => import('./views/AuthorPage'));
const BookPage = React.lazy(() => import('./views/BookPage'));
const PostCommentsPage = React.lazy(() => import('./views/PostCommentsPage'));
import { formatTime } from './utils/helpers';

// کلید «آخرین نوتیفیکیشن دیده‌شده» — جدا برای مهمان و هر کاربر، تا لاگین/لاگ‌اوت باگ نمایش نوتیفیکیشن نسازد
const notifLastSeenKey = (): string => {
    let uid = '';
    try { const u = JSON.parse(localStorage.getItem('user_data') || 'null'); uid = String(u?.id ?? u?._id ?? ''); } catch { /* ignore */ }
    return uid ? `mahfel_last_notif_id_${uid}` : 'mahfel_last_notif_id_guest';
};

// کلید «نوتیفیکیشن‌های نمایش‌داده‌شده» — مجموعه‌ای از idها برای نمایش هر نوتیفیکیشن دقیقاً یک‌بار روی هر دستگاه
const notifShownKey = (): string => {
    let uid = '';
    try { const u = JSON.parse(localStorage.getItem('user_data') || 'null'); uid = String(u?.id ?? u?._id ?? ''); } catch { /* ignore */ }
    return uid ? `mahfel_shown_notifs_${uid}` : 'mahfel_shown_notifs_guest';
};

const getShownNotifs = (): string[] => {
    try {
        const arr = JSON.parse(localStorage.getItem(notifShownKey()) || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
};

const hasShownNotif = (id: string): boolean => !!id && getShownNotifs().includes(id);

const markShownNotif = (id: string) => {
    if (!id) return;
    try {
        const arr = getShownNotifs();
        if (arr.includes(id)) return;
        arr.unshift(id);
        localStorage.setItem(notifShownKey(), JSON.stringify(arr.slice(0, 60)));
    } catch { /* ignore */ }
};

const AppInner: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const [appState, setAppState] = useState<'initializing' | 'login' | 'interests' | 'ready' | 'admin'>('initializing');
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const [authors, setAuthors] = useState<Author[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [publishedBooks, setPublishedBooks] = useState<PublishedBook[]>([]);
    const [myNotes, setMyNotes] = useState<PublishedBook[]>([]);
    const [usersVersion, setUsersVersion] = useState(0);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [networkError, setNetworkError] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [activeTab, setActiveTab] = useState<Page>('mahfel');
    const [playlistTab, setPlaylistTab] = useState<'about' | 'episodes' | 'comments'>('episodes');
    const [playlistEpisodeIndex, setPlaylistEpisodeIndex] = useState(0);
    
    const [user, setUser] = useState<User | null>(null);
    const userRef = useRef<User | null>(null);
    userRef.current = user;
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
    
    const [currentTrack, setCurrentTrack] = useState<{ podcast: Podcast; episode: Episode; episodeIndex: number } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(() => { try { return parseFloat(localStorage.getItem('soha_volume') || '0.8'); } catch { return 0.8; } });
    const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
    const [isShuffle, setIsShuffle] = useState(false);
    const [sleepTimer, setSleepTimer] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [isWriting, setIsWriting] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [isPublicPost, setIsPublicPost] = useState(true);
    const [selectedAttachment, setSelectedAttachment] = useState<{ type: 'audio' | 'video' | 'book' | 'image', data: any, timestamp?: number } | null>(null);
    const [postMedia, setPostMedia] = useState<{ type: 'image' | 'video' | 'audio'; url: string }[]>([]);

    // بوم شخصی + صف پخش (کتابخانه)
    const [albums, setAlbums] = useState<{ mine: any[]; shared: any[] }>({ mine: [], shared: [] });
    const [albumView, setAlbumView] = useState<any | null>(null);
    const [playQueue, setPlayQueue] = useState<any[]>([]);
    const [queueAuto, setQueueAuto] = useState(true);
    const queueRef = useRef<any[]>([]);
    const queueAlbumIdRef = useRef<string | null>(null);
    useEffect(() => { queueRef.current = playQueue; }, [playQueue]);
    const playQueueNextRef = useRef<() => boolean>(() => false);

    useEffect(() => {
        if (!user?._id && !user?.id) { setAlbums({ mine: [], shared: [] }); return; }
        getAlbums().then((d) => { if (d) setAlbums(d); }).catch(() => {});
    }, [user?._id, user?.id]);
    
    const [toast, setToast] = useState<{ id: number; message: string; image?: string; name?: string } | null>(null);
    const [notif, setNotif] = useState<{ id: string; title: string; body: string; link?: string } | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [viewProfileAuthor, setViewProfileAuthor] = useState<{ name: string; avatar?: string; authorId?: string } | null>(null);
    const [authorPublicNotes, setAuthorPublicNotes] = useState<PublishedBook[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [tabsHidden, setTabsHidden] = useState(false);
    const [mahfelSidebarOpen, setMahfelSidebarOpen] = useState(false);
    const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
    const [showChatInput, setShowChatInput] = useState(false);
    const [chatInputText, setChatInputText] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [instantView, setInstantView] = useState<{title: string, content: string} | null>(null);
    const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
    const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
    const [selectedPostPodcast, setSelectedPostPodcast] = useState<Podcast | null>(null);
    const [selectedVideoComment, setSelectedVideoComment] = useState<{ comment: Comment; video: Video } | null>(null);
    const [activeVideo, setActiveVideo] = useState<Video | null>(null);
    const [isVideoMini, setIsVideoMini] = useState(false);
    const [selectedPublishedBook, setSelectedPublishedBook] = useState<PublishedBook | null>(null);
    const [localVideoLibrary, setLocalVideoLibrary] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('soha_video_library') || '[]'); } catch { return []; }
    });
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    // ══ System back (hardware/browser back) ══
    const layerStackRef = useRef<string[]>([]);
    const [vaultPlaylistOpen, setVaultPlaylistOpen] = useState(false);
    const [vaultBackSignal, setVaultBackSignal] = useState(0);

    const closeLayerRef = useRef<(tag: string) => void>(() => {});
    closeLayerRef.current = (tag: string) => {
        switch (tag) {
            case 'admin': setAppState('ready'); break;
            case 'writing': setIsWriting(false); setSelectedAttachment(null); setPostMedia([]); break;
            case 'instant': setInstantView(null); break;
            case 'profile': setIsProfileOpen(false); setViewProfileAuthor(null); break;
            case 'search': setIsSearchOpen(false); break;
            case 'msidebar': setMahfelSidebarOpen(false); break;
            case 'sidebar': setIsSidebarOpen(false); break;
case 'video-mini': setActiveVideo(null); setIsVideoMini(false); break;
            case 'video': {
                // بعد از پخش در پس‌زمینه، دکمه برگشت مینی‌پلیر نمایش ندهد — PiP به پخش ادامه می‌دهد
                if (isVideoBackgroundActive()) {
                    setActiveVideo(null);
                } else {
                    setIsVideoMini(true);
                }
                break;
            }
            case 'post-comments': setSelectedPostForComments(null); setSelectedPostPodcast(null); break;
            case 'video-comments': setSelectedVideoComment(null); break;
            case 'note': setSelectedPublishedBook(null); break;
            case 'book': setSelectedBook(null); break;
            case 'author': setSelectedAuthor(null); break;
            case 'podcast': setSelectedPodcast(null); setSelectedAuthor(null); break;
            case 'player': setIsPlayerExpanded(false); break;
            case 'chat': setShowChatInput(false); break;
            case 'vault': setVaultBackSignal(s => s + 1); setVaultPlaylistOpen(false); break;
        }
    };

    const openLayers: string[] = [];
    if (appState === 'admin') openLayers.push('admin');
    if (isWriting) openLayers.push('writing');
    if (instantView) openLayers.push('instant');
    if (isProfileOpen) openLayers.push('profile');
    if (isSearchOpen) openLayers.push('search');
    if (mahfelSidebarOpen) openLayers.push('msidebar');
    if (isSidebarOpen) openLayers.push('sidebar');
    if (activeVideo && isVideoMini) openLayers.push('video-mini');
    if (activeVideo && !isVideoMini) openLayers.push('video');
    if (selectedPostForComments) openLayers.push('post-comments');
    if (selectedVideoComment) openLayers.push('video-comments');
    if (selectedPublishedBook) openLayers.push('note');
    if (selectedBook) openLayers.push('book');
    if (selectedAuthor) openLayers.push('author');
    if (selectedPodcast) openLayers.push('podcast');
    if (isPlayerExpanded) openLayers.push('player');
    if (showChatInput) openLayers.push('chat');
    if (vaultPlaylistOpen) openLayers.push('vault');
    const layersKey = openLayers.join('>');

    // Registers one history entry per open layer so system back stays in-app
    useEffect(() => {
        const prevKey = layerStackRef.current.join('>');
        if (layersKey === prevKey) return;
        const prev = layerStackRef.current;
        if (openLayers.length > prev.length) {
            layerStackRef.current = openLayers;
            history.pushState({ soha: openLayers[openLayers.length - 1] }, '');
        } else {
            layerStackRef.current = openLayers;
            history.replaceState(openLayers.length ? { soha: openLayers[openLayers.length - 1] } : { soha: 'root' }, '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layersKey]);

    // System back: close the top layer, or stay in-app at root
    useEffect(() => {
        const onPopState = () => {
            const stack = layerStackRef.current;
            if (stack.length === 0) {
                history.pushState({ soha: 'root' }, '');
                return;
            }
            const tag = stack[stack.length - 1];
            layerStackRef.current = stack.slice(0, -1);
            closeLayerRef.current(tag);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const { isVPN, dismissVPN } = useVPNDetection();
    const prevVPNRef = useRef(isVPN);
    useEffect(() => {
        if (prevVPNRef.current && !isVPN) {
            setToast({ id: Date.now(), message: 'VPN با موفقیت قطع شد!' });
        }
        prevVPNRef.current = isVPN;
    }, [isVPN]);

    const videoCurrentTimeRef = useRef(0);
    const videoPlayingRef = useRef(true);

    const handleVideoTimeUpdate = useCallback((time: number) => {
        videoCurrentTimeRef.current = time;
    }, []);

    const handleVideoPlay = useCallback(() => {
        videoPlayingRef.current = true;
    }, []);

    const handleVideoPause = useCallback(() => {
        videoPlayingRef.current = false;
    }, []);

    useEffect(() => {
        const newId = activeVideo ? (activeVideo.id || (activeVideo as any)._id) : null;
        if (newId !== activeVideoId) {
            setActiveVideoId(newId);
            videoCurrentTimeRef.current = 0;
            videoPlayingRef.current = true;
        }
    }, [activeVideo?.id, (activeVideo as any)?._id, activeVideoId]);

    // Author post editing state
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const recentlyDeletedIds = useRef(new Set<string>());
    const recentEdits = useRef(new Map<string, string>());
    const [editPostText, setEditPostText] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [p, b, a, v, c, po, pb] = await Promise.all([
                    getPodcasts(), getBooks(), getAuthors(), getVideos(), getComments(), getPosts(), getPublishedBooks(),
                ]);
                setPodcasts(p); setBooks(b); setAuthors(a); setVideos(v); setComments(c); setPublishedBooks(pb);
                setPosts([...po].sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime()));
                
                const savedUser = localStorage.getItem('user_data');
                if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
                    const userData = JSON.parse(savedUser);
                    if (userData && userData.name) {
                        if (userData.library?.podcasts) {
                            userData.library.podcasts = userData.library.podcasts.filter((id: any) => id !== null && id !== undefined && String(id) !== 'NaN');
                        }
                        if (!userData.library?.episodes) {
                            if (!userData.library) userData.library = { podcasts: [], episodes: [], videos: [], books: [], notes: [] };
                            userData.library.episodes = [];
                        }
                        setUser(userData);
                        setIsAuthenticated(true);
                        setAppState(['admin', 'superadmin'].includes(userData.role) ? 'admin' : (userData.interests && userData.interests.length > 0 ? 'ready' : 'interests'));
                        const welcomeKey = `welcome_seen_${userData.id || userData.name}`;
                        const onboardingKey = `onboarding_seen_${userData.id || userData.name}`;
                        if (!localStorage.getItem(welcomeKey)) {
                            setShowWelcomeVideo(true);
                        } else if (!localStorage.getItem(onboardingKey)) {
                            setShowOnboarding(true);
                        }
                    } else {
                        setAppState('login');
                    }
                } else {
                    setAppState('login');
                }
            } catch (error) {
                console.error("Initialization error:", error);
                if (!navigator.onLine) {
                    setNetworkError(true);
                } else {
                    setAppState('login');
                }
            } finally {
                setIsLoadingData(false);
            }
        };
        loadInitialData();
        initBackgroundPlayback();
        const welcomeVideo = typeof window !== 'undefined' && window.innerWidth < 768
            ? '/videopage/welcomemobile.mp4'
            : '/videopage/welcomepage.mp4';
        if (typeof document !== 'undefined') {
            const existing = document.querySelector(`link[data-welcome-video]`);
            if (!existing) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'video';
                link.type = 'video/mp4';
                link.href = welcomeVideo;
                link.setAttribute('data-welcome-video', 'true');
                document.head.appendChild(link);
            }
        }
        const checkNotifications = async () => {
            try {
                const current = userRef.current;
                if (!current) return;
                if (!getAppNotifEnabled()) return;
                const list = await getNotifications();
                if (!list || list.length === 0) return;
                const latest = list[0];
                const latestId = String((latest as any)._id || '');
                if (!latestId) return;
                const createdAt = (latest as any).createdAt ? new Date((latest as any).createdAt).getTime() : 0;
                if (createdAt && Date.now() - createdAt > 120000) return;
                notifyDisplay(latestId, latest.title, latest.body, (latest as any).link || '');
            } catch { /* ignore */ }
        };
        checkNotifications();
        const notifTimer = setInterval(checkNotifications, 30000);
        window.addEventListener('focus', checkNotifications);
        window.addEventListener('user-login-changed', checkNotifications);
        // چک‌آپدیت نسخه (فقط در اپ اندروید یا دسکتاپ)
        const checkForUpdate = async () => {
            try {
                const mobile = isApp();
                const desktop = isDesktop();
                if (!mobile && !desktop) return;
                const info = await getAppUpdate();
                if (!info) return;
                if (mobile && !isIos() && info.apkVersion) {
                    const current = getAppVersion();
                    if (!current || isVersionNewer(info.apkVersion, current)) {
                        setUpdateInfo(info);
                        setShowUpdateDialog(true);
                        return;
                    }
                }
                if (desktop && info.desktopVersion) {
                    const current = getDesktopVersion();
                    if (!current || isVersionNewer(info.desktopVersion, current)) {
                        setUpdateInfo(info);
                        setShowUpdateDialog(true);
                    }
                }
            } catch { /* ignore */ }
        };
        checkForUpdate();
        const updateTimer = setInterval(checkForUpdate, 10 * 60 * 1000);

        return () => {
            clearInterval(notifTimer);
            clearInterval(updateTimer);
            window.removeEventListener('focus', checkNotifications);
        };
    }, []);

    // مهاجرت از کلید قدیمی «آخرین دیده‌شده» به مجموعهٔ نمایش‌داده‌شده — تا نوتیفیکیشن قبلاً دیده‌شده دوباره نمایش داده نشود
    useEffect(() => {
        try {
            const prev = localStorage.getItem(notifLastSeenKey());
            if (prev && getShownNotifs().length === 0) {
                localStorage.setItem(notifShownKey(), JSON.stringify([prev]));
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        const syncLibrary = async () => {
            try {
                const res = await getMe();
                if (res?.user) {
                    setUser(prev => {
                        if (!prev) return prev;
                        const updated = { ...prev, library: res.user.library || prev.library };
                        localStorage.setItem('user_data', JSON.stringify(updated));
                        return updated;
                    });
                }
            } catch {}
        };
        if (isAuthenticated) syncLibrary();
    }, [isAuthenticated]);

    const refreshComments = useCallback(async () => {
        try {
            const fresh = await getComments();
            const deleted = recentlyDeletedIds.current;
            const filteredFresh = fresh.filter(c => !deleted.has(String((c as any)._id || c.id)));
            const removeDeletedFromTree = (list: any[]): any[] =>
                list.filter(c => !deleted.has(String((c as any)._id || c.id)))
                    .map(c => c.replies ? { ...c, replies: removeDeletedFromTree(c.replies) } : c);
            const cleanFresh = removeDeletedFromTree(filteredFresh);
            const edits = recentEdits.current;
            const applyEdits = (list: any[]): any[] =>
                list.map(c => {
                    const cid = String((c as any)._id || c.id);
                    const edited = edits.get(cid);
                    const updated = edited ? { ...c, text: edited, isEdited: true } : c;
                    return updated.replies ? { ...updated, replies: applyEdits(updated.replies) } : updated;
                });
            const freshWithEdits = applyEdits(cleanFresh);
            setComments(prev => {
                const countReplies = (c: any): number => {
                    if (!c.replies) return 0;
                    return c.replies.length + c.replies.reduce((s: number, r: any) => s + countReplies(r), 0);
                };
                const prevStr = JSON.stringify(prev.map(c => ({ _id: (c as any)._id || c.id, text: c.text, likes: c.likes, replyCount: countReplies(c), isEdited: (c as any).isEdited })));
                const freshStr = JSON.stringify(freshWithEdits.map(c => ({ _id: (c as any)._id || c.id, text: c.text, likes: c.likes, replyCount: countReplies(c), isEdited: (c as any).isEdited })));
                if (prevStr === freshStr) return prev;
                const merged = freshWithEdits.map(fc => {
                    const existing = prev.find(c => String((c as any)._id || c.id) === String(fc._id || fc.id));
                    return { ...fc, replies: fc.replies && fc.replies.length > 0 ? fc.replies : (existing && existing.replies ? existing.replies : []) };
                });
                merged.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
                const replyMap = new Map<string, Comment[]>();
                merged.forEach(c => {
                    if (c.parentId) {
                        if (!replyMap.has(c.parentId)) replyMap.set(c.parentId, []);
                        replyMap.get(c.parentId)!.push(c);
                    }
                });
                const roots = merged.filter(c => !c.parentId);
                const addReplies = (list: Comment[]): Comment[] =>
                    list.map(c => {
                        const cid = String((c as any)._id || c.id);
                        const replies = replyMap.get(cid) || c.replies || [];
                        return { ...c, replies: addReplies(replies) };
                    });
                return addReplies(roots);
            });
        } catch {}
        try {
            const freshPosts = await getPosts();
            const deletedIds = recentlyDeletedIds.current;
            const keptPosts = freshPosts.filter((p: any) => !deletedIds.has(String(p.id || p._id)));
            setPosts(prev => {
                const freshIds = new Set(keptPosts.map((p: any) => String(p.id || p._id)));
                const isSame = prev.length === keptPosts.length && prev.every((p: any) => freshIds.has(String(p.id || p._id)) && (keptPosts.find((fp: any) => String(fp.id || fp._id) === String(p.id || p._id))?.text || '') === p.text);
                if (isSame) return prev;
                const merged = keptPosts.map((fp: any) => {
                    const existing = prev.find((p: any) => String(p.id || p._id) === String(fp.id || fp._id));
                    return { ...fp, comments: fp.comments && fp.comments.length > 0 ? fp.comments : (existing && existing.comments ? existing.comments : []) };
                });
                merged.sort((a: any, b: any) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
                return merged;
            });
        } catch {}
    }, []);

    const refreshAllData = useCallback(async () => {
        try {
            const [p, b, a, v, pb] = await Promise.all([
                getPodcasts(), getBooks(), getAuthors(), getVideos(), getPublishedBooks(),
            ]);
            setPodcasts(p); setBooks(b); setAuthors(a); setVideos(v); setPublishedBooks(pb);
        } catch {}
        refreshComments();
    }, [refreshComments]);

    // نمایش یک‌بارهٔ نوتیفیکیشن: هر id فقط یک‌بار در هر دستگاه نمایش داده می‌شود
    const notifyDisplay = useCallback((id: string, title: string, body: string, link: string) => {
        if (hasShownNotif(id)) return;
        markShownNotif(id);
        const native = isApp();
        if (native) {
            sendNativeNotification(title || 'محفل', body || '', link || '');
            return;
        }
        const visible = typeof document !== 'undefined' && document.visibilityState === 'visible';
        if (visible) {
            setNotif({ id, title: title || 'محفل', body: body || '', link: link || '' });
            return;
        }
        // دسکتاپ (Electron): سرویس‌کار/پوش وب وجود ندارد → اعلان سیستمی از طریق پل نیتیو
        if (isDesktop()) {
            const sent = desktopShowNotification(title || 'محفل', body || '', link || '');
            if (!sent) {
                // نسخهٔ قدیمی EXE بدون پل → Notification خود Chromium (بعد از گرفتن مجوز)
                try {
                    if (typeof Notification !== 'undefined') {
                        const show = () => {
                            const n = new Notification(title || 'محفل', { body: body || '', icon: '/logo.png', tag: id });
                            n.onclick = () => {
                                try { window.focus(); } catch { /* ignore */ }
                                if (link) window.dispatchEvent(new CustomEvent('mahfel-open-notif', { detail: link }));
                                try { n.close(); } catch { /* ignore */ }
                            };
                        };
                        if (Notification.permission === 'granted') show();
                        else Notification.requestPermission().then((p) => { if (p === 'granted') show(); }).catch(() => { /* ignore */ });
                    }
                } catch { /* ignore */ }
            }
        }
    }, []);

    // ── FCM (اندروید): ثبت/حذف توکن گوشی — push وقتی اپ بسته است ──
    const syncFcmToken = useCallback(async () => {
        try {
            const token = getFcmToken();
            if (!token || !userRef.current) return;
            await registerFcmToken(token);
        } catch { /* ignore */ }
    }, []);

    const clearFcmToken = useCallback(async () => {
        try {
            const token = getFcmToken();
            if (!token) return;
            await unregisterFcmToken(token);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (isAuthenticated) syncFcmToken();
        const onFcm = () => { if (isAuthenticated) syncFcmToken(); };
        window.addEventListener('mahfel-fcm-token', onFcm);
        return () => window.removeEventListener('mahfel-fcm-token', onFcm);
    }, [isAuthenticated, syncFcmToken]);

    const applyRealtimePayload = useCallback((type: string, payload: any) => {
        const action = payload?.action;
        if (!action) { refreshAllData(); return; }
        const key = (x: any) => String((x as any)?._id ?? (x as any)?.id ?? '');
        const sid = (v: any) => String(v);

        if (type === 'posts') {
            if (action === 'create' && payload.item) {
                const item = payload.item;
                setPosts(prev => prev.some(p => key(p) === key(item)) ? prev : [item, ...prev]);
            } else if (action === 'update' && payload.item) {
                const item = payload.item;
                setPosts(prev => prev.map(p => key(p) === key(item) ? { ...p, ...item } : p));
            } else if (action === 'delete') {
                const id = sid(payload.id);
                recentlyDeletedIds.current.add(id);
                setPosts(prev => prev.filter(p => key(p) !== id));
            } else if (action === 'ids-delete') {
                const ids = ((payload.ids as any[]) || []).map(sid);
                const set = new Set(ids);
                set.forEach(id => recentlyDeletedIds.current.add(id));
                setPosts(prev => prev.filter(p => !set.has(key(p))));
            } else if (action === 'purge') {
                setPosts([]);
            } else if (action === 'ids-pin' || action === 'ids-unpin') {
                const set = new Set(((payload.ids as any[]) || []).map(sid));
                const pinned = action === 'ids-pin';
                setPosts(prev => prev.map(p => set.has(key(p)) ? { ...p, isPinned: pinned } : p));
            } else refreshAllData();
            return;
        }

        if (type === 'comments') {
            if (action === 'create' && payload.item) {
                const item = payload.item;
                const hasInTree = (list: Comment[]): boolean =>
                    list.some(c => key(c) === key(item) || (c.replies && hasInTree(c.replies)));
                setComments(prev => hasInTree(prev) ? prev : insertCommentIntoTree(prev, item));
            } else if (action === 'update' && payload.item) {
                const item = payload.item;
                const apply = (list: Comment[]): Comment[] =>
                    list.map(c => key(c) === key(item)
                        ? { ...c, ...item }
                        : c.replies ? { ...c, replies: apply(c.replies) } : c);
                setComments(prev => apply(prev));
            } else if (action === 'delete') {
                const id = sid(payload.id);
                const remove = (list: Comment[]): Comment[] =>
                    list.filter(c => key(c) !== id).map(c => c.replies ? { ...c, replies: remove(c.replies) } : c);
                setComments(prev => remove(prev));
                setPosts(prev => prev.map(p => ({ ...p, comments: (p.comments || []).filter((c: any) => key(c) !== id) })));
            } else if (action === 'ids-delete') {
                const set = new Set((payload.ids || []).map(sid));
                const remove = (list: Comment[]): Comment[] =>
                    list.filter(c => !set.has(key(c))).map(c => c.replies ? { ...c, replies: remove(c.replies) } : c);
                setComments(prev => remove(prev));
            } else refreshAllData();
            return;
        }

        if (type === 'notifications') {
            if (action === 'create' && payload.item) {
                const item = payload.item;
                const current = userRef.current;
                if (!current) return;
                const myId = String((current as any)?._id ?? (current as any)?.id ?? '');
                if (item.userId && myId && String(item.userId) !== myId) return;
                if (!item.userId && item.target === 'admins' && (current as any)?.role !== 'admin') return;
                if (!getAppNotifEnabled()) return;
                notifyDisplay(String(item._id || ''), item.title, item.body, item.link || '');
            } else if (action === 'delete') {
                try { window.dispatchEvent(new Event('mahfel-notifs-refresh')); } catch { /* ignore */ }
            }
            return;
        }

        const setters: Record<string, any> = {
            videos: setVideos, podcasts: setPodcasts, books: setBooks,
            authors: setAuthors, publishedBooks: setPublishedBooks,
        };
        if (type === 'users') { setUsersVersion(v => v + 1); return; }
        const setter = setters[type];
        if (!setter) { refreshAllData(); return; }
        setter((prev: any[]) => {
            if (action === 'create' && payload.item) {
                if (prev.some(p => key(p) === key(payload.item))) return prev;
                return [{ ...payload.item, id: payload.item._id ?? payload.item.id }, ...prev];
            }
            if (action === 'update' && payload.item) {
                return prev.map(p => key(p) === key(payload.item) ? { ...payload.item, id: payload.item._id ?? payload.item.id } : p);
            }
            if (action === 'delete') return prev.filter(p => key(p) !== sid(payload.id));
            return prev;
        });
    }, [refreshAllData, notifyDisplay]);

    useEffect(() => {
        let realtimeStarted = false;
        const start = async () => {
            const { startRealtime } = await import('./services/realtime');
            startRealtime({ onDataChanged: (type: any, payload: any) => { applyRealtimePayload(type, payload); } });
            realtimeStarted = true;
        };
        start();
        const onVisible = () => {
            if (!document.hidden) {
                import('./services/realtime').then(m => m.reconnectNow()).catch(() => {});
                refreshComments();
            }
        };
        const onOnline = () => {
            import('./services/realtime').then(m => m.reconnectNow()).catch(() => {});
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('online', onOnline);
        return () => {
            if (realtimeStarted) {
                import('./services/realtime').then(m => m.stopRealtime()).catch(() => {});
            }
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('online', onOnline);
        };
    }, [refreshComments]);

    useEffect(() => {
        if (!selectedVideoComment) return;
        const findInTree = (list: Comment[], targetId: string): Comment | null => {
            for (const c of list) {
                const cid = String((c as any)._id || c.id);
                if (cid === targetId) return c;
                if (c.replies) { const found = findInTree(c.replies, targetId); if (found) return found; }
            }
            return null;
        };
        const targetId = String((selectedVideoComment.comment as any)._id || selectedVideoComment.comment.id);
        const updated = findInTree(comments, targetId);
        if (updated && updated !== selectedVideoComment.comment) {
            setSelectedVideoComment({ comment: updated, video: selectedVideoComment.video });
        }
    }, [comments, selectedVideoComment]);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.ontimeupdate = () => {
                if(!audioRef.current) return;
                setAudioProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
            };
            audioRef.current.onloadedmetadata = () => {
                if(!audioRef.current) return;
                setAudioDuration(audioRef.current.duration);
            };
            audioRef.current.onended = () => {
                if (repeatMode === 'one') { audioRef.current?.play(); return; }
                if (repeatMode === 'all' || isShuffle) { playNext(); return; }
                if (queueAuto && playQueueNextRef.current()) { setIsPlaying(true); return; }
                setIsPlaying(false);
            };
        }
        audioRef.current.volume = volume;
    }, [repeatMode, isShuffle, volume, queueAuto]);

    // Web Push: ثبت سرویس‌ورکر و همگام‌سازی اشتراک قبلی (در APK هیچ سرویس‌ورکری ثبت نمی‌شود)
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        if (isApp()) {
            // APK = نمایش خالص وب: هر سرویس‌ورکر/کش قبلی را حذف کن تا هیچ داده‌ای ذخیره نماند
            navigator.serviceWorker.getRegistrations()
                .then(regs => regs.forEach(r => r.unregister()))
                .catch(() => {});
            try {
                if ('caches' in window) {
                    caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
                }
            } catch { /* ignore */ }
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                if (getPushEnabled()) {
                    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
                    if (!cancelled && reg.active) await syncWebPushSubscription();
                }
            } catch { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, []);

    // بیدارشدن از push (تب پس‌زمینه) یا از پلر نیتیو اندروید → رفرش فوری
    useEffect(() => {
        const onSwMsg = (e: MessageEvent) => {
            if (e.data && e.data.type === 'mahfel-refresh') refreshAllData();
        };
        const onNativeRefresh = () => refreshAllData();
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', onSwMsg);
        }
        window.addEventListener('mahfel-native-refresh', onNativeRefresh);
        return () => {
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', onSwMsg);
            }
            window.removeEventListener('mahfel-native-refresh', onNativeRefresh);
        };
    }, [refreshAllData]);

    // Close sidebar when image/video lightbox opens
    const prevCollapsedRef = useRef(desktopSidebarCollapsed);

    // Swipe between tabs on mobile (horizontal drag) — ترتیب همان منوی بار پایینی موبایل است (RTL: راست ← چپ)
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const TAB_SWIPE_ORDER: Page[] = ['sowt', 'library', 'mahfel', 'videos', 'nashr'];
    const canSwipeTabs = () =>
        typeof window !== 'undefined' &&
        window.innerWidth < 1024 &&
        !isDesktop() &&
        appState === 'ready' &&
        !isWriting &&
        !selectedPodcast &&
        !selectedBook &&
        !selectedPublishedBook &&
        !selectedAuthor &&
        !isPlayerExpanded &&
        !isSearchOpen &&
        !mahfelSidebarOpen &&
        !isSidebarOpen &&
        !activeVideo;
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!canSwipeTabs()) { swipeStartRef.current = null; return; }
        // اگر لمس داخل یک ناحیهٔ اسکرول افقی (کاروسل/فیلتر) شروع شده → سوییپ تب را فعال نکن
        let node: HTMLElement | null = e.target as HTMLElement | null;
        const container = e.currentTarget as HTMLElement;
        try {
            while (node && node !== container) {
                if (node.scrollWidth > node.clientWidth + 4) { swipeStartRef.current = null; return; }
                node = node.parentElement;
            }
        } catch { /* ignore */ }
        const t = e.touches[0];
        swipeStartRef.current = { x: t.clientX, y: t.clientY };
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        if (!start || !canSwipeTabs()) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const idx = TAB_SWIPE_ORDER.indexOf(activeTab);
        if (idx < 0) return;
        const next = dx < 0 ? TAB_SWIPE_ORDER[idx + 1] : TAB_SWIPE_ORDER[idx - 1];
        if (next) setActiveTab(next);
    };
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.open) {
                prevCollapsedRef.current = desktopSidebarCollapsed;
                setIsSidebarOpen(false);
                setDesktopSidebarCollapsed(true);
            } else {
                setDesktopSidebarCollapsed(prevCollapsedRef.current);
            }
        };
        window.addEventListener('lightbox-change', handler);
        return () => window.removeEventListener('lightbox-change', handler);
    }, [desktopSidebarCollapsed]);

    const handleLogin = (u: User, token?: string) => {
        setUser(u);
        setIsAuthenticated(true);
        if (token) localStorage.setItem('soha_token', token);
        localStorage.setItem('user_data', JSON.stringify(u));
        window.dispatchEvent(new Event('user-login-changed'));
        syncFcmToken();
        if (['admin', 'superadmin'].includes(u.role)) { setAppState('admin'); }
        else { setAppState(u.interests && u.interests.length > 0 ? 'ready' : 'interests'); }
        const welcomeKey = `welcome_seen_${u.id || u.name}`;
        const onboardingKey = `onboarding_seen_${u.id || u.name}`;
        if (!localStorage.getItem(welcomeKey)) {
            setShowWelcomeVideo(true);
        } else if (!localStorage.getItem(onboardingKey)) {
            setShowOnboarding(true);
        }
    };

    const handleLogout = () => {
        clearFcmToken();
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('soha_token');
        localStorage.removeItem('user_data');
        window.dispatchEvent(new Event('user-login-changed'));
        setAppState('login');
        setIsProfileOpen(false);
    };

    const handleOnboardingComplete = () => {
        if (user) {
            localStorage.setItem(`onboarding_seen_${user.id || user.name}`, 'true');
        }
        setShowOnboarding(false);
    };

    const handleWelcomeComplete = () => {
        if (user) {
            localStorage.setItem(`welcome_seen_${user.id || user.name}`, 'true');
        }
        setShowWelcomeVideo(false);
        const onboardingKey = `onboarding_seen_${user.id || user?.name}`;
        if (!localStorage.getItem(onboardingKey)) {
            setShowOnboarding(true);
        }
    };

    const playEpisode = useCallback((podcast: Podcast, index: number) => {
        const episode = podcast.episodes[index];
        if (!episode || !episode.audioUrl) return;
        // قطع خودکار پخش پس‌زمینه ویدیو هنگام پخش صوت جدید
        if (isVideoBackgroundActive()) stopVideoBackground();
        setActiveVideo(null);
        setIsVideoMini(false);
        setCurrentTrack({ podcast, episode, episodeIndex: index });
        setIsPlayerExpanded(true);
        const audioUrl = episode.audioUrl;
        const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`;
        recordPodcastPlay(String(podcast.id || (podcast as any)._id), index);
        // APK: اگر پخش در پلیر نیتیو پس‌زمینه است → همانجا سوئیچ کن (مثل اسپاتیفای)
        if (isApp() && isNativeMode()) {
            const author = authors.find(a => a.id === podcast.speakerId);
            updateAudioBackgroundMeta({
                title: String(episode.title || ''),
                artist: author?.name || String(podcast.title || ''),
                album: String(podcast.title || 'محفل'),
                artwork: String(episode.cover || podcast.cover || ''),
                duration: 0,
            });
            // لیست کامل اپیزودها → دکمه‌های next/prev نیتیو (نوتیفیکیشن و لاک‌اسکرین) خودشان پخش را عوض کنند
            const queue = podcast.episodes.map((ep: any, i: number) => ({
                url: `${window.location.origin}/api/proxy/audio?url=${encodeURIComponent(ep.audioUrl || '')}`,
                title: String(ep.title || ''),
                artist: author?.name || String(podcast.title || ''),
                artwork: String(ep.cover || podcast.cover || ''),
                podcastId: String(podcast.id || (podcast as any)._id),
            }));
            nativeCommand({
                cmd: 'play',
                url: queue[index]?.url || `${window.location.origin}${proxyUrl}`,
                positionMs: 0,
                podcastId: String(podcast.id || (podcast as any)._id),
                episodeIndex: index,
                queueIndex: index,
                queue,
            });
            setIsPlaying(true);
            return;
        }
        if (audioRef.current) {
            (audioRef.current as any).dataset.podcastId = String(podcast.id || (podcast as any)._id);
            (audioRef.current as any).dataset.episodeIndex = String(index);
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
        }
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.ontimeupdate = () => {
                if(!audioRef.current) return;
                setAudioProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
            };
            audioRef.current.onloadedmetadata = () => {
                if(!audioRef.current) return;
                setAudioDuration(audioRef.current.duration);
            };
            audioRef.current.onended = () => setIsPlaying(false);
            audioRef.current.onerror = () => {
                console.error('Audio error:', audioRef.current?.error?.message || 'unknown error', 'src:', audioRef.current?.src);
            };
        }
        try {
            audioRef.current.src = proxyUrl;
            audioRef.current.load();
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(() => {});
        } catch(e) {}
    }, [authors]);

    const togglePlay = () => {
        if (!currentTrack) return;
        // APK: در حالت نیتیو (پلیر پس‌زمینه) کنترل مستقیم روی پلیر نیتیو
        if (isApp() && isNativeMode()) {
            if (isPlaying) { nativeCommand({ cmd: 'pause' }); } else { nativeCommand({ cmd: 'resume' }); }
            setIsPlaying(!isPlaying);
            return;
        }
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.ontimeupdate = () => {
                if(!audioRef.current) return;
                setAudioProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
            };
            audioRef.current.onloadedmetadata = () => {
                if(!audioRef.current) return;
                setAudioDuration(audioRef.current.duration);
            };
            audioRef.current.onended = () => setIsPlaying(false);
            audioRef.current.onerror = () => {
                console.error('Audio error:', audioRef.current?.error?.message || 'unknown');
            };
        }
        if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
        else { audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error); }
    };

    const playNext = useCallback(() => {
        if (!currentTrack) return;
        const { podcast, episodeIndex } = currentTrack;
        let nextIndex: number;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * podcast.episodes.length);
            if (nextIndex === episodeIndex && podcast.episodes.length > 1) {
                nextIndex = (nextIndex + 1) % podcast.episodes.length;
            }
        } else {
            nextIndex = episodeIndex + 1;
            if (repeatMode === 'all' && nextIndex >= podcast.episodes.length) nextIndex = 0;
        }
        if (nextIndex < podcast.episodes.length) {
            playEpisode(podcast, nextIndex);
        }
    }, [currentTrack, playEpisode, isShuffle, repeatMode]);

    const playPrev = useCallback(() => {
        if (!currentTrack) return;
        const { podcast, episodeIndex } = currentTrack;
        let prevIndex = episodeIndex - 1;
        if (prevIndex < 0 && repeatMode === 'all') prevIndex = podcast.episodes.length - 1;
        if (prevIndex >= 0) {
            playEpisode(podcast, prevIndex);
        }
    }, [currentTrack, playEpisode, repeatMode]);

    // Volume handler
    const handleVolumeChange = useCallback((v: number) => {
        setVolume(v);
        localStorage.setItem('soha_volume', String(v));
        if (audioRef.current) audioRef.current.volume = v;
    }, []);

    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = playbackRate;
    }, [playbackRate]);

    // Sleep timer
    useEffect(() => {
        if (sleepTimer === null) return;
        const id = setTimeout(() => {
            if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
            setSleepTimer(null);
        }, sleepTimer);
        return () => clearTimeout(id);
    }, [sleepTimer]);

    const handleClosePlayer = useCallback(() => {
        if (isApp() && isNativeMode()) {
            nativeCommand({ cmd: 'stop' });
        } else {
            stopBackgroundAudio();
            stopPlaybackService();
        }
        if (audioRef.current) { audioRef.current.pause(); }
        setIsPlaying(false);
        setAudioProgress(0);
        setAudioDuration(0);
        setCurrentTrack(null);
        setIsPlayerExpanded(false);
    }, []);

    const handlePlayInBackground = useCallback(() => {
        if (!currentTrack || !audioRef.current) return;
        const { podcast, episode } = currentTrack;
        const author = authors.find(a => a.id === podcast.speakerId);
        const artwork = String(episode.cover || podcast.cover || '');
        playInBackgroundAudio({
            title: String(episode.title || ''),
            artist: author?.name || String(podcast.title || ''),
            album: String(podcast.title || 'محفل'),
            artwork: artwork || undefined,
            duration: audioDuration,
            onPlay: () => { audioRef.current?.play().catch(() => {}); },
            onPause: () => { audioRef.current?.pause(); },
            onSeek: (t) => { if (audioRef.current) audioRef.current.currentTime = t; },
            onNext: () => playNext(),
            onPrev: () => playPrev(),
        });
        setToast({ id: Date.now(), message: 'پخش در پس‌زمینه فعال شد' });
    }, [currentTrack, authors, audioDuration, playNext, playPrev]);

    // دستورهای اعلان/لاک‌اسکرین نیتیو (APK) → کنترل پلیر صوتی مثل وب
    useEffect(() => {
        const onCmd = (e: any) => {
            const cmd: string = e?.detail;
            if (typeof cmd !== 'string' || !cmd) return;
            if (cmd.startsWith('track:')) {
                // سرویس نیتیو خودش اپیزود را عوض کرده → فقط UI را همگام کن
                if (!currentTrack) return;
                const idx = parseInt(cmd.slice(6), 10);
                const { podcast } = currentTrack;
                if (isFinite(idx) && podcast.episodes[idx]) {
                    setCurrentTrack({ podcast, episode: podcast.episodes[idx], episodeIndex: idx });
                    setIsPlaying(true);
                }
                return;
            }
            if (!currentTrack) return;
            if (cmd.startsWith('seekto:')) {
                const ms = parseFloat(cmd.slice(7));
                if (isFinite(ms) && audioRef.current && !isNativeMode()) {
                    audioRef.current.currentTime = ms / 1000;
                }
                return;
            }
            switch (cmd) {
                case 'play':
                    if (isNativeMode()) { setIsPlaying(true); break; }
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                    setIsPlaying(true); break;
                case 'pause':
                    if (isNativeMode()) { setIsPlaying(false); break; }
                    if (audioRef.current) audioRef.current.pause();
                    setIsPlaying(false); break;
                case 'next': playNext(); break;
                case 'prev': playPrev(); break;
                case 'stop': handleClosePlayer(); break;
            }
        };
        window.addEventListener('mahfel-media-command', onCmd);
        return () => window.removeEventListener('mahfel-media-command', onCmd);
    }, [currentTrack, playNext, playPrev, handleClosePlayer]);

    // همگام‌سازی خودکار پلیر پس‌زمینه APK: متادیتا و وضعیت → سرویس نیتیو
    useEffect(() => {
        if (!isApp()) return;
        if (isNativeMode()) return; // در حالت نیتیو، وضعیت را پلیر نیتیو کنترل می‌کند
        if (!currentTrack || !audioRef.current) return;
        const { podcast, episode } = currentTrack;
        const author = authors.find(a => a.id === podcast.speakerId);
        // مدیا سشن وب را غیرفعال کن تا WebView نوتیفیکیشن خودش (Video player) را نشان ندهد
        clearWebMediaSession();
        updateAudioBackgroundMeta({
            title: String(episode.title || ''),
            artist: author?.name || String(podcast.title || ''),
            album: String(podcast.title || 'محفل'),
            artwork: String(episode.cover || podcast.cover || ''),
            duration: audioRef.current.duration || 0,
        });
        updateAudioBackgroundState(isPlaying, (audioRef.current.currentTime || 0) * 1000, (audioRef.current.duration || 0) * 1000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, currentTrack]);

    // به‌روزرسانی دوره‌ای موقعیت پخش (نوار پیشرفت نوتیفیکیشن)
    useEffect(() => {
        if (!isApp() || isNativeMode() || !isPlaying || !audioRef.current || !currentTrack) return;
        const id = setInterval(() => {
            if (!audioRef.current || !currentTrack) return;
            updateAudioBackgroundState(true, (audioRef.current.currentTime || 0) * 1000, (audioRef.current.duration || 0) * 1000);
        }, 2000);
        return () => clearInterval(id);
    }, [isPlaying, currentTrack]);

    // بازیابی پخش نیتیو پس از بازگشایی اپ (اگر سرویس از وضعیت قبلی ادامه می‌دهد — مثل اسپاتیفای)
    const nativeRestoredRef = useRef(false);
    useEffect(() => {
        if (!isApp() || nativeRestoredRef.current || podcasts.length === 0) return;
        nativeRestoredRef.current = true;
        try {
            const snap = getNativeSnapshot();
            if (snap && snap.nativeMode && snap.playing && snap.podcastId) {
                const p = podcasts.find(x => String(x.id || (x as any)._id) === String(snap.podcastId));
                if (p && p.episodes[snap.episodeIndex]) {
                    setNativeModeActive(true);
                    setCurrentTrack({ podcast: p, episode: p.episodes[snap.episodeIndex], episodeIndex: snap.episodeIndex });
                    setIsPlaying(true);
                    setIsPlayerExpanded(true);
                }
            }
        } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [podcasts.length]);

    const handlePlayVideo = useCallback((v: Video | null) => {
        // قطع خودکار پخش پس‌زمینه قبلی هنگام پخش ویدیو جدید
        stopBackgroundAudio();
        if (isVideoBackgroundActive()) stopVideoBackground();
        if (audioRef.current) { audioRef.current.pause(); }
        setIsPlaying(false);
        setAudioProgress(0);
        setAudioDuration(0);
        setCurrentTrack(null);
        setIsPlayerExpanded(false);
        setActiveVideo(v);
    }, []);

    // ── صف پخش (کتابخانه) ──
    const playQueueItem = useCallback((item: any) => {
        if (!item) return;
        if (item.type === 'audio') {
            const p = podcasts.find((x: any) => String(x.id || x._id) === String(item.podcastId));
            if (p && p.episodes[item.episodeIndex]) playEpisode(p, item.episodeIndex);
        } else {
            const v = videos.find((x: any) => String(x.id || x._id) === String(item.videoId));
            if (v) { setIsVideoMini(false); handlePlayVideo(v); }
        }
    }, [podcasts, videos, playEpisode, handlePlayVideo]);

    const playQueueNext = useCallback(() => {
        const q = queueRef.current;
        if (!q || q.length === 0) return false;
        const [next, ...rest] = q;
        queueRef.current = rest;
        setPlayQueue(rest);
        playQueueItem(next);
        return true;
    }, [playQueueItem]);
    playQueueNextRef.current = playQueueNext;

    const addToQueue = useCallback((item: any) => {
        setPlayQueue(q => [...q, item]);
    }, []);
    const removeFromQueue = useCallback((index: number) => {
        setPlayQueue(q => q.filter((_, k) => k !== index));
        queueRef.current = queueRef.current.filter((_, k) => k !== index);
    }, []);
    const clearQueue = useCallback(() => {
        setPlayQueue([]);
        queueRef.current = [];
    }, []);

    const playAlbum = useCallback((album: any) => {
        const items: any[] = (album?.items || []).filter((it: any) => it.noteId == null).map((it: any) =>
            it.podcastId != null
                ? { type: 'audio', podcastId: String(it.podcastId), episodeIndex: it.episodeIndex ?? 0, title: it.title || '', cover: it.cover || '' }
                : { type: 'video', videoId: String(it.videoId), title: it.title || '', cover: it.cover || '' });
        if (items.length === 0) return;
        queueAlbumIdRef.current = String(album?._id || album?.id || '');
        setPlayQueue(items.slice(1));
        queueRef.current = items.slice(1);
        playQueueItem(items[0]);
    }, [playQueueItem]);

    const onAlbumSaved = useCallback((albumId: string, items: any[]) => {
        if (!albumId || queueAlbumIdRef.current !== albumId) return;
        const playable = (items || []).filter((it: any) => it.noteId == null).map((it: any) =>
            it.podcastId != null
                ? { type: 'audio', podcastId: String(it.podcastId), episodeIndex: it.episodeIndex ?? 0, title: it.title || '', cover: it.cover || '' }
                : { type: 'video', videoId: String(it.videoId), title: it.title || '', cover: it.cover || '' });
        setPlayQueue(playable.slice(1));
        queueRef.current = playable.slice(1);
    }, []);

    const playAlbumItem = useCallback((item: any) => {
        if (item.noteId != null) {
            setInstantView({ title: item.title || 'یادداشت', content: item.content || '' });
            setAlbumView(null);
            return;
        }
        const it = item.podcastId != null
            ? { type: 'audio', podcastId: String(item.podcastId), episodeIndex: item.episodeIndex ?? 0, title: item.title || '', cover: item.cover || '' }
            : { type: 'video', videoId: String(item.videoId), title: item.title || '', cover: item.cover || '' };
        setPlayQueue([]);
        queueRef.current = [];
        playQueueItem(it);
        setAlbumView(null);
    }, [playQueueItem]);

    const toggleSavePost = useCallback(async (post: Post) => {
        if (!user) return;
        const id = String((post as any).id || (post as any)._id);
        const cur: string[] = user.library?.posts || [];
        const isIn = cur.some(x => String(x) === id);
        const next = isIn ? cur.filter(x => String(x) !== id) : [id, ...cur];
        const updatedUser = { ...user, library: { ...(user.library || {}), posts: next } };
        setUser(updatedUser);
        try { localStorage.setItem('user_data', JSON.stringify(updatedUser)); } catch {}
        try { await updateLibrary({ posts: next }); } catch {}
        setToast({ id: Date.now(), message: isIn ? 'پست از کتابخانه حذف شد' : 'پست در کتابخانه ذخیره شد', image: (post as any).authorAvatarUrl || '', name: (post as any).author || '' });
    }, [user]);

    const toggleSaveNote = useCallback(async (note: any) => {
        if (!user) return;
        const id = String((note as any).id || (note as any)._id);
        const cur: any[] = user.library?.notes || [];
        const isIn = cur.some(x => String(x) === id);
        const next = isIn ? cur.filter(x => String(x) !== id) : [id, ...cur];
        const updatedUser = { ...user, library: { ...(user.library || {}), notes: next } };
        setUser(updatedUser);
        try { localStorage.setItem('user_data', JSON.stringify(updatedUser)); } catch {}
        try { await updateLibrary({ notes: next }); } catch {}
        setToast({ id: Date.now(), message: isIn ? 'یادداشت از کتابخانه حذف شد' : 'یادداشت در کتابخانه ذخیره شد', image: '', name: String((note as any).title || '') });
    }, [user]);

    const handleSaveBookmark = useCallback(async (book: PublishedBook, text: string, page: number) => {
        if (!user) return;
        const id = String((book as any).id || (book as any)._id);
        const cur: any[] = user.library?.bookmarks || [];
        const item = { bookId: id, bookTitle: String(book.title || ''), page, text: String(text || '').trim().slice(0, 600) };
        if (!item.text) return;
        const exists = cur.some(b => b.bookId === id && b.page === page && b.text === item.text);
        if (exists) {
            setToast({ id: Date.now(), message: 'این نشان قبلاً ذخیره شده است' });
            return;
        }
        const next = [item, ...cur].slice(0, 200);
        const updatedUser = { ...user, library: { ...(user.library || {}), bookmarks: next } };
        setUser(updatedUser);
        try { localStorage.setItem('user_data', JSON.stringify(updatedUser)); } catch {}
        try { await updateLibrary({ bookmarks: next }); } catch {}
        setToast({ id: Date.now(), message: 'نشان در کتابخانه ذخیره شد', image: '', name: item.bookTitle });
    }, [user]);

    const handleRemoveBookmark = useCallback(async (bookId: string, text: string) => {
        if (!user) return;
        const cur: any[] = user.library?.bookmarks || [];
        const next = cur.filter(b => !(b.bookId === bookId && b.text === text));
        const updatedUser = { ...user, library: { ...(user.library || {}), bookmarks: next } };
        setUser(updatedUser);
        try { localStorage.setItem('user_data', JSON.stringify(updatedUser)); } catch {}
        try { await updateLibrary({ bookmarks: next }); } catch {}
        setToast({ id: Date.now(), message: 'نشان از کتابخانه حذف شد' });
    }, [user]);

    // باز کردن لینک نوتیفیکیشن (باز شدن اپ از نوتیفیکیشن یا کلیک روی بنر) — همگام با صفحه‌های اپ
    const handleNotifOpen = useCallback((link?: string | null) => {
        if (!link) return;
        const l = String(link);
        const openVideo = (v: any) => {
            setActiveTab('mahfel');
            setIsVideoMini(false);
            handlePlayVideo(v);
        };
        const vm = l.match(/\/mahfel\/video\/([^/?#]+)/);
        if (vm) {
            const id = vm[1];
            const v = videos.find(x => String((x as any).id || (x as any)._id) === id);
            if (v) { openVideo(v); return; }
            getVideos().then((list) => {
                const v2 = (list || []).find(x => String((x as any).id || (x as any)._id) === id);
                if (v2) openVideo(v2);
            }).catch(() => {});
            return;
        }
        const pm = l.match(/\/mahfel\/post\/([^/?#]+)/);
        if (pm) {
            const id = pm[1];
            const openPost = (p: any) => setSelectedPostForComments(p);
            const p = posts.find(x => String((x as any).id || (x as any)._id) === id);
            if (p) { openPost(p); return; }
            getPosts().then((list) => {
                const p2 = (list || []).find(x => String((x as any).id || (x as any)._id) === id);
                if (p2) openPost(p2);
            }).catch(() => {});
            return;
        }
        const podm = l.match(/\/mahfel\/podcast\/([^/?#]+)(?:\?ep=(\d+))?/);
        if (podm) {
            const id = podm[1];
            const ep = podm[2] != null ? parseInt(podm[2], 10) : undefined;
            const openP = (p: any) => { setSelectedPodcast(p); if (ep != null) setPlaylistEpisodeIndex(ep); };
            const p = podcasts.find(x => String((x as any).id || (x as any)._id) === id);
            if (p) { openP(p); return; }
            getPodcasts().then((list) => {
                const p2 = (list || []).find(x => String((x as any).id || (x as any)._id) === id);
                if (p2) openP(p2);
            }).catch(() => {});
            return;
        }
        const bm = l.match(/\/mahfel\/book\/([^/?#]+)/);
        if (bm) {
            const id = bm[1];
            const openB = (b: any) => { setSelectedPublishedBook(b); setActiveTab('nashr'); };
            const b = publishedBooks.find(x => String((x as any).id || (x as any)._id) === id);
            if (b) { openB(b); return; }
            getPublishedBooks().then((list) => {
                const b2 = (list || []).find(x => String((x as any).id || (x as any)._id) === id);
                if (b2) openB(b2);
            }).catch(() => {});
            return;
        }
        if (l === '/' || l === '/mahfel' || l === '/mahfel/videos') { setActiveTab('videos'); return; }
        const adminMatch = l.match(/^\/admin(?:\?tab=(.+))?$/);
        if (adminMatch) {
            setAppState('admin');
            if (adminMatch[1]) {
                setTimeout(() => { window.dispatchEvent(new CustomEvent('admin-goto-tab', { detail: adminMatch[1] })); }, 300);
            }
            return;
        }
        setActiveTab('mahfel');
    }, [videos, posts, podcasts, publishedBooks, handlePlayVideo]);

    // رویداد نیتیو: باز شدن اپ از نوتیفیکیشن APK → همان صفحه/ویدیو باز شود
    useEffect(() => {
        const onOpenNotif = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (typeof detail === 'string' && detail) handleNotifOpen(detail);
        };
        window.addEventListener('mahfel-open-notif', onOpenNotif);
        return () => window.removeEventListener('mahfel-open-notif', onOpenNotif);
    }, [handleNotifOpen]);

    const openWriteModalWithAttachment = (type: 'audio' | 'video' | 'book', data: any, timestamp?: number) => {
        setSelectedAttachment({ type, data, timestamp });
        setIsPublicPost(true);
        setIsWriting(true);
    };

    const handleAddBookComment = async (text: string, book: any, parentId?: string, quotedText?: string) => {
        if (!text.trim()) return;
        const newComment = await addComment({ type: 'book', bookId: book.id || (book as any)._id, author: user?.name || 'کاربر', text: text.trim(), parentId, quotedText, authorAvatarUrl: user?.avatar });
        if (newComment) {
            setComments(prev => insertCommentIntoTree(prev, newComment));
            refreshComments();
        }
    };

    const handlePublishPost = async () => {
        if (!user) return;

        if (isPublicPost) {
            const postData: any = {
                text: newPostText,
                videoId: selectedAttachment?.type === 'video' ? selectedAttachment.data.id : undefined,
                podcastId: selectedAttachment?.type === 'audio' ? selectedAttachment.data.podcast.id : undefined,
                episodeIndex: selectedAttachment?.type === 'audio' ? selectedAttachment.data.episodeIndex : undefined,
                bookId: selectedAttachment?.type === 'book' ? selectedAttachment.data.id : undefined,
                timestamp: selectedAttachment?.timestamp,
                media: (selectedAttachment?.type === 'image' ? [{ type: 'image', url: selectedAttachment.data }] : postMedia.length > 0 ? postMedia : undefined),
            };
            const newPost = await createPost(postData);
            if (newPost && (newPost as any).banned) {
                setToast({ id: Date.now(), message: 'شما از سایت اخراج شده‌اید' });
                setSendingPost(false);
                return;
            } else if (newPost && (newPost as any).warnings) {
                setToast({ id: Date.now(), message: `اخطار ${(newPost as any).warnings} از ۳ — پیام شما حذف شد` });
            } else if (newPost) {
                setPosts([newPost, ...posts]);
            }
            if (selectedAttachment?.type === 'book') {
                const newComment = await addComment({ type: 'book', bookId: selectedAttachment.data.id, author: user.name, text: newPostText, authorAvatarUrl: user.avatar });
                if (newComment) {
                    setComments(prev => [newComment, ...prev]);
                }
            }
            setToast({ id: Date.now(), message: 'یادداشت شما در محفل منتشر شد' });
        } else {
            setToast({ id: Date.now(), message: 'یادداشت شما در بایگانی شخصی ذخیره شد' });
        }

        setIsWriting(false);
        setNewPostText('');
        setSelectedAttachment(null);
        setPostMedia([]);
        setActiveTab('mahfel');
    };

    const loadMyNotes = useCallback(async () => {
        if (!user) { setMyNotes([]); return; }
        const notes = await getMyNotes();
        setMyNotes(notes || []);
    }, [user]);

    useEffect(() => {
        loadMyNotes();
    }, [loadMyNotes]);

    const handleSaveNote = useCallback(async (data: { title: string; content: string; isDraft: boolean; pendingApproval?: boolean }): Promise<PublishedBook | null> => {
        if (!user) return null;
        const note = await createPublishedBook({
            type: 'note',
            title: data.title,
            description: data.content.replace(/<[^>]*>/g, '').slice(0, 140),
            contentHtml: data.content,
            isDraft: data.isDraft,
            pendingApproval: data.pendingApproval,
            authorName: user.name,
            authorId: user._id || user.id,
            date: new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }),
        });
        if (!note) return null;
        setMyNotes(prev => [note, ...prev.filter(n => String(n.id) !== String(note.id))]);
        if (!note.isDraft && !(note as any).pendingApproval) setPublishedBooks(prev => [note, ...prev]);
        setToast({ id: Date.now(), message: note.isDraft ? 'یادداشت در بایگانی شخصی شما ذخیره شد' : (note as any).pendingApproval ? 'یادداشت برای انتشار ارسال شد — پس از تأیید مدیر در صفحه نشر نمایش داده میشود' : 'یادداشت شما در صفحه نشر منتشر شد' });
        return note;
    }, [user]);

    const handleUpdateNote = useCallback(async (id: string, data: { title: string; content: string; isDraft?: boolean }): Promise<PublishedBook | null> => {
        const updated = await updatePublishedBook(id, {
            title: data.title,
            description: data.content.replace(/<[^>]*>/g, '').slice(0, 140),
            contentHtml: data.content,
            isDraft: data.isDraft !== undefined ? data.isDraft : undefined,
        });
        if (!updated) return null;
        setMyNotes(prev => prev.map(n => String(n.id) === String(id) ? { ...n, ...updated } : n));
        if (!updated.isDraft && !(updated as any).pendingApproval) {
            setPublishedBooks(prev => [updated, ...prev.filter(n => String(n.id) !== String(id))]);
        } else {
            setPublishedBooks(prev => prev.filter(n => String(n.id) !== String(id)));
        }
        return updated;
    }, []);

    const handleDeleteNote = useCallback(async (id: string): Promise<boolean> => {
        const ok = await deletePublishedBook(id);
        if (ok) {
            setMyNotes(prev => prev.filter(n => String(n.id) !== String(id)));
            setPublishedBooks(prev => prev.filter(n => String(n.id) !== String(id)));
        }
        return ok;
    }, []);

    const handleToggleNoteLike = useCallback(async (note: PublishedBook) => {
        if (!user) return;
        const id = String(note.id || (note as any)._id);
        const uid = String((user as any)._id || (user as any).id);
        const cur: string[] = (note.likes || []).map(l => String(l));
        const liked = cur.includes(uid);
        const optimistic = { ...note, likes: liked ? cur.filter(l => l !== uid) : [uid, ...cur] };
        setPublishedBooks(prev => prev.map(n => String(n.id) === id ? optimistic : n));
        setMyNotes(prev => prev.map(n => String(n.id) === id ? optimistic : n));
        try { await toggleNoteLike(id); } catch {}
    }, [user]);

    const handleRepostNoteToMahfel = useCallback(async (note: PublishedBook) => {
        if (!user) return;
        const plainText = (note.description || '').replace(/<[^>]*>/g, '').slice(0, 100);
        const newPost = await shareToMahfel('book', String(note.id), plainText);
        if (!newPost) return;
        setPosts(prev => [newPost, ...prev]);
        setActiveTab('mahfel');
        setToast({ id: Date.now(), message: 'یادداشت در محفل بازنشر شد' });
    }, [user]);

    const handleOpenAuthorProfile = useCallback(async (author: { name: string; avatar?: string; authorId?: string }) => {
        setViewProfileAuthor(author);
        setAuthorPublicNotes([]);
        setIsProfileOpen(true);
        if (author.authorId) {
            const notes = await getAuthorNotes(author.authorId);
            setAuthorPublicNotes(notes || []);
        } else {
            setAuthorPublicNotes(publishedBooks.filter(b => b.type === 'note' && b.authorName === author.name));
        }
    }, [publishedBooks]);

    const handleChatSend = async () => {
        if (!chatInputText.trim() || chatSending || !user) return;
        setChatSending(true);
        const postData = { text: chatInputText.trim() };
        const newPost = await createPost(postData);
        if (newPost && (newPost as any).banned) {
            setToast({ id: Date.now(), message: 'شما از سایت اخراج شده‌اید' });
        } else if (newPost && (newPost as any).warnings) {
            setToast({ id: Date.now(), message: `اخطار ${(newPost as any).warnings} از ۳ — پیام شما حذف شد` });
        } else if (newPost) {
            setPosts([newPost, ...posts]);
            setChatInputText('');
        }
        setChatSending(false);
    };

    // Author: Edit own post
    const handleEditPost = async () => {
        if (!editingPost || !editPostText.trim()) return;
        const updated = await updatePost(String(editingPost.id), { text: editPostText });
        if (updated) {
            setPosts(posts.map(p => String(p.id) === String(editingPost.id) ? { ...p, text: editPostText, isEdited: true } : p));
            setToast({ id: Date.now(), message: 'پست ویرایش شد' });
        }
        setEditingPost(null);
        setEditPostText('');
    };

    // Author: Delete own post
    const handleDeletePost = async (postId: number) => {
        recentlyDeletedIds.current.add(String(postId));
        setPosts(prev => prev.filter(p => String(p.id) !== String(postId)));
        setToast({ id: Date.now(), message: 'پست حذف شد' });
        try {
            const ok = await apiDeletePost(String(postId));
            if (!ok) {
                recentlyDeletedIds.current.delete(String(postId));
                refreshComments();
            }
        } catch {
            recentlyDeletedIds.current.delete(String(postId));
            refreshComments();
        }
    };

    // Delete a comment
    const handleDeleteComment = async (commentId: string) => {
        recentlyDeletedIds.current.add(commentId);
        const removeFromTree = (list: Comment[]): Comment[] =>
            list.filter(c => String((c as any)._id || c.id) !== commentId)
                .map(c => ({ ...c, replies: c.replies ? removeFromTree(c.replies) : [] }));
        setComments(prev => removeFromTree(prev));
        setToast({ id: Date.now(), message: 'نظر حذف شد' });
        const ok = await apiDeleteComment(commentId);
        if (!ok) {
            recentlyDeletedIds.current.delete(commentId);
            refreshComments();
        }
    };

    const handleUpdateComment = async (commentId: string, newText: string) => {
        recentEdits.current.set(commentId, newText);
        const updateInTree = (list: Comment[]): Comment[] =>
            list.map(c => {
                const cid = String((c as any)._id || c.id);
                if (cid === commentId) return { ...c, text: newText, isEdited: true };
                if (c.replies && c.replies.length > 0) return { ...c, replies: updateInTree(c.replies) };
                return c;
            });
        setComments(prev => updateInTree(prev));
        const { updateComment } = await import('./services/api');
        const ok = await updateComment(commentId, newText);
        if (ok !== null) {
            setToast({ id: Date.now(), message: 'نظر ویرایش شد' });
            setTimeout(() => recentEdits.current.delete(commentId), 5000);
        }
    };

    const handleDeletePostComment = async (postId: string, commentId: string) => {
        recentlyDeletedIds.current.add(String(commentId));
        const removeFromLocal = (list: any[]): any[] =>
            list.filter(c => String((c as any)._id || c.id) !== String(commentId))
                .map(c => ({ ...c, replies: (c as any).replies ? removeFromLocal((c as any).replies) : [] }));
        setPosts(prev => prev.map(p => String(p.id) === String(postId) ? { ...p, comments: removeFromLocal(p.comments || []) } : p));
        setSelectedPostForComments(prev => prev && String(prev.id) === String(postId) ? { ...prev, comments: removeFromLocal(prev.comments || []) } : prev);
        try {
            const ok = await deletePostComment(postId, commentId);
            if (!ok) {
                recentlyDeletedIds.current.delete(String(commentId));
                refreshComments();
            } else {
                setToast({ id: Date.now(), message: 'نظر حذف شد' });
            }
        } catch {
            recentlyDeletedIds.current.delete(String(commentId));
            refreshComments();
        }
    };

    const handleUpdatePostComment = async (postId: string, commentId: string, newText: string) => {
        const updatedPost = await updatePostComment(postId, commentId, { text: newText });
        if (updatedPost) {
            const comments = (updatedPost.comments || []).map((c: any) => ({ ...c, id: c._id || c.id }));
            setPosts(prev => prev.map(p => String(p.id) === String(postId) ? { ...p, comments } : p));
            setSelectedPostForComments(prev => prev && String(prev.id) === String(postId) ? { ...prev, comments } : prev);
            setToast({ id: Date.now(), message: 'نظر ویرایش شد' });
        }
    };

    const handleLikeComment = async (commentId: string) => {
        const likedComments = new Set<string>(JSON.parse(localStorage.getItem('soha_liked_comments') || '[]'));
        const isLiked = likedComments.has(commentId);
        const updateInTree = (list: Comment[]): Comment[] =>
            list.map(c => {
                const cid = String((c as any)._id || c.id);
                if (cid === commentId) return { ...c, likes: (c.likes || 0) + (isLiked ? -1 : 1) };
                if (c.replies && c.replies.length > 0) return { ...c, replies: updateInTree(c.replies) };
                return c;
            });
        setComments(prev => updateInTree(prev));
        if (isLiked) likedComments.delete(commentId); else likedComments.add(commentId);
        localStorage.setItem('soha_liked_comments', JSON.stringify([...likedComments]));
        const newLikes = await likeComment(commentId);
        if (newLikes !== null) refreshComments();
    };

    const insertCommentIntoTree = (prev: Comment[], newComment: Comment): Comment[] => {
        const nc = { ...newComment, id: (newComment as any)._id || newComment.id, replies: [] as Comment[] };
        // جلوگیری از دوبار درج: پیام تکراری از race بین broadcast ریل‌تایم و پاسخ POST
        const ncKey = String((newComment as any)._id || newComment.id || '');
        const existsIn = (list: Comment[]): boolean =>
            list.some(c => {
                if (ncKey && String((c as any)._id || c.id || '') === ncKey) return true;
                return c.replies && c.replies.length > 0 ? existsIn(c.replies) : false;
            });
        if (ncKey && existsIn(prev)) return prev;
        if (!nc.parentId) return [nc, ...prev];
        const addReply = (list: Comment[]): Comment[] =>
            list.map(c => {
                const cid = String((c as any)._id || c.id);
                if (cid === String(nc.parentId)) {
                    return { ...c, replies: [nc, ...(c.replies || [])] };
                }
                if (c.replies && c.replies.length > 0) {
                    return { ...c, replies: addReply(c.replies) };
                }
                return c;
            });
        return addReply(prev);
    };

    const handleVideoLike = useCallback((videoId: string, newLikes: number) => {
        setVideos(prev => prev.map(v => (String(v.id) === videoId || String((v as any)._id) === videoId) ? { ...v, likes: newLikes } : v));
    }, []);

    const safeLibrary = (lib: User['library'], patch: Partial<NonNullable<User['library']>>): NonNullable<User['library']> => ({
        podcasts: lib?.podcasts ?? [],
        episodes: lib?.episodes ?? [],
        videos: lib?.videos ?? [],
        books: lib?.books ?? [],
        notes: lib?.notes ?? [],
        ...patch,
    });

    const handleToggleLibrary = async (videoId: string) => {
        const vid = String(videoId);
        const currentList = user?.library?.videos || localVideoLibrary;
        const isInLibrary = currentList.some(id => String(id) === vid);

        if (user) {
            const next = isInLibrary ? currentList.filter(id => String(id) !== vid) : [...currentList, vid];
            const updatedUser = { ...user, library: safeLibrary(user.library, { videos: next }) };
            setUser(updatedUser);
            localStorage.setItem('user_data', JSON.stringify(updatedUser));
            try { await updateLibrary({ videos: next }); } catch {}
        } else {
            const next = isInLibrary ? localVideoLibrary.filter(id => String(id) !== vid) : [...localVideoLibrary, vid];
            setLocalVideoLibrary(next);
            localStorage.setItem('soha_video_library', JSON.stringify(next));
        }
    };

    const handleTogglePodcastLibrary = async () => {
        if (!currentTrack) return;
        const podcast = currentTrack.podcast;
        togglePodcastLibrary(podcast);
    };

    const togglePodcastLibrary = async (podcast: Podcast) => {
        const podcastId = String(podcast.id || (podcast as any)._id);
        const currentList: string[] = (user?.library?.podcasts || []).map(String);
        const isIn = currentList.includes(podcastId);
        const next = isIn ? currentList.filter(id => id !== podcastId) : [...currentList, podcastId];
        if (user) {
            const updatedUser = { ...user, library: safeLibrary(user.library, { podcasts: next }) };
            setUser(updatedUser);
            localStorage.setItem('user_data', JSON.stringify(updatedUser));
            try { await updateLibrary({ podcasts: next }); } catch {}
        }
        setToast({ id: Date.now(), message: isIn ? 'پلی‌لیست از کتابخانه حذف شد' : 'پلی‌لیست در کتابخانه ذخیره گردید', image: String(podcast.cover || ''), name: String(podcast.title || '') });
    };

    const toggleEpisodeLibrary = async (podcastId: string, episodeIndex: number) => {
        const pid = String(podcastId);
        const currentList: { podcastId: string; episodeIndex: number }[] = user?.library?.episodes || [];
        const key = (e: { podcastId: string; episodeIndex: number }) => String(e.podcastId) === pid && e.episodeIndex === episodeIndex;
        const isIn = currentList.some(key);
        const next = isIn ? currentList.filter(e => !key(e)) : [...currentList, { podcastId: pid, episodeIndex }];
        if (user) {
            const updatedUser = { ...user, library: safeLibrary(user.library, { episodes: next }) };
            setUser(updatedUser);
            localStorage.setItem('user_data', JSON.stringify(updatedUser));
            try { await updateLibrary({ episodes: next }); } catch {}
        }
        setToast({ id: Date.now(), message: isIn ? 'صوت از کتابخانه حذف شد' : 'صوت در کتابخانه ذخیره گردید', image: String((() => { const p = podcasts.find(p => String(p.id || (p as any)._id) === pid); return p?.episodes[episodeIndex]?.cover || p?.cover || ''; })()), name: String((() => { const p = podcasts.find(p => String(p.id || (p as any)._id) === pid); return p?.episodes[episodeIndex]?.title || ''; })()) });
    };

    const renderActivePage = () => {
        if (selectedPostForComments) {
            const freshPost = posts.find(p => String(p.id) === String(selectedPostForComments.id)) || selectedPostForComments;
            const podcastId = (freshPost as any).podcastId;
            const episodeIndex = (freshPost as any).episodeIndex;
            const parentCommentId = (freshPost as any).parentCommentId;
            const flattenComments = (list: any[]): any[] => list.reduce((acc: any[], c: any) => { acc.push(c); if (c.replies?.length) acc.push(...flattenComments(c.replies)); return acc; }, []);
            const allFlat = flattenComments(comments);
            const collectDescendantIds = (parentId: string): Set<string> => {
                const ids = new Set<string>();
                const children = allFlat.filter((c: any) => String(c.parentId) === parentId);
                for (const child of children) {
                    const cid = String((child as any)._id || child.id);
                    ids.add(cid);
                    for (const descId of collectDescendantIds(cid)) ids.add(descId);
                }
                return ids;
            };
            const descendantIds = parentCommentId ? collectDescendantIds(String(parentCommentId)) : new Set<string>();
            const discussionCommentsList = podcastId ? allFlat
                .filter((c: any) => {
                    if (String(c.podcastId) !== String(podcastId)) return false;
                    if (episodeIndex != null && c.episodeIndex !== episodeIndex) return false;
                    if (parentCommentId) {
                        const pid = String(c.parentId);
                        const cid = String((c as any)._id || c.id);
                        return pid === String(parentCommentId) || cid === String(parentCommentId) || descendantIds.has(cid);
                    }
                    return true;
                })
                .map((c: any): any => ({
                    id: c._id || c.id,
                    author: c.author,
                    authorAvatarUrl: c.authorAvatarUrl || '',
                    text: c.text,
                    date: c.date || '',
                    isoDate: c.isoDate || '',
                    replyTo: c.parentId,
                    quotedText: c.quotedText,
                    audioTimestamp: c.audioTimestamp,
                    likes: c.likes || 0,
                    media: c.media || [],
                    episodeIndex: c.episodeIndex,
                    isEdited: c.isEdited,
                })) : freshPost.comments;
            return <PostCommentsPage post={freshPost} video={videos.find(v => String(v.id) === String(freshPost.videoId))} podcast={selectedPostPodcast || podcasts.find(p => String(p.id) === String(podcastId))} authors={authors} currentUser={user?.name} userRole={user?.role} discussionComments={discussionCommentsList} parentCommentId={parentCommentId} onBack={() => { setSelectedPostForComments(null); setSelectedPostPodcast(null); }} onAddComment={async (_postId, text, replyTo, media, quotedText, audioTimestamp, videoTimestamp) => {
                if (podcastId) {
                    const newComment = await addComment({ type: 'podcast', podcastId: String(podcastId), author: user?.name || 'کاربر', text, episodeIndex: episodeIndex ?? 0, parentId: replyTo ? String(replyTo) : (parentCommentId ? String(parentCommentId) : undefined), audioTimestamp, authorAvatarUrl: user?.avatar, quotedText, media } as any);
                    if (newComment) {
                        setComments(prev => insertCommentIntoTree(prev, newComment));
                        refreshComments();
                    }
                } else {
                    const updatedPost = await addPostComment(String(_postId), text, replyTo as any, media, quotedText, audioTimestamp, videoTimestamp);
                    if (updatedPost && (updatedPost as any).banned) {
                        setToast({ id: Date.now(), message: 'شما از سایت اخراج شده‌اید' });
                    } else if (updatedPost && (updatedPost as any).warnings) {
                        setToast({ id: Date.now(), message: `اخطار ${(updatedPost as any).warnings} از ۳ — پیام شما حذف شد` });
                    } else if (updatedPost) {
                        setPosts(prev => prev.map(p => String(p.id) === String(_postId) ? { ...p, comments: updatedPost.comments } : p));
                        setSelectedPostForComments({ ...freshPost, comments: updatedPost.comments });
                    }
                }
            }} onUpdatePost={(p) => {
                setPosts(prev => prev.map(post => String(post.id) === String(p.id) ? p : post));
                setSelectedPostForComments(p);
            }} onDeleteComment={async (cid: string) => { if (podcastId) { await handleDeleteComment(cid); } else { await handleDeletePostComment(String((freshPost as any)._id || (freshPost as any).id || ''), cid); } }} onLikeComment={handleLikeComment} onUpdateComment={async (cid: string, t: string) => { if (podcastId) { await handleUpdateComment(cid, t); } else { await handleUpdatePostComment(String((freshPost as any)._id || (freshPost as any).id || ''), cid, t); } }} publishedBooks={publishedBooks} onShowBook={(book) => {}} onPlayEpisode={(p: Podcast, idx: number) => {
              if (currentTrack && String(currentTrack.podcast.id) === String(p.id) && currentTrack.episodeIndex === idx && audioRef.current) {
                audioRef.current.play().catch(()=>{});
                setIsPlaying(true);
              } else {
                const episode = p.episodes[idx];
                if (!episode || !episode.audioUrl) return;
                setCurrentTrack({ podcast: p, episode, episodeIndex: idx });
                if (!audioRef.current) {
                  audioRef.current = new Audio();
                  audioRef.current.ontimeupdate = () => { if(!audioRef.current) return; setAudioProgress(audioRef.current.currentTime / (audioRef.current.duration || 1)); };
                  audioRef.current.onloadedmetadata = () => { if(!audioRef.current) return; setAudioDuration(audioRef.current.duration); };
                  audioRef.current.onended = () => setIsPlaying(false);
                }
                const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(episode.audioUrl)}`;
                audioRef.current.src = proxyUrl;
                audioRef.current.load();
                audioRef.current.play().then(() => { setIsPlaying(true); }).catch(()=>{});
              }
              setIsPlayerExpanded(true);
            }} onSeekAudio={(seconds: number) => { if (audioRef.current) { audioRef.current.currentTime = seconds; audioRef.current.play().catch(()=>{}); setIsPlaying(true); } }} miniPlayerProps={currentTrack ? { track: currentTrack, isPlaying: isPlaying, progress: audioProgress, duration: audioDuration, onPlayPause: togglePlay, onNext: playNext, onPrev: playPrev, onExpand: () => setIsPlayerExpanded(true), onClose: handleClosePlayer, onSelectPodcast: setSelectedPodcast, isVisible: !isPlayerExpanded, theme } : undefined} />;
        }
        if (selectedVideoComment) {
            const vc = selectedVideoComment.comment;
            const v = selectedVideoComment.video;
            const virtualPost: Post = {
                id: 0,
                author: vc.author,
                authorAvatarUrl: (vc as any).authorAvatarUrl || '',
                date: vc.date || '',
                isoDate: vc.isoDate || '',
                text: vc.text,
                media: (vc as any).media || [],
                videoId: String((v as any)._id || v.id),
                comments: (() => {
                    const flattenAll = (list: any[]): any[] => list.reduce((acc: any[], r: any) => {
                        const mapped = { id: r._id || r.id, author: r.author, authorAvatarUrl: r.authorAvatarUrl || '', text: r.text, date: r.date || '', isoDate: r.isoDate || '', replyTo: r.parentId, quotedText: r.quotedText, likes: r.likes || 0, media: r.media || [], videoTimestamp: r.videoTimestamp, audioTimestamp: r.audioTimestamp };
                        acc.push(mapped);
                        if (r.replies?.length) acc.push(...flattenAll(r.replies));
                        return acc;
                    }, []);
                    return flattenAll(vc.replies || []);
                })(),
                likes: 0,
            };
            return <PostCommentsPage post={virtualPost} video={v} authors={authors} currentUser={user?.name} userRole={user?.role} discussionComments={virtualPost.comments} onBack={() => setSelectedVideoComment(null)} onAddComment={async (_postId, text, replyTo, media, quoteText, audioTimestamp, videoTimestamp) => {
                const newComment = await addComment({ type: 'video', videoId: String((v as any)._id || v.id), author: user?.name || 'کاربر', text, parentId: replyTo ? String(replyTo) : (vc as any)._id || String(vc.id), authorAvatarUrl: user?.avatar, media: media as any, quotedText: quoteText, videoTimestamp } as any);
                if (newComment) {
                    setComments(prev => insertCommentIntoTree(prev, newComment));
                    refreshComments();
                    setSelectedVideoComment(prev => {
                        if (!prev) return null;
                        const addReply = (list: any[]): any[] => list.map((r: any) => {
                            if (String(r._id || r.id) === String(newComment.parentId || '')) {
                                return { ...r, replies: [...(r.replies || []), newComment] };
                            }
                            if (r.replies?.length) return { ...r, replies: addReply(r.replies) };
                            return r;
                        });
                        const newReplies = newComment.parentId ? addReply(prev.comment.replies || []) : [...(prev.comment.replies || []), newComment];
                        return { ...prev, comment: { ...prev.comment, replies: newReplies } };
                    });
                }
            }} onDeleteComment={handleDeleteComment} onLikeComment={handleLikeComment} onUpdateComment={handleUpdateComment} publishedBooks={publishedBooks} onShowBook={(book) => {}} onPlayEpisode={playEpisode} miniPlayerProps={currentTrack ? { track: currentTrack, isPlaying: isPlaying, progress: audioProgress, duration: audioDuration, onPlayPause: togglePlay, onNext: playNext, onPrev: playPrev, onExpand: () => setIsPlayerExpanded(true), onClose: handleClosePlayer, onSelectPodcast: setSelectedPodcast, isVisible: !isPlayerExpanded, theme } : undefined} />;
        }
        if (selectedPodcast) return <PlaylistPage podcast={selectedPodcast} author={authors.find(a => String(a.id) === String(selectedPodcast.speakerId))} comments={comments} onBack={() => { setSelectedPodcast(null); setSelectedAuthor(null); }} onPlayEpisode={playEpisode} onAuthorSelect={setSelectedAuthor} initialTab={playlistTab} initialEpisodeIndex={playlistEpisodeIndex} onEpisodeIndexChange={setPlaylistEpisodeIndex} onAddComment={async (text, p, episodeIndex, parentId, audioTimestamp, quotedText) => { const newComment = await addComment({ type: 'podcast', podcastId: p.id || (p as any)._id, author: user?.name || 'کاربر', text, episodeIndex, parentId, audioTimestamp, quotedText, authorAvatarUrl: user?.avatar }); if (newComment) { setComments(prev => insertCommentIntoTree(prev, newComment)); refreshComments(); } }} onDeleteComment={handleDeleteComment} onLikeComment={handleLikeComment} onUpdateComment={handleUpdateComment} currentUserName={user?.name} currentUserAvatar={user?.avatar} currentAudioTime={audioProgress * audioDuration} onSeekToTime={(s) => { if(audioRef.current) { audioRef.current.currentTime = s; audioRef.current.play().catch(()=>{}); } }} onPlayEpisodeAtTime={(p, epIdx, seekTime) => {
  const episode = p.episodes[epIdx];
  if (!episode || !episode.audioUrl) return;
  setCurrentTrack({ podcast: p, episode, episodeIndex: epIdx });
  setIsPlayerExpanded(false);
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.ontimeupdate = () => { if(!audioRef.current) return; setAudioProgress(audioRef.current.currentTime / (audioRef.current.duration || 1)); };
    audioRef.current.onloadedmetadata = () => { if(!audioRef.current) return; setAudioDuration(audioRef.current.duration); };
    audioRef.current.onended = () => setIsPlaying(false);
  }
  const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(episode.audioUrl)}`;
  audioRef.current.src = proxyUrl;
  audioRef.current.load();
  audioRef.current.play().then(() => {
    setIsPlaying(true);
    audioRef.current!.currentTime = seekTime;
  }).catch(()=>{});
}} hasPlayer={currentTrack !== null} isPlaying={isPlaying} onTogglePlay={togglePlay} onOpenPlayer={() => setIsPlayerExpanded(true)} onPlaylistTabChange={setPlaylistTab} activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSelectedPodcast(null); setSelectedAuthor(null); setSelectedBook(null); setSelectedPublishedBook(null); setShowChatInput(false); }} theme={theme} onToggleTheme={toggleTheme} onOpenProfile={() => setIsProfileOpen(true)} onToggleLibrary={(podcast: Podcast) => togglePodcastLibrary(podcast)} isInLibrary={selectedPodcast ? (user?.library?.podcasts || []).includes(String(selectedPodcast.id || (selectedPodcast as any)._id)) : false} onPrev={playPrev} onNext={playNext} audioProgress={audioProgress} audioDuration={audioDuration} isSidebarOpen={isSidebarOpen} onCloseSidebar={() => setIsSidebarOpen(false)} onOpenSearch={() => setIsSearchOpen(true)} onOpenAdmin={() => setAppState('admin')} user={user} isAuthenticated={isAuthenticated} isSidebarCollapsed={desktopSidebarCollapsed} onToggleSidebarCollapsed={setDesktopSidebarCollapsed} />;
        if (selectedAuthor) return <AuthorPage author={selectedAuthor} allBooks={books} allPodcasts={podcasts} allVideos={videos} onBack={() => setSelectedAuthor(null)} onBookSelect={setSelectedBook} onPlayEpisode={playEpisode} />;
        if (selectedBook) return <BookPage book={selectedBook} allPodcasts={podcasts} authors={authors} onBack={() => setSelectedBook(null)} onPlayEpisode={playEpisode} onAuthorSelect={setSelectedAuthor} />;
        if (selectedPublishedBook) {
            if (selectedPublishedBook.type === 'note') return <NoteDetailView note={selectedPublishedBook} allPodcasts={podcasts} comments={comments} onAddComment={(text, n, parentId, quotedText) => { if (parentId || quotedText) handleAddBookComment(text, n, parentId, quotedText); else openWriteModalWithAttachment('book', n); }} onClose={() => setSelectedPublishedBook(null)} />;
            return <BookDetailView book={selectedPublishedBook} allPodcasts={podcasts} onClose={() => setSelectedPublishedBook(null)} comments={comments} onAddComment={(text, b, parentId, quotedText) => { if (parentId || quotedText) handleAddBookComment(text, b, parentId, quotedText); else openWriteModalWithAttachment('book', b); }} />;
        }
        const currentVideoId = activeVideo ? (activeVideo.id || (activeVideo as any)._id) : null;
        const renderVideoInitialTime = currentVideoId === activeVideoId ? videoCurrentTimeRef.current : 0;

        if (activeVideo && !isVideoMini) {
            return <VideoPlayerPage video={activeVideo} allVideos={videos} comments={comments} authors={authors} isMini={false} initialTime={renderVideoInitialTime} onBack={() => {
                // بعد از پخش در پس‌زمینه، دکمه برگشت مینی‌پلیر نمایش ندهد — PiP به پخش ادامه می‌دهد
                if (isVideoBackgroundActive()) {
                    setActiveVideo(null);
                } else {
                    setIsVideoMini(true);
                }
            }} onVideoSelect={handlePlayVideo} onAddComment={async (text, v, videoTimestamp, parentId, _audioTimestamp, quotedText) => {
                const newComment = await addComment({ type: 'video', videoId: v.id || (v as any)._id, author: user?.name || 'کاربر', text, videoTimestamp, parentId, quotedText, authorAvatarUrl: user?.avatar });
                if (newComment) {
                    setComments(prev => insertCommentIntoTree(prev, newComment));
                    refreshComments();
                }
            }} onAuthorSelect={setSelectedAuthor} onPlayVideo={(v) => { handlePlayVideo(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }} userLibrary={user?.library?.videos || localVideoLibrary} onToggleLibrary={handleToggleLibrary} onShare={(t, s) => {}} onShowInstantView={(t, c) => setInstantView({ title: t, content: c })} userRole={user?.role} currentUserName={user?.name} onDeleteComment={handleDeleteComment} onLikeComment={handleLikeComment} onUpdateComment={handleUpdateComment} onVideoTimeUpdate={handleVideoTimeUpdate} onVideoPlay={handleVideoPlay} onVideoPause={handleVideoPause} onVideoEnded={() => { if (queueAuto && queueRef.current.length > 0) playQueueNextRef.current(); }} onVideoLike={handleVideoLike} />;
        }

        switch (activeTab) {
            case 'mahfel': return <MahfelPage tabsHidden={tabsHidden} showInput={showChatInput} onToggleInput={setShowChatInput} posts={posts} videos={videos} podcasts={podcasts} authors={authors} publishedBooks={publishedBooks} comments={comments} currentUser={user?.name} userRole={user?.role} albums={albums} savedPostIds={user?.library?.posts || []} onToggleSavePost={toggleSavePost} onPlayAlbum={playAlbum} onOpenAlbum={setAlbumView} onPlayVideoFromFeed={(v: Video) => { setIsVideoMini(false); handlePlayVideo(v);             }} onPlayPodcastFromFeed={playEpisode} onPlayPodcastComment={(p: Podcast, epIdx: number, seekTime?: number, expandPlayer: boolean = true) => {
              if (currentTrack && String(currentTrack.podcast.id) === String(p.id) && currentTrack.episodeIndex === epIdx && audioRef.current) {
                if (seekTime != null) audioRef.current.currentTime = seekTime;
                audioRef.current.play().catch(()=>{});
                setIsPlaying(true);
              } else {
                const episode = p.episodes[epIdx];
                if (!episode || !episode.audioUrl) return;
                setCurrentTrack({ podcast: p, episode, episodeIndex: epIdx });
                if (!audioRef.current) {
                  audioRef.current = new Audio();
                  audioRef.current.ontimeupdate = () => { if(!audioRef.current) return; setAudioProgress(audioRef.current.currentTime / (audioRef.current.duration || 1)); };
                  audioRef.current.onloadedmetadata = () => { if(!audioRef.current) return; setAudioDuration(audioRef.current.duration); };
                  audioRef.current.onended = () => setIsPlaying(false);
                }
                const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(episode.audioUrl)}`;
                audioRef.current.src = proxyUrl;
                audioRef.current.load();
                audioRef.current.play().then(() => {
                  setIsPlaying(true);
                  if (seekTime != null) audioRef.current!.currentTime = seekTime;
                }).catch(()=>{});
              }
              if (expandPlayer) setIsPlayerExpanded(true);
            }} onShowComments={(p: Post, podcast?: Podcast) => { setSelectedPostForComments(p); setSelectedPostPodcast(podcast || null); }} onShowVideoDiscussion={(c: Comment, v: Video) => setSelectedVideoComment({ comment: c, video: v })} onDeletePost={handleDeletePost} onShowBook={(b: PublishedBook) => { setSelectedPublishedBook(b); }} onShowInstantView={(title: string, content: string) => setInstantView({ title, content })} onDeleteComment={handleDeleteComment} onLikeComment={handleLikeComment} onUpdateComment={handleUpdateComment} onAddComment={async (text: string, v: any, videoTimestamp?: number, parentId?: string, audioTimestamp?: number, quotedText?: string) => {
                const findComment = (list: any[], id: string): any => { for (const c of list) { if (String((c as any)._id || c.id) === id) return c; if (c.replies?.length) { const found = findComment(c.replies, id); if (found) return found; } } return null; };
                const parentComment = parentId ? findComment(comments, String(parentId)) : null;
                const isPodcast = parentComment?.type === 'podcast' || v?.episodes;
                if (isPodcast) {
                    const pid = parentComment?.podcastId || v?.id || v?._id;
                    const nc = await addComment({ type: 'podcast', podcastId: String(pid), author: user?.name || 'کاربر', text, episodeIndex: parentComment?.episodeIndex ?? 0, parentId, authorAvatarUrl: user?.avatar, audioTimestamp, quotedText } as any);
                    if (nc) { setComments(prev => insertCommentIntoTree(prev, nc)); refreshComments(); }
                } else {
                    const nc = await addComment({ type: 'video', videoId: (v as any)._id || v.id, author: user?.name || 'کاربر', text, videoTimestamp, parentId, authorAvatarUrl: user?.avatar, audioTimestamp, quotedText });
                    if (nc) { setComments(prev => insertCommentIntoTree(prev, nc)); refreshComments(); }
                }}} onNewPost={(p: Post) => setPosts([p, ...posts])} onUpdatePost={(p: Post) => setPosts(posts.map(post => post.id === p.id ? p : post))} user={user} onOpenSearch={() => setIsSearchOpen(true)} onOpenProfile={() => setIsProfileOpen(true)}             onToggleSidebar={() => {
              if (window.innerWidth >= 1024) {
                setDesktopSidebarCollapsed(v => !v);
              } else {
                setMahfelSidebarOpen(v => !v);
              }
            }}
            miniPlayerProps={currentTrack ? {
              track: currentTrack, isPlaying, progress: audioProgress,
              onPlayPause: togglePlay, onNext: playNext, onPrev: playPrev,
              onExpand: () => setIsPlayerExpanded(true), onClose: handleClosePlayer,
              onSelectPodcast: setSelectedPodcast, isVisible: true,
              onToggleLibrary: () => togglePodcastLibrary(currentTrack.podcast),
              isInLibrary: (user?.library?.podcasts || []).includes(String(currentTrack.podcast.id || (currentTrack.podcast as any)._id)),
              theme,
            } : null}
            />;
            case 'sowt': return <SowtPage podcasts={podcasts} authors={authors} liveStream={{ isLive: false, title: '', url: '' }} onPodcastSelect={setSelectedPodcast} onPlay={playEpisode} userInterests={user?.interests || []} isHeaderVisible={true} onAuthorSelect={setSelectedAuthor} userLibrary={user?.library?.podcasts || []} onToggleLibrary={(id: number) => {}} onShare={(t: string, s: string) => {}} onToggleSidebar={() => setDesktopSidebarCollapsed(v => !v)} theme={theme} onToggleTheme={toggleTheme} onOpenProfile={() => setIsProfileOpen(true)} user={user} />;
            case 'matn': return <MatnPage authors={authors} books={books} onBookSelect={setSelectedBook} onAuthorSelect={setSelectedAuthor} />;
            case 'videos': return <VideoVaultPage videos={videos} onVideoSelect={(v) => { setIsVideoMini(false); handlePlayVideo(v); }} user={user} theme={theme} onToggleTheme={toggleTheme} onProfileClick={() => setIsProfileOpen(true)} onOpenSidebar={() => setDesktopSidebarCollapsed(v => !v)} onPlaylistOpen={setVaultPlaylistOpen} vaultBackSignal={vaultBackSignal} />;
            case 'nashr': return <NashrPage publishedBooks={publishedBooks} allPodcasts={podcasts} comments={comments} onAddComment={(text, book, parentId, quotedText) => { if (parentId || quotedText) handleAddBookComment(text, book, parentId, quotedText); else openWriteModalWithAttachment('book', book); }} user={user} onUpdateUser={(u) => { setUser(u); localStorage.setItem('user_data', JSON.stringify(u)); }} onDeleteComment={handleDeleteComment} onLikeComment={handleLikeComment} onUpdateComment={handleUpdateComment} onToggleSidebar={() => setDesktopSidebarCollapsed(v => !v)} myNotes={myNotes} onSaveNote={handleSaveNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onRepostToMahfel={handleRepostNoteToMahfel} onOpenAuthorProfile={handleOpenAuthorProfile} onToggleSaveNote={toggleSaveNote} savedNoteIds={user?.library?.notes || []} bookmarks={user?.library?.bookmarks || []} onSaveBookmark={handleSaveBookmark} onRemoveBookmark={handleRemoveBookmark} onToggleNoteLike={handleToggleNoteLike} />;
            case 'library': return <LibraryPage savedVideoIds={user?.library?.videos || localVideoLibrary} allVideos={videos} onPlayVideo={(v) => { setIsVideoMini(false); handlePlayVideo(v); }} onRemoveVideo={(id) => handleToggleLibrary(id)} savedPodcastIds={user?.library?.podcasts || []} savedEpisodes={user?.library?.episodes || []} allPodcasts={podcasts} authors={authors} onSelectPodcast={setSelectedPodcast} onRemovePodcast={(p) => togglePodcastLibrary(p)} onRemoveEpisode={(podcastId, episodeIndex) => toggleEpisodeLibrary(podcastId, episodeIndex)} onPlayPodcast={(podcast, idx) => playEpisode(podcast, idx)} theme={theme} onToggleTheme={toggleTheme} user={user} onOpenProfile={() => setIsProfileOpen(true)} onOpenSearch={() => setIsSearchOpen(true)} onToggleSidebar={() => setDesktopSidebarCollapsed(v => !v)} albums={albums} onAlbumsChange={setAlbums} queue={playQueue} queueAuto={queueAuto} onQueueAutoToggle={setQueueAuto} onPlayQueueItem={playQueueItem} onRemoveQueueItem={removeFromQueue} onClearQueue={clearQueue} onPlayAlbum={playAlbum} onOpenAlbum={setAlbumView} onAlbumSaved={onAlbumSaved} notes={myNotes} posts={posts} savedPostIds={user?.library?.posts || []} onOpenPost={(p: Post) => { setActiveTab('mahfel'); setSelectedPostForComments(p); }} publishedBooks={publishedBooks} onShowBook={(b: PublishedBook) => { setSelectedPublishedBook(b); }} savedNoteIds={user?.library?.notes || []} bookmarks={user?.library?.bookmarks || []} onRemoveBookmark={handleRemoveBookmark} onToggleSaveNote={toggleSaveNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />;
            case 'support': return <SupportPage user={user} theme={theme} onToggleTheme={toggleTheme} onOpenProfile={() => setIsProfileOpen(true)} onToggleSidebar={() => setDesktopSidebarCollapsed(v => !v)} />;
            case 'ai': return <AiAssistantPage podcasts={podcasts} videos={videos} posts={posts} books={publishedBooks} authors={authors} onPlayPodcast={playEpisode} onPlayVideo={(v) => { setIsVideoMini(false); handlePlayVideo(v); }} onShowBook={(b) => { setSelectedPublishedBook(b); }} />;
            default: return null;
        }
    };

    if (appState === 'initializing' || isLoadingData) return <LoadingPage />;
    if (networkError) return <NetworkErrorPage onRetry={() => { setNetworkError(false); window.location.reload(); }} />;
    if (appState === 'login') return <LoginPage onLoginSuccess={handleLogin} />;
    if (appState === 'interests') return <InterestsPage onInterestsSelected={(interests) => { if(user) { const u = {...user, interests}; setUser(u); handleLogin(u); } }} />;
    if (appState === 'admin') return <AdminPage onClose={() => setAppState('ready')} currentPodcasts={podcasts} currentVideos={videos} currentPublishedBooks={publishedBooks} currentAuthors={authors} currentBooks={books} currentComments={comments} currentPosts={posts} currentUsersVersion={usersVersion} onSave={(data: any) => { setPodcasts(data.podcasts); setVideos(data.videos); setPublishedBooks(data.publishedBooks); setAuthors(data.authors); setBooks(data.books); setPosts(data.posts); setComments(data.comments); }} />;

    const miniPlayerVideoId = activeVideo ? (activeVideo.id || (activeVideo as any)._id) : null;
    const miniPlayerInitialTime = miniPlayerVideoId === activeVideoId ? videoCurrentTimeRef.current : 0;

    return (
        <div className={`bg-background flex flex-col relative font-sans text-text-primary ${theme === 'dark' ? 'dark' : ''}`} dir="rtl" style={{ height: '100vh', overflow: 'hidden' }}>
             <IranAccessWarning />
             <VPNBanner isVPN={isVPN} onDismiss={dismissVPN} />
             <div className="app-container bg-background flex-1 flex min-h-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
             
             {/* Desktop Sidebar */}
              <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSelectedPodcast(null); setSelectedAuthor(null); setSelectedBook(null); setSelectedPublishedBook(null); setSelectedPostForComments(null); setSelectedPostPodcast(null); setSelectedVideoComment(null); setIsPlayerExpanded(false); setIsVideoMini(true); }} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} theme={theme} onToggleTheme={toggleTheme} onOpenSearch={() => setIsSearchOpen(true)} onOpenAdmin={() => setAppState('admin')} onOpenProfile={() => setIsProfileOpen(true)} user={user} isAuthenticated={isAuthenticated} collapsed={desktopSidebarCollapsed} onToggleCollapsed={setDesktopSidebarCollapsed} />

              {/* Main Content */}
               <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

              
               <div className={`flex-1 ${activeTab === 'mahfel' ? 'pb-0' : 'pb-16 lg:pb-0'}`}>
                    <Suspense fallback={<LoadingPage />}>{renderActivePage()}</Suspense>
             </div>
             
              {isWriting && (
                <div className="fixed inset-0 z-[5000] animate-fadeIn flex flex-col bg-white dark:bg-gray-900">
                    <header className="flex justify-between items-center p-6 border-b bg-white dark:bg-gray-900 dark:border-gray-700">
                        <button onClick={() => { setIsWriting(false); setSelectedAttachment(null); setPostMedia([]); }} className="text-gray-400 text-xl w-10 h-10 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center transition-all">&times;</button>
                        <h3 className="font-black text-sm text-gray-800 dark:text-gray-100">نوشتن یادداشت / پست</h3>
                        <button onClick={handlePublishPost} disabled={!newPostText.trim() && !selectedAttachment && postMedia.length === 0} className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-primary/20 active:scale-95 transition-all">انتشار</button>
                    </header>
                    <div className="flex-1 p-8 flex flex-col no-scrollbar bg-white dark:bg-gray-900 overflow-y-auto">
                        <textarea autoFocus value={newPostText} onChange={(e) => setNewPostText(e.target.value)} placeholder="نکته یا اندیشه خود را بنویسید..." className="w-full text-lg outline-none resize-none text-right font-medium min-h-[150px] mb-6 text-gray-900 dark:text-gray-100 bg-transparent flex-1" />
                        <div className="space-y-6">
                            {selectedAttachment && selectedAttachment.type !== 'image' && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2.5rem] flex items-center gap-4 animate-scaleIn shadow-sm">
                                    <div className="flex-1 flex items-center gap-4">
                                        <img src={selectedAttachment.type === 'audio' ? selectedAttachment.data.episode.cover || selectedAttachment.data.podcast.cover : (selectedAttachment.type === 'video' ? selectedAttachment.data.thumbnailUrl : selectedAttachment.data.cover)} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                                        <div className="text-right flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-primary uppercase tracking-tighter">
                                                {selectedAttachment.type === 'audio' ? `صوت (لحظه ${formatTime(selectedAttachment.timestamp || 0)})` : (selectedAttachment.type === 'video' ? 'ویدیو' : 'نشر سرای هنر و اندیشه')}
                                            </p>
                                            <p className="font-black text-gray-800 dark:text-gray-100 text-[12px] mt-1 truncate leading-tight">
                                                {selectedAttachment.type === 'audio' ? selectedAttachment.data.episode.title : selectedAttachment.data.title}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedAttachment(null)} className="w-10 h-10 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-400">&times;</button>
                                </div>
                            )}
                            {postMedia.map((m, i) => (
                                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center gap-3 animate-scaleIn">
                                    {m.type === 'image' ? (
                                        <img src={m.url} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt="" />
                                    ) : m.type === 'audio' ? (
                                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg shadow-sm"><i className="fas fa-music"></i></div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg shadow-sm"><i className="fas fa-video"></i></div>
                                    )}
                                    <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 text-right">{m.type === 'image' ? 'تصویر' : m.type === 'audio' ? 'صوت' : 'ویدیو'}</span>
                                    <button onClick={() => setPostMedia(prev => prev.filter((_, j) => j !== i))} className="w-8 h-8 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-400 text-sm">&times;</button>
                                </div>
                            ))}
                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <span className="text-xs font-black text-gray-700 dark:text-gray-300">انتشار عمومی در محفل سرای هنر و اندیشه</span>
                                <button onClick={() => setIsPublicPost(!isPublicPost)} className={`w-12 h-6 rounded-full relative transition-colors ${isPublicPost ? 'bg-primary' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublicPost ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            {selectedAttachment?.type !== 'book' && (
                            <div className="flex gap-3 flex-wrap">
                                <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer transition-all active:scale-95 text-xs font-black border-2 border-dashed min-w-[120px]" style={{borderColor: 'var(--primary)', color: 'var(--primary)'}}>
                                    <i className="fas fa-image"></i>
                                    تصویر
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const dataUrl = ev.target?.result as string;
                                            setPostMedia(prev => [...prev, { type: 'image', url: dataUrl }]);
                                        };
                                        reader.readAsDataURL(file);
                                        e.target.value = '';
                                    }} />
                                </label>
                                <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer transition-all active:scale-95 text-xs font-black border-2 border-dashed min-w-[120px]" style={{borderColor: 'var(--primary)', color: 'var(--primary)'}}>
                                    <i className="fas fa-microphone"></i>
                                    صوت
                                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const dataUrl = ev.target?.result as string;
                                            setPostMedia(prev => [...prev, { type: 'audio', url: dataUrl }]);
                                        };
                                        reader.readAsDataURL(file);
                                        e.target.value = '';
                                    }} />
                                </label>
                                <button onClick={() => {
                                    const url = prompt('لینک ویدیو را وارد کنید:');
                                    if (url && url.trim()) {
                                        setPostMedia(prev => [...prev, { type: 'video', url: url.trim() }]);
                                    }
                                }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer transition-all active:scale-95 text-xs font-black border-2 border-dashed min-w-[120px]" style={{borderColor: 'var(--primary)', color: 'var(--primary)'}}>
                                    <i className="fas fa-video"></i>
                                    ویدیو
                                </button>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
             )}

             {/* Edit Post Modal (Author) */}
             {editingPost && (
                <div className="fixed inset-0 z-[5000] animate-fadeIn flex flex-col bg-white dark:bg-gray-900">
                    <header className="flex justify-between items-center p-6 border-b bg-white dark:bg-gray-900 dark:border-gray-700">
                        <button onClick={() => { setEditingPost(null); setEditPostText(''); }} className="text-gray-400 text-xl w-10 h-10 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center transition-all">&times;</button>
                        <h3 className="font-black text-sm text-gray-800 dark:text-gray-100">ویرایش پست</h3>
                        <button onClick={handleEditPost} disabled={!editPostText.trim()} className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50">ذخیره</button>
                    </header>
                    <div className="flex-1 p-8">
                        <textarea autoFocus value={editPostText} onChange={(e) => setEditPostText(e.target.value)} className="w-full text-lg outline-none resize-none text-right font-medium min-h-[200px] text-gray-900 dark:text-gray-100 bg-transparent" />
                    </div>
                </div>
             )}

             {currentTrack && (
                <>
                    {isPlayerExpanded && (
                        <Suspense fallback={null}>
                            <FullScreenPlayer
                                track={currentTrack} isPlaying={isPlaying} progress={audioProgress} duration={audioDuration}
                                authors={authors} onPlayPause={togglePlay} onSeek={(p) => { if (audioRef.current && isFinite(p) && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) { audioRef.current.currentTime = p * audioRef.current.duration; audioRef.current.play().catch(()=>{}); setIsPlaying(true); } }}
                                onMinimize={() => setIsPlayerExpanded(false)} onClose={handleClosePlayer} onNext={playNext} onPrev={playPrev}
                                comments={comments} onAddComment={async (text, track, timestamp, parentId) => { const newComment = await addComment({ type: 'podcast', podcastId: track.podcast.id || (track.podcast as any)._id, author: user?.name || 'کاربر', text, episodeIndex: track.episodeIndex, parentId, audioTimestamp: timestamp, authorAvatarUrl: user?.avatar }); if (newComment) { setComments(prev => insertCommentIntoTree(prev, newComment)); refreshComments(); } }}
                                onDeleteComment={handleDeleteComment} onLikeComment={handleLikeComment} onUpdateComment={handleUpdateComment}
                                currentUserName={user?.name} playbackRate={playbackRate} onPlaybackRateChange={setPlaybackRate}
                                onOpenFile={(url) => window.open(url, '_blank')} onShowInstantView={(title, content) => setInstantView({ title, content })}
                                isInLibrary={(user?.library?.podcasts || []).includes(String(currentTrack.podcast.id || (currentTrack.podcast as any)._id))}
                                onToggleLibrary={() => togglePodcastLibrary(currentTrack.podcast)}
                                volume={volume} onVolumeChange={setVolume} repeatMode={repeatMode} onRepeatModeChange={setRepeatMode}
                                isShuffle={isShuffle} onShuffleToggle={() => setIsShuffle(s => !s)}
                                sleepTimer={sleepTimer} onSleepTimer={setSleepTimer} onPlayEpisode={playEpisode}
                                onPlayInBackground={handlePlayInBackground}
                                activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSelectedPodcast(null); }}
                                theme={theme} onToggleTheme={toggleTheme} onOpenProfile={() => setIsProfileOpen(true)}
                                podcasts={podcasts}
                                onToggleEpisode={toggleEpisodeLibrary} isEpisodeInLibrary={(pid, idx) => { const list = user?.library?.episodes || []; return list.some(e => String(e.podcastId) === pid && e.episodeIndex === idx); }}
                            />
                        </Suspense>
                    )}
                    {!isPlayerExpanded && (!selectedPodcast || playlistTab !== 'comments') && !(activeTab === 'mahfel' && window.innerWidth >= 1024) && <MinimizedPlayer track={currentTrack} isPlaying={isPlaying} progress={audioProgress} onPlayPause={togglePlay} onNext={playNext} onPrev={playPrev} onExpand={() => setIsPlayerExpanded(true)} onClose={handleClosePlayer} onSelectPodcast={setSelectedPodcast} isVisible={!isPlayerExpanded} onToggleLibrary={() => togglePodcastLibrary(currentTrack.podcast)} isInLibrary={(user?.library?.podcasts || []).includes(String(currentTrack.podcast.id || (currentTrack.podcast as any)._id))} onPlayInBackground={handlePlayInBackground} bottomOffset={selectedPodcast ? 24 : (activeTab === 'mahfel' ? 70 : 68)} theme={theme} />}
                </>
             )}

              {activeVideo && isVideoMini && (
                <VideoPlayerPage
                  video={activeVideo}
                  allVideos={videos}
                  comments={comments}
                  authors={authors}
                  isMini={true}
                  initialTime={miniPlayerInitialTime}
                  onBack={() => setIsVideoMini(false)}
                  onCloseMini={() => { setActiveVideo(null); setIsVideoMini(false); }}
                  onVideoSelect={(v) => { setIsVideoMini(false); handlePlayVideo(v); }}
                  onAddComment={async (text, v, videoTimestamp, parentId, _audioTimestamp, quotedText) => {
                    const newComment = await addComment({ type: 'video', videoId: v.id || (v as any)._id, author: user?.name || 'کاربر', text, videoTimestamp, parentId, quotedText, authorAvatarUrl: user?.avatar });
                    if (newComment) {
                      setComments(prev => insertCommentIntoTree(prev, newComment));
                      refreshComments();
                    }
                  }}
                  onAuthorSelect={setSelectedAuthor}
onPlayVideo={(v) => { setIsVideoMini(false); handlePlayVideo(v); }}
                  userLibrary={user?.library?.videos || localVideoLibrary}
                  onToggleLibrary={handleToggleLibrary}
                  onShare={() => {}}
                  onShowInstantView={(t, c) => setInstantView({ title: t, content: c })}
                  userRole={user?.role}
                  currentUserName={user?.name}
                  onDeleteComment={handleDeleteComment}
                  onLikeComment={handleLikeComment}
                  onVideoTimeUpdate={handleVideoTimeUpdate}
                  onVideoPlay={handleVideoPlay}
                  onVideoPause={handleVideoPause}
                  onVideoEnded={() => { if (queueAuto && queueRef.current.length > 0) playQueueNextRef.current(); }}
                  onVideoLike={handleVideoLike}
                />
              )}
             {instantView && <InstantView title={instantView.title} content={instantView.content} onClose={() => setInstantView(null)} />}
             {albumView && <AlbumViewer album={albumView} onClose={() => setAlbumView(null)} onPlayAll={playAlbum} onPlayItem={playAlbumItem} />}
             {isProfileOpen && user && <UserProfilePage onClose={() => { setIsProfileOpen(false); setViewProfileAuthor(null); }} onLogout={handleLogout} user={user} allPodcasts={podcasts} allVideos={videos} onPlayPodcast={playEpisode} onPlayVideo={(v) => { handlePlayVideo(v); setIsProfileOpen(false); }} onEditPost={(post: Post) => { setEditingPost(post); setEditPostText(post.text || ''); setIsProfileOpen(false); }} onDeletePost={handleDeletePost} onUpdateUser={(u) => { const oldName = user.name; const matches = (item: any) => { const byId = item.userId && String(item.userId) === String(u.id); const byName = !item.userId && item.author && item.author === oldName; return byId || byName; }; const remap = (item: any) => { const own = matches(item); const updated = own ? { ...item, author: u.name, authorAvatarUrl: u.avatar } : item; const replies = item.replies ? { ...updated, replies: (item.replies || []).map(remap) } : updated; return replies; }; setComments(prev => prev.map(remap)); setPosts(prev => prev.map(p => { const own = matches(p); const updated = own ? { ...p, author: u.name, authorAvatarUrl: u.avatar } : p; return { ...updated, comments: (p.comments || []).map(remap) }; })); setUser(u); localStorage.setItem('user_data', JSON.stringify(u)); }} onOpenAdmin={() => { setIsProfileOpen(false); setAppState('admin'); }} myNotes={myNotes} onSaveNote={handleSaveNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onRepostToMahfel={handleRepostNoteToMahfel} viewAuthor={viewProfileAuthor} authorNotes={authorPublicNotes} />}
             
             <SearchModal 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
                podcasts={podcasts}
                videos={videos}
                books={books}
                authors={authors}
                publishedBooks={publishedBooks}
                onPodcastSelect={setSelectedPodcast}
                onVideoSelect={(v) => { handlePlayVideo(v); setIsSearchOpen(false); }}
                onBookSelect={setSelectedBook}
                onAuthorSelect={setSelectedAuthor}
             />
             
                {appState === 'ready' && !isWriting && !selectedPodcast && !isPlayerExpanded && !(activeVideo && !isVideoMini) && activeTab === 'mahfel' && (
                   <div className="hidden lg:block">
                   <BottomTabs activeTab={activeTab} onTabChange={(tab) => {
                       if (tab === 'mahfel' && activeTab === 'mahfel') {
                           setShowChatInput(v => !v);
                       } else {
                           setActiveTab(tab);
                           setShowChatInput(false);
                       }
                   }} onLongPressCentral={() => setIsWriting(true)} newMahfelMessages={0} userRole={user?.role} hidden={tabsHidden || !!selectedPodcast || isPlayerExpanded} onToggle={setTabsHidden} chatInput={showChatInput && activeTab === 'mahfel'} chatInputText={chatInputText} onChatInputChange={setChatInputText} onChatSend={handleChatSend} onChatClose={() => setShowChatInput(false)} chatSending={chatSending} theme={theme} />
                   </div>
              )}
               {appState === 'ready' && !isWriting && !selectedPodcast && !isPlayerExpanded && !(activeVideo && !isVideoMini) && activeTab !== 'mahfel' && (
                   <BottomTabs activeTab={activeTab} onTabChange={(tab) => {
                       setActiveTab(tab);
                       setShowChatInput(false);
                   }} onLongPressCentral={() => setIsWriting(true)} newMahfelMessages={0} userRole={user?.role} hidden={tabsHidden || !!selectedPodcast || isPlayerExpanded} onToggle={setTabsHidden} chatInput={false} chatInputText={chatInputText} onChatInputChange={setChatInputText} onChatSend={handleChatSend} onChatClose={() => setShowChatInput(false)} chatSending={chatSending} theme={theme} />
              )}
              {appState === 'ready' && activeTab === 'mahfel' && !isPlayerExpanded && (
                 <div className="lg:hidden"><MahfelSidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSelectedPodcast(null); setSelectedAuthor(null); setSelectedBook(null); setSelectedPublishedBook(null); setShowChatInput(false); }} open={mahfelSidebarOpen} onOpenChange={setMahfelSidebarOpen} theme={theme} onToggleTheme={toggleTheme} onOpenProfile={() => setIsProfileOpen(true)} /></div>
              )}
             
              {toast && <Toast key={toast.id} message={toast.message} image={toast.image} name={toast.name} onClose={() => setToast(null)} />}
              {showUpdateDialog && updateInfo && (
                  <UpdateDialog update={updateInfo} isMobile={isApp()} onClose={() => setShowUpdateDialog(false)} />
              )}
              {notif && <NotificationBanner key={notif.id} title={notif.title} body={notif.body} link={notif.link} onClose={() => setNotif(null)} onClick={handleNotifOpen} />}
              {showWelcomeVideo && (
                  <WelcomeVideo onComplete={handleWelcomeComplete} />
              )}
              {showOnboarding && !showWelcomeVideo && user && (
                  <OnboardingGuide
                    steps={user.role === 'admin' ? ADMIN_STEPS : user.role === 'author' ? AUTHOR_STEPS : USER_STEPS}
                    role={user.role}
                    onComplete={handleOnboardingComplete}
                  />
              )}
              </div>
             </div>
        </div>
    );
};

const App: React.FC = () => (
    <ErrorBoundary>
        <ThemeProvider>
            <OfflineDetector>
                <AppInner />
            </OfflineDetector>
        </ThemeProvider>
    </ErrorBoundary>
);

export default App;
