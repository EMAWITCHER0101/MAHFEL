import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Podcast, Episode, Comment, Author, Page } from '../types';
import { formatTime, toPersianDigits, DEFAULT_COVER } from '../utils/helpers';
import MahfelSidebar from './MahfelSidebar';

interface FullScreenPlayerProps {
  track: { podcast: Podcast; episode: Episode; episodeIndex: number };
  isPlaying: boolean;
  progress: number;
  duration: number;
  authors: Author[];
  onPlayPause: () => void;
  onSeek: (progress: number) => void;
  onMinimize: () => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  comments: Comment[];
  onAddComment: (text: string, track: { podcast: Podcast; episode: Episode; episodeIndex: number }, timestamp?: number, parentId?: string) => void;
  onDeleteComment?: (id: string) => void;
  onUpdateComment?: (id: string, text: string) => void;
  onLikeComment?: (id: string) => void;
  currentUserName?: string;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  onOpenFile: (url: string) => void;
  onShowInstantView: (title: string, content: string) => void;
  isInLibrary?: boolean;
  onToggleLibrary: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  repeatMode: 'none' | 'one' | 'all';
  onRepeatModeChange: (m: 'none' | 'one' | 'all') => void;
  isShuffle: boolean;
  onShuffleToggle: () => void;
  sleepTimer: number | null;
  onSleepTimer: (t: number | null) => void;
  onPlayEpisode: (podcast: Podcast, idx: number) => void;
  onPlayInBackground: () => void;
  activeTab: Page;
  onTabChange: (tab: Page) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenProfile: () => void;
  podcasts: Podcast[];
  onToggleEpisode?: (podcastId: string, episodeIndex: number) => void;
  isEpisodeInLibrary?: (podcastId: string, episodeIndex: number) => boolean;
}

const SLEEP_OPTIONS = [
  { label: 'خاموش', value: null as number | null },
  { label: '۵ دقیقه', value: 5 * 60 * 1000 },
  { label: '۱۵ دقیقه', value: 15 * 60 * 1000 },
  { label: '۳۰ دقیقه', value: 30 * 60 * 1000 },
  { label: '۱ ساعت', value: 60 * 60 * 1000 },
];

const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  track, isPlaying, progress, duration, authors, onPlayPause, onSeek, onMinimize, onClose, onNext, onPrev, onPlayInBackground,
  comments, onAddComment, onDeleteComment, onUpdateComment, onLikeComment, currentUserName,
  playbackRate, onPlaybackRateChange, onOpenFile, onShowInstantView, isInLibrary, onToggleLibrary,
  volume, onVolumeChange, repeatMode, onRepeatModeChange, isShuffle, onShuffleToggle, sleepTimer, onSleepTimer,
  onPlayEpisode, activeTab, onTabChange, theme, onToggleTheme, onOpenProfile, podcasts,
  onToggleEpisode, isEpisodeInLibrary,
}) => {
  const isDark = theme === 'dark';
  const currentTime = duration * progress;
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; text: string } | null>(null);
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const { podcast, episode, episodeIndex } = track;
  const episodeComments = comments.filter(c => !c.parentId && String(c.podcastId) === String(podcast.id || (podcast as any)._id) && c.episodeIndex === episodeIndex);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [episodeComments.length]);

  const author = authors.find(a => a.id === podcast.speakerId);
  const hasStudyText = episode.fullText && episode.fullText.trim().length > 0;
  const rawCover = episode.cover || podcast.cover || DEFAULT_COVER;
  const coverUrl = String(rawCover || '');
  const totalEpisodes = podcast.episodes.length;

  const likedComments = new Set<string>(JSON.parse(localStorage.getItem('soha_liked_comments') || '[]'));

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    onAddComment(commentText.trim(), track, pendingTimestamp ?? undefined, replyTo?.id || undefined);
    setCommentText('');
    setReplyTo(null);
    setPendingTimestamp(null);
  };

  const isOwnComment = (c: Comment) => currentUserName && c.author === currentUserName;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input[type="range"]')) return;
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 0) setTouchDeltaY(dy * 0.4);
  }, [touchStartY]);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaY > 100) onMinimize();
    else setTouchDeltaY(0);
  }, [touchDeltaY, onMinimize]);

  const renderRate = (r: number) => r === 1 ? '۱x' : r === 1.5 ? '۱٫۵x' : r === 2 ? '۲x' : `${r}x`;

  const eqBars = Array.from({ length: 9 }, (_, i) => (
    <span key={i} className={`block w-[5px] rounded-full bg-primary animate-eq animate-eq-${i + 1} ${isPlaying ? 'opacity-100' : (isDark ? 'opacity-20 animate-none' : 'opacity-40 animate-none')}`} style={{ height: isPlaying ? undefined : '3px' }} />
  ));

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col overflow-hidden no-scrollbar"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ height: '100dvh', transform: `translateY(${touchDeltaY}px)`, transition: touchDeltaY === 0 ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}>

      {/* Ambient background */}
      <div className={`absolute inset-0 ${isDark ? 'bg-gray-950' : 'bg-gray-50'} pointer-events-none z-0`}></div>

      {/* ======== MOBILE LAYOUT ======== */}
      <div className="relative z-10 lg:hidden flex flex-col h-full overflow-hidden">
        {/* Background blur from cover */}
        {coverUrl && <div className="absolute inset-0 pointer-events-none z-0"><img src={coverUrl} alt="" className="absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] object-cover blur-[60px] opacity-[0.08]" /><div className={`absolute inset-0 ${isDark ? 'bg-gray-950/80' : 'bg-white/80'}`}></div></div>}
        {/* Back button */}
        <button onClick={onMinimize} className={`fixed top-3 left-3 z-30 w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-white/60 hover:text-white bg-gray-800 border-white/[0.06]' : 'text-gray-500 hover:text-gray-900 bg-gray-100 border-gray-200'} active:scale-90 transition-all border`}>
          <i className="fas fa-chevron-right text-xs"></i>
        </button>
        <button onClick={onClose} className={`fixed top-3 right-3 z-30 w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-white/60 hover:text-white bg-gray-800 border-white/[0.06]' : 'text-gray-500 hover:text-gray-900 bg-gray-100 border-gray-200'} active:scale-90 transition-all border`}>
          <i className="fas fa-xmark text-xs"></i>
        </button>

        {/* Cover + info */}
        <div className="relative z-10 flex-shrink-0 px-4 pt-12 pb-2">
          <div className="flex gap-4 items-center w-full">
            <div className={`relative w-[80px] h-[80px] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex-shrink-0 ring-2 ${isDark ? 'ring-white/[0.08]' : 'ring-gray-200'}`}>
              {coverUrl ? (
                <img src={coverUrl} alt={String(episode.title)} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                  <i className={`fas fa-headphones ${isDark ? 'text-white/40' : 'text-gray-500'} text-xl`}></i>
                </div>
              )}
              {isPlaying && <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <h2 className={`text-[15px] font-black ${isDark ? 'text-white' : 'text-gray-900'} leading-snug line-clamp-1`}>{String(episode.title)}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] font-semibold" style={{ color: '#06b6d4' }}>{String(author?.name || '')}</p>
                <span className={`text-[9px] ${isDark ? 'text-white/40 bg-white/[0.06]' : 'text-gray-500 bg-gray-100'} px-2 py-0.5 rounded-md font-mono tracking-wider`}>{toPersianDigits(episodeIndex + 1)}/{toPersianDigits(totalEpisodes)}</span>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <button onClick={onToggleLibrary}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isInLibrary ? 'text-[#06b6d4] bg-[#06b6d4]/10' : 'text-white/30 hover:text-white/60 bg-white/[0.04]'}`}>
                <i className={`${isInLibrary ? 'fas' : 'far'} fa-bookmark text-sm`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="relative z-10 px-4 mt-4">
          <div dir="ltr" className="relative h-4 flex items-center cursor-pointer"
            onMouseDown={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}
            onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setSeekPreview(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}
            onMouseLeave={() => setSeekPreview(null)}
            onTouchStart={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const t = e.touches[0]; onSeek(Math.max(0, Math.min(1, (t.clientX - rect.left) / rect.width))); }}
            onTouchMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const t = e.touches[0]; setSeekPreview(Math.max(0, Math.min(1, (t.clientX - rect.left) / rect.width))); }}
            onTouchEnd={() => setSeekPreview(null)}>
            <div className={`w-full h-[2px] ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'} rounded-full relative overflow-hidden`}>
              <div className="absolute h-full rounded-full" style={{ width: `${(progress || 0) * 100}%`, background: 'linear-gradient(90deg, #06b6d4, #10b981)' }}></div>
            </div>
            {seekPreview !== null && (
              <div className={`absolute -top-4 -translate-x-1/2 ${isDark ? 'bg-gray-900/95 text-white border-white/10' : 'bg-white/95 text-gray-900 border-gray-200 shadow-lg'} text-[7px] font-mono px-1.5 py-0.5 rounded-md border pointer-events-none`} style={{ left: `${seekPreview * 100}%` }}>
                {formatTime(duration * seekPreview)}
              </div>
            )}
          </div>
          <div className={`flex justify-between text-[7px] font-mono ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
            <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="relative z-10 flex items-center justify-center gap-4 px-4 -mt-1 w-full translate-x-6 lg:translate-x-0">
          <button onClick={() => onRepeatModeChange(repeatMode === 'none' ? 'one' : repeatMode === 'one' ? 'all' : 'none')}
            className={`relative w-8 h-8 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center transition-all text-[11px] lg:text-[10px] ${repeatMode !== 'none' ? 'text-emerald-400 bg-emerald-400/15 ring-1 ring-emerald-400/30' : 'text-white/40'}`}>
            <i className={`fas fa-repeat ${repeatMode !== 'none' ? 'text-white' : ''}`}></i>
            {repeatMode === 'one' && <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-emerald-500 text-[7px] text-white font-bold rounded-full flex items-center justify-center">۱</span>}
          </button>
          <button onClick={onNext} className={`${isDark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-900'} active:scale-90 transition-all text-lg lg:text-sm`}><i className="fas fa-forward-step"></i></button>
          <button onClick={onPlayPause} className="w-14 h-14 lg:w-10 lg:h-10 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-emerald-500/20" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-white text-lg lg:text-sm ${!isPlaying ? 'mr-0.5' : ''}`}></i>
          </button>
          <button onClick={onPrev} className={`${isDark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-900'} active:scale-90 transition-all text-lg lg:text-sm`}><i className="fas fa-backward-step"></i></button>
        </div>

        {/* Play in background (mobile) */}
        <button onClick={onPlayInBackground}
          className={`relative z-10 mx-auto mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black transition-all active:scale-95 ${isDark ? 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1] border border-white/[0.08]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>
          <i className="fas fa-compact-disc text-[10px]" style={{ color: '#06b6d4' }}></i>
          پخش در پس‌زمینه
        </button>

        {/* Extras single row */}
        <div className="relative z-10 flex items-center justify-center gap-3 px-4 mt-4 w-full">
          <button onClick={() => onPlaybackRateChange(playbackRate >= 2 ? 0.75 : +(playbackRate + 0.25).toFixed(2))}
            className={'w-6 h-6 rounded-md flex items-center justify-center transition-all text-[8px] font-black ' + (playbackRate !== 1 ? 'text-emerald-400 bg-emerald-400/15' : (isDark ? 'text-white/30' : 'text-gray-400'))}>
            {renderRate(playbackRate)}
          </button>
          <button onClick={() => { const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(episode.audioUrl || '')}`; const a = document.createElement('a'); a.href = proxyUrl; a.download = `${episode.title}.mp3`; a.click(); }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'} active:scale-90 transition-all text-xs`}>
            <i className="fas fa-download"></i>
          </button>
          <button onClick={() => setShowQueue(true)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'} active:scale-90 transition-all text-xs`}>
            <i className="fas fa-list"></i>
          </button>
          <div className={`w-px h-4 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
          {hasStudyText && (
            <button onClick={() => onShowInstantView(String(episode.title), String(episode.fullText || ''))}
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'} active:scale-90 transition-all text-xs`}>
              <i className="fas fa-book-open"></i>
            </button>
          )}
          <div className="relative" dir="ltr">
            <button onClick={() => setShowVolume(!showVolume)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'} active:scale-90 transition-all text-xs`}>
              <i className={`fas ${volume <= 0 ? 'fa-volume-off' : volume < 0.3 ? 'fa-volume-down' : 'fa-volume-up'}`}></i>
            </button>
            {showVolume && (
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${isDark ? 'bg-gray-900 border-white/[0.08]' : 'bg-white border-gray-200'} rounded-xl p-2 shadow-xl z-50`}>
                <input type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={e => { onVolumeChange(parseFloat(e.target.value)); }}
                  className="w-14 h-1 appearance-none bg-white/20 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/20 [&::-moz-range-track]:border-0" />
              </div>
            )}
          </div>
        </div>

        {/* Comments (mobile) */}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col px-4 mt-0 overflow-visible" dir="rtl">
          <div className="flex-shrink-0 flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <i className="fas fa-comments text-emerald-400/60 text-[10px]"></i>
              <h3 className={`text-[10px] font-black ${isDark ? 'text-white/60' : 'text-gray-600'}`}>یادداشت‌ها</h3>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">{toPersianDigits(comments.length)} نظر</span>
          </div>
          <div className={`flex-1 ${isDark ? 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] border-white/[0.08] shadow-black/20' : 'bg-gradient-to-b from-gray-50 to-white border-gray-200 shadow-gray-200/50'} backdrop-blur-2xl rounded-2xl border flex flex-col overflow-y-auto min-h-0 mb-1.5 shadow-lg`}>
            <div className="flex-1 overflow-y-auto space-y-1 p-2 no-scrollbar text-right">
              {episodeComments.length > 0 ? episodeComments.map(cmt => renderComment(cmt, false, 0)) : (
                <div className={`flex flex-col items-center justify-center py-6 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'} flex items-center justify-center mb-2`}>
                    <i className={`fas fa-comment-dots text-base ${isDark ? 'text-white/15' : 'text-gray-300'}`}></i>
                  </div>
                  <p className={`text-[10px] font-bold ${isDark ? 'text-white/20' : 'text-gray-400'}`}>هنوز یادداشتی ثبت نشده</p>
                  <p className={`text-[8px] ${isDark ? 'text-white/10' : 'text-gray-300'} mt-0.5`}>اولین نفر باشید</p>
                </div>
              )}
              <div ref={commentsEndRef} />
            </div>
          </div>
          {replyTo && (
            <div className={`flex items-center gap-2 mb-1.5 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} p-2 rounded-xl`}>
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-reply text-emerald-400 text-[7px]"></i>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold text-emerald-400 block">پاسخ به {String(replyTo.author)}</span>
                <span className={`text-[8px] ${isDark ? 'text-gray-500' : 'text-gray-400'} truncate block`}>{String(replyTo.text)}</span>
              </div>
              <button onClick={() => setReplyTo(null)} className={`w-4 h-4 rounded-full flex items-center justify-center ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                <i className="fas fa-times text-[7px]"></i>
              </button>
            </div>
          )}
          {pendingTimestamp !== null && (
            <div className="flex items-center gap-1.5 mb-1.5 bg-emerald-500/10 rounded-xl px-2 py-1">
              <i className="fas fa-music text-emerald-400 text-[7px]"></i>
              <span className="text-[8px] text-emerald-400 font-bold">لحظه {formatTime(pendingTimestamp)}</span>
              <button onClick={() => setPendingTimestamp(null)} className={`${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'} ml-auto`}><i className="fas fa-times text-[7px]"></i></button>
            </div>
          )}
          <div className="flex gap-1.5 items-center pb-2 pt-1" dir="ltr">
            <button onClick={handleSubmitComment} disabled={!commentText.trim()}
              className="bg-emerald-500 text-white w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 flex-shrink-0">
              <i className="fas fa-paper-plane text-[10px]"></i>
            </button>
            <div className="flex-1 relative" dir="rtl">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                placeholder={replyTo ? 'پاسخ...' : 'یادداشت...'}
                className={`w-full ${isDark ? 'bg-gray-800 text-white border-white/[0.06]' : 'bg-gray-100 text-gray-900 border-gray-300'} text-xs rounded-xl px-3 py-2.5 outline-none border focus:border-emerald-500/40 transition-all text-right`} />
            </div>
            <button onClick={(e) => { setPendingTimestamp(pendingTimestamp !== null ? null : Math.floor(currentTime)); e.currentTarget.blur(); }}
              className={'w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0 ' + (pendingTimestamp !== null ? 'bg-emerald-500 text-white' : (isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'))}>
              <i className="fas fa-music text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ======== DESKTOP LAYOUT ======== */}
      <div className="hidden lg:flex h-full overflow-hidden flex-row-reverse relative z-10">
        {/* Back button - desktop */}
        <button onClick={onMinimize} className={`absolute top-4 left-4 z-30 w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'text-white/50 hover:text-white bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.1]' : 'text-gray-500 hover:text-gray-900 bg-gray-100 border-gray-200 hover:bg-gray-200'} active:scale-90 transition-all border`}>
          <i className="fas fa-chevron-right text-xs"></i>
        </button>
        {/* Suggested playlists - Right */}
        <div className={`w-72 flex-shrink-0 h-full overflow-y-auto no-scrollbar ${isDark ? 'border-l border-white/[0.06] bg-gray-900' : 'border-l-2 border-gray-200 bg-white'}`}>
          <div className="flex flex-col h-full">
            <div className={`flex items-center justify-between px-5 pt-8 pb-5 ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-gray-200'}`}>
              <span className={`text-sm font-black ${isDark ? 'text-white/50' : 'text-gray-600'}`}>پیشنهادی</span>
              <i className={`fas fa-headphones text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}></i>
            </div>
            <div className="flex-1 px-3 py-4 space-y-1">
              {podcasts.filter(p => String(p.id || (p as any)._id) !== String(track.podcast.id || (track.podcast as any)._id)).slice(0, 8).map(p => {
                const pAuthor = authors.find(a => a.id === p.speakerId);
                const epCount = p.episodes?.length || 0;
                const cover = String(p.cover || '');
                return (
                  <button key={String(p.id || (p as any)._id)} onClick={() => { onPlayEpisode(p, 0); }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-100'} transition-all text-right group`}>
                    <div className={`w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 ring-1 ${isDark ? 'ring-white/[0.06] bg-gray-800' : 'ring-gray-200 bg-gray-100'}`}>
                      {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800"><i className="fas fa-podcast text-white/60 text-xs"></i></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${isDark ? 'text-white/70 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'} truncate transition-colors`}>{String(p.title)}</p>
                      <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-500'} mt-0.5`}>{String(pAuthor?.name || '')} · {toPersianDigits(epCount)} قسمت</p>
                    </div>
                    <i className={`fas fa-play text-[9px] ${isDark ? 'text-white/0' : 'text-transparent'} group-hover:text-primary transition-all`}></i>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content - Middle */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          {/* Background blur from cover */}
          {coverUrl && <div className="absolute inset-0 overflow-hidden pointer-events-none"><img src={coverUrl} alt="" className="absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] object-cover blur-[60px] opacity-[0.12]" /><div className={`absolute inset-0 ${isDark ? 'bg-gray-900/80' : 'bg-white/80'}`}></div></div>}
          
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-2 pt-4 pb-2 overflow-y-auto no-scrollbar">
            {/* Cover with audio waveform */}
            <div className="relative mb-5 flex-shrink-0 w-full max-w-3xl flex items-center justify-center gap-3">
              {coverUrl && <div className="absolute -inset-6 rounded-3xl opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #06b6d4 0%, #0891b2 50%, transparent 80%)' }}></div>}

              {/* Left waveform - full space */}
              {isPlaying && (
              <div className="relative z-10 flex-1 h-[180px] flex items-center justify-end overflow-hidden">
                <div className="flex items-center gap-[2px] h-full py-2 justify-end">
                  {[3,7,12,8,15,10,18,8,14,6,16,11,9,13,7,17,10,5,14,8,12,6,15,9,11,7,13,16,8,10,5,14,9,12,7,4,16,11,8,19,6,13,10,15,7,12,9,17,5,11,14,8,6,18,10,13,7,15,9,12,4,16,8,11,19,7,14,6,10,13,17,5,9,12,15,8,11,14,6,10,7,18,13,9,16,5,11,8,12,14,7,10,15,6,13,9,11,17,8,4,12,10,16,7,14,5,9,13,11,18,6,8,15,10,12,7,14,16,9,11,5,13,8,10,6,17,12,15,7,14,9,11,19,4,8,13,6,16,10,5,12,7,15,11,18,9,14,13,8,6,10,17,5,12,16,7,11,14,9,15,8,10,13,6,19,4,12,7,16,11,5,14,9,18,8,10,15,6,13,7,11,17,12,4,9,14,16,5,8,10,13,6,15,7,11,18,12,19,9,14,4,16,10,5,8,13,6,7,15,11,17,12,9,14,18,10,16,13,8,5,6,11,15,7,4,19,12,9,14,17,10,16,8,13,6,11,15,5,7,18,12,19,9,14,4,16,10,8,6,13,11,17,15,7,12,5,14,18,9,16,10,19,4,8,6,13,11,15,7,17,12,5,14,18,9,16,10].map((h, i) => (
                    <div key={`lw${i}`} className="w-[2px] rounded-full flex-shrink-0" style={{
                      height: `${h * 5}%`,
                      background: i % 2 === 0 ? '#06b6d4' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.15)',
                      opacity: 0.4 + (h / 25),
                      animation: `waveBar 0.${1 + (i % 4)}s ease-in-out ${i * 0.015}s infinite alternate`,
                    }}></div>
                  ))}
                </div>
              </div>
              )}

              {/* Cover */}
              <div className={`relative w-[180px] h-[180px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ${isDark ? 'ring-white/[0.08]' : 'ring-gray-200'} z-10 flex-shrink-0`}>
                {coverUrl ? (
                  <img src={coverUrl} alt={String(episode.title)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-gray-800"><i className="fas fa-headphones text-white/30 text-4xl"></i></div>
                )}
                {isPlaying && <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center shadow-lg animate-pulse"><i className="fas fa-pause text-white text-[10px]"></i></div>}
              </div>

              {/* Right waveform - full space */}
              {isPlaying && (
              <div className="relative z-10 flex-1 h-[180px] flex items-center justify-start overflow-hidden">
                <div className="flex items-center gap-[2px] h-full py-2 justify-start">
                  {[8,14,6,11,16,9,5,13,7,17,10,12,8,15,6,11,14,9,7,16,10,13,5,12,8,15,7,11,9,14,6,10,13,8,12,19,4,7,16,11,5,18,9,14,10,13,17,6,12,8,15,7,11,4,16,10,18,9,14,19,6,13,5,8,12,7,17,11,15,10,4,16,6,14,9,13,8,18,5,12,7,11,17,15,10,19,4,16,6,14,8,13,9,12,18,5,7,11,17,15,10,16,4,19,6,14,8,13,12,9,18,5,7,11,17,15,10,16,6,4,19,14,8,13,12,9,18,5,7,11,17,15,10,16,6,14,19,4,8,13,12,9,18,5,7,11,17,15,10,16,6,14,19,8,13,12,9,18,5,7,11,17,15,10,16,6,14,4,19,8,13,12,9,18,5,7,11,17,15,10,16,6,14,19,4,8,13,12,9,18,5,7,11,17,15,10,16,6,14,19,8,13,12,9,18,5,7,11,17,15,10,16,6,14,19,4,8,13,12,9,18,5,7,11,17,15,10,16,6,14,19,8,13,12,9,18,5,7,11,17,15,10,16,6,14,19,4,8,13,12,9,18,5,7,11,17,15,10,16,6,14,19].map((h, i) => (
                    <div key={`rw${i}`} className="w-[2px] rounded-full flex-shrink-0" style={{
                      height: `${h * 5}%`,
                      background: i % 2 === 0 ? '#06b6d4' : 'rgba(255,255,255,0.6)',
                      opacity: 0.4 + (h / 25),
                      animation: `waveBar 0.${1 + ((i + 2) % 4)}s ease-in-out ${i * 0.015}s infinite alternate`,
                    }}></div>
                  ))}
                </div>
              </div>
              )}
            </div>

            {/* Title */}
            <div className="text-center mb-4 w-full max-w-md">
              <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} leading-snug line-clamp-1`}>{String(episode.title)}</h2>
            </div>

            {/* Progress */}
            <div className="w-full max-w-md mb-3">
              <div dir="ltr" className="relative group cursor-pointer"
                onMouseDown={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}
                onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setSeekPreview(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}
                onMouseLeave={() => setSeekPreview(null)}>
                <div className={`w-full h-[4px] ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'} rounded-full relative overflow-hidden group-hover:h-[6px] transition-all`}>
                  <div className="absolute h-full rounded-full" style={{ width: `${(progress || 0) * 100}%`, background: 'linear-gradient(90deg, #10b981, #6366f1)' }}></div>
                </div>
                {seekPreview !== null && (
                  <div className={`absolute -top-7 -translate-x-1/2 ${isDark ? 'bg-gray-800/95 backdrop-blur-xl text-white border-white/10' : 'bg-white/95 backdrop-blur-xl text-gray-900 border-gray-200 shadow-xl'} text-[10px] font-mono px-2 py-1 rounded-lg border pointer-events-none`} style={{ left: `${seekPreview * 100}%` }}>
                    {formatTime(duration * seekPreview)}
                  </div>
                )}
              </div>
              <div className={`flex justify-between text-[11px] font-mono ${isDark ? 'text-white/20' : 'text-gray-400'} mt-1`}>
                <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
                <span>{formatTime(currentTime)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-5 mb-3">
              <button onClick={onShuffleToggle}
                className={'w-9 h-9 rounded-xl flex items-center justify-center transition-all text-xs ' + (isShuffle ? 'text-primary bg-primary/[0.12]' : (isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-900'))}>
                <i className="fas fa-shuffle"></i>
              </button>
              <button onClick={onNext} className={`${isDark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-900'} active:scale-90 transition-all text-xl`}><i className="fas fa-forward-step"></i></button>
              <button onClick={onPlayPause} className="w-14 h-14 rounded-full flex items-center justify-center text-xl active:scale-90 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-white ${!isPlaying ? 'mr-0.5' : ''}`}></i>
              </button>
              <button onClick={onPrev} className={`${isDark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-900'} active:scale-90 transition-all text-xl`}><i className="fas fa-backward-step"></i></button>
              <button onClick={() => onRepeatModeChange(repeatMode === 'none' ? 'one' : repeatMode === 'one' ? 'all' : 'none')}
                className={'relative w-9 h-9 rounded-xl flex items-center justify-center transition-all text-xs ' + (repeatMode !== 'none' ? 'text-emerald-400 bg-emerald-400/15 ring-1 ring-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.25)]' : (isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-900'))}>
                <i className={`fas fa-repeat ${repeatMode !== 'none' ? 'text-white' : ''}`}></i>
                {repeatMode === 'one' && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 text-[7px] text-white font-bold rounded-full flex items-center justify-center ring-2 ring-black/20">۱</span>}
              </button>
            </div>

            {/* Extras row */}
            <div className="flex items-center gap-3">
              <button onClick={() => onPlaybackRateChange(playbackRate >= 2 ? 0.75 : +(playbackRate + 0.25).toFixed(2))}
                className={'w-8 h-8 rounded-lg flex items-center justify-center transition-all text-[10px] font-black ' + (playbackRate !== 1 ? 'text-primary bg-primary/[0.12]' : (isDark ? 'text-white/25 hover:text-white/50' : 'text-gray-400 hover:text-gray-900'))}>
                {renderRate(playbackRate)}
              </button>
              <div className="flex items-center gap-1 relative" dir="ltr">
                <button onClick={() => setShowVolume(!showVolume)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-white/25 hover:text-white/50' : 'text-gray-400 hover:text-gray-700'} transition-all`}>
                  <i className={`fas ${volume <= 0 ? 'fa-volume-off' : volume < 0.3 ? 'fa-volume-down' : 'fa-volume-up'} text-[10px]`}></i>
                </button>
                {showVolume && (
                  <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 ${isDark ? 'bg-gray-800/95 border-white/[0.08]' : 'bg-white/95 border-gray-200'} backdrop-blur-xl border rounded-xl p-2 shadow-xl z-50`}>
                    <input type="range" min="0" max="1" step="0.01" value={volume}
                      onChange={e => onVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-1.5 appearance-none bg-white/20 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/20 [&::-moz-range-track]:border-0" />
                  </div>
                )}
              </div>
              <button onClick={() => { const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(episode.audioUrl || '')}`; const a = document.createElement('a'); a.href = proxyUrl; a.download = `${episode.title}.mp3`; a.click(); }} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-white/25 hover:text-white/50' : 'text-gray-400 hover:text-gray-900'} transition-all text-[10px]`}><i className="fas fa-download"></i></button>
              <button onClick={() => setShowQueue(true)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-white/25 hover:text-white/50' : 'text-gray-400 hover:text-gray-900'} transition-all text-[10px]`}><i className="fas fa-list"></i></button>
              <button onClick={onToggleLibrary} className={'w-8 h-8 rounded-lg flex items-center justify-center transition-all text-[10px] ' + (isInLibrary ? 'text-primary' : (isDark ? 'text-white/25 hover:text-white/50' : 'text-gray-400 hover:text-gray-900'))}>
                <i className={`${isInLibrary ? 'fas' : 'far'} fa-bookmark`}></i>
              </button>
              <button onClick={onPlayInBackground} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg transition-all text-[10px] font-black ${isDark ? 'text-white/40 hover:text-white border border-white/[0.08] bg-white/[0.04]' : 'text-gray-500 hover:text-gray-900 border border-gray-200 bg-gray-50'}`}>
                <i className="fas fa-compact-disc text-[10px]" style={{ color: '#06b6d4' }}></i>
                پس‌زمینه
              </button>
              {hasStudyText && (
                <button onClick={() => onShowInstantView(String(episode.title), String(episode.fullText || ''))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-white/25 hover:text-white/50' : 'text-gray-400 hover:text-gray-900'} transition-all text-[10px]`}>
                  <i className="fas fa-book-open"></i>
                </button>
              )}
            </div>
          </div>

          {/* Comments (desktop) */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col px-4 pb-0" dir="rtl">
              <div className={`flex-1 max-w-3xl mx-auto w-full ${isDark ? 'bg-gradient-to-b from-[#041e2b] via-[#062030] to-[#082538] border-white/[0.06]' : 'bg-gradient-to-b from-gray-50 via-white to-white border-gray-200'} rounded-2xl border flex flex-col overflow-hidden min-h-0`}>
                <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-1">
                  <h3 className={`text-sm font-black ${isDark ? 'text-white/70' : 'text-gray-700'}`}>یادداشت‌ها</h3>
                  <span className="bg-primary/15 text-primary text-xs font-black px-2.5 py-0.5 rounded-full">{toPersianDigits(comments.length)} نظر</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 px-4 pb-2 no-scrollbar text-right">
                  {episodeComments.length > 0 ? episodeComments.map(cmt => renderComment(cmt, true, 0)) : (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-600">
                      <i className="fas fa-comment-slash text-xl mb-2"></i>
                      <p className="text-xs font-black">هنوز یادداشتی ثبت نشده است.</p>
                    </div>
                  )}
                  <div ref={commentsEndRef} />
                </div>
                <div className={`border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-200'} px-4 py-2.5`}>
                  {replyTo && (
                    <div className={`flex items-start gap-2 mb-2 ${isDark ? 'bg-white/[0.08] border-white/[0.06]' : 'bg-gray-50 border-gray-200'} p-3 rounded-xl border`}>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-primary block mb-0.5">
                          <i className="fas fa-reply ml-1 text-[8px]"></i>
                          {'پاسخ به ' + String(replyTo.author)}
                        </span>
                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed whitespace-pre-wrap break-words`}>{String(replyTo.text)}</p>
                      </div>
                      <button onClick={() => setReplyTo(null)} className={`${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'} flex-shrink-0 mt-0.5`}><i className="fas fa-times text-[9px]"></i></button>
                    </div>
                  )}
                  {pendingTimestamp !== null && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex items-center gap-1 bg-primary/10 text-primary rounded-lg px-2 py-0.5 text-[10px] font-bold">
                        <i className="fas fa-music text-[7px]"></i>
                        <span>{'لحظه ' + formatTime(pendingTimestamp)}</span>
                      </div>
                      <button onClick={() => setPendingTimestamp(null)} className={`${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'} text-[8px]`}><i className="fas fa-times"></i></button>
                    </div>
                  )}
                  <div className="flex gap-2 items-end" dir="ltr">
                    <button onClick={handleSubmitComment} disabled={!commentText.trim()}
                      className="bg-primary text-white w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 flex-shrink-0 shadow-lg shadow-primary/20">
                      <i className="fas fa-paper-plane text-sm"></i>
                    </button>
                    <div className="flex-1 relative" dir="rtl">
                      <input value={commentText} onChange={e => setCommentText(e.target.value)}
                        placeholder={replyTo ? 'پاسخ...' : 'یادداشت...'}
                        className={`w-full ${isDark ? 'bg-white/[0.06] text-white border-white/[0.08]' : 'bg-gray-100 text-gray-900 border-gray-300'} text-sm rounded-xl px-3 py-2.5 outline-none border focus:border-primary/50 transition-all text-right`}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }} />
                    </div>
                    <button onClick={(e) => { setPendingTimestamp(pendingTimestamp !== null ? null : Math.floor(currentTime)); e.currentTarget.blur(); }}
                      className={'w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0 ' + (pendingTimestamp !== null ? 'bg-primary text-white shadow-lg shadow-primary/20' : (isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'))}
                      title="ثبت با لحظه صوتی">
                      <i className="fas fa-music text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Nav sidebar - Left */}
        <div className={`w-72 flex-shrink-0 h-full overflow-y-auto no-scrollbar ${isDark ? 'border-r border-white/[0.06] bg-gray-900' : 'border-r-2 border-gray-200 bg-white/95'}`}>
          <div className="flex flex-col h-full">
            <div className={`flex items-center justify-between px-5 pt-8 pb-6 ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-gray-200'}`}>
              <span className="text-lg font-black font-nastaliq bg-gradient-to-l from-emerald-400 to-emerald-600 bg-clip-text text-transparent">سرای هنر و اندیشه</span>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {[
                { page: 'mahfel' as Page, icon: 'fas fa-comments', label: 'محفل' },
                { page: 'sowt' as Page, icon: 'fas fa-podcast', label: 'صوت' },
                { page: 'library' as Page, icon: 'fas fa-book-open', label: 'کتابخانه' },
                { page: 'videos' as Page, icon: 'fas fa-video', label: 'ویدیو' },
                { page: 'nashr' as Page, icon: 'fas fa-book-reader', label: 'نشر' },
                { page: 'ai' as Page, icon: 'fas fa-robot', label: 'هوش مصنوعی' },
              ].map(item => {
                const isActive = activeTab === item.page;
                return (
                  <button key={item.page}
                    onClick={() => { onTabChange(item.page); onClose(); }}
                    className={`w-full flex items-center gap-3 py-3 text-sm font-bold transition-all ${
                      isActive
                        ? 'text-white shadow-md shadow-emerald-500/10 mr-3 -ml-3 rounded-r-2xl px-5'
                        : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.06] mx-3 rounded-2xl px-4' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 mx-3 rounded-2xl px-4')
                    }`}
                    style={isActive ? { background: 'linear-gradient(135deg, var(--primary), #0d9488)' } : {}}
                  >
                    <i className={`${item.icon} text-base w-5 text-center ${isActive ? '' : (isDark ? 'text-white/30' : 'text-gray-400')}`} />
                    <span>{item.label}</span>
                    {isActive && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-white/60"></span>}
                  </button>
                );
              })}
            </nav>
            <div className={`px-3 pb-4 space-y-1 ${isDark ? 'border-t border-white/[0.06]' : 'border-t border-gray-200'} pt-4`}>
              <button onClick={() => { onClose(); onToggleTheme(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-base w-5 text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                <span>{theme === 'dark' ? 'روشن' : 'تیره'}</span>
              </button>
              <button onClick={() => { onClose(); onOpenProfile(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                <i className={`fas fa-user text-base w-5 text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                <span>پروفایل</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {showSleepMenu && (
        <div className="absolute inset-0 z-[3000] bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fadeIn" onClick={() => setShowSleepMenu(false)}>
          <div className={`${isDark ? 'bg-gray-900 border-white/[0.08]' : 'bg-white border-gray-200'} rounded-3xl p-6 w-72 shadow-2xl animate-scaleIn`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} text-center mb-5`}>خواب‌گیر</h3>
            <div className="flex flex-col gap-2">
              {SLEEP_OPTIONS.map(opt => (
                <button key={opt.label} onClick={() => { onSleepTimer(opt.value); setShowSleepMenu(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all ${sleepTimer === opt.value ? 'bg-primary text-white' : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {sleepTimer !== null && (
              <button onClick={() => { onSleepTimer(null); setShowSleepMenu(false); }} className="w-full mt-3 py-2 text-xs text-red-400 font-bold text-center">لغو خواب‌گیر</button>
            )}
          </div>
        </div>
      )}

      {/* Queue drawer */}
      {showQueue && (
        <div className="absolute inset-0 z-[3000] bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={() => setShowQueue(false)}>
          <div className={`absolute bottom-0 left-0 right-0 max-h-[65vh] ${isDark ? 'bg-gray-900 border-white/[0.05]' : 'bg-white border-gray-200'} rounded-t-[2.5rem] p-5 shadow-2xl border-t animate-slideInUp`} onClick={e => e.stopPropagation()}>
            <div className={`w-12 h-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-300'} rounded-full mx-auto mb-5`}></div>
            <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-900'} mb-4 text-right`}>{'صف پخش · ' + toPersianDigits(totalEpisodes) + ' قسمت'}</h3>
            <div className="overflow-y-auto max-h-[45vh] space-y-0.5 no-scrollbar">
              {podcast.episodes.map((ep, i) => (
                <div key={i} className={`w-full flex items-center gap-2 p-2.5 rounded-xl transition-all ${i === episodeIndex ? 'bg-primary/[0.12] border border-primary/25' : (isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-100') + ' border border-transparent'}`}>
                  <button onClick={() => { onPlayEpisode(podcast, i); }} className="flex-1 flex items-center gap-3 text-right">
                    <span className={'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ' + (i === episodeIndex ? 'bg-primary text-white' : (isDark ? 'bg-white/[0.08] text-white/40' : 'bg-gray-100 text-gray-500'))}>
                      {toPersianDigits(i + 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={'text-xs font-bold truncate ' + (i === episodeIndex ? 'text-primary-light' : (isDark ? 'text-white/70' : 'text-gray-700'))}>{String(ep.title)}</p>
                      <p className={`text-[9px] ${isDark ? 'text-white/30' : 'text-gray-500'} mt-0.5`}>{String(ep.duration)}</p>
                    </div>
                    {i === episodeIndex && <i className="fas fa-play text-primary text-[10px]"></i>}
                  </button>
                  {onToggleEpisode && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleEpisode(String(podcast.id || (podcast as any)._id), i); }}
                      className={'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ' + (isEpisodeInLibrary?.(String(podcast.id || (podcast as any)._id), i) ? 'text-primary' : (isDark ? 'text-white/25 hover:text-white/50' : 'text-gray-400 hover:text-gray-900'))}>
                      <i className={`${isEpisodeInLibrary?.(String(podcast.id || (podcast as any)._id), i) ? 'fas' : 'far'} fa-bookmark text-[11px]`}></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );

  function renderComment(comment: Comment, isDesktop: boolean = false, depth: number = 0) {
    const d = (mobile: string, desktop: string) => isDesktop ? desktop : mobile;
    const cid = String((comment as any)._id || comment.id);
    const replies = comment.replies || [];
    const isOwn = isOwnComment(comment);
    const isEditing = editCommentId === cid;
    const isLiked = likedComments.has(cid);
    const parentComment = comment.parentId ? comments.find(c => String((c as any)._id || c.id) === String(comment.parentId)) : null;
    const maxDepth = 2;
    const isNested = depth > 0 && depth <= maxDepth;
    const isOverDepth = depth > maxDepth;

    return (
      <div key={cid} className={isNested ? d('mr-3', 'mr-5') : ''}>
        <div className={d(
          `flex items-start gap-2 p-2 rounded-xl group transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-gray-50 border-gray-200'} border ${isOverDepth ? 'opacity-80' : ''}`,
          `flex items-start gap-3 p-3 rounded-2xl group ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'} border ${isOverDepth ? 'opacity-80' : ''}`
        )}>
          {comment.authorAvatarUrl ? (
            <img src={String(comment.authorAvatarUrl)} alt="" className={d('w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-emerald-500/20', 'w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20')} />
          ) : (
            <div className={d('w-7 h-7 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center text-white font-black text-[10px]', 'w-9 h-9 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white font-black text-xs')}>{String(comment.author).charAt(0)}</div>
          )}
          <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className={d(`text-[10px] font-bold ${isDark ? 'text-white/70' : 'text-gray-700'}`, `text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`)}>{String(comment.author)}</span>
                <div className="flex items-center gap-1">
                  {(comment.audioTimestamp ?? comment.timestamp) !== undefined && (
                    <span onClick={() => { onSeek(Number(comment.audioTimestamp ?? comment.timestamp) / duration); if (!isPlaying) onPlayPause(); }}
                      className={d('text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 active:scale-95 transition-all', 'text-[10px] text-primary font-black bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 cursor-pointer hover:bg-primary/20 active:scale-95 transition-all')}>
                      {formatTime(Number(comment.audioTimestamp ?? comment.timestamp))}
                    </span>
                  )}
                </div>
              </div>
            {isEditing ? (
              <div className="mb-1">
                <textarea autoFocus value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                  className={d(`w-full ${isDark ? 'bg-white/[0.06] text-white border-emerald-500/30' : 'bg-gray-100 text-gray-900 border-gray-300'} text-[11px] rounded-xl p-2 outline-none resize-none border text-right`, `w-full ${isDark ? 'bg-white/5 text-white border-primary' : 'bg-gray-100 text-gray-900 border-gray-300'} text-sm rounded-xl p-2 outline-none resize-none border text-right`)} rows={3} />
                <div className="flex gap-1.5 mt-1 justify-start">
                  <button onClick={() => { if (onUpdateComment) onUpdateComment(cid, editCommentText); setEditCommentId(null); }}
                    className={d('text-[9px] bg-emerald-500 text-white px-3 py-1 rounded-lg font-bold active:scale-95', 'text-xs bg-primary text-white px-3 py-1 rounded-lg font-bold active:scale-95')}>ذخیره</button>
                  <button onClick={() => setEditCommentId(null)}
                    className={d(`text-[9px] ${isDark ? 'bg-white/[0.08] text-gray-400' : 'bg-gray-200 text-gray-600'} px-3 py-1 rounded-lg active:scale-95`, `text-xs ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'} px-3 py-1 rounded-lg active:scale-95`)}>لغو</button>
                </div>
              </div>
            ) : (
              <div>
                {parentComment && (
                  <div className={d(`text-[9px] ${isDark ? 'text-gray-500 bg-white/[0.04] border-emerald-500/30' : 'text-gray-400 bg-gray-50 border-emerald-300'} mb-1 rounded-lg px-2 py-0.5 border-r-2`, `text-[10px] ${isDark ? 'text-gray-500 bg-white/[0.04] border-primary/30' : 'text-gray-400 bg-gray-50 border-primary/30'} mb-1 rounded-lg px-2 py-0.5 border-r-2`)}>
                    <span className="text-emerald-400 font-bold">{String(parentComment.author)}: </span>
                    <span>{String(parentComment.text).substring(0, 60)}{String(parentComment.text).length > 60 ? '...' : ''}</span>
                  </div>
                )}
                <p onDoubleClick={() => { if (isOwn) { setEditCommentId(cid); setEditCommentText(String(comment.text)); } }}
                  onTouchEnd={(e) => { if (!isOwn) return; const now = Date.now(); if ((window as any).__lastCommentTouch && now - (window as any).__lastCommentTouch < 300) { (window as any).__lastCommentTouch = 0; setEditCommentId(cid); setEditCommentText(String(comment.text)); e.preventDefault(); } else { (window as any).__lastCommentTouch = now; } }}
                  className={d('text-[10px] leading-normal ' + (isDark ? 'text-white/50' : 'text-gray-700') + ' font-medium whitespace-pre-wrap break-words', 'text-sm leading-relaxed text-gray-400 font-medium whitespace-pre-wrap break-words')}>{String(comment.text)}</p>
              </div>
            )}
            <div className={d('flex items-center gap-2 mt-1', 'flex items-center gap-3 mt-2')}>
              <button onClick={() => { if (onLikeComment) onLikeComment(cid); }}
                className={d('text-[9px] flex items-center gap-1 transition-all active:scale-125', 'text-xs flex items-center gap-1 transition-all active:scale-125') + ` ${isLiked ? 'text-red-400' : (isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500')}`}>
                <i className={`${isLiked ? 'fas' : 'far'} fa-heart`}></i>
                {comment.likes ? toPersianDigits(comment.likes) : ''}
              </button>
              <button onClick={() => setReplyTo({ id: cid, author: String(comment.author), text: String(comment.text) })}
                className={d(`text-[9px] ${isDark ? 'text-gray-500 hover:text-emerald-400' : 'text-gray-400 hover:text-emerald-600'} transition-all active:scale-110`, `text-xs ${isDark ? 'text-gray-500 hover:text-primary' : 'text-gray-400 hover:text-primary'} transition-all active:scale-110`)}>
                <i className="fas fa-reply ml-1 text-[8px]"></i>پاسخ
              </button>
              {isOwn && (
                <button onClick={() => { if (onDeleteComment) onDeleteComment(cid); }}
                  className={d('text-[9px] text-gray-500 hover:text-red-400 active:scale-110', 'text-xs text-gray-500 hover:text-red-400 active:scale-110')}><i className="fas fa-trash"></i></button>
              )}
            </div>
          </div>
        </div>
        {replies.length > 0 && (
          <div className={d(isOverDepth ? '' : 'mr-3 mt-1 space-y-1', isOverDepth ? '' : 'mr-5 mt-2 space-y-1.5')}>{replies.map(r => renderComment(r, isDesktop, isOverDepth ? depth : depth + 1))}</div>
        )}
      </div>
    );
  }
};

export default FullScreenPlayer;
