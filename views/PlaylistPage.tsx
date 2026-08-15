import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Podcast, Episode, Author, Comment, Page, User } from '../types';
import { toPersianDigits, formatPersianDate, formatTime, DEFAULT_COVER } from '../utils/helpers';
import InstantView from '../components/InstantView';
import MahfelSidebar from '../components/MahfelSidebar';
import Sidebar from '../components/Sidebar';
import { useActionMenu, ActionMenu, QuoteBlock, QuoteChip, QuoteBar, useSelectionQuote } from '../components/QuoteActions';

interface PlaylistPageProps {
  podcast: Podcast;
  author?: Author;
  comments: Comment[];
  onBack: () => void;
  onPlayEpisode: (podcast: Podcast, episodeIndex: number) => void;
  onAuthorSelect?: (author: Author) => void;
  onAddComment?: (text: string, podcast: Podcast, episodeIndex?: number, parentId?: string, audioTimestamp?: number, quotedText?: string) => void;
  onDeleteComment?: (id: string) => void;
  onUpdateComment?: (id: string, text: string) => void;
  onLikeComment?: (id: string) => void;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentAudioTime?: number;
  onSeekToTime?: (seconds: number) => void;
  onPlayEpisodeAtTime?: (podcast: Podcast, episodeIndex: number, seekTime: number) => void;
  hasPlayer?: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onOpenPlayer?: () => void;
  onPlaylistTabChange?: (tab: 'about' | 'episodes' | 'comments') => void;
  initialTab?: 'about' | 'episodes' | 'comments';
  initialEpisodeIndex?: number;
  onEpisodeIndexChange?: (index: number) => void;
  activeTab: Page;
  onTabChange: (tab: Page) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenProfile: () => void;
  onToggleLibrary?: (podcast: Podcast) => void;
  isInLibrary?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  audioProgress?: number;
  audioDuration?: number;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
  onOpenSearch: () => void;
  onOpenAdmin: () => void;
  user: User | null;
  isAuthenticated: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapsed: (v: boolean) => void;
}

const PlaylistPage: React.FC<PlaylistPageProps> = ({
  podcast, author, comments, onBack, onPlayEpisode, onAuthorSelect,
  onAddComment, onDeleteComment, onUpdateComment, onLikeComment, currentUserName, currentUserAvatar, currentAudioTime, onSeekToTime, onPlayEpisodeAtTime, hasPlayer, isPlaying, onTogglePlay, onOpenPlayer, onPlaylistTabChange, initialTab, initialEpisodeIndex, onEpisodeIndexChange,
  activeTab: pageTab, onTabChange, theme, onToggleTheme, onOpenProfile, onToggleLibrary, isInLibrary, onPrev, onNext, audioProgress = 0, audioDuration = 0,
  isSidebarOpen, onCloseSidebar, onOpenSearch, onOpenAdmin, user, isAuthenticated, isSidebarCollapsed, onToggleSidebarCollapsed,
}) => {
  const isDark = theme === 'dark';
  const isBookmarked = isInLibrary ?? false;
  const [activeTab, setActiveTab] = useState<'about' | 'episodes' | 'comments'>(initialTab || 'episodes');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [instantViewContent, setInstantViewContent] = useState<{ title: string; content: string } | null>(null);
  const [mahfelSidebarOpen, setMahfelSidebarOpen] = useState(false);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState<number>(initialEpisodeIndex || 0);

  useEffect(() => {
    if (initialEpisodeIndex !== undefined) setSelectedEpisodeIndex(initialEpisodeIndex);
  }, [initialEpisodeIndex]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; text: string } | null>(null);
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [replyQuoteText, setReplyQuoteText] = useState('');
  const [menuCid, setMenuCid] = useState<string | null>(null);
  const menu = useActionMenu();
  const [selQuote, setSelQuote] = useState<{ cid: string; text: string; rect: DOMRect } | null>(null);
  const [markAudioTimestamp, setMarkAudioTimestamp] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pageToast, setPageToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsListRef = useRef<HTMLDivElement>(null);

  const showPageToast = (msg: string) => { setPageToast(msg); setTimeout(() => setPageToast(''), 2500); };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      showPageToast('حجم فایل حداکثر ۳۰ مگابایت مجاز است');
      e.target.value = '';
      return;
    }
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/aac'];
    if (!allowed.includes(file.type)) {
      showPageToast('فقط تصاویر و صوت مجاز است');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در آپلود');
      }
      const data = await res.json();
      const mediaType = file.type.startsWith('image/') ? 'image' : 'audio';
      setUploadedMedia({ url: data.url, type: mediaType });
    } catch (err: any) {
      showPageToast(err.message || 'خطا در آپلود فایل');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeMedia = () => setUploadedMedia(null);

  const toggleBookmark = (e?: React.MouseEvent) => { e?.stopPropagation(); if (onToggleLibrary) onToggleLibrary(podcast); };
  const playAll = (e: React.MouseEvent) => { e.stopPropagation(); if (podcast.episodes.length > 0) onPlayEpisode(podcast, selectedEpisodeIndex); };
  const handleAuthorClick = () => { if (author && onAuthorSelect) onAuthorSelect(author); };

  const podcastIdStr = String(podcast.id);

  const episodeComments = useMemo(() => {
    return comments.filter(c => c.type === 'podcast' && String(c.podcastId) === podcastIdStr && c.episodeIndex === selectedEpisodeIndex && !c.parentId)
      .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());
  }, [comments, podcastIdStr, selectedEpisodeIndex]);

  const getReplies = (parentId: string) => comments.filter(c => String(c.parentId) === parentId && c.type === 'podcast' && String(c.podcastId) === podcastIdStr && c.episodeIndex === selectedEpisodeIndex)
    .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());

  useEffect(() => {
    if (activeTab === 'comments' && commentsListRef.current) {
      setTimeout(() => { commentsListRef.current!.scrollTop = commentsListRef.current!.scrollHeight; }, 100);
    }
  }, [activeTab, episodeComments.length]);

  const totalEpisodeComments = useMemo(() =>
    comments.filter(c => c.type === 'podcast' && String(c.podcastId) === podcastIdStr && c.episodeIndex === selectedEpisodeIndex).length,
  [comments, podcastIdStr, selectedEpisodeIndex]);

  const podcastCommentsCount = useMemo(() =>
    comments.filter(c => c.type === 'podcast' && String(c.podcastId) === podcastIdStr).length,
  [comments, podcastIdStr]);

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    if (onAddComment) {
      onAddComment(commentText.trim(), podcast, selectedEpisodeIndex, replyTo?.id || undefined, markAudioTimestamp ? currentAudioTime : undefined, replyQuoteText || undefined);
    }
    setCommentText('');
    setReplyTo(null);
    setReplyQuoteText('');
    setMarkAudioTimestamp(false);
    setUploadedMedia(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); }
  };

  const isOwnComment = (c: Comment) => currentUserName && c.author === currentUserName;

  useSelectionQuote((cid, text, rect) => {
    setSelQuote({ cid, text, rect });
  });

  const handleQuoteReplyPick = () => {
    if (!selQuote) return;
    const c = comments.find(x => String((x as any)._id || x.id) === selQuote.cid);
    if (c) setReplyTo({ id: selQuote.cid, author: String(c.author), text: String(c.text).substring(0, 50) });
    setReplyQuoteText(selQuote.text);
    setSelQuote(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <>
    {pageToast && (
        <div className="fixed top-5 right-5 z-[5000] bg-gray-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold animate-toastIn flex items-center gap-2 border border-white/10 max-w-[80vw]">
        <i className="fas fa-info-circle text-primary text-sm"></i>
        {pageToast}
      </div>
    )}
    <div className={`fixed inset-0 z-[200] overflow-y-auto lg:overflow-hidden lg:flex animate-fadeIn ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {instantViewContent && (
        <InstantView title={instantViewContent.title} content={instantViewContent.content} subtitle={podcast.title} onClose={() => setInstantViewContent(null)} />
      )}

      <Sidebar
        activeTab={pageTab}
        onTabChange={onTabChange}
        isOpen={isSidebarOpen}
        onClose={onCloseSidebar}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenSearch={onOpenSearch}
        onOpenAdmin={onOpenAdmin}
        onOpenProfile={onOpenProfile}
        user={user}
        isAuthenticated={isAuthenticated}
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={onToggleSidebarCollapsed}
      />

      <div className="lg:flex-1 lg:overflow-y-auto">
        {/* Hero */}
        <header className="relative text-white overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center scale-110" style={{ backgroundImage: 'url(' + String(podcast.cover || DEFAULT_COVER) + ')', filter: isDark ? 'blur(40px) brightness(0.15) saturate(1.3)' : 'blur(40px) brightness(0.3) saturate(1.3)' }}></div>
          <div className={`absolute inset-0 bg-gradient-to-b ${isDark ? 'from-gray-900/60 via-gray-900/80 to-gray-900' : 'from-gray-100/80 via-white/90 to-white'}`}></div>

          <div className="relative z-10 px-4 pt-12 pb-3 lg:px-5 lg:pt-14 lg:pb-8">
            <button onClick={onBack} className={`${isDark ? 'bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 shadow-black/10' : 'bg-gray-100/80 backdrop-blur-xl border border-gray-200 text-gray-700 hover:bg-gray-200/80 shadow-black/5'} w-9 h-9 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl text-sm lg:text-base cursor-pointer transition-all duration-300 flex items-center justify-center absolute left-3 top-3 lg:left-4 lg:top-4 active:scale-90 z-20 shadow-lg`}>
              <i className="fas fa-arrow-right"></i>
            </button>
            <button onClick={() => setMahfelSidebarOpen(true)} className={`lg:hidden ${isDark ? 'bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 shadow-black/10' : 'bg-gray-100/80 backdrop-blur-xl border border-gray-200 text-gray-700 hover:bg-gray-200/80 shadow-black/5'} w-9 h-9 rounded-xl text-sm cursor-pointer transition-all duration-300 flex items-center justify-center absolute right-3 top-3 active:scale-90 z-20 shadow-lg`}>
              <i className="fas fa-bars"></i>
            </button>

            {activeTab === 'comments' ? (
              <div className="hidden lg:flex justify-center mt-6">
                <div className={`flex flex-col gap-4 px-7 py-5 rounded-3xl w-full max-w-2xl ${isDark ? '' : 'border border-gray-200 bg-white/80'}`} style={{ background: isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,95,70,0.06))' : '', border: isDark ? '1px solid rgba(16,185,129,0.15)' : '' }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl overflow-hidden shadow-lg flex-shrink-0 ring-1 ${isDark ? 'shadow-black/30 ring-white/10' : 'shadow-gray-200/50 ring-gray-200'} cursor-pointer hover:ring-emerald-400/30 transition-all`} onClick={(e) => { e.stopPropagation(); if (hasPlayer && onOpenPlayer) onOpenPlayer(); else if (podcast.episodes.length > 0) onPlayEpisode(podcast, selectedEpisodeIndex); }}>
                       <img src={String(podcast.cover || DEFAULT_COVER)} alt={String(podcast.title)} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <h1 className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'} leading-snug line-clamp-1`}>{String(podcast.title)}</h1>
                      {author && <p className={`text-xs ${isDark ? 'text-emerald-300/60' : 'text-emerald-600'} mt-0.5 truncate`}>{String(author.name)}</p>}
                      <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-gray-500'} mt-1 truncate`}>{String(podcast.episodes[selectedEpisodeIndex]?.title || '')}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); if (onPrev) onPrev(); else if (hasPlayer && selectedEpisodeIndex > 0) onPlayEpisode(podcast, selectedEpisodeIndex - 1); }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all ${isDark ? 'bg-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}>
                        <i className="fas fa-forward text-[11px] mr-[-1px]"></i>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (onTogglePlay && hasPlayer) onTogglePlay(); else playAll(e); }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-l from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 active:scale-90 transition-all hover:shadow-emerald-500/40">
                        <i className={`fas ${hasPlayer && isPlaying ? 'fa-pause' : 'fa-play'} text-sm ${!(hasPlayer && isPlaying) ? 'mr-0.5' : ''}`}></i>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); else if (hasPlayer && selectedEpisodeIndex < podcast.episodes.length - 1) onPlayEpisode(podcast, selectedEpisodeIndex + 1); }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all ${isDark ? 'bg-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}>
                        <i className="fas fa-backward text-[11px] ml-[-1px]"></i>
                      </button>
                    </div>
                  </div>
                  {activeTab === 'comments' && (
                    <div className="flex items-center gap-3 pt-1" dir="ltr">
                      <span className={`text-[10px] font-mono flex-shrink-0 w-10 text-left ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{formatTime(audioProgress * audioDuration)}</span>
                      <div className="flex-1 group cursor-pointer h-5 flex items-center" onClick={(e) => { e.stopPropagation(); if (onSeekToTime) { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); onSeekToTime(pct * audioDuration); } }}>
                        <div className={`w-full h-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden group-hover:h-2 transition-all`}>
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${audioProgress * 100}%` }}></div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono flex-shrink-0 w-10 text-right ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{formatTime(audioDuration)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex gap-4 items-end mt-4 cursor-pointer" onClick={() => { if (hasPlayer && onOpenPlayer) onOpenPlayer(); else if (podcast.episodes.length > 0) onPlayEpisode(podcast, selectedEpisodeIndex); }}>
                <div className={`w-[120px] h-[170px] rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 ring-1 ${isDark ? 'shadow-black/30 ring-white/10' : 'shadow-gray-200/50 ring-gray-200'}`}>
                   <img src={String(podcast.cover || DEFAULT_COVER)} alt={String(podcast.title)} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-emerald-400/70' : 'text-emerald-600'}`}>پادکست</span>
                  </div>
                  <h1 className={`text-2xl font-black mb-1.5 leading-tight drop-shadow-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{String(podcast.title)}</h1>
                  {author && (
                    <p className={`text-sm font-semibold mb-3 leading-relaxed drop-shadow-sm ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
                      <i className="fas fa-user ml-1.5 text-[10px] opacity-60"></i>{String(author.name)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); toggleBookmark(); }} className={`transition-all active:scale-110 ${isDark ? 'text-white/40 hover:text-emerald-400' : 'text-gray-400 hover:text-emerald-600'}`}>
                      <i className={`${isBookmarked ? 'fas text-emerald-400' : 'far'} fa-bookmark text-sm`}></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile: compact hero */}
            <div className="lg:hidden mt-3">
              <div className="flex gap-3 items-center cursor-pointer" onClick={() => { if (hasPlayer && onOpenPlayer) onOpenPlayer(); else if (podcast.episodes.length > 0) onPlayEpisode(podcast, selectedEpisodeIndex); }}>
                <div className={`w-[72px] h-[72px] rounded-2xl overflow-hidden shadow-xl flex-shrink-0 ring-1 ${isDark ? 'shadow-black/30 ring-white/10' : 'shadow-gray-200/50 ring-gray-200'}`}>
                   <img src={String(podcast.cover || DEFAULT_COVER)} alt={String(podcast.title)} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <span className={`text-[9px] font-bold uppercase tracking-[0.2em] block mb-0.5 ${isDark ? 'text-emerald-400/70' : 'text-emerald-600'}`}>پادکست</span>
                  <h1 className={`text-base font-black leading-tight drop-shadow-lg line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{String(podcast.title)}</h1>
                  {author && (
                    <p className={`text-[11px] font-semibold mt-0.5 cursor-pointer transition-colors ${isDark ? 'text-emerald-300/80 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-600'}`} onClick={handleAuthorClick}>
                      <i className="fas fa-user ml-1 text-[8px] opacity-60"></i>{String(author.name)}
                    </p>
                  )}
                </div>
                {activeTab === 'comments' && (
                  <div className="flex-shrink-0 flex items-center gap-1.5 mr-auto">
                    <button onClick={(e) => { e.stopPropagation(); if (onPrev) onPrev(); else if (hasPlayer && selectedEpisodeIndex > 0) onPlayEpisode(podcast, selectedEpisodeIndex - 1); }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all ${isDark ? 'bg-white/5 text-white/50 hover:text-white' : 'bg-gray-100/80 text-gray-500 hover:text-gray-900 hover:bg-gray-200/80'}`}>
                      <i className="fas fa-forward text-[10px] mr-[-1px]"></i>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (onTogglePlay && hasPlayer) onTogglePlay(); else playAll(e); }}
                      className="w-11 h-11 rounded-2xl bg-gradient-to-l from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-all flex-shrink-0">
                      <i className={`fas ${hasPlayer && isPlaying ? 'fa-pause' : 'fa-play'} text-sm ${!(hasPlayer && isPlaying) ? 'mr-0.5' : ''}`}></i>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); else if (hasPlayer && selectedEpisodeIndex < podcast.episodes.length - 1) onPlayEpisode(podcast, selectedEpisodeIndex + 1); }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all ${isDark ? 'bg-white/5 text-white/50 hover:text-white' : 'bg-gray-100/80 text-gray-500 hover:text-gray-900 hover:bg-gray-200/80'}`}>
                      <i className="fas fa-backward text-[10px] ml-[-1px]"></i>
                    </button>
                  </div>
                )}
                {activeTab !== 'comments' && (
                  <button onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                    className={`flex-shrink-0 transition-all active:scale-110 ${isDark ? 'text-white/40 hover:text-emerald-400' : 'text-gray-400 hover:text-emerald-600'}`}>
                    <i className={`${isBookmarked ? 'fas text-emerald-400' : 'far'} fa-bookmark text-sm`}></i>
                  </button>
                )}
              </div>
              </div>
              {activeTab === 'comments' && (
                <div className="lg:hidden flex items-center gap-2 mt-2 px-1" dir="ltr" onClick={(e) => e.stopPropagation()}>
                  <span className={`text-[10px] font-mono flex-shrink-0 w-9 text-left ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{formatTime(audioProgress * audioDuration)}</span>
                  <div className="flex-1 group cursor-pointer h-4 flex items-center" onClick={(e) => { if (onSeekToTime) { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); onSeekToTime(pct * audioDuration); } }}>
                    <div className={`w-full h-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden group-hover:h-2 transition-all`}>
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${audioProgress * 100}%` }}></div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono flex-shrink-0 w-9 text-right ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{formatTime(audioDuration)}</span>
                </div>
              )}
            </div>
        </header>

        {/* Tabs */}
        <div className={`${isDark ? 'bg-gray-900/90 border-b border-white/[0.06]' : 'bg-gray-50 border-b border-gray-200'} backdrop-blur-xl flex justify-center sticky top-0 z-10 gap-1 px-4 lg:-mt-4 lg:pt-3 -mt-2 pt-2`}>
          <button onClick={() => { setActiveTab('about'); if (onPlaylistTabChange) onPlaylistTabChange('about'); }} className={`py-2 px-4 lg:py-2.5 lg:px-5 text-xs lg:text-sm font-bold transition-all rounded-xl             ${activeTab === 'about' ? (isDark ? 'text-white bg-white/10' : 'text-gray-900 bg-gray-200') + ' shadow-sm' : (isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')}`}>درباره</button>
          <button onClick={() => { setActiveTab('episodes'); if (onPlaylistTabChange) onPlaylistTabChange('episodes'); }} className={`py-2 px-4 lg:py-2.5 lg:px-5 text-xs lg:text-sm font-bold transition-all rounded-xl ${activeTab === 'episodes' ? (isDark ? 'text-white bg-white/10' : 'text-gray-900 bg-gray-200') + ' shadow-sm' : (isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')}`}>{'قسمت\u200cها (' + toPersianDigits(podcast.episodes.length) + ')'}</button>
          <button onClick={() => { setActiveTab('comments'); if (onPlaylistTabChange) onPlaylistTabChange('comments'); }} className={`py-2 px-4 lg:py-2.5 lg:px-5 text-xs lg:text-sm font-bold transition-all rounded-xl ${activeTab === 'comments' ? (isDark ? 'text-white bg-white/10' : 'text-gray-900 bg-gray-200') + ' shadow-sm' : (isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')}`}>{'گفتگوها (' + toPersianDigits(podcastCommentsCount) + ')'}</button>
        </div>

        {/* Content */}
        <div className={`p-3 lg:p-4 ${isDark ? 'bg-gray-900' : 'bg-white'} pb-36 lg:pb-20`}>
          {activeTab === 'about' && (
            <section className="animate-fadeIn space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`flex items-center gap-2.5 p-3.5 ${isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-gray-50 border-gray-200'} backdrop-blur-sm rounded-xl border`}>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <i className="fas fa-headphones text-emerald-400 text-xs"></i>
                  </div>
                  <div>
                    <div className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-sm`}>{toPersianDigits(podcast.episodes.length)}</div>
                    <div className={`${isDark ? 'text-white/40' : 'text-gray-500'} text-[10px]`}>جلسه</div>
                  </div>
                </div>
                {podcast.duration && podcast.duration !== '00:00' && (
                  <div className={`flex items-center gap-2.5 p-3.5 ${isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-gray-50 border-gray-200'} backdrop-blur-sm rounded-xl border`}>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <i className="far fa-clock text-emerald-400 text-xs"></i>
                    </div>
                    <div>
                      <div className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-sm`}>{String(podcast.duration)}</div>
                      <div className={`${isDark ? 'text-white/40' : 'text-gray-500'} text-[10px]`}>مدت زمان</div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`p-5 ${isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-gray-50 border-gray-200'} backdrop-blur-sm rounded-2xl border shadow-lg`}>
                <div className="flex items-center gap-2 mb-3">
                  <i className="fas fa-align-right text-emerald-400/60 text-xs"></i>
                  <span className="text-emerald-400/60 text-xs font-bold">توضیحات</span>
                </div>
                <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm leading-loose text-justify whitespace-pre-wrap`} dangerouslySetInnerHTML={{ __html: (() => { let d = String(podcast.description || 'توضیحاتی برای این مجموعه ثبت نشده است.'); while (d.includes('&amp;')) d = d.replace(/&amp;/g, '&'); return d.trim(); })() }} />
              </div>
            </section>
          )}

          {activeTab === 'episodes' && (
            <div className="flex flex-col gap-3 animate-fadeIn">
              {podcast.episodes.map((episode, index) => (
                <div key={index} className={`group relative ${isDark ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:from-white/[0.07] hover:to-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] hover:shadow-black/20' : 'bg-white hover:bg-gray-50/80 border border-gray-200 hover:border-emerald-400 shadow-sm hover:shadow-md hover:shadow-emerald-200/20 border-r-[3px] border-r-emerald-500/60 hover:border-r-emerald-600'} rounded-2xl transition-all duration-300 active:scale-[0.98] hover:shadow-xl`}>
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => onPlayEpisode(podcast, index)}>
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${isDark ? 'bg-white/[0.06] text-white/30' : 'bg-emerald-50 text-emerald-600 font-black'} text-xs flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all`}>{toPersianDigits(index + 1)}</div>
                    <div className={`relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg ring-1 ${isDark ? 'ring-white/[0.06]' : 'ring-gray-100'}`}>
                       <img src={String(episode.cover || podcast.cover || DEFAULT_COVER)} alt={String(episode.title)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-base opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/80 backdrop-blur-md flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20 transform group-hover:scale-110 transition-transform">
                          <i className="fas fa-play text-sm mr-0.5"></i>
                  {activeTab === 'comments' && (
                    <div className="flex items-center gap-3" dir="ltr">
                      <span className={`text-[10px] font-mono flex-shrink-0 w-10 text-left ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{formatTime(audioProgress * audioDuration)}</span>
                      <div className="flex-1 group cursor-pointer h-5 flex items-center" onClick={(e) => { e.stopPropagation(); if (onSeekToTime) { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); onSeekToTime(pct * audioDuration); } }}>
                        <div className={`w-full h-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden group-hover:h-2 transition-all`}>
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${audioProgress * 100}%` }}></div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono flex-shrink-0 w-10 text-right ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{formatTime(audioDuration)}</span>
                    </div>
                  )}
                </div>
              </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={'text-sm font-bold line-clamp-2 leading-snug transition-colors ' + (isDark ? 'text-white/80 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900')}>{String(episode.title)}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-[11px] font-medium flex items-center gap-1.5 ${isDark ? 'text-white/40 bg-white/[0.04]' : 'text-emerald-700 bg-emerald-50'} px-2 py-0.5 rounded-lg`}>
                          <i className="far fa-clock text-[9px]"></i> {String(episode.duration)}
                        </span>
                        <span className={`text-[11px] font-medium flex items-center gap-1.5 ${isDark ? 'text-white/30' : 'text-emerald-600/60'}`}>
                          <i className="far fa-calendar-alt text-[9px]"></i> {formatPersianDate(String(episode.date))}
                        </span>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 ${isDark ? 'text-white/20 group-hover:text-white/50 group-hover:bg-white/[0.06]' : 'text-gray-200 group-hover:text-emerald-500 group-hover:bg-emerald-50'} transition-colors text-sm w-8 h-8 rounded-xl flex items-center justify-center`}>
                      <i className="fas fa-chevron-left"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'comments' && (
            <section className="animate-fadeIn">
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar lg:justify-center" dir="ltr">
                {podcast.episodes.map((ep, i) => (
                  <button key={i} onClick={() => { setSelectedEpisodeIndex(i); onEpisodeIndexChange?.(i); setReplyTo(null); setEditCommentId(null); onPlayEpisode(podcast, i); }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedEpisodeIndex === i ? 'bg-primary text-white shadow-md' : (isDark ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200')}`}>
                    {toPersianDigits(i + 1)} · {String(ep.title).substring(0, 15)}{String(ep.title).length > 15 ? '..' : ''}
                  </button>
                ))}
              </div>

              <div ref={commentsListRef} className="space-y-4 overflow-y-auto max-h-[60vh] lg:max-h-none">
                {episodeComments.length > 0 ? episodeComments.map(comment => (
                  <div key={String(comment._id || comment.id)}>
                    {renderComment(comment, 0)}
                  </div>
                )) : (
                  <div className={`text-center py-16 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    <i className="fas fa-comments text-4xl mb-4"></i>
                    <p className="text-sm font-black">هنوز گفتگویی برای این اپیزود ثبت نشده است.</p>
                    <p className={`text-xs ${isDark ? 'text-gray-700' : 'text-gray-500'} mt-2`}>اولین نفری باشید که نظر می‌دهید!</p>
                  </div>
          )}
          </div>
        </section>
      )}

      {/* Comment input */}
      {activeTab === 'comments' && (
        <div className={`fixed bottom-0 left-0 right-0 ${isDark ? 'border-t border-white/[0.06] bg-gray-900/95 lg:border-l lg:border-white/[0.06]' : 'border-t border-gray-200 bg-white/95 lg:border-l lg:border-gray-200'} backdrop-blur-xl px-3 py-2.5 z-[1000] lg:flex lg:justify-center lg:left-0 lg:right-72`}>
          <div className="lg:max-w-2xl lg:w-full">
          {replyQuoteText && (
            <div className="mb-1.5 px-1" dir="rtl">
              <QuoteChip text={replyQuoteText} onCancel={() => setReplyQuoteText('')} />
            </div>
          )}
          <div className="flex gap-1.5 items-end" dir="ltr">
            <button onClick={handleSubmitComment} disabled={!commentText.trim()}
              className="bg-primary text-white w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 flex-shrink-0 shadow-lg shadow-primary/20">
              <i className="fas fa-paper-plane text-xs"></i>
            </button>
            <div className="flex-1 relative" dir="rtl">
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={replyTo ? 'پاسخ...' : 'یادداشت...'}
                className={`w-full ${isDark ? 'bg-white/[0.06] text-white border-white/[0.08]' : 'bg-gray-100 text-gray-900 border-gray-300'} text-sm rounded-xl px-3 py-2 outline-none border focus:border-primary/50 transition-all text-right`} />
            </div>
            <button onClick={() => setMarkAudioTimestamp(true)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0 ${markAudioTimestamp ? 'bg-primary text-white shadow-lg shadow-primary/20' : (isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}`}
              title="ثبت با لحظه صوتی">
              <i className="fas fa-music text-xs"></i>
            </button>
          </div>

          {uploadedMedia && (
            <div className="flex items-center gap-1.5 mt-1.5 px-1">
              <div className="relative">
                {uploadedMedia.type === 'image' ? (
                  <img src={uploadedMedia.url} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-primary/30" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs ring-1 ring-primary/20">
                    <i className="fas fa-music"></i>
                  </div>
                )}
                <button onClick={removeMedia}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[6px] shadow-lg">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

        </div>
      </div>
    </div>

    <MahfelSidebar activeTab={pageTab} onTabChange={(tab) => { onTabChange(tab); onBack(); }} open={mahfelSidebarOpen} onOpenChange={setMahfelSidebarOpen} theme={theme} onToggleTheme={onToggleTheme} onOpenProfile={onOpenProfile} />
    </>
  );

  function renderComment(comment: Comment, depth: number) {
    const cid = String((comment as any)._id || comment.id);
    const replies = comment.replies || [];
    const isOwn = isOwnComment(comment);
    const isEditing = editCommentId === cid;
    const likesStr = comment.likes ? toPersianDigits(comment.likes) : '';
    const likedComments = new Set<string>(JSON.parse(localStorage.getItem('soha_liked_comments') || '[]'));
    const isLiked = likedComments.has(cid);
    const maxDepth = 2;
    const isNested = depth > 0 && depth <= maxDepth;
    const isOverDepth = depth > maxDepth;

    return (
      <div key={cid} className={`${isNested ? 'mr-5 lg:mr-6 ' + (isDark ? 'border-r-2 border-gray-700/50' : 'border-r-2 border-gray-200') + ' pr-3' : ''}`}>
        <div className={`${isOverDepth ? (isDark ? 'bg-gray-800/30' : 'bg-gray-50/80') : (isDark ? 'bg-gray-800/50' : 'bg-gray-50')} p-3 rounded-2xl border ${isDark ? 'border-gray-700/30' : 'border-gray-200'} group`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {(comment as any).authorAvatarUrl ? (
                  <img src={String((comment as any).authorAvatarUrl)} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-primary/20" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                    {String(comment.author).charAt(0)}
                  </div>
                )}
                <div>
                  <span className={`text-xs font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{String(comment.author)}</span>
                  {comment.isEdited && <span className="text-[9px] text-gray-500 mr-1">(ویرایش شده)</span>}
                  <div className={`text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{String(comment.date || formatPersianDate(String(comment.isoDate)))}</div>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setMenuCid(cid); menu.openAt(e); }}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-30 hover:!opacity-70 flex-shrink-0 ${isDark ? 'hover:!bg-white/10' : ''}`} style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-ellipsis-vertical text-[9px]"></i>
              </button>
              {(comment.audioTimestamp ?? comment.timestamp) !== undefined && (
                <button onClick={() => {
                  const ts = Number(comment.audioTimestamp ?? comment.timestamp);
                  const epIdx = comment.episodeIndex ?? selectedEpisodeIndex;
                  if (onPlayEpisodeAtTime) onPlayEpisodeAtTime(podcast, epIdx, ts);
                }}
                  className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-black border border-primary/20 cursor-pointer hover:bg-primary/20 active:scale-95 transition-all" title="پرش به این لحظه">
                  {formatTime(Number(comment.audioTimestamp ?? comment.timestamp))}
                </button>
              )}
            </div>

          {isEditing ? (
            <div className="mb-2">
              <textarea autoFocus value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                className={`w-full ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900 border-gray-300'} text-sm rounded-xl p-2 outline-none resize-none border text-right`} rows={2} />
              <div className="flex gap-2 mt-1 justify-start">
                <button onClick={() => { if (onUpdateComment) onUpdateComment(cid, editCommentText); setEditCommentId(null); }}
                  className="text-xs bg-primary text-white px-3 py-1 rounded-lg font-bold active:scale-95">ذخیره</button>
                <button onClick={() => setEditCommentId(null)}
                  className={`text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} px-3 py-1 rounded-lg active:scale-95`}>لغو</button>
              </div>
            </div>
          ) : (
            <>
            {(comment as any).quotedText && <QuoteBlock text={String((comment as any).quotedText)} author={String(comment.author)} />}
            <QuoteBar show={!!(selQuote && selQuote.cid === cid)} onClick={handleQuoteReplyPick} />
            <p data-comment-text data-cid={cid} className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm leading-relaxed whitespace-pre-wrap break-words`}>{String(comment.text)}</p>
            </>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => { if (onLikeComment) onLikeComment(cid); }}
              className={`text-xs flex items-center gap-1 transition-all active:scale-125 ${isLiked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'}`}>
              <i className={`${isLiked ? 'fas' : 'far'} fa-heart`}></i>
              {likesStr && <span>{likesStr}</span>}
            </button>
            <button onClick={() => { setReplyTo({ id: cid, author: String(comment.author), text: String(comment.text).substring(0, 50) }); }}
              className="text-xs text-gray-500 hover:text-primary transition-all active:scale-110 flex items-center gap-1">
              <i className="far fa-comment"></i><span>پاسخ</span>
            </button>
              {isOwn && (
              <>
                <button onClick={() => { setEditCommentId(cid); setEditCommentText(String(comment.text)); }}
                  className="text-xs text-gray-500 hover:text-yellow-400 transition-all active:scale-110">
                  <i className="fas fa-pen"></i>
                </button>
                <button onClick={() => setDeleteConfirmId(cid)}
                  className="text-xs text-gray-500 hover:text-red-400 transition-all active:scale-110">
                  <i className="fas fa-trash"></i>
                </button>
              </>
            )}
          </div>
        </div>

        {deleteConfirmId === cid && (
          <div className={`flex items-center gap-2 p-2 rounded-xl mb-2 text-xs ${isDark ? 'bg-red-950/40 border border-red-800/40' : 'bg-red-50 border border-red-200'}`}>
            <i className="fas fa-exclamation-triangle text-red-400"></i>
            <span className="text-red-300 flex-1">از حذف این نظر مطمئنید؟</span>
            <button onClick={() => { if (onDeleteComment) onDeleteComment(cid); setDeleteConfirmId(null); }}
              className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 active:scale-95 transition-all">بله</button>
            <button onClick={() => setDeleteConfirmId(null)}
              className={`${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} px-3 py-1 rounded-lg text-xs hover:opacity-80 active:scale-95 transition-all`}>خیر</button>
          </div>
        )}

        {replies.length > 0 && (
          <div className={`${isOverDepth ? '' : 'mt-2 space-y-2'}`}>
            {replies.map(reply => renderComment(reply, isOverDepth ? depth : depth + 1))}
          </div>
        )}
        {menu.pos && menuCid === cid && (
          <ActionMenu pos={menu.pos} onClose={menu.close} items={[
            { icon: 'fas fa-reply', label: 'پاسخ', onClick: () => setReplyTo({ id: cid, author: String(comment.author), text: String(comment.text).substring(0, 50) }) },
            { icon: 'fas fa-quote-right', label: 'نقل‌قول', onClick: () => { setReplyTo({ id: cid, author: String(comment.author), text: String(comment.text).substring(0, 50) }); setReplyQuoteText(selQuote && selQuote.cid === cid ? selQuote.text : String(comment.text)); } },
            { divider: true },
            { icon: isLiked ? 'fas fa-heart' : 'far fa-heart', label: isLiked ? 'برداشتن لایک' : 'لایک', color: isLiked ? '#ef4444' : undefined, onClick: () => { if (onLikeComment) onLikeComment(cid); } },
            ...(isOwn ? [
              { icon: 'fas fa-pen', label: 'ویرایش', onClick: () => { setEditCommentId(cid); setEditCommentText(String(comment.text)); } },
              ...(onDeleteComment ? [{ icon: 'fas fa-trash-alt', label: 'حذف', color: '#ef4444', onClick: () => setDeleteConfirmId(cid) }] : []),
            ] : []),
          ]} />
        )}
      </div>
    );
  }
};

export default PlaylistPage;
