
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Podcast, Episode, Video, PublishedBook, Author, Book } from '../types';
import { toPersianDigits } from '../utils/helpers';
import PermissionToast from '../components/PermissionToast';
import PermissionLocked from '../components/PermissionLocked';
import { uploadFile, getAdminStats, getAdminUsers, updateUserRole, deleteUser, getAdminPosts, adminDeletePost, adminUpdatePost, getAdminComments, adminDeleteComment, adminUpdateComment, getPodcasts, getBooks, getAuthors, getVideos, getComments, getPosts, getPublishedBooks, getAdminAnalytics, getAdminAnalyticsSegments, getAdminInsights, getAdminActivity, adminExportData, adminSearchGlobal, adminBulkUsers, adminBulkPosts, adminBulkComments, muteUser, unmuteUser, unbanUser, resetUserWarnings, getNotifications, adminSendNotification, adminDeleteNotification, getAICorpus, getAdminVideoPlaylists, createVideoPlaylist, updateVideoPlaylist, deleteVideoPlaylist, adminGetNotes, adminCreateNote, adminUpdateNote, adminDeleteNote, adminGetAuthors, getAppUpdate, adminSaveAppUpdate, adminUploadApk, AppUpdateInfo, adminGetPurchaseRequests, adminUpdatePurchaseRequest, getCommunitySettings, updateCommunitySettings, getSupportMessages, markSupportMessageRead, deleteSupportMessage, adminPurgePosts, requestAdminAccess, getMyAdminRequest, getAdminRequests, approveAdminRequest, rejectAdminRequest, changeUserRole, removeAdmin, getAdminList, AVAILABLE_PERMISSIONS, updateAdminPermissions, ALL_ROLE_PERMISSIONS, getRolePermissions, updateRolePermissions, resetUserPermissions } from '../services/api';
import { fetchAparatVideoDetails, extractAparatId } from '../utils/aparatApi';
import { GoogleGenAI } from "@google/genai";
import { AreaTrendChart, StackedDailyBars, RankBars } from '../components/AdminCharts';
import BookReader from '../components/BookReader';
import AdminSalesPanel from '../components/AdminSalesPanel';

const FormField = ({ label, children }: any) => (
  <div className="mb-4">
    <label className="block text-[10px] font-black text-gray-400 mb-1.5 mr-1 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

const TextInput = (props: any) => (
  <input {...props} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300 shadow-sm" />
);

const TextArea = (props: any) => (
  <textarea {...props} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[100px] placeholder:text-gray-300 shadow-sm" />
);

const UploadButton = ({ onUpload, icon = "fa-cloud-upload-alt", accept = "image/*" }: any) => {
    const [uploading, setUploading] = useState(false);
    return (
        <label className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all border ${uploading ? 'bg-gray-50 text-gray-400' : 'bg-white text-primary border-primary/10 hover:bg-primary/5 shadow-sm'}`}>
            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : icon}`}></i>
            <input type="file" accept={accept} hidden onChange={async (e:any) => {
                const f = e.target.files[0]; if(!f) return;
                setUploading(true); try { const url = await uploadFile(f); onUpload(url); } finally { setUploading(false); }
            }} />
        </label>
    );
};

const SmartEditButton = ({ text, onEdited }: { text: string, onEdited: (newText: string) => void }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const handleSmartEdit = async () => {
        if (!text || text.trim().length < 5) return;
        setIsProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: text,
                config: { systemInstruction: "شما یک ویراستار حرفه‌ای هستید. متن فارسی ارائه شده را به صورت بسیار جزیی ویرایش کنید تا فقط رسمی و از نظر نگارشی صحیح شود." },
            });
            if (response.text) onEdited(response.text);
        } catch (error) { showAdminToast("خطا در ویراستاری هوشمند.", "error"); } finally { setIsProcessing(false); }
    };
    return (
        <button onClick={handleSmartEdit} disabled={isProcessing || !text} title="ویراستار هوشمند"
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${isProcessing ? 'bg-primary/10 text-primary' : 'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100 shadow-sm disabled:opacity-30'}`}>
            <i className={`fas ${isProcessing ? 'fa-wand-magic-sparkles fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
        </button>
    );
};

declare const mammoth: any;
const WordToHtmlButton = ({ onConverted }: any) => {
    const [processing, setProcessing] = useState(false);
    return (
        <label className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all border ${processing ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 shadow-sm'}`}>
            <i className={`fas ${processing ? 'fa-spinner fa-spin' : 'fa-file-word'}`}></i>
            <input type="file" accept=".docx" hidden onChange={async (e:any) => {
                const f = e.target.files[0]; if(!f) return; setProcessing(true);
                try { const arrayBuffer = await f.arrayBuffer(); const result = await mammoth.convertToHtml({ arrayBuffer }); onConverted(result.value); } catch { showAdminToast("خطا", "error"); } finally { setProcessing(false); }
            }} />
        </label>
    );
};

const PersianDateInput = ({ value, onChange }: any) => (
    <div className="relative group">
        <TextInput value={value} onChange={onChange} placeholder="۱۴۰۳/۰۱/۰۱" />
        <i className="fas fa-calendar-day absolute left-3 top-3.5 text-gray-300 group-focus-within:text-primary transition-colors"></i>
    </div>
);

const MiniAudioPlayer = ({ comment, timestamp }: { comment: any; timestamp?: number }) => {
    const ts = timestamp ?? comment?.audioTimestamp ?? comment?.timestamp ?? 0;
    const tsLabel = ts ? `${toPersianDigits(Math.floor(ts / 60))}:${toPersianDigits(Math.floor(ts % 60)).toString().padStart(2, '0')}` : '';
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [audioError, setAudioError] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const podcast = comment.podcastData || (typeof comment.podcastId === 'object' ? comment.podcastId : null);
    const episode = podcast?.episodes?.[comment.episodeIndex ?? 0];
    const audioUrl = episode?.audioUrl || '';
    const cover = podcast?.cover || '';
    const title = comment.podcastTitle || podcast?.title || 'مجموعه صوتی';
    const epTitle = comment.episodeTitle || episode?.title || '';
    const ensureAudio = () => {
        if (!audioUrl) return null;
        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl);
            audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
            });
            audioRef.current.addEventListener('ended', () => setPlaying(false));
        }
        return audioRef.current;
    };
    const safePlay = (a: HTMLAudioElement) => {
        const p = a.play();
        if (p && typeof p.catch === 'function') {
            p.catch(() => setAudioError(true));
        }
    };
    const togglePlay = () => {
        const a = ensureAudio();
        if (!a) return;
        setAudioError(false);
        if (playing) { a.pause(); setPlaying(false); } else { safePlay(a); setPlaying(true); }
    };
    const playFrom = (seconds: number) => {
        const a = ensureAudio();
        if (!a) return;
        setAudioError(false);
        a.currentTime = seconds;
        safePlay(a);
        setPlaying(true);
    };
    return (
        <div className="mt-2 p-3 bg-gradient-to-l from-purple-50 to-purple-100/50 rounded-2xl flex items-center gap-3 border border-purple-200/60">
            <div className="relative flex-shrink-0">
                {cover ? (
                    <img src={cover} className="w-12 h-12 rounded-xl object-cover shadow-md" />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shadow-md">
                        <i className="fas fa-headphones text-base"></i>
                    </div>
                )}
                {audioUrl && (
                    <button onClick={togglePlay} className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg border-2 border-white active:scale-90 transition-transform">
                        <i className={`fas ${playing ? 'fa-pause' : 'fa-play'} text-[7px] ${!playing ? 'mr-[-1px]' : ''}`}></i>
                    </button>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-purple-800 truncate">{title}</p>
                {epTitle && <p className="text-[9px] text-purple-500 truncate mt-0.5">{epTitle}</p>}
                {tsLabel && (
                    audioUrl ? (
                        <button onClick={() => playFrom(ts)} className="inline-flex items-center gap-1 mt-1 text-[8px] font-black text-purple-600 bg-purple-100 hover:bg-purple-200 px-1.5 py-0.5 rounded-full transition-colors active:scale-95 cursor-pointer" title="پخش از این زمان">
                            <i className="fas fa-clock"></i>{tsLabel}
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-black text-purple-400 bg-purple-50 px-1.5 py-0.5 rounded-full">
                            <i className="fas fa-clock"></i>{tsLabel}
                        </span>
                    )
                )}
                {audioError && <p className="text-[7px] text-red-500 mt-1 font-bold">لینک صوت قابل پخش نیست</p>}
                {audioUrl ? (
                    <div className="w-full bg-purple-200 rounded-full h-1 mt-2">
                        <div className="bg-purple-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                ) : (
                    <p className="text-[7px] text-purple-300 mt-1">لینک صوت موجود نیست</p>
                )}
            </div>
        </div>
    );
};

const MiniVideoPlayer = ({ comment, playable = true }: { comment: any; playable?: boolean }) => {
    const [showEmbed, setShowEmbed] = useState(false);
    const video = comment.videoData || (typeof comment.videoId === 'object' ? comment.videoId : null);
    const videoTitle = comment.videoTitle || video?.title || 'ویدیو';
    const thumbnail = video?.thumbnailUrl || '';
    const embedId = video?.embedId || '';

    if (!playable) {
        return (
            <div className="mt-2 w-fit max-w-[240px] rounded-2xl bg-gradient-to-l from-blue-50/90 to-indigo-50/70 border border-blue-100 shadow-[0_4px_18px_-8px_rgba(99,102,241,0.45)] p-2.5">
                <div className="relative flex-shrink-0">
                    {thumbnail ? (
                        <img src={thumbnail} className="w-full h-28 rounded-xl object-cover shadow-md ring-2 ring-white/70" />
                    ) : (
                        <div className="w-full h-28 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-white/70">
                            <i className="fas fa-play text-xl mr-[-2px]"></i>
                        </div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/55 backdrop-blur-sm text-white text-[7px] font-black flex items-center gap-1 shadow">
                        <i className="fas fa-play text-[6px]"></i> آپارات
                    </span>
                </div>
                <div className="mt-2 px-0.5">
                    <span className="inline-flex items-center gap-1 text-[8px] font-black text-blue-500 bg-blue-100/80 px-2 py-0.5 rounded-full mb-1"><i className="fas fa-video"></i> ویدیو</span>
                    <p className="text-[12px] font-extrabold text-gray-800 leading-relaxed break-words">{videoTitle}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 rounded-2xl overflow-hidden border border-blue-200/60">
            {showEmbed && embedId ? (
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <iframe src={`https://www.aparat.com/embed/video/${embedId}`} className="absolute inset-0 w-full h-full" frameBorder="0" allowFullScreen></iframe>
                    <button onClick={() => setShowEmbed(false)} className="absolute top-2 left-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-[8px] z-10"><i className="fas fa-times"></i></button>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-l from-blue-50 to-blue-100/50">
                    <div className="relative flex-shrink-0">
                        {thumbnail ? (
                            <img src={thumbnail} className="w-24 h-14 rounded-xl object-cover shadow-md" />
                        ) : (
                            <div className="w-24 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md">
                                <i className="fas fa-play text-base mr-[-1px]"></i>
                            </div>
                        )}
                        {embedId && (
                            <button onClick={() => setShowEmbed(true)} className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                    <i className="fas fa-play text-blue-600 text-[10px] mr-[-1px]"></i>
                                </div>
                            </button>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-blue-500 mb-1 flex items-center gap-1"><i className="fas fa-video"></i> ویدیو</p>
                        <p className="text-[12px] font-black text-blue-900 leading-snug break-words">{videoTitle}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const AudioPickerModal = ({ podcasts, onSelect, onClose }: any) => {
    const [step, setStep] = useState<'podcast' | 'episode'>('podcast');
    const [selectedPod, setSelectedPod] = useState<Podcast | null>(null);
    const [search, setSearch] = useState('');
    const filteredPodcasts = podcasts.filter((p: Podcast) => p.title.includes(search));
    const filteredEpisodes = selectedPod ? selectedPod.episodes.filter(e => e.title.includes(search)) : [];
    return (
        <div className="fixed inset-0 bg-black/60 z-[9000] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col h-[70vh] overflow-hidden animate-fadeIn">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-gray-800 text-xs">{step === 'podcast' ? 'مرحله ۱: انتخاب مجموعه' : `مرحله ۲: انتخاب جلسه از ${selectedPod?.title}`}</h3>
                    <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
                </div>
                <div className="p-4 bg-white border-b"><TextInput placeholder="جستجو..." value={search} onChange={(e:any)=>setSearch(e.target.value)} /></div>
                <div className="flex-grow overflow-y-auto p-4 space-y-2 no-scrollbar bg-gray-50">
                    {step === 'podcast' ? filteredPodcasts.map((p: Podcast) => (
                        <div key={p.id} onClick={() => { setSelectedPod(p); setStep('episode'); setSearch(''); }} className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary cursor-pointer transition-all flex items-center gap-3 shadow-sm">
                            <img src={p.cover || 'https://via.placeholder.com/80'} className="w-10 h-10 rounded-xl object-cover" />
                            <div><p className="text-[11px] font-black text-gray-800">{p.title}</p><p className="text-[9px] text-gray-400 font-bold">{toPersianDigits(p.episodes.length)} جلسه</p></div>
                        </div>
                    )) : (<>
                        <button onClick={() => { setStep('podcast'); setSelectedPod(null); }} className="text-primary font-black text-[10px] mb-3 flex items-center gap-1 hover:underline"><i className="fas fa-arrow-right"></i> بازگشت</button>
                        {filteredEpisodes.map((ep: Episode, idx: number) => (
                            <div key={idx} onClick={() => { onSelect({ podcastId: selectedPod?.id, episodeIndex: idx, title: ep.title }); onClose(); }} className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary cursor-pointer transition-all shadow-sm">
                                <p className="text-[10px] font-black text-gray-800">{ep.title}</p>
                                <p className="text-[8px] text-gray-400 font-bold mt-1">{ep.duration}</p>
                            </div>
                        ))}
                    </>)}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) => (
    <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
            <i className={`fas ${icon} text-sm`}></i>
        </div>
        <div>
            <p className="text-lg font-black text-gray-800">{typeof value === 'number' ? toPersianDigits(value) : value}</p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
        </div>
    </div>
);

type AdminTab = 'dashboard' | 'users' | 'posts' | 'comments' | 'sowt' | 'videos' | 'library' | 'nashr' | 'notes' | 'authors' | 'analytics' | 'notifications' | 'versions' | 'purchases' | 'sales' | 'support' | 'roles';

const MiniBarChart = ({ data, height = 56, color = '#8b5cf6' }: { data: { label: string; value: number }[]; height?: number; color?: string }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-end gap-[3px] h-16" style={{ height }}>
      {data.length === 0 && <div className="w-full flex items-center justify-center text-[8px] text-gray-300 font-bold">داده‌ای وجود ندارد</div>}
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative" title={`${d.label}: ${toPersianDigits(d.value)}`}>
          <div className="w-full rounded-t-[4px] transition-all duration-500 group-hover:opacity-80"
            style={{ height: `${Math.max(4, (d.value / max) * 100)}%`, background: d.value === max && d.value > 0 ? color : `${color}66` }} />
          <span className="text-[6px] text-gray-300 font-black mt-0.5">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const GrowthBadge = ({ value, suffix = '٪' }: { value?: number; suffix?: string }) => {
  const v = Number(value || 0);
  const up = v > 0, down = v < 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black ${up ? 'bg-green-50 text-green-600' : down ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
      <i className={`fas ${up ? 'fa-arrow-up' : down ? 'fa-arrow-down' : 'fa-minus'} text-[6px]`}></i>
      {up ? '+' : ''}{toPersianDigits(Math.abs(v))}{suffix}
    </span>
  );
};

const buildDailyByType = (rows: any[]) => {
    const byDate: Record<string, { podcast: number; video: number }> = {};
    rows.forEach((r: any) => {
        const d = r._id?.date || '';
        if (!byDate[d]) byDate[d] = { podcast: 0, video: 0 };
        if (r._id?.event === 'podcast_play') byDate[d].podcast += r.count;
        else byDate[d].video += r.count;
    });
    return Object.entries(byDate).map(([date, v]) => ({ label: date.slice(5), podcast: v.podcast, video: v.video }));
};

const InsightLevelStyles: Record<string, { bg: string; text: string; icon: string }> = {  success: { bg: 'bg-green-50 border-green-100', text: 'text-green-700', icon: 'text-green-500' },
  info: { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: 'text-blue-500' },
  warning: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
  danger: { bg: 'bg-red-50 border-red-100', text: 'text-red-700', icon: 'text-red-500' },
};

const AdminPage = ({ onClose, currentPodcasts, currentVideos, currentPublishedBooks, currentAuthors, currentBooks, currentComments, currentPosts, currentUsersVersion, onSave }: any) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [librarySubTab, setLibrarySubTab] = useState<'podcasts' | 'books'>('podcasts');
    const [videoSubTab, setVideoSubTab] = useState<'videos' | 'playlists'>('videos');
    const [communitySubTab, setCommunitySubTab] = useState<'comments' | 'posts'>('comments');

    const [localData, setLocalData] = useState({
        podcasts: JSON.parse(JSON.stringify(currentPodcasts)),
        videos: JSON.parse(JSON.stringify(currentVideos)),
        publishedBooks: JSON.parse(JSON.stringify(currentPublishedBooks)),
        authors: JSON.parse(JSON.stringify(currentAuthors)),
        books: JSON.parse(JSON.stringify(currentBooks)),
        posts: JSON.parse(JSON.stringify(currentPosts)),
        comments: JSON.parse(JSON.stringify(currentComments))
    });

    // همگام‌سازی لحظه‌ای با state اصلی اپ (realtime از Go Change Streams) — همهٔ تب‌ها بدون fetch
    useEffect(() => {
        setLocalData(prev => {
            const next = {
                podcasts: JSON.parse(JSON.stringify(currentPodcasts)),
                videos: JSON.parse(JSON.stringify(currentVideos)),
                publishedBooks: JSON.parse(JSON.stringify(currentPublishedBooks)),
                authors: JSON.parse(JSON.stringify(currentAuthors)),
                books: JSON.parse(JSON.stringify(currentBooks)),
                posts: JSON.parse(JSON.stringify(currentPosts)),
                comments: JSON.parse(JSON.stringify(currentComments))
            };
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
    }, [currentPodcasts, currentVideos, currentPublishedBooks, currentAuthors, currentBooks, currentPosts, currentComments]);

    const [editingItem, setEditingItem] = useState<{ type: string, id: any } | null>(null);
    const [pickerConfig, setPickerConfig] = useState<any>(null);
    const [aparatUrl, setAparatUrl] = useState('');
    const [podcastSearch, setPodcastSearch] = useState('');
    const [podcastSort, setPodcastSort] = useState<'newest' | 'year' | 'master'>('newest');
    const [selectedMasterFilter, setSelectedMasterFilter] = useState<number | 'all'>('all');

    const [notifList, setNotifList] = useState<any[]>([]);
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [notifTarget, setNotifTarget] = useState('all');
    const [notifSending, setNotifSending] = useState(false);
    const [notifItemType, setNotifItemType] = useState('');
    const [notifItemId, setNotifItemId] = useState('');
    const [notifLink, setNotifLink] = useState('');
    const [notifUserId, setNotifUserId] = useState('');
    const [notifUserLabel, setNotifUserLabel] = useState('');
    const [notifUserAvatar, setNotifUserAvatar] = useState('');
    const [notifUserSearch, setNotifUserSearch] = useState('');
    const [notifUserResults, setNotifUserResults] = useState<any[] | null>(null);
    const [notifUsersLoading, setNotifUsersLoading] = useState(false);

    const [supportMessages, setSupportMessages] = useState<any[]>([]);
    const [supportTotal, setSupportTotal] = useState(0);
    const [supportPage, setSupportPage] = useState(1);
    const [supportReadFilter, setSupportReadFilter] = useState<'' | 'true' | 'false'>('');

    const [rolesTab, setRolesTab] = useState<'requests' | 'admins' | 'request' | 'allusers' | 'rolePerms'>('request');
    const [adminRequests, setAdminRequests] = useState<any[]>([]);
    const [adminList, setAdminList] = useState<any[]>([]);
    const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [editingRolePerms, setEditingRolePerms] = useState<string[]>([]);
    const [editingUserPerms, setEditingUserPerms] = useState<string | null>(null);
    const [editingUserPermsList, setEditingUserPermsList] = useState<string[]>([]);
    const [permToast, setPermToast] = useState<{ message: string; type: 'enabled' | 'disabled' } | null>(null);
    const [myRequest, setMyRequest] = useState<any>(null);
    const [requestMessage, setRequestMessage] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);
    const [rolesSearch, setRolesSearch] = useState('');
    const [rolesUsers, setRolesUsers] = useState<any[]>([]);
    const [rolesUserPage, setRolesUserPage] = useState(1);
    const [rolesUserTotal, setRolesUserTotal] = useState(0);
    const [approvingRequest, setApprovingRequest] = useState<string | null>(null);
    const [approvePerms, setApprovePerms] = useState<string[]>([]);
    const [myRole, setMyRole] = useState<string>('admin');
    const [myPerms, setMyPerms] = useState<string[]>([]);
    const [editingPermsUser, setEditingPermsUser] = useState<any>(null);
    const [editingPerms, setEditingPerms] = useState<string[]>([]);

    const [versionForm, setVersionForm] = useState<AppUpdateInfo>({
        apkVersion: '', apkUrl: '', apkMessage: '',
        desktopVersion: '', desktopUrl: '', desktopMessage: '',
    });
    const [versionSaving, setVersionSaving] = useState(false);
    const [versionUploading, setVersionUploading] = useState(false);
    const versionFileInputRef = useRef<HTMLInputElement>(null);

    // ─── درخواست‌های پرداخت (کارت به کارت + تایید ادمین) ───
    const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
    const [purchaseFilter, setPurchaseFilter] = useState('');
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    const loadPurchaseRequests = useCallback(async () => {
        setPurchaseLoading(true);
        try {
            const list = await adminGetPurchaseRequests(purchaseFilter || undefined);
            if (list) setPurchaseRequests(list);
        } finally {
            setPurchaseLoading(false);
        }
    }, [purchaseFilter]);

    const reviewPurchase = useCallback(async (id: string, status: 'confirmed' | 'rejected') => {
        const res = await adminUpdatePurchaseRequest(id, status);
        if (res) {
            showAdminToast(status === 'confirmed' ? 'خرید تایید شد — دسترسی کتاب برای کاربر فعال شد ✅' : 'درخواست رد شد ❌', status === 'confirmed' ? 'success' : 'warning');
            loadPurchaseRequests();
        } else {
            showAdminToast('خطا در بررسی درخواست', 'error');
        }
    }, [loadPurchaseRequests]);

    // رفرش خودکار درخواست‌ها هنگام باز بودن تب
    useEffect(() => {
        if (activeTab !== 'purchases') return;
        loadPurchaseRequests();
        const t = setInterval(loadPurchaseRequests, 10000);
        return () => clearInterval(t);
    }, [activeTab, loadPurchaseRequests]);

    const loadVersions = useCallback(async () => {
        const info = await getAppUpdate();
        if (info) {
            setVersionForm({
                apkVersion: info.apkVersion || '', apkUrl: info.apkUrl || '', apkMessage: info.apkMessage || '',
                desktopVersion: info.desktopVersion || '', desktopUrl: info.desktopUrl || '', desktopMessage: info.desktopMessage || '',
            });
        }
    }, []);

    const [adminPlaylists, setAdminPlaylists] = useState<any[]>([]);
    const [playlistSearch, setPlaylistSearch] = useState('');
    const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null);
    const [playlistSaving, setPlaylistSaving] = useState(false);

    const loadNotifications = useCallback(async () => {
        const list = await getNotifications();
        if (list) setNotifList(list);
    }, []);

    // انتخاب مورد (ویدیو/صوت/کتاب/یادداشت/پیام محفل) → پر کردن عنوان، متن و لینک نوتیفیکیشن
    const applyNotifItem = useCallback((type: string, id: string) => {
        const find = (list: any[], key: string) => list.find((x: any) => String(x._id || x.id) === key);
        if (type === 'video') {
            const v = find(localData.videos, id);
            if (!v) return;
            setNotifTitle(`🎬 ویدیو جدید: ${v.title}`);
            setNotifBody((v.description || 'ویدیوی جدید منتشر شد — تماشا کنید').slice(0, 140));
            setNotifLink(`/mahfel/video/${v._id || v.id}`);
        } else if (type === 'podcast') {
            const p = find(localData.podcasts, id);
            if (!p) return;
            const ep = p.episodes?.[0];
            setNotifTitle(`🎧 صوت جدید: ${ep?.title || p.title}`);
            setNotifBody(`اپیزود تازه از «${p.title}» منتشر شد — بشنوید`);
            setNotifLink(`/mahfel/podcast/${p._id || p.id}`);
        } else if (type === 'book') {
            const b = find(localData.publishedBooks, id);
            if (!b) return;
            setNotifTitle(`📚 کتاب جدید: ${b.title}`);
            setNotifBody(`کتاب «${b.title}» منتشر شد — مشاهده کنید`);
            setNotifLink(`/mahfel/book/${b._id || b.id}`);
        } else if (type === 'note') {
            const n = find(localData.publishedBooks, id);
            if (!n) return;
            setNotifTitle(`📝 یادداشت جدید: ${n.title}`);
            setNotifBody((n.description || `یادداشت «${n.title}» منتشر شد — بخوانید`).slice(0, 140));
            setNotifLink(`/mahfel/book/${n._id || n.id}`);
        } else if (type === 'post') {
            const p = find(localData.posts, id);
            if (!p) return;
            setNotifTitle(`💬 پیام جدید در محفل: ${p.author || 'کاربر'}`);
            setNotifBody((p.text || '').slice(0, 140));
            setNotifLink(`/mahfel/post/${p._id || p.id}`);
        }
    }, [localData]);

    const loadSupportMessages = useCallback(async (page = supportPage, readFilter = supportReadFilter) => {
        const data = await getSupportMessages(page, 20, readFilter === '' ? undefined : readFilter === 'true');
        if (data) {
            setSupportMessages(data.messages);
            setSupportTotal(data.total);
            setSupportPage(data.page);
        }
    }, [supportPage, supportReadFilter]);

    const loadAdminRequests = useCallback(async (status = 'pending') => {
        const data = await getAdminRequests(status);
        if (data) setAdminRequests(data);
    }, []);

    const loadAdminList = useCallback(async () => {
        const data = await getAdminList();
        if (data) setAdminList(data);
    }, []);

    const loadMyRequest = useCallback(async () => {
        const data = await getMyAdminRequest();
        if (data) setMyRequest(data);
    }, []);

    const loadRolesUsers = useCallback(async (page = 1, search = rolesSearch) => {
        const data = await getAdminUsers(page, 20, search);
        if (data) { setRolesUsers(data.users); setRolesUserTotal(data.total); setRolesUserPage(page); }
    }, [rolesSearch]);

    const loadRolePermissions = useCallback(async () => {
        const data = await getRolePermissions();
        if (data) setRolePermissions(data);
    }, []);

    const handleRequestAdmin = async () => {
        setRequestLoading(true);
        try {
            const res = await requestAdminAccess(requestMessage);
            if (res) { setAdminToast({ type: 'success', message: 'درخواست شما ثبت شد' }); setRequestMessage(''); loadMyRequest(); }
        } catch { setAdminToast({ type: 'error', message: 'خطا در ثبت درخواست' }); }
        setRequestLoading(false);
    };

    const handleApproveRequest = async (requestId: string, role: string, permissions: string[]) => {
        try {
            const res = await approveAdminRequest(requestId, role, permissions);
            if (res) { setAdminToast({ type: 'success', message: res.message || 'تأیید شد' }); loadAdminRequests(); loadAdminList(); loadRolesUsers(); }
        } catch { setAdminToast({ type: 'error', message: 'خطا در تأیید' }); }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            const res = await rejectAdminRequest(requestId);
            if (res) { setAdminToast({ type: 'success', message: 'رد شد' }); loadAdminRequests(); }
        } catch { setAdminToast({ type: 'error', message: 'خطا' }); }
    };

    const handleChangeRole = async (userId: string, role: string, permissions: string[] = []) => {
        try {
            const res = await changeUserRole(userId, role, permissions);
            if (res) { setAdminToast({ type: 'success', message: res.message || 'تغییر یافت' }); loadAdminList(); loadRolesUsers(); }
        } catch { setAdminToast({ type: 'error', message: 'خطا در تغییر نقش' }); }
    };

    const handleRemoveAdmin = async (userId: string) => {
        if (!confirm('آیا از حذف ادمین مطمئن هستید؟')) return;
        try {
            const res = await removeAdmin(userId);
            if (res) { setAdminToast({ type: 'success', message: res.message || 'حذف شد' }); loadAdminList(); loadRolesUsers(); }
        } catch { setAdminToast({ type: 'error', message: 'خطا در حذف' }); }
    };

    const [adminNotes, setAdminNotes] = useState<any[]>([]);
    const [adminNotesPage, setAdminNotesPage] = useState(1);
    const [adminNotesTotal, setAdminNotesTotal] = useState(0);
    const [adminNotesPages, setAdminNotesPages] = useState(1);
    const [adminNotesSearch, setAdminNotesSearch] = useState('');
    const [adminNotesStatus, setAdminNotesStatus] = useState('');
    const [editingNote, setEditingNote] = useState<any | null>(null);
    const [noteComposer, setNoteComposer] = useState<{ open: boolean; note?: any }>({ open: false });
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteAuthorName, setNoteAuthorName] = useState('');
    const [noteIsDraft, setNoteIsDraft] = useState(false);
    const [noteSaving, setNoteSaving] = useState(false);
    const [adminAuthors, setAdminAuthors] = useState<any[]>([]);
    const [authorsLoading, setAuthorsLoading] = useState(false);

    const loadAdminAuthors = useCallback(async () => {
        setAuthorsLoading(true);
        try {
            const list = await adminGetAuthors();
            if (list) setAdminAuthors(list);
        } finally {
            setAuthorsLoading(false);
        }
    }, []);

    const loadAdminNotes = useCallback(async (page = 1, search = adminNotesSearch, status = adminNotesStatus) => {
        const res = await adminGetNotes({ search: search || undefined, status: status || undefined, page });
        if (res) {
            setAdminNotes(res.notes || []);
            setAdminNotesTotal(res.total || 0);
            setAdminNotesPages(res.pages || 1);
            setAdminNotesPage(res.page || 1);
        }
    }, [adminNotesSearch, adminNotesStatus]);

    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [usersPage, setUsersPage] = useState(1);
    const [usersTotal, setUsersTotal] = useState(0);
    const [usersSearch, setUsersSearch] = useState('');
    const [usersRoleFilter, setUsersRoleFilter] = useState('');
    const [adminPosts, setAdminPosts] = useState<any[]>([]);
    const [adminPostsPage, setAdminPostsPage] = useState(1);
    const [adminPostsTotal, setAdminPostsTotal] = useState(0);
    const [adminPostsSearch, setAdminPostsSearch] = useState('');
    const [adminComments, setAdminComments] = useState<any[]>([]);
    const [adminCommentsPage, setAdminCommentsPage] = useState(1);
    const [adminCommentsTotal, setAdminCommentsTotal] = useState(0);
    const [adminCommentsSearch, setAdminCommentsSearch] = useState('');
    const [adminCommentsType, setAdminCommentsType] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingPostText, setEditingPostText] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
    const [selectedComments, setSelectedComments] = useState<string[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');
    const [analyticsTab, setAnalyticsTab] = useState<'audio' | 'video' | 'community' | 'sales'>('audio');
    const [segments, setSegments] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [aiCorpus, setAiCorpus] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [adminToast, setAdminToast] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);
    const [confirmToast, setConfirmToast] = useState<{ message: string; onConfirm: () => void; type?: 'danger' | 'warning' } | null>(null);
    const [chatEnabled, setChatEnabled] = useState(true);
    const [chatMessage, setChatMessage] = useState('');
    const [chatSettingsLoading, setChatSettingsLoading] = useState(false);
    const [readingBook, setReadingBook] = useState<PublishedBook | null>(null);
    const [purgeBusy, setPurgeBusy] = useState(false);

    // سوییپ چپ/راست بین تب‌های پنل (موبایل)
    const ADMIN_TAB_ORDER: AdminTab[] = ['dashboard', 'users', 'posts', 'comments', 'analytics', 'sowt', 'library', 'nashr', 'notes', 'authors', 'videos', 'notifications', 'versions', 'purchases', 'sales', 'support', 'roles'];
    const adminSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const tabsBarRef = useRef<HTMLDivElement>(null);
    const handleAdminTouchStart = (e: React.TouchEvent) => {
        if (isEditing || typeof window === 'undefined' || window.innerWidth >= 1024) { adminSwipeStartRef.current = null; return; }
        let node: HTMLElement | null = e.target as HTMLElement | null;
        const container = e.currentTarget as HTMLElement;
        try {
            while (node && node !== container) {
                if (node.scrollWidth > node.clientWidth + 4) { adminSwipeStartRef.current = null; return; }
                node = node.parentElement;
            }
        } catch { /* ignore */ }
        const t = e.touches[0];
        adminSwipeStartRef.current = { x: t.clientX, y: t.clientY };
    };
    const handleAdminTouchEnd = (e: React.TouchEvent) => {
        const start = adminSwipeStartRef.current;
        adminSwipeStartRef.current = null;
        if (!start || isEditing) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const visibleIds = visibleTabs.map(t => t.id);
        const idx = visibleIds.indexOf(activeTab);
        if (idx < 0) return;
        const next = dx < 0 ? visibleIds[idx + 1] : visibleIds[idx - 1];
        if (next) setActiveTab(next);
    };

    useEffect(() => {
        if (!tabsBarRef.current) return;
        const activeBtn = tabsBarRef.current.querySelector(`[data-guide="admin-${activeTab}"]`);
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [activeTab]);

    const showAdminToast = (message: string, type: 'error' | 'success' | 'warning' = 'success') => {
        setAdminToast({ message, type });
        setTimeout(() => setAdminToast(null), 4000);
    };

    const showConfirmToast = (message: string, onConfirm: () => void, type: 'danger' | 'warning' = 'danger') => {
        setConfirmToast({ message, onConfirm, type });
    };

    const handlePurgeChat = async () => {
        setPurgeBusy(true);
        try {
            const res = await adminPurgePosts();
            if (res?.success) {
                showAdminToast(`تمام پیام‌های محفل پاک شد — ${toPersianDigits(res.deleted || 0)} پیام حذف شد`, 'success');
            } else {
                showAdminToast('خطا در پاکسازی محفل', 'error');
            }
        } catch {
            showAdminToast('خطا در پاکسازی محفل', 'error');
        } finally {
            setPurgeBusy(false);
        }
    };

    const updateTable = (key: keyof typeof localData, val: any) => setLocalData(prev => ({ ...prev, [key]: val }));
    const handleDelete = (key: string, id: any, label?: string, onConfirm?: () => void) => {
        const confirmAction = onConfirm || (() => updateTable(key as any, localData[key as keyof typeof localData].filter((x: any) => x.id !== id)));
        showConfirmToast(label || 'آیا از حذف این آیتم اطمینان دارید؟', confirmAction);
    };

    const loadStats = useCallback(async () => {
        const s = await getAdminStats();
        if (s) setStats(s);
    }, []);

    useEffect(() => {
        let alive = true;
        getCommunitySettings().then(s => {
            if (alive && s) { setChatEnabled(s.chatEnabled); setChatMessage(s.chatMessage || ''); }
        }).catch(() => {});
        return () => { alive = false; };
    }, []);

    const handleToggleChat = async () => {
        setChatSettingsLoading(true);
        try {
            const r = await updateCommunitySettings(!chatEnabled, chatMessage);
            if (r) {
                setChatEnabled(r.chatEnabled);
                setChatMessage(r.chatMessage || '');
                showAdminToast(r.chatEnabled ? 'چت محفل باز شد ✅' : 'چت محفل بسته شد — کاربران فقط میتوانند ببینند ⚠️', r.chatEnabled ? 'success' : 'warning');
            } else {
                showAdminToast('خطا در ذخیره تنظیمات', 'error');
            }
        } catch {
            showAdminToast('خطا در ذخیره تنظیمات', 'error');
        }
        setChatSettingsLoading(false);
    };

    const loadUsers = useCallback(async (page = 1) => {
        const r = await getAdminUsers({ search: usersSearch, role: usersRoleFilter, page });
        if (r) { setUsers(r.users); setUsersTotal(r.total); setUsersPage(page); }
    }, [usersSearch, usersRoleFilter]);

    const loadPosts = useCallback(async (page = 1) => {
        const r = await getAdminPosts({ search: adminPostsSearch, page });
        if (r) { setAdminPosts(r.posts); setAdminPostsTotal(r.total); setAdminPostsPage(page); }
    }, [adminPostsSearch]);

    const loadComments = useCallback(async (page = 1) => {
        const r = await getAdminComments({ type: adminCommentsType, search: adminCommentsSearch, page });
        if (r) { setAdminComments(r.comments); setAdminCommentsTotal(r.total); setAdminCommentsPage(page); }
    }, [adminCommentsType, adminCommentsSearch]);

    const loadAnalytics = useCallback(async () => {
        const a = await getAdminAnalytics({ period: analyticsPeriod });
        if (a) setAnalytics(a);
        const s = await getAdminAnalyticsSegments({ period: analyticsPeriod });
        if (s) setSegments(s);
    }, [analyticsPeriod]);

    const loadInsights = useCallback(async (period?: string) => {
        setInsightsLoading(true);
        const p = period || analyticsPeriod;
        const i = await getAdminInsights({ period: p });
        if (i) setInsights(i);
        setInsightsLoading(false);
    }, [analyticsPeriod]);

    const loadActivity = useCallback(async () => {
        const act = await getAdminActivity({ limit: 50 });
        if (act) setActivity(act);
    }, []);

    const loadAICorpus = useCallback(async () => {
        const c = await getAICorpus();
        if (c) setAiCorpus(c);
    }, []);

    const handleGlobalSearch = useCallback(async () => {
        if (!globalSearch || globalSearch.length < 2) { setGlobalSearchResults(null); return; }
        setIsSearching(true);
        const results = await adminSearchGlobal(globalSearch);
        if (results) setGlobalSearchResults(results);
        setIsSearching(false);
    }, [globalSearch]);

    useEffect(() => {
        (async () => {
            try {
                const req = await getMyAdminRequest();
                if (req) { setMyRole(req.role); setMyPerms(req.adminPermissions || []); }
            } catch {}
        })();
    }, []);

    useEffect(() => {
        if (activeTab === 'dashboard') loadStats();
        if (activeTab === 'dashboard') loadAICorpus();
        if (activeTab === 'users') loadUsers(1);
        if (activeTab === 'posts') loadPosts(1);
        if (activeTab === 'comments') loadComments(1);
        if (activeTab === 'analytics') loadAnalytics();
        if (activeTab === 'analytics') loadActivity();
        if (activeTab === 'dashboard' || activeTab === 'analytics') loadInsights();
        if (activeTab === 'notifications') loadNotifications();
        if (activeTab === 'support') loadSupportMessages();
        if (activeTab === 'roles') { loadAdminRequests(); loadAdminList(); loadMyRequest(); loadRolesUsers(); loadRolePermissions(); }
if (activeTab === 'versions') loadVersions();
        if (activeTab === 'notes') loadAdminNotes(1);
        if (activeTab === 'authors') loadAdminAuthors();
    }, [activeTab, loadStats, loadUsers, loadPosts, loadComments, loadAnalytics, loadActivity, loadInsights, loadAICorpus, loadNotifications, loadAdminNotes, loadAdminAuthors, loadVersions, loadAdminRequests, loadAdminList, loadMyRequest, loadRolesUsers]);

    // رفرش لحظه‌ای لیست نوتیفیکیشن‌ها وقتی پیام/پست/ریپلای حذف می‌شود یا نوتیفیکیشن جدید می‌رسد
    useEffect(() => {
        const onRefresh = () => { if (activeTab === 'notifications') loadNotifications(); };
        window.addEventListener('mahfel-notifs-refresh', onRefresh);
        return () => window.removeEventListener('mahfel-notifs-refresh', onRefresh);
    }, [activeTab, loadNotifications]);

    // ریل‌تایم مدیریت کاربران: هر تغییر کاربر (ثبت‌نام/نقش/حذف) → ری‌فچ لحظه‌ای صفحهٔ فعلی بدون رفرش
    useEffect(() => {
        if (activeTab !== 'users' || currentUsersVersion <= 0) return;
        const t = setTimeout(() => loadUsers(usersPage), 250);
        return () => clearTimeout(t);
    }, [currentUsersVersion, activeTab, usersPage, loadUsers]);

    // جستجوی کاربر برای ارسال نوتیفیکیشن شخصی
    useEffect(() => {
        if (notifTarget !== 'user') return;
        if (notifUserSearch.trim().length < 2) { setNotifUserResults(null); return; }
        let alive = true;
        setNotifUsersLoading(true);
        const t = setTimeout(async () => {
            const r = await getAdminUsers({ search: notifUserSearch.trim() });
            if (alive) { setNotifUserResults(r ? r.users : []); setNotifUsersLoading(false); }
        }, 400);
        return () => { alive = false; clearTimeout(t); };
    }, [notifUserSearch, notifTarget]);

    const sortedPodcasts = useMemo(() => {
        let list = [...localData.podcasts].filter(p => p.title.includes(podcastSearch));
        if (selectedMasterFilter !== 'all') list = list.filter(p => p.speakerId === selectedMasterFilter || p.authorId === selectedMasterFilter);
        if (podcastSort === 'newest') list.sort((a,b) => b.id - a.id);
        if (podcastSort === 'year') list.sort((a,b) => b.year - a.year);
        if (podcastSort === 'master') list.sort((a, b) => {
            const authorA = localData.authors.find((au: any) => au.id === a.speakerId)?.name || '';
            const authorB = localData.authors.find((au: any) => au.id === b.speakerId)?.name || '';
            return authorA.localeCompare(authorB);
        });
        return list;
    }, [localData.podcasts, podcastSearch, podcastSort, selectedMasterFilter, localData.authors]);

    const renderDashboard = () => (
        <div className="p-4 space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-3">
                <StatCard icon="fa-users" label="کاربران" value={stats?.users || 0} color="#1ab394" />
                <StatCard icon="fa-microphone-alt" label="مجموعه صوتی" value={stats?.podcasts || 0} color="#1ab394" />
                <StatCard icon="fa-video" label="ویدیوها" value={stats?.videos || 0} color="#2e86c1" />
                <StatCard icon="fa-newspaper" label="پست‌ها" value={stats?.posts || 0} color="#f97316" />
                <StatCard icon="fa-comment-dots" label="نظرات" value={stats?.comments || 0} color="#0d9488" />
                <StatCard icon="fa-book" label="کتاب‌ها" value={stats?.books || 0} color="#8b5cf6" />
                <StatCard icon="fa-user-tie" label="اساتید" value={stats?.authors || 0} color="#ec4899" />
                <StatCard icon="fa-book" label="کتاب‌های نشر" value={stats?.publishedBooks || 0} color="#2563eb" />
                <StatCard icon="fa-sticky-note" label="یادداشت‌ها" value={stats?.publishedNotes || 0} color="#64748b" />
                <StatCard icon="fa-eye" label="کل پخش‌ها" value={stats?.totalPlays || 0} color="#7c3aed" />
                <StatCard icon="fa-headphones" label="بازدید صوتی (پلی‌لیست)" value={stats?.podcastViews || 0} color="#1ab394" />
                <StatCard icon="fa-play-circle" label="بازدید ویدیو" value={stats?.videoViews || 0} color="#2e86c1" />
                <StatCard icon="fa-heart" label="لایک پادکست‌ها" value={stats?.podcastLikes || 0} color="#f43f5e" />
                <StatCard icon="fa-heart" label="لایک ویدیوها" value={stats?.videoLikes || 0} color="#ec4899" />
            </div>

            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-200 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-broom text-red-500 text-sm"></i>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[10px] font-black text-red-600">دستور پاکسازی محفل</h3>
                            <p className="text-[9px] font-bold text-red-400 leading-relaxed mt-0.5">تمام پیام‌های داخل محفل برای همیشه حذف می‌شوند — این عمل قابل بازگشت نیست!</p>
                        </div>
                    </div>
                    <button
                        onClick={() => showConfirmToast('آیا از پاکسازی کامل تمام پیام‌های محفل مطمئن هستید؟ این عمل غیرقابل بازگشت است.', handlePurgeChat, 'danger')}
                        disabled={purgeBusy}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white text-[10px] font-black shadow-sm">
                        {purgeBusy ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-broom"></i>}
                        <span>{purgeBusy ? 'در حال پاکسازی…' : 'دستور پاکسازی'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-robot text-purple-500"></i> تحلیل خودکار هوشمند
                    </h3>
                    {insightsLoading && <i className="fas fa-spinner fa-spin text-purple-400 text-xs"></i>}
                    {insights?.usingLLM && <span className="text-[7px] font-black text-purple-400 bg-purple-50 px-2 py-0.5 rounded-full">🎯 توسط هوش مصنوعی</span>}
                </div>
                {insights?.summary ? (
                    <p className="text-[11px] leading-relaxed font-bold text-gray-700 bg-white/80 rounded-xl p-3 border border-purple-100 mb-3">{insights.summary}</p>
                ) : (
                    <p className="text-[9px] text-gray-400 mb-2">تحلیل خودکار بر اساس رویدادهای اخیر در حال آماده‌سازی است…</p>
                )}
                <div className="grid gap-2">
                    {(insights?.insights || []).slice(0, 3).map((ins: any, i: number) => {
                        const st = InsightLevelStyles[ins.level] || InsightLevelStyles.info;
                        return (
                            <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${st.bg}`}>
                                <i className={`fas ${ins.icon} ${st.icon} text-[10px] mt-0.5`}></i>
                                <div className="min-w-0">
                                    <p className={`text-[9px] font-black ${st.text}`}>{ins.title}</p>
                                    <p className="text-[8px] text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{ins.detail}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">روند هفتگی</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                        <p className="text-lg font-black text-green-600">{toPersianDigits(stats?.newUsersThisWeek || 0)}</p>
                        <p className="text-[8px] font-black text-green-400">کاربر جدید</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                        <p className="text-lg font-black text-orange-600">{toPersianDigits(stats?.newPostsThisWeek || 0)}</p>
                        <p className="text-[8px] font-black text-orange-400">پست جدید</p>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-xl">
                        <p className="text-lg font-black text-teal-600">{toPersianDigits(stats?.newCommentsThisWeek || 0)}</p>
                        <p className="text-[8px] font-black text-teal-400">نظر جدید</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">فعالیت پخش (۱۴ روز اخیر)</h3>
                    <div className="flex items-center gap-2 text-[8px] font-black">
                        <span className="flex items-center gap-1 text-emerald-600"><i className="fas fa-circle text-[6px]"></i> صوتی</span>
                        <span className="flex items-center gap-1 text-blue-500"><i className="fas fa-circle text-[6px]"></i> ویدیو</span>
                    </div>
                </div>
                <StackedDailyBars
                    data={buildDailyByType(stats?.dailyPlaysByType || [])}
                    colors={['#10b981', '#2e86c1']}
                    height={140}
                />
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">محبوب‌ترین پادکست‌ها (بر اساس بازدید واقعی)</h3>
                <RankBars
                    color="#10b981"
                    barColor2="#34d399"
                    valueSuffix="بازدید"
                    data={(stats?.popularPodcasts || []).slice(0, 5).map((p: any) => ({
                        title: p.title,
                        cover: p.cover,
                        value: p.totalViews || 0,
                        subtitle: `${toPersianDigits(p.likes || 0)} لایک • ${toPersianDigits(p.episodes?.length || 0)} جلسه`,
                    }))}
                />
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">محبوب‌ترین ویدیوها (بر اساس بازدید واقعی)</h3>
                <div className="space-y-2">
                    {(stats?.popularVideos || []).map((v: any, i: number) => (
                        <div key={v._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                            <span className={`text-[10px] font-black w-6 text-center ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>{i === 0 ? <i className="fas fa-crown"></i> : toPersianDigits(i + 1)}</span>
                            <img src={v.thumbnailUrl || 'https://via.placeholder.com/64x40'} className="w-12 h-9 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-gray-700 truncate">{v.title}</p>
                                <p className="text-[9px] text-gray-400 flex items-center gap-2">
                                    <span><i className="fas fa-play ml-0.5 text-blue-500"></i>{toPersianDigits(v.viewCount || 0)} بازدید</span>
                                    <span><i className="fas fa-heart ml-0.5 text-rose-400"></i>{toPersianDigits(v.likes || 0)} لایک</span>
                                </p>
                            </div>
                            <div className="w-24">
                                <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, ((v.viewCount || 0) / Math.max(1, stats?.popularVideos?.[0]?.viewCount || 1)) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(stats?.popularVideos || []).length === 0 && <p className="text-center text-[9px] text-gray-300 py-4">هنوز آماری ثبت نشده است</p>}
                </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/80 rounded-2xl border p-4 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                    <i className="fas fa-brain text-emerald-500"></i> موتور یادگیری هوشمند (کتاب‌ها و متن‌های سها سیما)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
                        <p className="text-lg font-black text-emerald-600">{toPersianDigits(aiCorpus?.byKind?.کتاب || 0)}</p>
                        <p className="text-[8px] font-black text-emerald-400">بخش کتاب‌ها</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
                        <p className="text-lg font-black text-purple-600">{toPersianDigits(aiCorpus?.byKind?.پادکست || 0)}</p>
                        <p className="text-[8px] font-black text-purple-400">بخش پادکست‌ها</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
                        <p className="text-lg font-black text-pink-600">{toPersianDigits(aiCorpus?.byKind?.ویدیو || 0)}</p>
                        <p className="text-[8px] font-black text-pink-400">بخش ویدیوها</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
                        <p className="text-lg font-black text-teal-600">{toPersianDigits(aiCorpus?.chunks || 0)}</p>
                        <p className="text-[8px] font-black text-teal-500">بخش‌های دانش (chunk)</p>
                    </div>
                </div>
                {aiCorpus?.indexedAt && (
                    <p className="text-[7px] text-gray-400 mt-2 text-center">آخرین به‌روزرسانی دانش: {toPersianDigits(new Date(aiCorpus.indexedAt).toLocaleString('fa-IR'))} • تازه‌سازی خودکار هر ۳۰ دقیقه</p>
                )}
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">آخرین کاربران</h3>
                </div>
                <div className="divide-y">
                    {(stats?.recentUsers || []).map((u: any) => (
                        <div key={u._id} className="p-3 flex items-center gap-3">
                            <img src={u.avatar || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="16" fill="#1ab394"/><text x="16" y="16" font-size="14" fill="white" text-anchor="middle" dominant-baseline="central" font-family="Arial">${(u.name || 'ک').charAt(0)}</text></svg>`)}`} className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-gray-800 truncate">{u.name || 'بدون نام'}</p>
                                <p className="text-[8px] text-gray-400">{toPersianDigits(u.phoneNumber)}</p>
                            </div>
                            <span className={`text-[7px] px-2 py-0.5 rounded-full font-black ${u.role === 'admin' ? 'bg-red-50 text-red-500' : u.role === 'author' ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-500'}`}>{u.role === 'admin' ? 'ادمین' : u.role === 'author' ? 'نویسنده' : 'کاربر'}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">آخرین پست‌ها</h3>
                </div>
                <div className="divide-y">
                    {(stats?.recentPosts || []).map((p: any) => (
                        <div key={p._id} className="p-3 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black flex-shrink-0">{p.author?.charAt(0) || '?'}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-gray-800">{p.author}</p>
                                <p className="text-[9px] text-gray-500 line-clamp-2 mt-0.5">{p.text || '(بدون متن)'}</p>
                            </div>
                            <div className="text-[8px] text-gray-400 flex items-center gap-1"><i className="fas fa-heart text-red-300"></i>{toPersianDigits(p.likes || 0)}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">توزیع نقش‌ها</h3>
                <div className="flex gap-2">
                    {(stats?.roleStats || []).map((r: any) => (
                        <div key={r._id} className="flex-1 text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-black text-gray-800">{toPersianDigits(r.count)}</p>
                            <p className="text-[8px] font-black text-gray-400">{r._id === 'admin' ? 'ادمین' : r._id === 'author' ? 'نویسنده' : 'کاربر'}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">توزیع نظرات بر اساس نوع</h3>
                <div className="flex gap-2">
                    {(stats?.commentsByType || []).map((c: any) => (
                        <div key={c._id} className="flex-1 text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-black text-gray-800">{toPersianDigits(c.count)}</p>
                            <p className="text-[8px] font-black text-gray-400">{c._id === 'podcast' ? 'صوتی' : c._id === 'video' ? 'ویدیویی' : 'کتاب'}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-2xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-[10px] font-black text-gray-600">کل لایک‌ها</h3>
                        <p className="text-2xl font-black text-primary">{toPersianDigits(stats?.totalLikes || 0)}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><i className="fas fa-heart text-xl"></i></div>
                </div>
            </div>
        </div>
    );

    const renderUsersPanel = () => (
        <div className="p-4 space-y-4 animate-fadeIn">
            <div className="bg-white p-3 rounded-2xl border shadow-sm space-y-2">
                <div className="relative">
                    <TextInput placeholder="جستجوی نام یا شماره..." value={usersSearch} onChange={(e: any) => setUsersSearch(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && loadUsers(1)} />
                    <i className="fas fa-search absolute left-3 top-3.5 text-gray-300"></i>
                </div>
                <div className="flex gap-2">
                    {[{ v: '', l: 'همه' }, { v: 'user', l: 'کاربر' }, { v: 'author', l: 'نویسنده' }, { v: 'admin', l: 'ادمین' }].map(r => (
                        <button key={r.v} onClick={() => { setUsersRoleFilter(r.v); }}
                            className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${usersRoleFilter === r.v ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}>{r.l}</button>
                    ))}
                </div>
            </div>

            {selectedUsers.length > 0 && (
                <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20 flex items-center gap-3">
                    <span className="text-[9px] font-black text-primary">{toPersianDigits(selectedUsers.length)} انتخاب شده</span>
                    <div className="flex-1"></div>
                    <button onClick={() => {
                        showConfirmToast(`تبدیل ${toPersianDigits(selectedUsers.length)} کاربر به نویسنده؟`, async () => {
                            await adminBulkUsers(selectedUsers, 'role', 'author');
                            setSelectedUsers([]);
                            loadUsers(1);
                            showAdminToast('کاربران به نویسنده تبدیل شدند', 'success');
                        }, 'warning');
                    }} className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[8px] font-black">تبدیل به نویسنده</button>
                    <button onClick={() => {
                        showConfirmToast(`آیا از حذف ${toPersianDigits(selectedUsers.length)} کاربر اطمینان دارید؟`, async () => {
                            await adminBulkUsers(selectedUsers, 'delete');
                            setSelectedUsers([]);
                            loadUsers(1);
                            showAdminToast('کاربران حذف شدند', 'success');
                        });
                    }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[8px] font-black">حذف</button>
                    <button onClick={() => setSelectedUsers([])} className="text-gray-400 text-[8px]"><i className="fas fa-times"></i></button>
                </div>
            )}

            <p className="text-[9px] font-black text-gray-400">{toPersianDigits(usersTotal)} کاربر یافت شد</p>

            <div className="space-y-2">
                {users.map((u: any) => (
                    <div key={u._id} className={`bg-white p-3 rounded-2xl border shadow-sm flex items-center gap-3 group hover:border-primary transition-all ${selectedUsers.includes(u._id) ? 'border-primary bg-primary/5' : ''}`}>
                        <input
                            type="checkbox"
                            checked={selectedUsers.includes(u._id)}
                            onChange={(e) => {
                                if (e.target.checked) setSelectedUsers(prev => [...prev, u._id]);
                                else setSelectedUsers(prev => prev.filter(id => id !== u._id));
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <img src={u.avatar || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="#1ab394"/><text x="20" y="20" font-size="16" fill="white" text-anchor="middle" dominant-baseline="central" font-family="Arial">${(u.name || 'ک').charAt(0)}</text></svg>`)}`} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-gray-800 truncate">{u.name || 'بدون نام'}
                                {u.banned && <span className="text-red-500 text-[8px] mr-1">🚫 بن شده</span>}
                                {u.muted && <span className="text-orange-500 text-[8px] mr-1">🔇 سکوت</span>}
                                {(u.warnings || 0) > 0 && !u.banned && <span className="text-amber-500 text-[8px] mr-1">⚠️{toPersianDigits(u.warnings)}</span>}
                            </p>
                            <p className="text-[9px] text-gray-400">{toPersianDigits(u.phoneNumber)}</p>
                            <p className="text-[8px] text-gray-300">{u.interests?.length ? `${toPersianDigits(u.interests.length)} علاقه‌مندی` : ''} {u.library?.podcasts?.length ? `• ${toPersianDigits(u.library.podcasts.length)} پادکست` : ''}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <select value={u.role} onChange={async (e) => {
                                const r = await updateUserRole(u._id, e.target.value);
                                if (r) setUsers(prev => prev.map(x => x._id === u._id ? { ...x, role: e.target.value } : x));
                            }} className="bg-gray-50 border rounded-lg px-2 py-1.5 text-[9px] font-black outline-none">
                                <option value="user">کاربر</option>
                                <option value="author">نویسنده</option>
                                <option value="admin">ادمین</option>
                            </select>
                            {u.banned ? (
                                <button onClick={async () => { const r = await unbanUser(u._id); if (r) setUsers(prev => prev.map(x => x._id === u._id ? { ...x, banned: false, warnings: 0 } : x)); }} className="px-2 py-1.5 bg-green-50 text-green-500 rounded-xl text-[9px] font-black hover:bg-green-100 transition-all" title="رفع بن">✅ رفع بن</button>
                            ) : u.warnings > 0 ? (
                                <button onClick={async () => { const r = await resetUserWarnings(u._id); if (r) setUsers(prev => prev.map(x => x._id === u._id ? { ...x, warnings: 0 } : x)); }} className="px-2 py-1.5 bg-amber-50 text-amber-500 rounded-xl text-[9px] font-black hover:bg-amber-100 transition-all" title="پاک کردن اخطارها">⚠️ {toPersianDigits(u.warnings)}</button>
                            ) : null}
                            {u.muted ? (
                                <button onClick={async () => { const r = await unmuteUser(u._id); if (r) { setUsers(prev => prev.map(x => x._id === u._id ? { ...x, muted: false, mutedUntil: null } : x)); showAdminToast(`${u.name} رفع سکوت شد`, 'success'); } }} className="px-2 py-1.5 bg-blue-50 text-blue-500 rounded-xl text-[9px] font-black hover:bg-blue-100 transition-all" title="رفع سکوت">🔊 رفع سکوت</button>
                            ) : (
                                <button onClick={() => {
                                    showConfirmToast(`سکوت ${u.name} به مدت ۱۰ دقیقه؟`, async () => {
                                        const r = await muteUser(u._id, 10, 'سکوت توسط ادمین');
                                        if (r) { setUsers(prev => prev.map(x => x._id === u._id ? { ...x, muted: true, mutedUntil: r.mutedUntil } : x)); showAdminToast(`${u.name} سکوت شد`, 'success'); }
                                    }, 'warning');
                                }} className="px-2 py-1.5 bg-orange-50 text-orange-500 rounded-xl text-[9px] font-black hover:bg-orange-100 transition-all" title="سکوت کاربر">🔇 سکوت</button>
                            )}
                            <button onClick={() => {
                                showConfirmToast(`آیا از حذف ${u.name} اطمینان دارید؟`, async () => {
                                    const r = await deleteUser(u._id);
                                    if (r) {
                                        setUsers(prev => prev.filter(x => x._id !== u._id));
                                        setSelectedUsers(prev => prev.filter(id => id !== u._id));
                                        showAdminToast(`${u.name} حذف شد`, 'success');
                                    }
                                });
                            }} className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[10px]"></i></button>
                        </div>
                    </div>
                ))}
            </div>

            {usersTotal > 20 && (
                <div className="flex justify-center gap-2">
                    <button onClick={() => loadUsers(usersPage - 1)} disabled={usersPage <= 1} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black disabled:opacity-30">قبلی</button>
                    <span className="px-4 py-2 text-[10px] font-black text-gray-400">{toPersianDigits(usersPage)} / {toPersianDigits(Math.ceil(usersTotal / 20))}</span>
                    <button onClick={() => loadUsers(usersPage + 1)} disabled={usersPage >= Math.ceil(usersTotal / 20)} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black disabled:opacity-30">بعدی</button>
                </div>
            )}
        </div>
    );

const renderPostsPanel = () => (
        <div className="p-4 space-y-4 animate-fadeIn">
            <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: chatEnabled ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <i className={`fas ${chatEnabled ? 'fa-unlock' : 'fa-lock'} text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-800">چت محفل {chatEnabled ? 'باز است' : 'بسته است'}</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-0.5 leading-relaxed">{chatEnabled ? 'کاربران میتوانند پیام بفرستند' : 'کاربران فقط میتوانند پیامها را ببینند'}</p>
                    </div>
                    <button onClick={handleToggleChat} disabled={chatSettingsLoading}
                        className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 disabled:opacity-50 ${chatEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${chatEnabled ? 'left-0.5' : 'left-[22px]'}`}></span>
                    </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <i className="fas fa-comment-slash text-[10px] text-gray-300 flex-shrink-0"></i>
                    <input
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="پیام نمایشی هنگام بسته بودن چت (اختیاری)..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[10px] text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <button onClick={async () => {
                        try {
                            const r = await updateCommunitySettings(chatEnabled, chatMessage);
                            if (r) { setChatEnabled(r.chatEnabled); setChatMessage(r.chatMessage || ''); showAdminToast('پیام چت ذخیره شد ✅'); }
                            else showAdminToast('خطا در ذخیره پیام', 'error');
                        } catch { showAdminToast('خطا در ذخیره پیام', 'error'); }
                    }} className="px-3 py-2 bg-primary text-white rounded-xl text-[9px] font-black flex items-center gap-1.5 active:scale-95 transition-all">
                        <i className="fas fa-save text-[9px]"></i> ذخیره پیام
                    </button>
                </div>
            </div>
            <div className="bg-white p-3 rounded-2xl border shadow-sm">
                <div className="relative">
                    <TextInput placeholder="جستجو در پستها..." value={adminPostsSearch} onChange={(e: any) => setAdminPostsSearch(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && loadPosts(1)} />
                    <i className="fas fa-search absolute left-3 top-3.5 text-gray-300"></i>
                </div>
            </div>

            {selectedPosts.length > 0 && (
                <div className="bg-orange-50 p-3 rounded-2xl border border-orange-200 flex items-center gap-3">
                    <span className="text-[9px] font-black text-orange-600">{toPersianDigits(selectedPosts.length)} انتخاب شده</span>
                    <div className="flex-1"></div>
                    <button onClick={async () => { await adminBulkPosts(selectedPosts, 'pin'); setSelectedPosts([]); loadPosts(1); }} className="px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-lg text-[8px] font-black">سنجاق کردن</button>
                    <button onClick={async () => { await adminBulkPosts(selectedPosts, 'delete'); setSelectedPosts([]); loadPosts(1); }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[8px] font-black">حذف</button>
                    <button onClick={() => setSelectedPosts([])} className="text-gray-400 text-[8px]"><i className="fas fa-times"></i></button>
                </div>
            )}

            <p className="text-[9px] font-black text-gray-400">{toPersianDigits(adminPostsTotal)} پست یافت شد</p>

            <div className="space-y-3">
                {adminPosts.map((p: any) => (
                    <div key={p._id} className={`bg-white p-4 rounded-2xl border shadow-sm group hover:border-primary transition-all ${selectedPosts.includes(p._id) ? 'border-orange-400 bg-orange-50/30' : ''}`}>
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={selectedPosts.includes(p._id)}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedPosts(prev => [...prev, p._id]);
                                    else setSelectedPosts(prev => prev.filter(id => id !== p._id));
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 mt-1"
                            />
                            <img src={p.authorAvatarUrl || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" rx="18" fill="#f97316"/><text x="18" y="18" font-size="14" fill="white" text-anchor="middle" dominant-baseline="central" font-family="Arial">${(p.author || 'ک').charAt(0)}</text></svg>`)}`} className="w-9 h-9 rounded-full object-cover shadow-sm flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] font-black text-gray-800">{p.author}</span>
                                    <div className="flex items-center gap-2">
                                        {p.isPinned && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-600 font-black"><i className="fas fa-thumbtack"></i> سنجاق</span>}
                                        {p.isEdited && <span className="text-[7px] text-gray-400 font-bold">ویرایش شده</span>}
                                        <span className="text-[8px] text-gray-400 font-bold">{p.date}</span>
                                    </div>
                                </div>
                                {editingPostId === p._id ? (
                                    <div className="flex gap-2 mt-2">
                                        <TextInput value={editingPostText} onChange={(e: any) => setEditingPostText(e.target.value)} />
                                        <button onClick={async () => {
                                            const r = await adminUpdatePost(p._id, { text: editingPostText });
                                            if (r) { setAdminPosts(prev => prev.map(x => x._id === p._id ? { ...x, text: editingPostText } : x)); setEditingPostId(null); }
                                        }} className="px-3 py-1 bg-primary text-white rounded-lg text-[9px] font-black">ذخیره</button>
                                        <button onClick={() => setEditingPostId(null)} className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black">لغو</button>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3">{p.text || '(بدون متن)'}</p>
                                )}
                                {p.podcastData && (
                                    <MiniAudioPlayer comment={{ podcastId: p.podcastData, episodeIndex: p.episodeIndex, podcastTitle: p.podcastData?.title, episodeTitle: p.podcastData?.episodes?.[p.episodeIndex]?.title }} />
                                )}
                                {p.videoData && (
                                    <MiniVideoPlayer comment={{ videoId: p.videoData, videoTitle: p.videoData?.title }} />
                                )}
                                {p.bookData && !p.podcastData && !p.videoData && (
                                    <div className="mt-2 p-2 bg-pink-50 rounded-xl flex items-center gap-2">
                                        <img src={p.bookData?.cover} className="w-8 h-8 rounded-lg object-cover shadow-sm flex-shrink-0" />
                                        <span className="text-[9px] font-black text-pink-600">{p.bookData?.title || 'کتاب'}</span>
                                    </div>
                                )}
                                {p.media && p.media.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                        {p.media.map((m: any, i: number) => (
                                            m.type === 'image' ? <img key={i} src={m.url} className="w-12 h-12 rounded-lg object-cover border" /> : <span key={i} className="text-[8px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg"><i className="fas fa-video"></i></span>
                                        ))}
                                    </div>
                                )}
                                {p.comments && p.comments.length > 0 && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded-xl space-y-1">
                                        <p className="text-[8px] font-black text-gray-400">{toPersianDigits(p.comments.length)} نظر</p>
                                        {p.comments.slice(0, 3).map((c: any) => (
                                            <div key={c._id} className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-gray-600">{c.author}:</span>
                                                <span className="text-[8px] text-gray-500 truncate">{c.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => setEditingPostId(p._id)} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"><i className="fas fa-pen text-[8px]"></i></button>
                                <button onClick={async () => {
                                    const r = await adminUpdatePost(p._id, { isPinned: !p.isPinned });
                                    if (r) setAdminPosts(prev => prev.map(x => x._id === p._id ? { ...x, isPinned: !x.isPinned } : x));
                                }} className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 ${p.isPinned ? 'bg-yellow-50 text-yellow-500' : 'bg-gray-50 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500'}`}><i className="fas fa-thumbtack text-[8px]"></i></button>
                                <button onClick={() => {
                                    showConfirmToast('آیا از حذف این پست اطمینان دارید؟', async () => {
                                        const r = await adminDeletePost(p._id);
                                        if (r) { setAdminPosts(prev => prev.filter(x => x._id !== p._id)); showAdminToast('پست حذف شد', 'success'); }
                                    });
                                }} className="w-7 h-7 rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[8px]"></i></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {adminPostsTotal > 20 && (
                <div className="flex justify-center gap-2">
                    <button onClick={() => loadPosts(adminPostsPage - 1)} disabled={adminPostsPage <= 1} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black disabled:opacity-30">قبلی</button>
                    <span className="px-4 py-2 text-[10px] font-black text-gray-400">{toPersianDigits(adminPostsPage)} / {toPersianDigits(Math.ceil(adminPostsTotal / 20))}</span>
                    <button onClick={() => loadPosts(adminPostsPage + 1)} disabled={adminPostsPage >= Math.ceil(adminPostsTotal / 20)} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black disabled:opacity-30">بعدی</button>
                </div>
            )}
        </div>
    );

    const renderCommentsPanel = () => (
        <div className="p-4 space-y-4 animate-fadeIn">
            <div className="bg-white p-3 rounded-2xl border shadow-sm space-y-2">
                <div className="relative">
                    <TextInput placeholder="جستجو در نظرات..." value={adminCommentsSearch} onChange={(e: any) => setAdminCommentsSearch(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && loadComments(1)} />
                    <i className="fas fa-search absolute left-3 top-3.5 text-gray-300"></i>
                </div>
                <div className="flex gap-2">
                    {[{ v: '', l: 'همه', icon: 'fa-comments' }, { v: 'podcast', l: 'صوتی', icon: 'fa-podcast' }, { v: 'video', l: 'ویدیویی', icon: 'fa-video' }, { v: 'book', l: 'کتاب', icon: 'fa-book' }].map(t => (
                        <button key={t.v} onClick={() => { setAdminCommentsType(t.v); }}
                            className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all flex items-center justify-center gap-1 ${adminCommentsType === t.v ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}>
                            <i className={`fas ${t.icon}`}></i>{t.l}
                        </button>
                    ))}
                </div>
            </div>

            {selectedComments.length > 0 && (
                <div className="bg-teal-50 p-3 rounded-2xl border border-teal-200 flex items-center gap-3">
                    <span className="text-[9px] font-black text-teal-600">{toPersianDigits(selectedComments.length)} انتخاب شده</span>
                    <div className="flex-1"></div>
                    <button onClick={async () => { await adminBulkComments(selectedComments, 'feature'); setSelectedComments([]); loadComments(1); }} className="px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-lg text-[8px] font-black">ویژه کردن</button>
                    <button onClick={async () => { await adminBulkComments(selectedComments, 'delete'); setSelectedComments([]); loadComments(1); }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[8px] font-black">حذف</button>
                    <button onClick={() => setSelectedComments([])} className="text-gray-400 text-[8px]"><i className="fas fa-times"></i></button>
                </div>
            )}

            <p className="text-[9px] font-black text-gray-400">{toPersianDigits(adminCommentsTotal)} نظر یافت شد</p>

            <div className="space-y-2">
                {adminComments.map((c: any) => (
                    <div key={c._id} className={`relative bg-white p-3 sm:p-4 lg:p-5 rounded-3xl border shadow-sm group transition-all hover:shadow-md hover:-translate-y-0.5 ${c.isFeatured ? 'border-yellow-300 bg-gradient-to-b from-yellow-50/60 to-white' : 'border-gray-100 hover:border-primary/40'} ${selectedComments.includes(c._id) ? 'border-teal-400 bg-teal-50/40 ring-2 ring-teal-100' : ''}`}>
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={selectedComments.includes(c._id)}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedComments(prev => [...prev, c._id]);
                                    else setSelectedComments(prev => prev.filter(id => id !== c._id));
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500 mt-1"
                            />
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary font-black text-[11px] sm:text-[13px] flex-shrink-0 shadow-sm ring-2 ring-white">{c.author?.charAt(0) || '?'}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-black text-gray-800">{c.author}</span>
                                        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: c.type === 'podcast' ? '#fef3c7' : c.type === 'video' ? '#dbeafe' : '#fce7f3', color: c.type === 'podcast' ? '#d97706' : c.type === 'video' ? '#2563eb' : '#db2777' }}>{c.type}</span>
                                        {c.isFeatured && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-600 font-black"><i className="fas fa-star"></i> ویژه</span>}
                                    </div>
                                    <span className="text-[8px] text-gray-400 font-bold">{c.date}</span>
                                </div>
                                {editingCommentId === c._id ? (
                                    <div className="flex gap-2 mt-2">
                                        <TextInput value={editingCommentText} onChange={(e: any) => setEditingCommentText(e.target.value)} />
                                        <button onClick={async () => {
                                            const r = await adminUpdateComment(c._id, { text: editingCommentText });
                                            if (r) { setAdminComments(prev => prev.map(x => x._id === c._id ? { ...x, text: editingCommentText } : x)); setEditingCommentId(null); }
                                        }} className="px-3 py-1 bg-primary text-white rounded-lg text-[9px] font-black">ذخیره</button>
                                        <button onClick={() => setEditingCommentId(null)} className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black">لغو</button>
                                    </div>
                                ) : (
                                    <p className="text-[11px] sm:text-[12px] text-gray-600 leading-loose">{c.text}</p>
                                )}
                                {c.type === 'podcast' && (
                                    <MiniAudioPlayer comment={{ ...c, podcastData: c.podcastData || c.podcastId }} timestamp={c.audioTimestamp || c.timestamp} />
                                )}
                                {c.type === 'video' && (
                                    <MiniVideoPlayer comment={{ ...c, videoData: c.videoData || c.videoId }} playable={false} />
                                )}
                                {c.type === 'book' && c.bookId && (
                                    <div className="mt-2 flex items-center gap-3 p-2 bg-pink-50 rounded-xl">
                                        {c.bookData?.cover ? (
                                            <img src={c.bookData.cover} className="w-10 h-14 rounded-lg object-cover shadow-sm flex-shrink-0" />
                                        ) : (
                                            <div className="w-10 h-14 rounded-lg bg-pink-100 flex items-center justify-center text-pink-400 shadow-sm flex-shrink-0"><i className="fas fa-book text-[12px]"></i></div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-pink-500 mb-1 flex items-center gap-1"><i className="fas fa-book"></i> کتاب</p>
                                            <p className="text-[11px] font-black text-pink-800 leading-snug truncate">{c.bookData?.title || 'کتاب'}</p>
                                        </div>
                                    </div>
                                )}
                                {c.type !== 'podcast' && (c.timestamp || c.videoTimestamp) && (
                                    <span className="text-[8px] text-primary mt-1 inline-block"><i className="fas fa-clock"></i> {toPersianDigits(Math.floor((c.timestamp || c.audioTimestamp || c.videoTimestamp || 0) / 60))}:{toPersianDigits(Math.floor((c.timestamp || c.audioTimestamp || c.videoTimestamp || 0) % 60)).toString().padStart(2, '0')}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 sm:bg-gray-50 sm:px-1.5 sm:py-1 sm:rounded-2xl sm:border sm:border-gray-100 sm:gap-0.5">
                                <button onClick={() => { setEditingCommentId(c._id); setEditingCommentText(c.text); }} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><i className="fas fa-pen text-[8px]"></i></button>
                                <button onClick={async () => {
                                    const r = await adminUpdateComment(c._id, { isFeatured: !c.isFeatured });
                                    if (r) setAdminComments(prev => prev.map(x => x._id === c._id ? { ...x, isFeatured: !x.isFeatured } : x));
                                }} className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${c.isFeatured ? 'bg-yellow-50 text-yellow-500' : 'bg-gray-50 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500'}`}><i className="fas fa-star text-[8px]"></i></button>
                                <button onClick={() => {
                                    showConfirmToast('آیا از حذف این نظر اطمینان دارید؟', async () => {
                                        const r = await adminDeleteComment(c._id);
                                        if (r) { setAdminComments(prev => prev.filter(x => x._id !== c._id)); showAdminToast('نظر حذف شد', 'success'); }
                                    });
                                }} className="w-7 h-7 rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center opacity-100 sm:opacity-100 sm:group-hover:opacity-100"><i className="fas fa-trash text-[8px]"></i></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {adminCommentsTotal > 30 && (
                <div className="flex justify-center gap-2">
                    <button onClick={() => loadComments(adminCommentsPage - 1)} disabled={adminCommentsPage <= 1} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black disabled:opacity-30">قبلی</button>
                    <span className="px-4 py-2 text-[10px] font-black text-gray-400">{toPersianDigits(adminCommentsPage)} / {toPersianDigits(Math.ceil(adminCommentsTotal / 30))}</span>
                    <button onClick={() => loadComments(adminCommentsPage + 1)} disabled={adminCommentsPage >= Math.ceil(adminCommentsTotal / 30)} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black disabled:opacity-30">بعدی</button>
                </div>
            )}
        </div>
    );

    const renderAdminNotesPanel = () => {
        if (noteComposer.open) {
            return (
                <div className="p-4 space-y-4 animate-fadeIn pb-40">
                    <button onClick={() => { setNoteComposer({ open: false }); setEditingNote(null); }} className="text-violet-600 font-black text-[10px]">&larr; بازگشت به لیست یادداشت‌ها</button>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                        <h4 className="font-black text-gray-700 text-sm mb-2">{editingNote ? 'ویرایش یادداشت' : 'یادداشت جدید'}</h4>
                        <FormField label="عنوان یادداشت"><TextInput value={noteTitle} onChange={(e: any) => setNoteTitle(e.target.value)} placeholder="عنوان..." /></FormField>
                        <FormField label="متن یادداشت"><TextArea value={noteContent} onChange={(e: any) => setNoteContent(e.target.value)} placeholder="متن فکری / فرهنگی..." /></FormField>
                        <FormField label="نویسنده‌ی اصلی"><TextInput value={noteAuthorName} onChange={(e: any) => setNoteAuthorName(e.target.value)} placeholder="مثلاً: استاد طاهرزاده / سیمای هنر و اندیشه / ..." /></FormField>
                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 mb-4 cursor-pointer">
                            <input type="checkbox" checked={noteIsDraft} onChange={(e) => setNoteIsDraft(e.target.checked)} className="w-4 h-4 accent-violet-600" />
                            ذخیره به‌صورت پیش‌نویس {noteIsDraft === false ? '(انتشار در صفحه نشر)' : '(فقط در پنل مدیریت و نویسنده)'}
                        </label>
                        <div className="flex gap-2 pt-2 border-t">
                            <button disabled={noteSaving} onClick={async () => {
                                if (!noteTitle.trim()) { showAdminToast('عنوان یادداشت را بنویسید', 'warning'); return; }
                                setNoteSaving(true);
                                try {
                                    const payload = { title: noteTitle.trim(), description: noteContent.trim().replace(/<[^>]*>/g, '').slice(0, 140), contentHtml: noteContent.trim().split('\n').map(p => `<p>${p}</p>`).join(''), authorName: noteAuthorName.trim() || 'سیمای هنر و اندیشه', isDraft: noteIsDraft, type: 'note' };
                                    if (editingNote) {
                                        const r = await adminUpdateNote(editingNote._id, payload);
                                        if (r) { showAdminToast('یادداشت به‌روزرسانی شد', 'success'); setNoteComposer({ open: false }); setEditingNote(null); loadAdminNotes(adminNotesPage); }
                                    } else {
                                        const r = await adminCreateNote(payload);
                                        if (r) { showAdminToast('یادداشت منتشر شد', 'success'); setNoteComposer({ open: false }); loadAdminNotes(1); }
                                    }
                                } finally { setNoteSaving(false); }
                            }} className="flex-1 py-3 bg-violet-600 text-white rounded-2xl text-[11px] font-black shadow-lg shadow-violet-100 active:scale-95 transition-all disabled:opacity-50">
                                {noteSaving ? 'در حال ذخیره...' : editingNote ? 'ذخیره تغییرات' : 'ثبت یادداشت'}
                            </button>
                            <button onClick={() => { setNoteComposer({ open: false }); setEditingNote(null); }} className="px-6 py-3 bg-gray-50 text-gray-500 rounded-2xl text-[11px] font-black">انصراف</button>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="p-4 space-y-4 animate-fadeIn pb-40">
                <div className="bg-white p-3 rounded-2xl border shadow-sm space-y-2">
                    <div className="relative">
                        <TextInput placeholder="جستجو در یادداشت‌ها..." value={adminNotesSearch} onChange={(e: any) => setAdminNotesSearch(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && loadAdminNotes(1)} />
                        <i className="fas fa-search absolute left-3 top-3.5 text-gray-300"></i>
                    </div>
                    <div className="flex gap-2">
                        {[{ v: '', l: 'همه', icon: 'fa-feather-alt' }, { v: 'published', l: 'منتشر شده', icon: 'fa-globe' }, { v: 'draft', l: 'پیش‌نویس‌ها', icon: 'fa-pen-alt' }].map(t => (
                            <button key={t.v} onClick={() => { setAdminNotesStatus(t.v); loadAdminNotes(1, adminNotesSearch, t.v); }}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all flex items-center justify-center gap-1 ${adminNotesStatus === t.v ? 'bg-violet-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                <i className={`fas ${t.icon}`}></i>{t.l}
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={() => { setNoteComposer({ open: true }); setEditingNote(null); setNoteTitle(''); setNoteContent(''); setNoteAuthorName(''); setNoteIsDraft(false); }} className="w-full py-4 bg-violet-600 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-violet-100 active:scale-95 transition-all">+ یادداشت جدید</button>

                <p className="text-[9px] font-black text-gray-400">{toPersianDigits(adminNotesTotal)} یادداشت یافت شد</p>

                <div className="space-y-2">
                    {adminNotes.map((n: any) => (
                        <div key={n._id} className="bg-white p-3 sm:p-4 rounded-3xl border shadow-sm group hover:border-violet-300/60 transition-all">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white text-[13px]"><i className="fas fa-feather-alt"></i></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-[11px] font-black text-gray-800">{n.title || 'بی‌عنوان'}</span>
                                        {n.isDraft ? (
                                            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-black whitespace-nowrap"><i className="fas fa-pen-alt"></i> پیش‌نویس</span>
                                        ) : n.pendingApproval ? (
                                            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-black whitespace-nowrap"><i className="fas fa-hourglass-half"></i> در انتظار تأیید</span>
                                        ) : (
                                            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-black whitespace-nowrap"><i className="fas fa-globe"></i> منتشر شده</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 mb-1">✍️ {n.authorName || n.user?.name || 'سیمای هنر و اندیشه'}</p>
                                    <p className="text-[9px] text-gray-400 leading-relaxed line-clamp-2 text-right">{String(n.description || '').replace(/<[^>]*>/g, '') || n.title}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {n.pendingApproval && (
                                        <button onClick={async () => {
                                            const r = await adminUpdateNote(n._id, { isDraft: false, pendingApproval: false });
                                            if (r) { showAdminToast('یادداشت تأیید و منتشر شد', 'success'); loadAdminNotes(adminNotesPage); }
                                        }} className="w-8 h-8 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center" title="تأیید و انتشار">
                                            <i className="fas fa-check text-[9px]"></i>
                                        </button>
                                    )}
                                    <button onClick={() => { setEditingNote(n); setNoteTitle(n.title || ''); setNoteContent((n.contentHtml || n.description || '').replace(/<[^>]*>/g, '')); setNoteAuthorName(n.authorName || n.user?.name || ''); setNoteIsDraft(!!n.isDraft); setNoteComposer({ open: true }); }} className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all flex items-center justify-center"><i className="fas fa-pen text-[9px]"></i></button>
                                    <button onClick={async () => {
                                        const r = await adminUpdateNote(n._id, { isDraft: !n.isDraft });
                                        if (r) { showAdminToast(n.isDraft ? 'یادداشت منتشر شد' : 'به پیش‌نویس تبدیل شد', 'success'); loadAdminNotes(adminNotesPage); }
                                    }} className="w-8 h-8 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all flex items-center justify-center" title="انتشار / پیش‌نویس">
                                        <i className={`fas ${n.isDraft ? 'fa-globe' : 'fa-pen-alt'} text-[9px]`}></i>
                                    </button>
                                    <button onClick={() => {
                                        showConfirmToast('آیا از حذف این یادداشت اطمینان دارید؟', async () => {
                                            const r = await adminDeleteNote(n._id);
                                            if (r) { setAdminNotes(prev => prev.filter(x => x._id !== n._id)); showAdminToast('یادداشت حذف شد', 'success'); }
                                        });
                                    }} className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[9px]"></i></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {adminNotesTotal > 20 && (
                    <div className="flex justify-center gap-2">
                        <button onClick={() => loadAdminNotes(adminNotesPage - 1)} disabled={adminNotesPage <= 1} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black disabled:opacity-30">قبلی</button>
                        <span className="px-4 py-2 text-[10px] font-black text-gray-400">{toPersianDigits(adminNotesPage)} / {toPersianDigits(adminNotesPages)}</span>
                        <button onClick={() => loadAdminNotes(adminNotesPage + 1)} disabled={adminNotesPage >= adminNotesPages} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black disabled:opacity-30">بعدی</button>
                    </div>
                )}
            </div>
        );
    };

    const renderAdminAuthorsPanel = () => (
        <div className="p-4 space-y-4 animate-fadeIn pb-40">
            <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نویسندگان و مدیران سرای هنر و اندیشه</h3>
                <span className="text-[9px] font-black text-pink-600 bg-pink-50 px-3 py-1 rounded-full">{toPersianDigits(adminAuthors.length)} نفر</span>
            </div>
            {authorsLoading ? (
                <div className="text-center py-16 text-pink-300"><i className="fas fa-circle-notch fa-spin text-2xl"></i></div>
            ) : (
                <div className="space-y-2">
                    {adminAuthors.map((a: any) => (
                        <div key={a._id} className="bg-white p-3 sm:p-4 rounded-3xl border shadow-sm group hover:border-pink-300/60 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md overflow-hidden">
                                    {a.avatar ? <img src={a.avatar} className="w-full h-full object-cover" /> : (a.name || '؟').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-gray-800">{a.name}</p>
                                    <p className="text-[9px] text-gray-400 font-bold mt-0.5" dir="ltr">{a.phoneNumber || a.email || ''}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                        {a.role === 'admin' ? (
                                            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-gray-900 text-white font-black">🛡️ مدیر سیستم</span>
                                        ) : (
                                            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600 font-black">✍️ نویسنده</span>
                                        )}
                                        <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-bold whitespace-nowrap"><i className="fas fa-feather-alt"></i> {toPersianDigits(a.noteCount || 0)} یادداشت</span>
                                        {(a.draftCount || 0) > 0 && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold whitespace-nowrap"><i className="fas fa-pen-alt"></i> {toPersianDigits(a.draftCount)} پیش‌نویس</span>}
                                        {a.banned && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-black">🚫 مسدود</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {a.role === 'author' ? (
                                        <button onClick={async () => {
                                            const r = await updateUserRole(a._id, 'user');
                                            if (r) { showAdminToast('نقش به مخاطب تغییر کرد', 'success'); loadAdminAuthors(); }
                                        }} className="px-3 py-2 bg-gray-50 text-gray-500 rounded-xl text-[9px] font-black hover:bg-gray-100 transition-colors whitespace-nowrap">حذف از نویسندگی</button>
                                    ) : (
                                        a.role === 'admin' ? (
                                            <button onClick={async () => {
                                                const r = await updateUserRole(a._id, 'author');
                                                if (r) { showAdminToast('به نویسنده تغییر کرد', 'success'); loadAdminAuthors(); }
                                            }} className="px-3 py-2 bg-gray-50 text-gray-500 rounded-xl text-[9px] font-black hover:bg-gray-100 transition-colors whitespace-nowrap">نویسنده کند</button>
                                        ) : null
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderSowtPanel = () => {
        if (editingItem?.type === 'Podcast') {
            const p = localData.podcasts.find((x: any) => x.id === editingItem.id);
            if (!p) return null;
            const setField = (f: keyof Podcast, v: any) => updateTable('podcasts', localData.podcasts.map((i: any) => i.id === p.id ? { ...i, [f]: v } : i));
            return (
                <div className="p-4 space-y-6 animate-fadeIn pb-40">
                    <button onClick={() => setEditingItem(null)} className="text-primary font-black text-[10px]">&larr; بازگشت به لیست</button>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                        <FormField label="عنوان مجموعه صوتی"><TextInput value={p.title} onChange={(e:any)=>setField('title', e.target.value)} /></FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="دبیر (ارائه‌دهنده)"><select className="w-full bg-white border border-gray-200 rounded-xl h-11 px-2 text-[11px] font-black outline-none shadow-sm" value={p.speakerId} onChange={(e:any)=>setField('speakerId', Number(e.target.value))}>{localData.authors.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></FormField>
                            <FormField label="سال برگزاری (شمسی)"><TextInput type="number" value={p.year} onChange={(e:any)=>setField('year', Number(e.target.value))} /></FormField>
                        </div>
                        <FormField label="کاور مجموعه"><div className="flex gap-2"><TextInput value={p.cover} onChange={(e:any)=>setField('cover', e.target.value)} /><UploadButton onUpload={(url:string)=>setField('cover', url)} /></div></FormField>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 pr-3 uppercase tracking-widest">جلسات مجموعه</h3>
                        {p.episodes.map((ep: Episode, idx: number) => (
                            <div key={idx} className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-3 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 px-4 py-1 bg-primary/10 text-primary text-[8px] font-black rounded-bl-2xl">جلسه {toPersianDigits(idx + 1)}</div>
                                <div className="pt-2 flex gap-2">
                                    <div className="flex-1"><FormField label="زیرعنوان جلسه"><TextInput value={ep.subtitle || ''} onChange={(e:any)=>{ const n=[...p.episodes]; n[idx].subtitle=e.target.value; setField('episodes', n); }}/></FormField></div>
                                    <div className="w-10"><FormField label="آپلود صوت"><UploadButton accept="audio/*" icon="fa-microphone" onUpload={(url:string)=>{ const n=[...p.episodes]; n[idx].audioUrl=url; setField('episodes', n); }} /></FormField></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="لینک صوت"><TextInput value={ep.audioUrl} onChange={(e:any)=>{ const n=[...p.episodes]; n[idx].audioUrl=e.target.value; setField('episodes', n); }}/></FormField>
                                    <FormField label="تاریخ انتشار"><PersianDateInput value={ep.date} onChange={(e:any)=>{ const n=[...p.episodes]; n[idx].date=e.target.value; setField('episodes', n); }}/></FormField>
                                </div>
                                <FormField label="متن جلسه (مطالعه)"><div className="flex gap-2 items-start"><TextArea placeholder="متن مطالعه..." value={ep.fullText || ''} onChange={(e:any)=>{ const n=[...p.episodes]; n[idx].fullText=e.target.value; setField('episodes', n); }} /><div className="flex flex-col gap-2"><WordToHtmlButton onConverted={(html:string)=>{ const n=[...p.episodes]; n[idx].fullText=html; setField('episodes', n); }} /><SmartEditButton text={ep.fullText || ''} onEdited={(newText) => { const n=[...p.episodes]; n[idx].fullText=newText; setField('episodes', n); }} /></div></div></FormField>
                                <button onClick={()=>{const n=[...p.episodes]; n.splice(idx,1); setField('episodes', n);}} className="bg-red-500 text-white text-[9px] font-black w-full text-center py-2 rounded-lg transition-opacity">حذف این جلسه</button>
                            </div>
                        ))}
                        <button onClick={()=>{ const n=[...p.episodes, {title: `جلسه ${p.episodes.length+1}`, duration:'0', audioUrl:'', date:'۱۴۰۳/۰۱/۰۱', isNew:true, viewCount:0}]; setField('episodes', n); }} className="w-full py-4 border-2 border-dashed border-primary/20 text-primary rounded-[2rem] font-black text-xs bg-primary/5 active:scale-95 transition-all shadow-sm">+ افزودن جلسه جدید</button>
                    </div>
                </div>
            );
        }
        return (
            <div className="p-4 space-y-4">
                <button onClick={()=>{ const id = Date.now(); const n: Podcast = { id, title: '', description: '', cover: '', speakerId: localData.authors[0]?.id || 1, duration: '0', episodes: [], year: 1403, categories: ["پادکست"] }; updateTable('podcasts', [n, ...localData.podcasts]); setEditingItem({ type: 'Podcast', id }); }} className="w-full py-4 bg-primary text-white rounded-[2rem] font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95">+ ایجاد مجموعه صوتی جدید</button>
                <div className="space-y-2 bg-white p-3 rounded-[2rem] border shadow-sm">
                    <div className="relative"><TextInput placeholder="جستجو..." value={podcastSearch} onChange={(e:any)=>setPodcastSearch(e.target.value)} /><i className="fas fa-search absolute left-3 top-3.5 text-gray-300"></i></div>
                    <div className="flex gap-2">
                        <select className="flex-1 bg-gray-50 border-none rounded-xl px-3 h-10 text-[10px] font-black text-gray-500 outline-none" value={podcastSort} onChange={(e:any)=>setPodcastSort(e.target.value as any)}><option value="newest">جدیدترین</option><option value="year">سال برگزاری</option><option value="master">نام استاد</option></select>
                        <select className="flex-1 bg-gray-50 border-none rounded-xl px-3 h-10 text-[10px] font-black text-gray-500 outline-none" value={selectedMasterFilter} onChange={(e:any)=>setSelectedMasterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}><option value="all">همه اساتید</option>{localData.authors.map((a:any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                    </div>
                </div>
                <div className="space-y-2">
                    {sortedPodcasts.map((p: any) => (
                        <div key={p.id} className="bg-white p-3 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-primary transition-all">
                            <div className="flex items-center gap-3"><img src={p.cover || 'https://via.placeholder.com/80'} className="w-11 h-11 rounded-xl object-cover shadow-sm"/><div><p className="font-black text-[11px] text-gray-700">{p.title || 'بی‌عنوان'}</p><p className="text-[9px] text-gray-400 font-bold">{toPersianDigits(p.year)} • {toPersianDigits(p.episodes.length)} جلسه</p></div></div>
                            <div className="flex items-center gap-2">
                                <button onClick={async () => { const { shareToMahfel } = await import('../services/api'); const ok = await shareToMahfel('podcast', p.id); if (ok) showAdminToast('در محفل شیر شد!', 'success'); }} className="text-green-500 font-black text-[9px] bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors whitespace-nowrap"><i className="fas fa-share-alt ml-1"></i>محفل</button>
                                <button onClick={() => setEditingItem({ type: 'Podcast', id: p.id })} className="bg-blue-50 text-blue-600 px-5 py-2 rounded-xl text-[10px] font-black transition-colors hover:bg-blue-100">ویرایش</button>
                                <button onClick={() => handleDelete('podcasts', p.id)} className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[10px]"></i></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderLibraryPanel = () => {
        if (editingItem?.type === 'Author') {
            const a = localData.authors.find((x: any) => x.id === editingItem.id);
            if (!a) return null;
            const setField = (f: keyof Author, v: any) => updateTable('authors', localData.authors.map((i: any) => i.id === a.id ? { ...i, [f]: v } : i));
            return (
                <div className="p-4 space-y-4 animate-fadeIn pb-40">
                    <button onClick={() => setEditingItem(null)} className="text-orange-600 font-black text-[10px]">&larr; بازگشت</button>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                        <FormField label="نام استاد/دبیر"><TextInput value={a.name} onChange={(e:any)=>setField('name', e.target.value)} /></FormField>
                        <FormField label="نقش"><select className="w-full bg-white border border-gray-200 rounded-xl h-11 px-2 text-[11px] font-black outline-none shadow-sm" value={a.role} onChange={(e:any)=>setField('role', e.target.value)}><option value="master">استاد (مولف)</option><option value="secretary">دبیر (ارائه‌دهنده)</option></select></FormField>
                        <FormField label="تصویر آواتار"><div className="flex gap-2"><TextInput value={a.avatar} onChange={(e:any)=>setField('avatar', e.target.value)} /><UploadButton onUpload={(url:string)=>setField('avatar', url)} /></div></FormField>
                        <TextArea label="بایوگرافی" value={a.bio} onChange={(e:any)=>setField('bio', e.target.value)} />
                    </div>
                </div>
            );
        }
        if (editingItem?.type === 'Book') {
            const b = localData.books.find((x: any) => x.id === editingItem.id);
            if (!b) return null;
            const setField = (f: keyof Book, v: any) => updateTable('books', localData.books.map((i: any) => i.id === b.id ? { ...i, [f]: v } : i));
            return (
                <div className="p-4 space-y-4 animate-fadeIn pb-40">
                    <button onClick={() => setEditingItem(null)} className="text-orange-600 font-black text-[10px]">&larr; بازگشت</button>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                        <FormField label="عنوان کتاب"><TextInput value={b.title} onChange={(e:any)=>setField('title', e.target.value)} /></FormField>
                        <FormField label="انتخاب استاد (مولف)"><select className="w-full bg-white border border-gray-200 rounded-xl h-11 px-2 text-[11px] font-black outline-none shadow-sm" value={b.authorId} onChange={(e:any)=>setField('authorId', Number(e.target.value))}>{localData.authors.filter((a:any)=>a.role === 'master').map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></FormField>
                        <FormField label="کاور کتاب"><div className="flex gap-2"><TextInput value={b.cover} onChange={(e:any)=>setField('cover', e.target.value)} /><UploadButton onUpload={(url:string)=>setField('cover', url)} /></div></FormField>
                        <div className="pt-4 border-t">
                            <p className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">صوت‌های متصل شده</p>
                            <div className="space-y-1 mb-3">{b.relatedEpisodes?.map((re:any, i:number)=>(<div key={i} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100"><span className="text-[9px] font-bold text-gray-600">صوت شماره {toPersianDigits(i+1)}</span><button onClick={()=>{const n=[...b.relatedEpisodes]; n.splice(i,1); setField('relatedEpisodes', n);}} className="text-red-400 text-xs p-1 hover:text-red-600"><i className="fas fa-times-circle"></i></button></div>))}</div>
                            <button onClick={()=>setPickerConfig({ podcasts: localData.podcasts, onSelect: (ep:any)=>{ const n=[...(b.relatedEpisodes||[]), {podcastId: ep.podcastId, episodeIndex: ep.episodeIndex}]; setField('relatedEpisodes', n); } })} className="w-full py-3 bg-orange-50 text-orange-600 rounded-2xl text-[10px] font-black border-2 border-dashed border-orange-100 hover:bg-orange-100 transition-colors shadow-sm">+ اتصال صوت جدید</button>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="p-4 space-y-6 pb-40">
                <div className="flex p-1 bg-gray-100 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
                    {[{ id: 'podcasts', label: 'صوت‌ها', icon: 'fa-podcast' }, { id: 'books', label: 'کتاب‌ها', icon: 'fa-book' }].map(sub => (
                        <button key={sub.id} onClick={() => setLibrarySubTab(sub.id as any)} className={`flex-shrink-0 flex flex-col items-center justify-center p-2.5 rounded-xl text-[9px] font-black transition-all ${librarySubTab === sub.id ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 grayscale opacity-60'}`}><i className={`fas ${sub.icon} text-sm mb-1`}></i><span>{sub.label}</span></button>
                    ))}
                </div>

                {librarySubTab === 'podcasts' && (<section className="animate-fadeIn"><div className="flex justify-between items-center mb-4"><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">مجموعه‌های صوتی ذخیره شده</h3><span className="text-[9px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full">{toPersianDigits(localData.podcasts.length)} مجموعه</span></div><div className="space-y-2">{localData.podcasts.map((p: any) => (<div key={p.id} className="bg-white p-3 rounded-2xl border shadow-sm flex items-center gap-3 group hover:border-primary transition-all"><img src={p.cover || 'https://via.placeholder.com/80'} className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-[11px] font-black text-gray-800 truncate">{p.title || 'بی‌عنوان'}</p><p className="text-[9px] text-gray-400 font-bold mt-0.5">{toPersianDigits(p.episodes?.length || 0)} جلسه • {p.year ? toPersianDigits(p.year) : ''}</p><div className="flex flex-wrap gap-1 mt-1">{p.episodes?.slice(0, 3).map((ep: any, i: number) => (<span key={i} className="text-[7px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-full">{ep.title}</span>))}{(p.episodes?.length || 0) > 3 && <span className="text-[7px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-full">+{toPersianDigits(p.episodes.length - 3)}</span>}</div></div><div className="flex items-center gap-1 flex-shrink-0"><button onClick={() => setEditingItem({ type: 'Podcast', id: p.id })} className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"><i className="fas fa-pen text-[9px]"></i></button><button onClick={() => handleDelete('podcasts', p.id)} className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[9px]"></i></button></div></div>))}</div></section>)}

                

                {librarySubTab === 'books' && (<section className="animate-fadeIn"><div className="flex justify-between items-center mb-4"><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">لیست کتاب‌ها</h3><button onClick={()=>{ const id = Date.now(); const n: Book = { id, title: '', authorId: localData.authors.find((a:any)=>a.role==='master')?.id || 1, cover: '', relatedEpisodes: [], categories: ["فلسفه"] }; updateTable('books', [n, ...localData.books]); setEditingItem({ type: 'Book', id }); }} className="text-[9px] font-black text-orange-600 bg-orange-50 px-4 py-1.5 rounded-full">+ کتاب جدید</button></div><div className="space-y-2">{localData.books.map((bk: any) => (<div key={bk.id} className="bg-white p-3 rounded-2xl border flex justify-between items-center shadow-sm hover:border-orange-200 transition-all group"><div className="flex items-center gap-4"><img src={bk.cover || 'https://via.placeholder.com/80'} className="w-9 h-12 rounded-lg object-cover shadow-sm" /><p className="text-[10px] font-black text-gray-800">{bk.title}</p></div><div className="flex items-center gap-2"><button onClick={() => setEditingItem({ type: 'Book', id: bk.id })} className="bg-orange-50 text-orange-600 px-5 py-2 rounded-xl text-[10px] font-black hover:bg-orange-100 transition-colors">ویرایش</button><button onClick={() => handleDelete('books', bk.id)} className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[10px]"></i></button></div></div>))}</div></section>)}
            </div>
        );
    };

    const renderNashrPanel = () => {
        if (editingItem?.type === 'PublishedBook') {
            const b = localData.publishedBooks.find((x: any) => x.id === editingItem.id);
            if (!b) return null;
            const setField = (f: keyof PublishedBook, v: any) => updateTable('publishedBooks', localData.publishedBooks.map((i: any) => i.id === b.id ? { ...i, [f]: v } : i));
            return (
                <div className="p-4 space-y-4 animate-fadeIn pb-40">
                    <button onClick={() => setEditingItem(null)} className="text-blue-600 font-black text-[10px]">&larr; بازگشت</button>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                        <FormField label="نوع اثر"><select className="w-full bg-white border border-gray-200 rounded-xl h-11 px-2 text-[11px] font-black outline-none shadow-sm" value={b.type || 'book'} onChange={(e:any)=>setField('type', e.target.value)}><option value="book">کتاب</option><option value="note">یادداشت</option></select></FormField>
                        <FormField label="عنوان"><TextInput value={b.title} onChange={(e:any)=>setField('title', e.target.value)} /></FormField>
                        <FormField label="زیرعنوان"><TextInput value={b.subtitle} onChange={(e:any)=>setField('subtitle', e.target.value)} /></FormField>
                        {b.type !== 'note' && <FormField label="کاور اثر"><div className="flex gap-2"><TextInput value={b.cover} onChange={(e:any)=>setField('cover', e.target.value)} /><UploadButton onUpload={(url:string)=>setField('cover', url)} /></div></FormField>}
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="قیمت (تومان)"><TextInput value={b.price} onChange={(e:any)=>setField('price', e.target.value)} /></FormField>
                            <FormField label="لینک فایل PDF"><div className="flex gap-2"><TextInput value={b.pdfUrl} onChange={(e:any)=>setField('pdfUrl', e.target.value)} /><UploadButton accept=".pdf" icon="fa-file-pdf" onUpload={(url:string)=>setField('pdfUrl', url)} /></div></FormField>
                        </div>
                        <FormField label="فهرست مطالب"><TextArea value={b.tableOfContents} onChange={(e:any)=>setField('tableOfContents', e.target.value)} rows={4} /></FormField>
                        <FormField label="درباره کتاب (متن کوتاه ۲-۳ خط)"><TextArea value={b.description || ''} onChange={(e:any)=>setField('description', e.target.value)} rows={2} /></FormField>
                        <FormField label="مقدمه / متن محصول"><div className="flex gap-2"><TextArea value={b.contentHtml || ''} onChange={(e:any)=>setField('contentHtml', e.target.value)} /><WordToHtmlButton onConverted={(html:string)=>setField('contentHtml', html)} /></div></FormField>
                    </div>
                </div>
            );
        }
        return (
            <div className="p-4 space-y-4 pb-40">
                <button onClick={()=>{ const id = Date.now(); const n: PublishedBook = { id, title: '', subtitle: '', description: '', authorName: 'نشر سرای هنر و اندیشه', cover: '', price: '۰', type: 'book', relatedAudioIds: [] }; updateTable('publishedBooks', [n, ...localData.publishedBooks]); setEditingItem({ type: 'PublishedBook', id }); }} className="w-full py-4 bg-blue-600 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-blue-100 active:scale-95 transition-all">+ محصول جدید در نشر</button>
                {localData.publishedBooks.map((b: any) => (
                    <div key={b.id} className="bg-white p-3 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-3"><img src={b.cover || 'https://via.placeholder.com/100'} className="w-10 h-14 rounded-lg object-cover shadow-sm" /><p className="font-black text-[11px] text-gray-800">{b.title || 'بی‌عنوان'}</p></div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setReadingBook(b)} className="bg-blue-600 text-white w-8 h-8 rounded-xl hover:bg-blue-700 shadow-md transition-all flex items-center justify-center active:scale-95" title="باز کردن با پلیر کتاب"><i className="fas fa-book-open text-[10px]"></i></button>
                            <button onClick={async () => { const { shareToMahfel } = await import('../services/api'); const ok = await shareToMahfel('book', b.id); if (ok) showAdminToast('در محفل شیر شد!', 'success'); }} className="text-green-500 font-black text-[9px] bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors whitespace-nowrap"><i className="fas fa-share-alt ml-1"></i>محفل</button>
                            <button onClick={() => setEditingItem({ type: 'PublishedBook', id: b.id })} className="bg-blue-50 text-blue-600 px-5 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-colors">ویرایش</button>
                            <button onClick={() => handleDelete('publishedBooks', b.id)} className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[10px]"></i></button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderVideoPanel = () => {
        if (editingItem?.type === 'Video') {
            const v = localData.videos.find((x: any) => x.id === editingItem.id);
            if (!v) return null;
            const setField = (f: keyof Video, val: any) => updateTable('videos', localData.videos.map((i: any) => i.id === v.id ? { ...i, [f]: val } : i));
            return (
                <div className="p-4 space-y-4 animate-fadeIn pb-40">
                    <button onClick={() => setEditingItem(null)} className="text-secondary font-black text-[10px]">&larr; بازگشت</button>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                        <FormField label="عنوان ویدیو"><TextInput value={v.title} onChange={(e:any)=>setField('title', e.target.value)} /></FormField>
                        <FormField label="کاور ویدیو"><div className="flex gap-2"><TextInput value={v.thumbnailUrl} onChange={(e:any)=>setField('thumbnailUrl', e.target.value)} /><UploadButton onUpload={(url:string)=>setField('thumbnailUrl', url)} /></div></FormField>
                        <FormField label="شناسه امبد (Aparat UID)"><TextInput value={v.embedId} onChange={(e:any)=>setField('embedId', e.target.value)} /></FormField>
                        <TextArea label="توضیحات" value={v.description} onChange={(e:any)=>setField('description', e.target.value)} />
                    </div>
                </div>
            );
        }
        return (
            <div className="p-4 space-y-4 pb-40">
                <div className="flex p-1 bg-gray-100 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
                    {[{ id: 'videos' as const, label: 'ویدیوها', icon: 'fa-video' }, { id: 'playlists' as const, label: 'پلی‌لیست‌ها', icon: 'fa-list-ul' }].map(sub => (
                        <button key={sub.id} onClick={() => setVideoSubTab(sub.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black transition-all ${videoSubTab === sub.id ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400'}`}><i className={`fas ${sub.icon} text-[10px]`}></i>{sub.label}</button>
                    ))}
                </div>
                {videoSubTab === 'playlists' ? (
                    renderPlaylistsContent()
                ) : (
                    <>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-secondary/5 p-4 rounded-[2.5rem] border border-secondary/10 flex gap-2 shadow-inner">
                                <TextInput placeholder="لینک آپارات..." value={aparatUrl} onChange={(e: any) => setAparatUrl(e.target.value)} />
                                <button onClick={async () => {
                                    const id = extractAparatId(aparatUrl); if (!id) return showAdminToast("لینک نامعتبر", "error");
                                    try { const { details } = await fetchAparatVideoDetails(id); const nv: Video = { id: details.uid, embedId: details.uid, title: details.title, description: details.description, thumbnailUrl: details.big_poster, viewCount: details.visit_cnt, uploadDate: details.sdate, duration: details.duration, categories: ["ویدیو"] }; updateTable('videos', [nv, ...localData.videos]); setAparatUrl(''); setEditingItem({ type: 'Video', id: nv.id }); } catch { showAdminToast("خطا در دریافت ویدیو", "error"); }
                                }} className="bg-secondary text-white px-6 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all">دریافت</button>
                            </div>
                            <button onClick={() => { const id = String(Date.now()); const nv: Video = { id, title: '', description: '', thumbnailUrl: '', embedId: '', viewCount: 0, uploadDate: '', duration: 0, categories: ["ویدیو"] }; updateTable('videos', [nv, ...localData.videos]); setEditingItem({ type: 'Video', id }); }} className="bg-gray-100 text-gray-600 px-4 rounded-2xl font-black text-[10px] transition-all hover:bg-gray-200 active:scale-95 shadow-sm flex items-center gap-1"><i className="fas fa-plus"></i> جدید</button>
                        </div>
                        {localData.videos.map((v: any) => (
                            <div key={v.id} className="bg-white p-2 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-secondary transition-all">
                                <div className="flex items-center gap-3"><img src={v.thumbnailUrl || 'https://via.placeholder.com/120x68?text=Video'} className="w-16 h-10 rounded-lg object-cover shadow-sm"/><p className="text-[10px] font-black text-gray-700 truncate max-w-[150px]">{v.title}</p></div>
                                <div className="flex items-center gap-2">
                                    <button onClick={async () => { const { shareToMahfel } = await import('../services/api'); const ok = await shareToMahfel('video', v.id); if (ok) showAdminToast('در محفل شیر شد!', 'success'); }} className="text-green-500 font-black text-[9px] bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors whitespace-nowrap"><i className="fas fa-share-alt ml-1"></i>محفل</button>
                                    <button onClick={() => setEditingItem({ type: 'Video', id: v.id })} className="text-blue-500 font-black text-[9px] bg-blue-50 px-5 py-2 rounded-xl hover:bg-blue-100 transition-colors">ویرایش</button>
                                    <button onClick={() => handleDelete('videos', v.id)} className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[10px]"></i></button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        );
    };

    const loadAdminPlaylists = useCallback(async () => {
        const list = await getAdminVideoPlaylists();
        if (list) setAdminPlaylists(list);
    }, []);

    useEffect(() => { loadAdminPlaylists(); }, [loadAdminPlaylists]);

    const savePlaylist = async () => {
        if (!editingPlaylist) return;
        setPlaylistSaving(true);
        try {
            const payload: any = {
                name: editingPlaylist.name,
                slug: editingPlaylist.slug || undefined,
                description: editingPlaylist.description || '',
                cover: editingPlaylist.cover || '',
                videoIds: editingPlaylist.videoIds || [],
                order: Number(editingPlaylist.order) || 0,
                visible: editingPlaylist.visible !== false,
                autoFill: editingPlaylist.autoFill === true,
            };
            let res;
            if (editingPlaylist.isNew) {
                res = await createVideoPlaylist({ ...payload, autoFill: undefined });
            } else {
                res = await updateVideoPlaylist(editingPlaylist.id, payload);
            }
            if (res) {
                showAdminToast('پلی‌لیست ذخیره شد!', 'success');
                setEditingPlaylist(null);
                loadAdminPlaylists();
            } else {
                showAdminToast('خطا در ذخیره پلی‌لیست', 'error');
            }
        } finally {
            setPlaylistSaving(false);
        }
    };

    const movePlaylist = async (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= adminPlaylists.length) return;
        const a = adminPlaylists[index];
        const b = adminPlaylists[target];
        const okA = await updateVideoPlaylist(a.id, { order: b.order, autoFill: false });
        const okB = await updateVideoPlaylist(b.id, { order: a.order, autoFill: false });
        if (okA && okB) loadAdminPlaylists();
    };

    const renderPlaylistsContent = () => {
        if (editingPlaylist) {
            const p = editingPlaylist;
            const setEdit = (f: string, v: any) => setEditingPlaylist((prev: any) => ({ ...prev, [f]: v }));
            return (
                <div className="space-y-4 animate-fadeIn">
                    <button onClick={() => setEditingPlaylist(null)} className="text-secondary font-black text-[10px]">&larr; بازگشت</button>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-gray-700 flex items-center gap-2"><i className="fas fa-list-ul text-pink-500"></i>{p.isNew ? 'ایجاد پلی‌لیست جدید' : 'ویرایش پلی‌لیست'} <span className="text-[9px] text-gray-400 font-bold">({toPersianDigits(p.videoIds?.length || 0)} ویدیو)</span></h3>
                        <FormField label="نام پلی‌لیست"><TextInput value={p.name || ''} placeholder="مثلا: ضیافتح" onChange={(e: any) => setEdit('name', e.target.value)} /></FormField>
                        <FormField label="توضیحات"><TextArea value={p.description || ''} onChange={(e: any) => setEdit('description', e.target.value)} rows={2} /></FormField>
                        <FormField label="کاور (اختیاری — در صورت خالی بودن کاور پیش‌فرض نمایش داده می‌شود)"><div className="flex gap-2"><TextInput value={p.cover || ''} onChange={(e: any) => setEdit('cover', e.target.value)} /><UploadButton onUpload={(url: string) => setEdit('cover', url)} /></div>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="relative w-20 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                                    {p.cover ? <img src={p.cover} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-list-ul text-white text-xs"></i></div>}
                                </div>
                                <span className="text-[9px] font-bold text-gray-400">پیش‌نمایش کاور — با آپلود عکس جدید بلافاصله به‌روز می‌شود</span>
                            </div>
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="ترتیب (order)"><TextInput type="number" value={p.order ?? 0} onChange={(e: any) => setEdit('order', Number(e.target.value))} /></FormField>
                            <FormField label="وضعیت">
                                <select className="w-full bg-white border border-gray-200 rounded-xl h-11 px-3 text-xs text-gray-700 outline-none shadow-sm" value={p.visible === false ? 'hidden' : 'visible'} onChange={(e: any) => setEdit('visible', e.target.value !== 'hidden')}>
                                    <option value="visible">نمایش داده شود</option>
                                    <option value="hidden">مخفی</option>
                                </select>
                            </FormField>
                        </div>
                        <FormField label="اعمال خودکار ویدیوها بر اساس نام (با کلیدواژه)">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={p.autoFill !== false} onChange={(e: any) => setEdit('autoFill', e.target.checked)} className="w-4 h-4 accent-pink-500" />
                                <span className="text-[10px] font-bold text-gray-500">ویدیوهایی که عنوانشان شامل نام پلی‌لیست است به‌صورت خودکار افزوده شوند</span>
                            </label>
                        </FormField>
                        <div className="flex gap-2 pt-2">
                            <button onClick={savePlaylist} disabled={playlistSaving} className="flex-1 py-3.5 bg-pink-500 text-white rounded-2xl text-[10px] font-black shadow-xl shadow-pink-200 active:scale-95 transition-all disabled:opacity-50">
                                {playlistSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save ml-1"></i>} ذخیره پلی‌لیست
                            </button>
                            <button onClick={() => setEditingPlaylist(null)} className="px-6 py-3.5 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black hover:bg-gray-100 transition-all">انصراف</button>
                        </div>
                    </div>
                </div>
            );
        }
        const filtered = playlistSearch.trim() ? adminPlaylists.filter((pl: any) => String(pl.name || '').includes(playlistSearch.trim())) : adminPlaylists;
        return (
            <div className="space-y-4">
                <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-pink-500/5 p-2 rounded-[2rem] border border-pink-500/10 flex gap-2 shadow-inner">
                        <TextInput placeholder="جستجوی پلی‌لیست..." value={playlistSearch} onChange={(e: any) => setPlaylistSearch(e.target.value)} />
                    </div>
                    <button onClick={() => setEditingPlaylist({ name: '', description: '', cover: '', videoIds: [], order: adminPlaylists.length, visible: true, autoFill: true, isNew: true })} className="bg-pink-500 text-white px-5 py-3 rounded-2xl font-black text-[10px] shadow-lg shadow-pink-200 active:scale-95 transition-all flex items-center gap-1.5"><i className="fas fa-plus"></i> پلی‌لیست جدید</button>
                </div>
                <div className="flex items-center justify-between px-1">
                    <p className="text-[9px] font-black text-gray-400"><i className="fas fa-list-ul text-pink-400 ml-1"></i>{toPersianDigits(adminPlaylists.length)} پلی‌لیست</p>
                    <p className="text-[8px] text-gray-300">برای جابه‌جایی از فلش‌های کنار هر ردیف استفاده کنید</p>
                </div>
                {adminPlaylists.map((pl: any, i: number) => (
                    <div key={pl.id} className="bg-white p-2 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-pink-300 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="relative w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                                {pl.cover ? <img src={pl.cover} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-list-ul text-white text-xs"></i></div>}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-700 truncate max-w-[160px]">{pl.name || 'بی‌نام'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[8px] font-black text-gray-400">{toPersianDigits(pl.count)} ویدیو</span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${pl.visible === false ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-500'}`}>{pl.visible === false ? 'مخفی' : 'نمایش'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="flex flex-col mr-1">
                                <button onClick={() => movePlaylist(i, -1)} disabled={i === 0} className="w-6 h-5 rounded-md bg-gray-50 text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-[8px]"><i className="fas fa-chevron-up"></i></button>
                                <button onClick={() => movePlaylist(i, 1)} disabled={i === adminPlaylists.length - 1} className="w-6 h-5 rounded-md bg-gray-50 text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-[8px]"><i className="fas fa-chevron-down"></i></button>
                            </div>
                            <button onClick={() => setEditingPlaylist({ ...pl, autoFill: true })} className="text-blue-500 font-black text-[9px] bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">ویرایش</button>
                            <button onClick={() => showConfirmToast('آیا از حذف این پلی‌لیست اطمینان دارید؟', async () => { const ok = await deleteVideoPlaylist(pl.id); if (ok) { showAdminToast('پلی‌لیست حذف شد', 'success'); loadAdminPlaylists(); } })} className="w-8 h-8 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all flex items-center justify-center"><i className="fas fa-trash text-[10px]"></i></button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderAnalytics = () => {
        const seg = segments || {};
        const audio = seg.audio || {};
        const video = seg.video || {};
        const community = seg.community || {};
        const segPeriodLabel = analyticsPeriod === '7d' ? '۷ روز' : analyticsPeriod === '30d' ? '۳۰ روز' : '۹۰ روز';
        const segTabs = [
            { id: 'audio', label: 'آمار صوتی', icon: 'fa-microphone-alt', color: '#10b981' },
            { id: 'video', label: 'آمار ویدیو', icon: 'fa-video', color: '#2e86c1' },
            { id: 'community', label: 'آمار محفل', icon: 'fa-users', color: '#f97316' },
            { id: 'sales', label: 'آمار فروش', icon: 'fa-chart-line', color: '#8b5cf6' },
        ] as const;
        const segSummary = (tab: 'audio' | 'video' | 'community' | 'sales') => {
            if (tab === 'audio') return (
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                        <p className="text-lg font-black text-emerald-600">{toPersianDigits(audio.plays || 0)}</p>
                        <p className="text-[8px] font-black text-emerald-400">کل پخش صوتی</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                        <p className="text-lg font-black text-green-600">{toPersianDigits(audio.likes || 0)}</p>
                        <p className="text-[8px] font-black text-green-400">لایک پادکست‌ها</p>
                    </div>
                </div>
            );
            if (tab === 'video') return (
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                        <p className="text-lg font-black text-blue-600">{toPersianDigits(video.views || 0)}</p>
                        <p className="text-[8px] font-black text-blue-400">کل بازدید ویدیو</p>
                    </div>
                    <div className="text-center p-3 bg-sky-50 rounded-xl">
                        <p className="text-lg font-black text-sky-600">{toPersianDigits(video.likes || 0)}</p>
                        <p className="text-[8px] font-black text-sky-400">لایک ویدیوها</p>
                    </div>
                </div>
            );
            if (tab === 'sales') return (
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-violet-50 rounded-xl">
                        <p className="text-lg font-black text-violet-600"><i className="fas fa-bag-shopping text-sm"></i></p>
                        <p className="text-[8px] font-black text-violet-400">فروش تایید شده و سود خالص</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl">
                        <p className="text-lg font-black text-purple-600"><i className="fas fa-chart-line text-sm"></i></p>
                        <p className="text-[8px] font-black text-purple-400">پرفروش‌ترین کتاب‌ها</p>
                    </div>
                </div>
            );
            return (
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                        <p className="text-lg font-black text-orange-600">{toPersianDigits(community.newUsers || 0)}</p>
                        <p className="text-[8px] font-black text-orange-400">کاربر جدید</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl">
                        <p className="text-lg font-black text-purple-600">{toPersianDigits(community.newPosts || 0)}</p>
                        <p className="text-[8px] font-black text-purple-400">پست جدید</p>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-xl">
                        <p className="text-lg font-black text-teal-600">{toPersianDigits(community.newComments || 0)}</p>
                        <p className="text-[8px] font-black text-teal-400">نظر جدید</p>
                    </div>
                </div>
            );
        };
        return (
        <div className="p-4 space-y-6 animate-fadeIn">
            <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">آمار و تحلیل دقیق</h3>
                    <div className="flex gap-2">
                        {['7d', '30d', '90d'].map(p => (
                            <button key={p} onClick={() => { setAnalyticsPeriod(p); }}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${analyticsPeriod === p ? 'bg-purple-500 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                {p === '7d' ? '۷ روز' : p === '30d' ? '۳۰ روز' : '۹۰ روز'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2 mb-4">
                    {segTabs.map(t => (
                        <button key={t.id} onClick={() => setAnalyticsTab(t.id)}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black transition-all flex-1 ${analyticsTab === t.id ? 'text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                            style={analyticsTab === t.id ? { background: t.color } : undefined}>
                            <i className={`fas ${t.icon}`}></i>{t.label}
                        </button>
                    ))}
                </div>
                {segSummary(analyticsTab)}
            </div>

            {analyticsTab === 'audio' && (
                <>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">روند پخش صوتی روزانه ({segPeriodLabel})</h3>
                        <AreaTrendChart
                            data={(audio.daily || []).map((d: any) => ({ label: (d.date || '').slice(5), value: d.count }))}
                            height={170}
                            color="#10b981"
                            suffix=" پخش"
                            showPoints={(audio.daily || []).length <= 30}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">ساعت‌های اوج پخش صوتی</h3>
                        <AreaTrendChart
                            data={(audio.hours || []).map((h: any) => ({ label: String(h.hour), value: h.count }))}
                            height={130}
                            color="#34d399"
                            suffix=" پخش"
                            showPoints={false}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">محبوب‌ترین پادکست‌ها ({segPeriodLabel})</h3>
                        <RankBars
                            color="#10b981"
                            barColor2="#34d399"
                            valueSuffix="پخش"
                            data={(audio.top || []).slice(0, 5).map((p: any) => ({
                                title: p.title,
                                cover: p.cover,
                                value: p.count,
                                subtitle: p.subtitle,
                            }))}
                        />
                    </div>
                </>
            )}

            {analyticsTab === 'video' && (
                <>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">روند بازدید ویدیو روزانه ({segPeriodLabel})</h3>
                        <AreaTrendChart
                            data={(video.daily || []).map((d: any) => ({ label: (d.date || '').slice(5), value: d.count }))}
                            height={170}
                            color="#2e86c1"
                            suffix=" بازدید"
                            showPoints={(video.daily || []).length <= 30}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">ساعت‌های اوج بازدید ویدیو</h3>
                        <AreaTrendChart
                            data={(video.hours || []).map((h: any) => ({ label: String(h.hour), value: h.count }))}
                            height={130}
                            color="#5dade2"
                            suffix=" بازدید"
                            showPoints={false}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">محبوب‌ترین ویدیوها ({segPeriodLabel})</h3>
                        <RankBars
                            color="#2e86c1"
                            barColor2="#5dade2"
                            valueSuffix="بازدید"
                            data={(video.top || []).slice(0, 5).map((v: any) => ({
                                title: v.title,
                                value: v.count,
                            }))}
                        />
                    </div>
                </>
            )}

            {analyticsTab === 'community' && (
                <>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">روند کاربران جدید ({segPeriodLabel})</h3>
                        <AreaTrendChart
                            data={(community.dailyUsers || []).map((d: any) => ({ label: (d.date || '').slice(5), value: d.count }))}
                            height={150}
                            color="#f97316"
                            suffix=" کاربر"
                            showPoints={(community.dailyUsers || []).length <= 30}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">روند پست‌های جدید ({segPeriodLabel})</h3>
                        <AreaTrendChart
                            data={(community.dailyPosts || []).map((d: any) => ({ label: (d.date || '').slice(5), value: d.count }))}
                            height={150}
                            color="#8b5cf6"
                            suffix=" پست"
                            showPoints={(community.dailyPosts || []).length <= 30}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">نویسندگان برتر</h3>
                        <RankBars
                            color="#f97316"
                            barColor2="#fb923c"
                            valueSuffix="پست"
                            data={(community.topAuthors || []).slice(0, 5).map((a: any) => ({
                                title: a._id,
                                value: a.count,
                                subtitle: `${toPersianDigits(a.totalLikes)} لایک`,
                            }))}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">پست‌های پر بحث</h3>
                        <RankBars
                            color="#8b5cf6"
                            barColor2="#a78bfa"
                            valueSuffix="نظر"
                            data={(community.postsWithMostComments || []).slice(0, 5).map((p: any) => ({
                                title: p.title || (p.text || '').slice(0, 40) || 'بدون عنوان',
                                value: p.commentsCount || 0,
                            }))}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">نظردهندگان برتر</h3>
                        <RankBars
                            color="#0d9488"
                            barColor2="#2dd4bf"
                            valueSuffix="نظر"
                            data={(community.topCommenters || []).slice(0, 5).map((c: any) => ({
                                title: c._id,
                                value: c.count,
                            }))}
                        />
                    </div>
                </>
            )}

            {analyticsTab === 'sales' && (
                <div className="bg-white p-4 rounded-2xl border shadow-sm">
                    <AdminSalesPanel />
                </div>
            )}

            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-brain text-purple-500"></i> تحلیل خودکار هوشمند
                    </h3>
                    {insightsLoading ? <i className="fas fa-spinner fa-spin text-purple-400 text-xs"></i>
                        : <span className="text-[7px] font-black text-purple-400 bg-white/70 px-2 py-0.5 rounded-full">{insights?.usingLLM ? '🎯 هوش مصنوعی' : '⚙️ موتور داده'} • {insights?.cached ? 'کش' : 'بروز'}</span>}
                </div>
                {insights?.summary && (
                    <p className="text-[11px] leading-relaxed font-bold text-gray-700 bg-white/80 rounded-xl p-3 border border-purple-100 mb-3">{insights.summary}</p>
                )}
                <div className="grid gap-2">
                    {(insights?.insights || []).map((ins: any, i: number) => {
                        const st = InsightLevelStyles[ins.level] || InsightLevelStyles.info;
                        return (
                            <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${st.bg}`}>
                                <i className={`fas ${ins.icon} ${st.icon} text-[10px] mt-0.5`}></i>
                                <div className="min-w-0">
                                    <p className={`text-[9px] font-black ${st.text}`}>{ins.title}</p>
                                    <p className="text-[8px] text-gray-500 leading-relaxed mt-0.5">{ins.detail}</p>
                                </div>
                            </div>
                        );
                    })}
                    {(!insights?.insights || insights.insights.length === 0) && (
                        <p className="text-[9px] text-gray-400 text-center py-3">در حال تحلیل داده‌ها…</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">فعالیت اخیر</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activity.map((a: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] ${a.type === 'user_joined' ? 'bg-green-500' : a.type === 'post_created' ? 'bg-orange-500' : 'bg-teal-500'}`}>
                                <i className={`fas ${a.type === 'user_joined' ? 'fa-user-plus' : a.type === 'post_created' ? 'fa-newspaper' : 'fa-comment-dots'}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-gray-700 truncate">
                                    {a.type === 'user_joined' ? `${a.user} عضو شد` : a.type === 'post_created' ? `${a.author} پست گذاشت` : `${a.author} نظر داد`}
                                </p>
                                <p className="text-[8px] text-gray-400 truncate">{a.text || a.contentType || ''}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">خروجی داده‌ها</h3>
                <div className="grid grid-cols-2 gap-2">
                    {[{ type: 'users', label: 'کاربران', icon: 'fa-users', color: 'green' }, { type: 'posts', label: 'پست‌ها', icon: 'fa-newspaper', color: 'orange' }, { type: 'comments', label: 'نظرات', icon: 'fa-comment-dots', color: 'teal' }, { type: 'podcasts', label: 'صوت‌ها', icon: 'fa-podcast', color: 'blue' }, { type: 'videos', label: 'ویدیوها', icon: 'fa-video', color: 'purple' }].map(e => (
                        <button key={e.type} onClick={() => adminExportData(e.type)} className={`flex items-center gap-2 p-3 bg-${e.color}-50 rounded-xl text-${e.color}-600 hover:bg-${e.color}-100 transition-all`}>
                            <i className={`fas ${e.icon} text-sm`}></i>
                            <span className="text-[9px] font-black">{e.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

    const isEditing = editingItem !== null;
    const renderVersionsPanel = () => (
        <div className="p-4 sm:p-6 flex flex-col gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <i className="fas fa-robot text-primary"></i> اعلان نسخه جدید — اندروید (APK)
                </h3>
                <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">
                    کاربران اپ اندروید به‌محض باز کردن اپ، پیشنهاد «دانلود و نصب» نسخه جدید را می‌بینند.
                </p>
                <div className="space-y-3">
                    <FormField label="شماره نسخه جدید (مثال: 1.1.0)">
                        <TextInput dir="ltr" placeholder="1.1.0" value={versionForm.apkVersion || ''} onChange={(e: any) => setVersionForm(f => ({ ...f, apkVersion: e.target.value.trim() }))} />
                    </FormField>
                    <FormField label="پیام به کاربران (اختیاری)">
                        <TextArea rows={2} placeholder="مثلاً: قابلیت درج خودکار کد تایید اضافه شد" value={versionForm.apkMessage || ''} onChange={(e: any) => setVersionForm(f => ({ ...f, apkMessage: e.target.value }))} />
                    </FormField>
                    <FormField label="فایل APK جدید">
                        <div className="flex flex-col gap-2">
                            <input
                                ref={versionFileInputRef}
                                type="file"
                                accept=".apk,application/vnd.android.package-archive,application/octet-stream"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (!file) return;
                                    setVersionUploading(true);
                                    const res = await adminUploadApk(file);
                                    setVersionUploading(false);
                                    if (res.url) {
                                        setVersionForm(f => ({ ...f, apkUrl: res.url || '' }));
                                        setAdminToast({ type: 'success', message: 'فایل APK با موفقیت آپلود شد ✅' });
                                    } else {
                                        setAdminToast({ type: 'error', message: res.error || 'خطا در آپلود فایل' });
                                    }
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => versionFileInputRef.current?.click()}
                                    disabled={versionUploading}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-black transition-all active:scale-95 shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed">
                                    {versionUploading ? <><i className="fas fa-spinner fa-spin"></i> در حال آپلود…</> : <><i className="fas fa-upload"></i> انتخاب فایل APK</>}
                                </button>
                                {versionForm.apkUrl && (
                                    <span className="text-[9px] text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-black truncate max-w-[220px]">{versionForm.apkUrl}</span>
                                )}
                            </div>
                        </div>
                    </FormField>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <i className="fas fa-desktop text-primary"></i> اعلان نسخه جدید — دسکتاپ ویندوز
                </h3>
                <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">
                    هنگام باز شدن اپ دسکتاپ، به کاربر پیشنهاد دانلود نصاب جدید داده می‌شود.
                </p>
                <div className="space-y-3">
                    <FormField label="شماره نسخه جدید (مثال: 1.1.0)">
                        <TextInput dir="ltr" placeholder="1.1.0" value={versionForm.desktopVersion || ''} onChange={(e: any) => setVersionForm(f => ({ ...f, desktopVersion: e.target.value.trim() }))} />
                    </FormField>
                    <FormField label="لینک نصاب جدید (https://...)">
                        <TextInput dir="ltr" placeholder="https://app.soha-sima.ir/downloads/Mahfel-Setup.exe" value={versionForm.desktopUrl || ''} onChange={(e: any) => setVersionForm(f => ({ ...f, desktopUrl: e.target.value.trim() }))} />
                    </FormField>
                    <FormField label="پیام به کاربران (اختیاری)">
                        <TextArea rows={2} placeholder="مثلاً: مشکلات نصب نسخه قبلی برطرف شده است" value={versionForm.desktopMessage || ''} onChange={(e: any) => setVersionForm(f => ({ ...f, desktopMessage: e.target.value }))} />
                    </FormField>
                </div>
            </div>

            <button
                disabled={versionSaving || (!versionForm.apkVersion && !versionForm.desktopVersion)}
                onClick={async () => {
                    setVersionSaving(true);
                    const res = await adminSaveAppUpdate(versionForm);
                    setVersionSaving(false);
                    if (res) {
                        setAdminToast({ type: 'success', message: 'نسخه‌ها با موفقیت ذخیره شد ✅' });
                        loadVersions();
                    } else {
                        setAdminToast({ type: 'error', message: 'خطا در ذخیره نسخه‌ها' });
                    }
                }}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-xs font-black transition-all active:scale-95 shadow-lg ${versionSaving || (!versionForm.apkVersion && !versionForm.desktopVersion) ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:opacity-90'}`}>
                {versionSaving ? <><i className="fas fa-spinner fa-spin"></i> در حال ذخیره…</> : <><i className="fas fa-save"></i> ذخیره و اعلام به کاربران</>}
            </button>
        </div>
    );
    const renderPurchasesPanel = () => (
        <div className="p-4 sm:p-6 flex flex-col gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-money-bill-transfer text-primary"></i> درخواست‌های خرید کتاب مجازی
                </h3>
                <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">
                    کاربران پس از کارت به کارت، اطلاعات پرداخت (تاریخ/ساعت/کد پیگیری) را ثبت می‌کنند. پس از بررسی واریز، درخواست را تایید کنید تا دسترسی کتاب برای کاربر فعال شود. تایید کردن و رفرش خودکار هر ۱۰ ثانیه.
                </p>

                {/* فیلتر وضعیت */}
                <div className="flex gap-2 mb-4 flex-wrap">
                    {[{ v: '', l: 'همه' }, { v: 'pending', l: '⏳ در انتظار' }, { v: 'confirmed', l: '✅ تایید شده' }, { v: 'rejected', l: '❌ رد شده' }].map(f => (
                        <button key={f.v} onClick={() => setPurchaseFilter(f.v)}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-black transition-all active:scale-95 ${purchaseFilter === f.v ? 'text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            style={{ background: purchaseFilter === f.v ? 'var(--primary)' : undefined }}>
                            {f.l}
                        </button>
                    ))}
                    <button onClick={loadPurchaseRequests} className="px-3.5 py-1.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all active:scale-95">
                        <i className={`fas ${purchaseLoading ? 'fa-spinner fa-spin' : 'fa-rotate'} text-[9px] ml-1`} /> رفرش
                    </button>
                </div>

                {purchaseRequests.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-2)', border: '2px dashed var(--border)' }}>
                            <i className="fas fa-receipt text-xl" style={{ color: 'var(--text-3)' }} />
                        </div>
                        <p className="text-[11px] font-black text-gray-400">درخواستی یافت نشد</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {purchaseRequests.map(r => {
                            const pending = r.status === 'pending';
                            return (
                                <div key={r._id} className="rounded-2xl p-4 border transition-all" style={{ background: pending ? 'color-mix(in srgb, #f59e0b 4%, white)' : 'white', borderColor: pending ? 'color-mix(in srgb, #f59e0b 30%, transparent)' : 'var(--border)' }}>
                                    {/* header */}
                                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black ${pending ? 'bg-amber-500' : r.status === 'confirmed' ? 'bg-green-500' : 'bg-red-400'}`}>
                                                <i className={`fas ${pending ? 'fa-hourglass-half' : r.status === 'confirmed' ? 'fa-check' : 'fa-xmark'} text-[11px]`}></i>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-800">{r.userName || 'کاربر'}</p>
                                                <p className="text-[9px] text-gray-400 font-mono" dir="ltr">{r.userPhone}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black ${pending ? 'bg-amber-50 text-amber-600' : r.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                            {pending ? 'در انتظار بررسی' : r.status === 'confirmed' ? 'تایید شده' : 'رد شده'}
                                        </span>
                                    </div>

                                    {/* items */}
                                    <div className="space-y-1.5 mb-3">
                                        {r.items.map((it: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-[10px] font-bold text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
                                                <span className="truncate ml-2">{it.title} <span className="text-gray-400">× {it.quantity}</span></span>
                                                <span className="tabular-nums text-gray-700">{toPersianDigits(it.price || '۰')}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* transfer info */}
                                    <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] font-bold text-gray-700">
                                        <div className="bg-gray-50 rounded-lg px-2.5 py-1.5"><span className="text-gray-400">تاریخ:</span> {toPersianDigits(r.transferDate || '—')}</div>
                                        <div className="bg-gray-50 rounded-lg px-2.5 py-1.5"><span className="text-gray-400">ساعت:</span> {toPersianDigits(r.transferTime || '—')}</div>
                                        <div className="col-span-2 bg-gray-50 rounded-lg px-2.5 py-1.5" dir="ltr"><span className="text-gray-400 ml-2">کد پیگیری:</span> <span className="font-mono">{toPersianDigits(r.trackingCode || '—')}</span></div>
                                    </div>

                                    {/* amount + actions */}
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <span className="text-sm font-black tabular-nums" style={{ color: 'var(--primary)' }}>{toPersianDigits((r.totalPrice || 0).toLocaleString('fa-IR'))} <span className="text-[9px] font-bold text-gray-400">تومان</span></span>
                                        {pending && (
                                            <div className="flex gap-2">
                                                <button onClick={() => showConfirmToast('تایید این خرید؟ پس از تایید دسترسی کتاب برای کاربر فعال می‌شود.', () => reviewPurchase(r._id, 'confirmed'), 'warning')}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black text-white transition-all active:scale-95 bg-green-500 hover:bg-green-600 shadow-md shadow-green-500/25">
                                                    <i className="fas fa-check text-[9px]" /> تایید و فعال‌سازی
                                                </button>
                                                <button onClick={() => showConfirmToast('این درخواست رد شود؟', () => reviewPurchase(r._id, 'rejected'))}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all active:scale-95">
                                                    <i className="fas fa-xmark text-[9px]" /> رد
                                                </button>
                                            </div>
                                        )}
                                        {!pending && r.adminNote && (
                                            <span className="text-[9px] text-gray-400 font-bold">یادداشت: {r.adminNote}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
    const renderNotificationsPanel = () => (
        <div className="p-4 sm:p-6 flex flex-col gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-paper-plane text-primary"></i> ارسال نوتیفیکیشن
                </h3>
                <div className="space-y-3">
                    <FormField label="عنوان">
                        <TextInput placeholder="مثلاً: اپیزود جدید منتشر شد" value={notifTitle} onChange={(e: any) => setNotifTitle(e.target.value)} />
                    </FormField>
                    <FormField label="متن پیام">
                        <TextArea placeholder="متن نوتیفیکیشن…" rows={3} value={notifBody} onChange={(e: any) => setNotifBody(e.target.value)} />
                    </FormField>
                    <FormField label="مخاطب">
                        <select value={notifTarget} onChange={(e) => { setNotifTarget(e.target.value); if (e.target.value !== 'user') { setNotifUserId(''); setNotifUserLabel(''); setNotifUserAvatar(''); setNotifUserSearch(''); setNotifUserResults(null); } }}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm">
                            <option value="all">همه کاربران</option>
                            <option value="users">کاربران عادی</option>
                            <option value="authors">نویسندگان</option>
                            <option value="user">کاربر خاص</option>
                        </select>
                        {notifTarget === 'user' && (
                            <div className="mt-2 flex flex-col gap-2">
                                {notifUserId ? (
                                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {notifUserAvatar ? (
                                                <img src={notifUserAvatar} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0"><i className="fas fa-user text-[9px]"></i></div>
                                            )}
                                            <span className="text-xs font-black text-gray-700 truncate">{notifUserLabel}</span>
                                            <span className="text-[9px] text-primary font-bold flex-shrink-0">کاربر انتخاب شد</span>
                                        </div>
                                        <button onClick={() => { setNotifUserId(''); setNotifUserLabel(''); setNotifUserAvatar(''); setNotifUserSearch(''); setNotifUserResults(null); }}
                                            className="w-6 h-6 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all flex-shrink-0" title="تغییر کاربر">
                                            <i className="fas fa-times text-[10px]"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <TextInput placeholder="جستجوی نام کاربر…" value={notifUserSearch} onChange={(e: any) => setNotifUserSearch(e.target.value)} />
                                        {notifUsersLoading && <p className="text-[10px] text-gray-400"><i className="fas fa-spinner fa-spin"></i> در حال جستجو…</p>}
                                        {!notifUsersLoading && notifUserResults && notifUserResults.length === 0 && (
                                            <p className="text-[10px] text-gray-400">کاربری یافت نشد</p>
                                        )}
                                        {notifUserResults && notifUserResults.length > 0 && (
                                            <div className="max-h-40 overflow-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white shadow-sm">
                                                {notifUserResults.map((u: any) => (
                                                    <button key={String(u._id)} onClick={() => { setNotifUserId(String(u._id)); setNotifUserLabel(u.name || 'کاربر'); setNotifUserAvatar(u.avatar || ''); setNotifUserSearch(''); setNotifUserResults(null); }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-primary/5 transition-all text-right">
                                                        {u.avatar ? (
                                                            <img src={u.avatar} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0"><i className="fas fa-user text-[9px]"></i></div>
                                                        )}
                                                        <span className="font-bold truncate">{u.name || 'کاربر'}</span>
                                                        <span className="text-[9px] text-gray-400 ml-auto flex-shrink-0">{u.role === 'admin' ? 'مدیر' : u.role === 'author' ? 'نویسنده' : 'کاربر'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </FormField>
                    <FormField label="انتخاب مورد (اختیاری — با کلیک روی نوتیفیکیشن به آن هدایت می‌شود)">
                        <div className="flex flex-col gap-2">
                            <select value={notifItemType} onChange={(e) => { setNotifItemType(e.target.value); setNotifItemId(''); setNotifLink(''); }}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm">
                                <option value="">بدون مورد (فقط پیام)</option>
                                <option value="video">🎬 ویدیو</option>
                                <option value="podcast">🎧 پلی‌لیست صوت</option>
                                <option value="book">📚 کتاب</option>
                                <option value="note">📝 یادداشت</option>
                                <option value="post">💬 پیام محفل</option>
                            </select>
                            {notifItemType && (
                                <select value={notifItemId} onChange={(e) => applyNotifItem(notifItemType, e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm">
                                    <option value="">— انتخاب کنید —</option>
                                    {(notifItemType === 'book' || notifItemType === 'note'
                                        ? localData.publishedBooks.filter((b: any) => notifItemType === 'note' ? b.type === 'note' : b.type === 'book')
                                        : notifItemType === 'video' ? localData.videos
                                        : notifItemType === 'podcast' ? localData.podcasts
                                        : localData.posts).map((x: any) => (
                                            <option key={String(x._id || x.id)} value={String(x._id || x.id)}>
                                                {String(x.title || x.text || '').slice(0, 60)}
                                            </option>
                                    ))}
                                </select>
                            )}
                            {notifLink && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
                                    <i className="fas fa-link text-[10px] text-primary"></i>
                                    <span className="text-[10px] font-bold text-gray-600 truncate" dir="ltr">{notifLink}</span>
                                </div>
                            )}
                        </div>
                    </FormField>
                    <button
                        disabled={notifSending || !notifTitle.trim() || !notifBody.trim() || (notifTarget === 'user' && !notifUserId)}
                        onClick={async () => {
                            setNotifSending(true);
                            const res = await adminSendNotification(notifTitle, notifBody, notifTarget, notifLink || undefined, undefined, notifTarget === 'user' ? notifUserId : undefined);
                            setNotifSending(false);
                            if (res && (res as any)._id) {
                                setAdminToast({ type: 'success', message: 'نوتیفیکیشن با موفقیت ارسال شد ✅' });
                                setNotifTitle('');
                                setNotifBody('');
                                setNotifItemType('');
                                setNotifItemId('');
                                setNotifLink('');
                                setNotifUserId('');
                                setNotifUserLabel('');
                                setNotifUserAvatar('');
                                setNotifUserSearch('');
                                setNotifUserResults(null);
                                loadNotifications();
                            } else {
                                setAdminToast({ type: 'error', message: 'خطا در ارسال نوتیفیکیشن' });
                            }
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-xs font-black transition-all active:scale-95 shadow-lg ${notifSending || !notifTitle.trim() || !notifBody.trim() || (notifTarget === 'user' && !notifUserId) ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:opacity-90'}`}>
                        {notifSending ? <><i className="fas fa-spinner fa-spin"></i> در حال ارسال…</> : <><i className="fas fa-bell"></i> {notifTarget === 'user' ? 'ارسال برای کاربر خاص' : 'ارسال برای همه'}</>}
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm flex-1 overflow-auto">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-history text-primary"></i> نوتیفیکیشن‌های ارسال‌شده
                </h3>
                {notifList.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-8">هنوز نوتیفیکیشنی ارسال نشده است</p>
                ) : (
                    <div className="space-y-2">
                        {notifList.map((n: any) => (
                            <div key={String(n._id)} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                    <i className="fas fa-bell text-xs"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-black text-gray-700 truncate">{n.title}</p>
                                        <span className="flex items-center gap-1.5 flex-shrink-0">
                                            {n.userId && (
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold">شخصی</span>
                                            )}
                                            <span className="text-[9px] text-gray-400">{n.createdAt ? new Date(n.createdAt).toLocaleDateString('fa-IR') : ''}</span>
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed whitespace-pre-line">{n.body}</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        await adminDeleteNotification(String(n._id));
                                        loadNotifications();
                                    }}
                                    className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all"
                                    title="حذف">
                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
    const renderSupportPanel = () => (
        <div className="p-4 sm:p-6 flex flex-col gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm flex-1 overflow-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-headset text-primary"></i> پیام‌های پشتیبانی ({toPersianDigits(supportTotal)})
                    </h3>
                    <div className="flex gap-1.5">
                        {[['', 'همه'], ['false', 'خوانده‌نشده'], ['true', 'خوانده‌شده']].map(([val, label]) => (
                            <button key={val}
                                onClick={() => { setSupportReadFilter(val as any); loadSupportMessages(1, val as any); }}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${
                                    supportReadFilter === val ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {supportMessages.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-10">پیامی دریافت نشده است</p>
                ) : (
                    <div className="space-y-2">
                        {supportMessages.map((m: any) => (
                            <div key={String(m._id)} className={`p-3 bg-gray-50 rounded-xl border border-gray-100 ${!m.isRead ? 'bg-amber-50/50 border-amber-200/60' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <i className="fas fa-user text-xs"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <p className="text-xs font-black text-gray-700 truncate">{m.name || 'کاربر'}</p>
                                                {!m.isRead && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="خوانده‌نشده"></span>}
                                            </div>
                                            <span className="text-[9px] text-gray-400 flex-shrink-0">{m.createdAt ? new Date(m.createdAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 rounded-md text-[8px] font-black"
                                                style={{ background: m.category === 'bug' ? '#fee2e2' : m.category === 'suggestion' ? '#fef3c7' : m.category === 'question' ? '#dbeafe' : '#d1fae5',
                                                    color: m.category === 'bug' ? '#ef4444' : m.category === 'suggestion' ? '#f59e0b' : m.category === 'question' ? '#3b82f6' : '#10b981' }}>
                                                {m.category === 'bug' ? 'گزارش باگ' : m.category === 'suggestion' ? 'پیشنهاد' : m.category === 'question' ? 'سؤال' : 'سایر'}
                                            </span>
                                            {m.contact && <span className="text-[9px] text-gray-400 truncate" dir="ltr">{m.contact}</span>}
                                        </div>
                                        <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed whitespace-pre-line">{m.message}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 flex-shrink-0">
                                        <button
                                            onClick={async () => {
                                                if (!m.isRead) {
                                                    await markSupportMessageRead(String(m._id));
                                                    loadSupportMessages();
                                                }
                                            }}
                                            disabled={m.isRead}
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${m.isRead ? 'text-gray-300 cursor-default' : 'text-green-500 hover:bg-green-50'}`}
                                            title={m.isRead ? 'خوانده شد' : 'علامت‌گذاری خوانده‌شده'}>
                                            <i className="fas fa-check text-[10px]"></i>
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await deleteSupportMessage(String(m._id));
                                                loadSupportMessages();
                                            }}
                                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all"
                                            title="حذف">
                                            <i className="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {supportTotal > 20 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <button onClick={() => loadSupportMessages(Math.max(1, supportPage - 1))} disabled={supportPage <= 1}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[9px] font-black disabled:opacity-30 transition-all hover:bg-gray-200">
                            قبلی
                        </button>
                        <span className="text-[9px] font-black text-gray-400">صفحه {toPersianDigits(supportPage)} از {toPersianDigits(Math.ceil(supportTotal / 20))}</span>
                        <button onClick={() => loadSupportMessages(supportPage + 1)} disabled={supportPage * 20 >= supportTotal}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[9px] font-black disabled:opacity-30 transition-all hover:bg-gray-200">
                            بعدی
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
    const renderRolesPanel = () => {
        return (
            <div className="p-4 sm:p-6 flex flex-col gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm">
                    <div className="flex gap-1.5 mb-4 flex-wrap">
                        {([
                            ['request', 'درخواست ادمین شدن', 'fa-paper-plane', '#6366f1'],
                            ['requests', 'درخواست‌ها', 'fa-inbox', '#f59e0b'],
                            ['admins', 'ادمین‌ها', 'fa-user-shield', '#10b981'],
                            ['allusers', 'همه کاربران', 'fa-users', '#8b5cf6'],
                            ['rolePerms', 'دسترسی نقش‌ها', 'fa-key', '#dc2626'],
                        ] as const).map(([id, label, icon, color]) => (
                            <button key={id} onClick={() => setRolesTab(id)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 ${rolesTab === id ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                style={rolesTab === id ? { backgroundColor: color } : {}}>
                                <i className={`fas ${icon} text-[8px]`}></i>
                                {label}
                            </button>
                        ))}
                    </div>

                    {rolesTab === 'request' && (
                        <div className="space-y-3">
                            <p className="text-[10px] text-gray-500">درخواست ادمین شدن بدهید. مدیر سیستم دسترسی‌های شما را مشخص می‌کند.</p>
                            {(myRequest?.role === 'superadmin') ? (
                                <div className="bg-red-50 p-3 rounded-xl text-red-700 text-[10px] font-bold flex items-center gap-2">
                                    <i className="fas fa-crown"></i> شما مدیر سیستم هستید
                                </div>
                            ) : myRequest?.role === 'admin' ? (
                                <div className="bg-blue-50 p-3 rounded-xl text-blue-700 text-[10px] font-bold flex items-center gap-2">
                                    <i className="fas fa-shield-alt"></i> شما ادمین هستید
                                </div>
                            ) : myRequest?.pendingRequest ? (
                                <div className="bg-amber-50 p-3 rounded-xl text-amber-700 text-[10px] font-bold flex items-center gap-2">
                                    <i className="fas fa-clock"></i> درخواست شما در انتظار بررسی است
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <textarea value={requestMessage} onChange={e => setRequestMessage(e.target.value)} placeholder="چرا می‌خواهید ادمین شوید؟" className="w-full p-2.5 border rounded-xl text-[10px] focus:ring-2 focus:ring-red-300 outline-none" rows={3} />
                                    <button onClick={handleRequestAdmin} disabled={requestLoading} className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-bold disabled:opacity-50 hover:bg-red-600 transition-all">
                                        {requestLoading ? 'در حال ارسال...' : 'ارسال درخواست'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {rolesTab === 'requests' && (
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 flex items-center gap-2">
                                <i className="fas fa-inbox text-amber-500"></i>
                                درخواست‌های در انتظار ({toPersianDigits(adminRequests.length)})
                            </h3>
                            {adminRequests.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 py-8">درخواستی وجود ندارد</p>
                            ) : adminRequests.map(req => (
                                <div key={req._id} className="bg-gray-50 p-3 rounded-xl border space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-[11px]">{req.userName || 'بدون نام'}</span>
                                        <span className="text-[9px] text-gray-400">{req.userPhone}</span>
                                        <span className="text-[8px] text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">{toPersianDigits(new Date(req.requestedAt).toLocaleDateString('fa-IR'))}</span>
                                    </div>
                                    {req.message && <p className="text-[9px] text-gray-500 bg-white p-2 rounded-lg border">{req.message}</p>}
                                    <div className="flex gap-1.5 flex-wrap items-center">
                                        <button onClick={() => { setApprovingRequest(req._id); setApprovePerms([]); }}
                                            className="px-3 py-1.5 rounded-lg text-[8px] font-bold bg-green-500 text-white hover:bg-green-600 transition-all">
                                            <i className="fas fa-check ml-1"></i> تأیید
                                        </button>
                                        <button onClick={() => handleRejectRequest(req._id)}
                                            className="px-3 py-1.5 rounded-lg text-[8px] font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-all">
                                            <i className="fas fa-times ml-1"></i> رد
                                        </button>
                                    </div>
                                    {approvingRequest === req._id && (
                                        <div className="bg-green-50 p-3 rounded-xl border space-y-2">
                                            <p className="text-[9px] font-bold text-green-700">نقش مورد نظر:</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApproveRequest(req._id, 'admin', approvePerms)}
                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-blue-500 text-white hover:bg-blue-600">ادمین</button>
                                                <button onClick={() => handleApproveRequest(req._id, 'author', [])}
                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-purple-500 text-white hover:bg-purple-600">نویسنده</button>
                                                <button onClick={() => setApprovingRequest(null)}
                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-gray-200 text-gray-600 hover:bg-gray-300">لغو</button>
                                            </div>
                                            {approvePerms !== undefined && (
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {AVAILABLE_PERMISSIONS.map(p => (
                                                        <button key={p.id}
                                                            onClick={() => setApprovePerms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                                                            className={`px-2 py-1 rounded-lg text-[7px] font-bold transition-all ${approvePerms.includes(p.id) ? 'bg-green-500 text-white' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
                                                            {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {rolesTab === 'admins' && (
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 flex items-center gap-2">
                                <i className="fas fa-user-shield text-green-500"></i>
                                ادمین‌ها و نویسندگان ({toPersianDigits(adminList.length)})
                            </h3>
                            {adminList.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 py-8">هنوز ادمین یا نویسنده‌ای وجود ندارد</p>
                            ) : adminList.map(a => (
                                <div key={a._id} className="bg-gray-50 p-3 rounded-xl border">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${a.role === 'superadmin' ? 'bg-red-500' : a.role === 'admin' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                                {a.role === 'superadmin' ? <i className="fas fa-crown text-[8px]"></i> : (a.name || a.phoneNumber || '?')[0]}
                                            </div>
                                            <div>
                                                <span className="font-bold text-[11px] block">{a.name || 'بدون نام'}</span>
                                                <span className="text-[8px] text-gray-400">{a.phoneNumber}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${a.role === 'superadmin' ? 'bg-red-100 text-red-700' : a.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {a.role === 'superadmin' ? 'مدیر سیستم' : a.role === 'admin' ? 'ادمین' : 'نویسنده'}
                                            </span>
                                        </div>
                                        {a.role !== 'superadmin' && (
                                            <div className="flex gap-1.5 items-center">
                                                <select value={a.role} onChange={e => handleChangeRole(a._id, e.target.value)} className="text-[9px] font-bold p-1.5 rounded-lg border bg-white">
                                                    <option value="user">کاربر</option>
                                                    <option value="author">نویسنده</option>
                                                    <option value="admin">ادمین</option>
                                                </select>
                                                <button onClick={() => { setEditingPermsUser(editingPermsUser?._id === a._id ? null : a); setEditingPerms(a.adminPermissions || []); }}
                                                    className={`px-2 py-1.5 rounded-lg text-[8px] font-bold transition-all ${editingPermsUser?._id === a._id ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                                                    <i className="fas fa-key"></i>
                                                </button>
                                                <button onClick={() => handleRemoveAdmin(a._id)} className="px-2 py-1.5 rounded-lg text-[8px] font-bold bg-red-100 text-red-600 hover:bg-red-200">
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {editingPermsUser?._id === a._id && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                                            <p className="text-[9px] font-bold text-blue-700">دسترسی‌های {a.name || a.phoneNumber}:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {AVAILABLE_PERMISSIONS.map(p => (
                                                    <button key={p.id}
                                                        onClick={() => {
                                                            const newPerms = editingPerms.includes(p.id) ? editingPerms.filter(x => x !== p.id) : [...editingPerms, p.id];
                                                            setEditingPerms(newPerms);
                                                        }}
                                                        className={`px-2.5 py-1 rounded-lg text-[8px] font-bold transition-all ${editingPerms.includes(p.id) ? 'bg-blue-500 text-white shadow-sm' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
                                                        {editingPerms.includes(p.id) && <i className="fas fa-check ml-0.5"></i>}
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={async () => { await updateAdminPermissions(a._id, editingPerms); setAdminToast({ type: 'success', message: 'دسترسی‌ها ذخیره شد' }); loadAdminList(); setEditingPermsUser(null); }}
                                                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-[8px] font-bold hover:bg-green-600">
                                                    <i className="fas fa-save ml-1"></i> ذخیره
                                                </button>
                                                <button onClick={() => setEditingPermsUser(null)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-[8px] font-bold hover:bg-gray-300">لغو</button>
                                            </div>
                                        </div>
                                    )}
                                    {a.adminPermissions?.length > 0 && editingPermsUser?._id !== a._id && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {a.adminPermissions.map((p: string) => (
                                                <span key={p} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-bold">{AVAILABLE_PERMISSIONS.find(x => x.id === p)?.label || p}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {rolesTab === 'allusers' && (
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 flex items-center gap-2">
                                <i className="fas fa-users text-purple-500"></i>
                                همه کاربران ({toPersianDigits(rolesUserTotal)})
                            </h3>
                            <div className="flex gap-2">
                                <input value={rolesSearch} onChange={e => setRolesSearch(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') loadRolesUsers(1); }}
                                    placeholder="جستجو نام یا شماره..." className="flex-1 p-2 border rounded-xl text-[10px] focus:ring-2 focus:ring-purple-300 outline-none" />
                                <button onClick={() => loadRolesUsers(1)} className="px-3 py-2 bg-purple-500 text-white rounded-xl text-[9px] font-bold hover:bg-purple-600">
                                    <i className="fas fa-search"></i>
                                </button>
                            </div>
                            {rolesUsers.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 py-8">کاربری یافت نشد</p>
                            ) : (
                                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                                    {rolesUsers.map((u: any) => (
                                        <div key={u._id} className="bg-gray-50 p-2.5 rounded-xl border flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${u.role === 'superadmin' ? 'bg-red-500' : u.role === 'admin' ? 'bg-blue-500' : u.role === 'author' ? 'bg-purple-500' : 'bg-gray-400'}`}>
                                                    {(u.name || u.phoneNumber || '?')[0]}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-[10px] block">{u.name || 'بدون نام'}</span>
                                                    <span className="text-[8px] text-gray-400">{u.phoneNumber}</span>
                                                </div>
                                                <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-bold ${u.role === 'superadmin' ? 'bg-red-100 text-red-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : u.role === 'author' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {u.role === 'superadmin' ? 'مدیر سیستم' : u.role === 'admin' ? 'ادمین' : u.role === 'author' ? 'نویسنده' : 'کاربر'}
                                                </span>
                                            </div>
                                            {u.role !== 'superadmin' && (
                                                <div className="flex items-center gap-1">
                                                    <select value={u.role} onChange={e => handleChangeRole(u._id, e.target.value)} className="text-[8px] font-bold p-1 rounded-lg border bg-white">
                                                        <option value="user">کاربر</option>
                                                        <option value="author">نویسنده</option>
                                                        <option value="admin">ادمین</option>
                                                    </select>
                                                    <button onClick={() => { setEditingUserPerms(editingUserPerms === u._id ? null : u._id); setEditingUserPermsList(u.adminPermissions || []); }}
                                                        className={`px-2 py-1 rounded-lg text-[8px] font-bold transition-all ${editingUserPerms === u._id ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'}`}>
                                                        <i className="fas fa-key"></i>
                                                    </button>
                                                </div>
                                            )}
                                            {editingUserPerms === u._id && (
                                                <div className="w-full mt-2 p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-bold text-blue-700">دسترسی اختصاصی {u.name || u.phoneNumber} (نقش: {u.role === 'admin' ? 'ادمین' : u.role === 'author' ? 'نویسنده' : 'کاربر'})</p>
                                                        <span className="text-[7px] text-gray-400">وقتی خالی باشه، دسترسی نقش اعمال میشه</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {ALL_ROLE_PERMISSIONS.filter(p => {
                                                            if (u.role === 'admin') return p.category === 'admin';
                                                            if (u.role === 'author') return true;
                                                            return p.category === 'user';
                                                        }).map(p => (
                                                            <button key={p.id}
                                                                onClick={() => {
                                                                    const newPerms = editingUserPermsList.includes(p.id) ? editingUserPermsList.filter(x => x !== p.id) : [...editingUserPermsList, p.id];
                                                                    setEditingUserPermsList(newPerms);
                                                                }}
                                                                className={`px-2 py-1 rounded-lg text-[8px] font-bold transition-all ${editingUserPermsList.includes(p.id) ? 'bg-blue-500 text-white shadow-sm' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
                                                                {editingUserPermsList.includes(p.id) && <i className="fas fa-check ml-0.5"></i>}
                                                                {p.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={async () => {
                                                            const oldPerms = u.adminPermissions || [];
                                                            const added = editingUserPermsList.filter(p => !oldPerms.includes(p));
                                                            const removed = oldPerms.filter(p => !editingUserPermsList.includes(p));
                                                            await updateAdminPermissions(u._id, editingUserPermsList);
                                                            loadRolesUsers();
                                                            setEditingUserPerms(null);
                                                            if (editingUserPermsList.length === 0) {
                                                                setPermToast({ message: `دسترسی ${u.name || u.phoneNumber} به پیش‌فرض نقش برگشت`, type: 'enabled' });
                                                            } else if (added.length > 0 && removed.length === 0) {
                                                                setPermToast({ message: `${added.length} دسترسی برای ${u.name || u.phoneNumber} فعال شد`, type: 'enabled' });
                                                            } else if (removed.length > 0 && added.length === 0) {
                                                                setPermToast({ message: `${removed.length} دسترسی برای ${u.name || u.phoneNumber} غیرفعال شد`, type: 'disabled' });
                                                            } else {
                                                                setPermToast({ message: `دسترسی ${u.name || u.phoneNumber} به‌روزرسانی شد`, type: 'enabled' });
                                                            }
                                                        }}
                                                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-[8px] font-bold hover:bg-green-600">
                                                            <i className="fas fa-save ml-1"></i> ذخیره
                                                        </button>
                                                        <button onClick={async () => { await resetUserPermissions(u._id); loadRolesUsers(); setEditingUserPerms(null); setPermToast({ message: `دسترسی ${u.name || u.phoneNumber} به پیش‌فرض نقش برگشت`, type: 'enabled' }); }}
                                                            className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg text-[8px] font-bold hover:bg-orange-200">
                                                            <i className="fas fa-undo ml-1"></i> بازنشانی
                                                        </button>
                                                        <button onClick={() => setEditingUserPerms(null)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-[8px] font-bold hover:bg-gray-300">لغو</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {rolesUserTotal > 20 && (
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <button onClick={() => loadRolesUsers(Math.max(1, rolesUserPage - 1))} disabled={rolesUserPage <= 1} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-500 text-[9px] font-black disabled:opacity-30">قبلی</button>
                                    <span className="text-[9px] text-gray-400">صفحه {toPersianDigits(rolesUserPage)} از {toPersianDigits(Math.ceil(rolesUserTotal / 20))}</span>
                                    <button onClick={() => loadRolesUsers(rolesUserPage + 1)} disabled={rolesUserPage * 20 >= rolesUserTotal} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-500 text-[9px] font-black disabled:opacity-30">بعدی</button>
                                </div>
                            )}
                        </div>
                    )}
                    {rolesTab === 'rolePerms' && (
                        <div className="space-y-3">
                            {[
                                { id: 'user', label: 'کاربر', icon: 'fa-user', color: '#6b7280', desc: 'دسترسی‌های پیش‌فرض کاربران عادی' },
                                { id: 'author', label: 'نویسنده', icon: 'fa-pen-fancy', color: '#8b5cf6', desc: 'دسترسی‌های پیش‌فرض نویسندگان' },
                                { id: 'admin', label: 'ادمین', icon: 'fa-user-shield', color: '#3b82f6', desc: 'دسترسی‌های پنل مدیریت ادمین‌ها' },
                            ].map(role => (
                                <div key={role.id} className="bg-gray-50 p-3 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: role.color }}>
                                                <i className={`fas ${role.icon} text-[10px]`}></i>
                                            </div>
                                            <div>
                                                <span className="font-bold text-[11px] block">{role.label}</span>
                                                <span className="text-[8px] text-gray-400">{role.desc}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setEditingRole(editingRole === role.id ? null : role.id); setEditingRolePerms(rolePermissions[role.id] || []); }}
                                            className={`px-3 py-1.5 rounded-lg text-[8px] font-bold transition-all ${editingRole === role.id ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                            <i className={`fas ${editingRole === role.id ? 'fa-times' : 'fa-edit'} ml-1`}></i>
                                            {editingRole === role.id ? 'لغو' : 'ویرایش'}
                                        </button>
                                    </div>
                                    {editingRole !== role.id && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(rolePermissions[role.id] || []).map((p: string) => (
                                                <span key={p} className="px-1.5 py-0.5 bg-white border rounded text-[7px] font-bold text-gray-600">
                                                    {ALL_ROLE_PERMISSIONS.find(x => x.id === p)?.label || p}
                                                </span>
                                            ))}
                                            {(!rolePermissions[role.id] || rolePermissions[role.id].length === 0) && (
                                                <span className="text-[8px] text-gray-400">بدون دسترسی</span>
                                            )}
                                        </div>
                                    )}
                                    {editingRole === role.id && (
                                        <div className="mt-3 p-3 bg-white rounded-xl border space-y-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                {ALL_ROLE_PERMISSIONS.filter(p => p.category === role.id || (role.id === 'admin' && p.category === 'admin')).map(p => (
                                                    <button key={p.id}
                                                        onClick={() => {
                                                            const newPerms = editingRolePerms.includes(p.id) ? editingRolePerms.filter(x => x !== p.id) : [...editingRolePerms, p.id];
                                                            setEditingRolePerms(newPerms);
                                                        }}
                                                        className={`px-2.5 py-1 rounded-lg text-[8px] font-bold transition-all ${editingRolePerms.includes(p.id) ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 border text-gray-500 hover:bg-gray-200'}`}>
                                                        {editingRolePerms.includes(p.id) && <i className="fas fa-check ml-0.5"></i>}
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={async () => {
                                                    const newRolePerms = { ...rolePermissions, [role.id]: editingRolePerms };
                                                    await updateRolePermissions(newRolePerms);
                                                    setRolePermissions(newRolePerms);
                                                    setEditingRole(null);
                                                    const oldPerms = rolePermissions[role.id] || [];
                                                    const added = editingRolePerms.filter(p => !oldPerms.includes(p));
                                                    const removed = oldPerms.filter(p => !editingRolePerms.includes(p));
                                                    if (added.length > 0) setPermToast({ message: `${added.length} دسترسی برای نقش ${role.label} فعال شد`, type: 'enabled' });
                                                    else if (removed.length > 0) setPermToast({ message: `${removed.length} دسترسی برای نقش ${role.label} غیرفعال شد`, type: 'disabled' });
                                                    else setAdminToast({ type: 'success', message: `دسترسی‌های ${role.label} ذخیره شد` });
                                                }}
                                                    className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-[9px] font-bold hover:bg-green-600">
                                                    <i className="fas fa-save ml-1"></i> ذخیره
                                                </button>
                                                <button onClick={() => setEditingRole(null)} className="px-4 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-[9px] font-bold hover:bg-gray-300">لغو</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    const tabs: { id: AdminTab; label: string; icon: string; color: string }[] = [
        { id: 'dashboard', label: 'داشبورد', icon: 'fa-chart-pie', color: '#6366f1' },
        { id: 'users', label: 'کاربران', icon: 'fa-users', color: '#10b981' },
        { id: 'posts', label: 'پست‌ها', icon: 'fa-newspaper', color: '#f97316' },
        { id: 'comments', label: 'نظرات', icon: 'fa-comment-dots', color: '#0d9488' },
        { id: 'analytics', label: 'آمار', icon: 'fa-chart-line', color: '#8b5cf6' },
        { id: 'sowt', label: 'صوت', icon: 'fa-microphone-alt', color: '#1ab394' },
        { id: 'library', label: 'کتابخانه', icon: 'fa-book-open', color: '#f97316' },
        { id: 'nashr', label: 'نشر', icon: 'fa-shopping-cart', color: '#2563eb' },
        { id: 'notes', label: 'یادداشت‌ها', icon: 'fa-feather-alt', color: '#7c3aed' },
        { id: 'authors', label: 'نویسندگان', icon: 'fa-pen-fancy', color: '#db2777' },
        { id: 'videos', label: 'ویدیو', icon: 'fa-video', color: '#2e86c1' },
        { id: 'notifications', label: 'نوتیفیکیشن', icon: 'fa-bell', color: '#f59e0b' },
        { id: 'versions', label: 'نسخه اپ', icon: 'fa-rocket', color: '#7c5cff' },
        { id: 'purchases', label: 'درخواست خرید', icon: 'fa-money-bill-transfer', color: '#059669' },
        { id: 'sales', label: 'آمار فروش', icon: 'fa-chart-line', color: '#2e86c1' },
        { id: 'support', label: 'پشتیبانی', icon: 'fa-headset', color: '#7c3aed' },
        { id: 'roles', label: 'مدیریت نقش', icon: 'fa-user-shield', color: '#dc2626' },
    ];

    const TAB_PERMISSIONS: Record<AdminTab, string | null> = {
        dashboard: null,
        users: 'users',
        posts: 'posts',
        comments: 'comments',
        analytics: 'analytics',
        sowt: 'podcasts',
        library: 'library',
        nashr: 'library',
        notes: 'notes',
        authors: 'authors',
        videos: 'videos',
        notifications: 'notifications',
        versions: 'settings',
        purchases: 'purchases',
        sales: 'sales',
        support: 'support',
        roles: null,
    };

    const isSuperAdmin = myRole === 'superadmin';
    const visibleTabs = isSuperAdmin
        ? tabs
        : tabs.filter(tab => {
            const perm = TAB_PERMISSIONS[tab.id];
            return !perm || myPerms.includes(perm);
        });

    return (
        <div className="fixed inset-0 bg-gray-950/98 z-[4500] backdrop-blur-3xl flex items-center justify-center p-0 sm:p-4 animate-fadeIn">

            {permToast && (
                <PermissionToast
                    message={permToast.message}
                    type={permToast.type}
                    onClose={() => setPermToast(null)}
                />
            )}

            {adminToast && (
                <div className={`fixed top-6 right-6 z-[5000] px-5 py-3.5 rounded-2xl text-sm font-bold text-white shadow-2xl max-w-[90%] sm:max-w-sm text-center animate-toastIn flex items-center gap-2.5 backdrop-blur-sm ${
                    adminToast.type === 'success' ? 'bg-green-500/90' : adminToast.type === 'warning' ? 'bg-amber-500/90' : 'bg-red-500/90'
                }`} style={{ boxShadow: `0 8px 32px ${adminToast.type === 'success' ? 'rgba(34,197,94,0.35)' : adminToast.type === 'warning' ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'}` }} onClick={() => setAdminToast(null)}>
                    <span className="text-base flex-shrink-0">{adminToast.type === 'success' ? '✅' : adminToast.type === 'warning' ? '⚠️' : '❌'}</span>
                    <span className="leading-relaxed">{adminToast.message}</span>
                </div>
            )}
            <div className="bg-[#fcfdfe] w-full max-w-4xl h-full sm:h-[90vh] rounded-none sm:rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/5">
                <header className={`relative bg-white px-6 sm:px-10 transition-all duration-300 border-b flex justify-between items-center flex-shrink-0 overflow-hidden ${isEditing ? 'h-0 opacity-0 py-0' : 'py-5 sm:py-6 opacity-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gray-900 rounded-[1.25rem] flex items-center justify-center text-white rotate-3 shadow-xl"><i className="fas fa-sliders-h"></i></div>
                        <div>
                            <h2 className="font-black text-gray-800 text-base sm:text-lg ">پنل مدیریت</h2>
                            <p className="text-[9px] text-gray-400 font-black uppercase mt-0.5 tracking-widest">Soha Admin Panel</p>
                        </div>
                    </div>
                    <button onClick={onClose} data-guide="admin-close-mobile" className="sm:hidden absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 font-black text-lg transition-all">&times;</button>
                    <button onClick={() => adminExportData('users')} data-guide="admin-export-mobile" className="sm:hidden absolute left-14 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-500 transition-all" title="خروجی کاربران"><i className="fas fa-download text-[10px]"></i></button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative hidden sm:block flex-1 min-w-0">
                            <input
                                type="text"
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
                                placeholder="جستجوی سراسری..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-[10px] text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                            <i className={`fas ${isSearching ? "fa-spinner fa-spin" : "fa-search"} absolute left-3 top-2.5 text-gray-300 text-[10px]`}></i>
                        </div>
                        <button onClick={() => adminExportData('users')} className="hidden sm:flex w-9 h-9 rounded-xl bg-green-50 text-green-500 hover:bg-green-100 transition-all items-center justify-center" title="خروجی کاربران"><i className="fas fa-download text-[10px]"></i></button>
                        <button onClick={onClose} data-guide="admin-close" className="hidden sm:flex w-10 h-10 rounded-full bg-gray-50 items-center justify-center text-gray-300 hover:text-red-500 font-black text-xl transition-all">&times;</button>
                    </div>
                </header>

                <div ref={tabsBarRef} className={`flex gap-1 bg-gray-50 border-b overflow-x-auto no-scrollbar flex-shrink-0 transition-all duration-300 ${isEditing ? 'h-0 opacity-0 p-0' : 'p-2 sm:p-3 opacity-100'}`}>
                    {visibleTabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            data-guide={`admin-${tab.id}`}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl sm:rounded-[1.25rem] transition-all border-2 flex-shrink-0 min-w-[60px] sm:w-20 ${activeTab === tab.id ? 'bg-white shadow-lg scale-105 active:scale-95' : 'bg-transparent border-transparent text-gray-300 grayscale opacity-60'}`}
                            style={{ borderColor: activeTab === tab.id ? tab.color : 'transparent', color: activeTab === tab.id ? tab.color : '' }}>
                            <i className={`fas ${tab.icon} text-sm mb-1`}></i>
                            <span className="text-[8px] sm:text-[9px] font-black uppercase">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-grow overflow-y-auto no-scrollbar bg-[#f8f9fa] pb-40" onTouchStart={handleAdminTouchStart} onTouchEnd={handleAdminTouchEnd}>
                    <div className="max-w-2xl mx-auto">
                        {globalSearchResults && (
                            <div className="p-4 space-y-4 animate-fadeIn border-b bg-white">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نتایج جستجو برای "{globalSearch}"</h3>
                                    <button onClick={() => setGlobalSearchResults(null)} className="text-[9px] text-gray-400 hover:text-red-500"><i className="fas fa-times"></i> بستن</button>
                                </div>
                                {globalSearchResults.users?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-green-500 mb-2"><i className="fas fa-users"></i> کاربران ({toPersianDigits(globalSearchResults.users.length)})</p>
                                        {globalSearchResults.users.map((u: any) => (
                                            <div key={u._id} className="p-2 bg-gray-50 rounded-xl mb-1 flex items-center gap-2">
                                                <span className="text-[10px] font-black text-gray-700">{u.name}</span>
                                                <span className="text-[8px] text-gray-400">{toPersianDigits(u.phoneNumber)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {globalSearchResults.posts?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-orange-500 mb-2"><i className="fas fa-newspaper"></i> پست‌ها ({toPersianDigits(globalSearchResults.posts.length)})</p>
                                        {globalSearchResults.posts.map((p: any) => (
                                            <div key={p._id} className="p-2 bg-gray-50 rounded-xl mb-1">
                                                <p className="text-[10px] font-black text-gray-700">{p.author}</p>
                                                <p className="text-[8px] text-gray-500 truncate">{p.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {globalSearchResults.comments?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-teal-500 mb-2"><i className="fas fa-comment-dots"></i> نظرات ({toPersianDigits(globalSearchResults.comments.length)})</p>
                                        {globalSearchResults.comments.map((c: any) => (
                                            <div key={c._id} className="p-2 bg-gray-50 rounded-xl mb-1">
                                                <p className="text-[10px] font-black text-gray-700">{c.author}</p>
                                                <p className="text-[8px] text-gray-500 truncate">{c.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'users' && renderUsersPanel()}
                        {activeTab === 'posts' && renderPostsPanel()}
                        {activeTab === 'comments' && renderCommentsPanel()}
                        {activeTab === 'analytics' && renderAnalytics()}
                        {activeTab === 'sowt' && renderSowtPanel()}
                        {activeTab === 'videos' && renderVideoPanel()}
                        {activeTab === 'library' && renderLibraryPanel()}
                        {activeTab === 'nashr' && renderNashrPanel()}
                        {activeTab === 'notes' && renderAdminNotesPanel()}
                        {activeTab === 'authors' && renderAdminAuthorsPanel()}
                        {activeTab === 'notifications' && renderNotificationsPanel()}
                        {activeTab === 'versions' && renderVersionsPanel()}
{activeTab === 'purchases' && renderPurchasesPanel()}
                    {activeTab === 'sales' && <AdminSalesPanel />}
                    {activeTab === 'support' && renderSupportPanel()}
                    {activeTab === 'roles' && renderRolesPanel()}
                    </div>
                </div>

                <footer className="bg-white px-8 py-4 border-t flex gap-4 flex-shrink-0 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                    <button onClick={onClose} className="flex-1 py-3.5 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black hover:bg-gray-100 transition-all active:scale-95">بازگشت به سایت</button>
                    <button onClick={() => { onSave(localData); onClose(); }} className="flex-[2] py-3.5 bg-primary text-white rounded-2xl text-[10px] font-black shadow-xl shadow-primary/20 active:scale-95 transition-all">ذخیره و اعمال تغییرات</button>
                </footer>
            </div>
            {pickerConfig && <AudioPickerModal podcasts={localData.podcasts} onSelect={pickerConfig.onSelect} onClose={()=>setPickerConfig(null)} />}
            {confirmToast && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slideInUp">
                    <div className={`max-w-xs rounded-2xl shadow-2xl p-4 ${confirmToast.type === 'danger' ? 'bg-red-500' : 'bg-amber-500'} text-white`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                <i className={`fas ${confirmToast.type === 'danger' ? 'fa-exclamation-triangle' : 'fa-question'} text-sm`}></i>
                            </div>
                            <p className="text-[11px] font-bold leading-relaxed">{confirmToast.message}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmToast(null)} className="flex-1 py-2 bg-white/20 rounded-xl text-[10px] font-black hover:bg-white/30 transition-all active:scale-95">انصراف</button>
                            <button onClick={() => { confirmToast.onConfirm(); setConfirmToast(null); }} className="flex-1 py-2 bg-white rounded-xl text-[10px] font-black transition-all active:scale-95" style={{ color: confirmToast.type === 'danger' ? '#dc2626' : '#d97706' }}>تایید</button>
                        </div>
                    </div>
                </div>
            )}
            {readingBook && <BookReader book={readingBook} onClose={() => setReadingBook(null)} />}
        </div>
    );
};

export default AdminPage;
