
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Video, Comment, Author } from '../types';
import { toPersianDigits, formatTime } from '../utils/helpers';
import CustomVideoPlayer from '../components/CustomVideoPlayer';

import type { CustomVideoPlayerHandle } from '../components/CustomVideoPlayer';

interface VideoPlayerPageProps {
  video: Video;
  allVideos: Video[];
  comments: Comment[];
  authors: Author[];
  isMini?: boolean;
  initialTime?: number;
  onBack: () => void;
  onCloseMini?: () => void;
  onVideoSelect: (video: Video) => void;
  onAddComment: (text: string, video: Video, videoTimestamp?: number, parentId?: string, audioTimestamp?: number) => void;
  onAuthorSelect: (author: Author) => void;
  onPlayVideo: (video: Video) => void;
  userLibrary: string[];
  onToggleLibrary: (id: string) => void;
  onShare: (title: string, text: string) => void;
  onShowInstantView: (title: string, content: string) => void;
  userRole?: string;
  currentUserName?: string;
  onLikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  onVideoTimeUpdate?: (time: number) => void;
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
  onVideoLike?: (videoId: string, newLikes: number) => void;
}

const VideoPlayerPage: React.FC<VideoPlayerPageProps> = (props) => {
  const { video, allVideos, comments, authors, isMini = false, initialTime, onBack, onCloseMini, onVideoSelect, onAddComment,
    onAuthorSelect, onPlayVideo, userLibrary, onToggleLibrary, onShare,
    onShowInstantView, userRole, currentUserName, onLikeComment, onDeleteComment, onUpdateComment, onVideoTimeUpdate, onVideoPlay, onVideoPause, onVideoLike } = props;

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [liked, setLiked] = useState(() => {
    try {
      const videoId = String(video.id || (video as any)._id || '');
      return JSON.parse(localStorage.getItem('soha_liked_videos') || '[]').some((id: any) => String(id) === videoId);
    } catch { return false; }
  });
  const [likeCount, setLikeCount] = useState(video.likes || 0);

  useEffect(() => {
    const videoId = String(video.id || (video as any)._id || '');
    try {
      const liked = JSON.parse(localStorage.getItem('soha_liked_videos') || '[]').some((id: any) => String(id) === videoId);
      setLiked(liked);
    } catch { setLiked(false); }
  }, [video.id, (video as any)._id]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyToAuthor, setReplyToAuthor] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState('');
  const [commentSort, setCommentSort] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [highlightedComment, setHighlightedComment] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [markTimestamp, setMarkTimestamp] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('soha_liked_comments') || '[]')); } catch { return new Set(); }
  });
  const [seekLoading, setSeekLoading] = useState<{ time: number } | null>(null);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const videoPlayerRef = useRef<CustomVideoPlayerHandle>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const isInLibrary = userLibrary.some(id => String(id) === String(video.id) || String(id) === String((video as any)._id));
  const videoAuthor = authors.find(a => String(a.id) === String(video.authorId));
  const videoComments = comments.filter(c => String(c.videoId) === String(video.id) || String(c.videoId) === String((video as any)._id));
  const rootComments = videoComments.filter(c => !c.parentId);
  const replyToComment = replyTo ? videoComments.find(c => (c.id || (c as any)._id) === replyTo) || null : null;
  const related = useMemo(() => {
    const others = allVideos.filter(v => v.id !== video.id);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    return others.slice(0, 5);
  }, [allVideos, video.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCommentText('');
    setReplyTo(null);
    setCurrentTime(0);
    import('../services/api').then(m => m.recordVideoView(String(video.id || (video as any)._id || '')));
    const pendingTs = (window as any).__pendingVideoTimestamp;
    if (pendingTs !== undefined && pendingTs !== null) {
      delete (window as any).__pendingVideoTimestamp;
      setSeekLoading({ time: pendingTs });
      let tries = 0;
      const trySeek = () => {
        if (videoPlayerRef.current) {
          videoPlayerRef.current.seekTo(pendingTs, true);
        } else if (tries < 30) {
          tries++;
          setTimeout(trySeek, 200);
        }
      };
      trySeek();
    }
  }, [video.id]);

  const handleTimestampClick = (seconds: number, commentId: string) => {
    videoPlayerRef.current?.seekTo(seconds);
    setHighlightedComment(commentId);
    const el = document.getElementById(`comment-${commentId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedComment(null), 3000);
  };

  const handleLike = async () => {
    const videoId = String(video.id || (video as any)._id || '');
    if (!videoId) return;
    const likedVideos: string[] = JSON.parse(localStorage.getItem('soha_liked_videos') || '[]');
    const isCurrentlyLiked = likedVideos.some(id => String(id) === videoId);

    if (!isCurrentlyLiked) {
      likedVideos.push(videoId);
      setLikeCount(c => c + 1);
      setLiked(true);
    } else {
      const idx = likedVideos.findIndex(id => String(id) === videoId);
      if (idx > -1) likedVideos.splice(idx, 1);
      setLikeCount(c => Math.max(0, c - 1));
      setLiked(false);
    }
    localStorage.setItem('soha_liked_videos', JSON.stringify(likedVideos));

    try {
      const newLikes = await import('../services/api').then(m => m.likeVideo(videoId));
      if (newLikes !== null && newLikes !== undefined) {
        setLikeCount(newLikes);
        onVideoLike?.(videoId, newLikes);
      }
    } catch (e) {
      console.error('Like failed:', e);
      if (!isCurrentlyLiked) {
        const idx = likedVideos.findIndex(id => String(id) === videoId);
        if (idx > -1) likedVideos.splice(idx, 1);
        setLikeCount(c => Math.max(0, c - 1));
        setLiked(false);
      } else {
        likedVideos.push(videoId);
        setLikeCount(c => c + 1);
        setLiked(true);
      }
      localStorage.setItem('soha_liked_videos', JSON.stringify(likedVideos));
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    if (replyTo) {
      onAddComment(commentText, video, undefined, replyTo);
    } else if (markTimestamp) {
      onAddComment(commentText, video, currentTime);
    } else {
      onAddComment(commentText, video);
    }
    setCommentText('');
    setReplyTo(null);
    setReplyToAuthor('');
    showToast('نظر شما ثبت شد');
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo(commentId);
    setReplyToAuthor(authorName);
    commentInputRef.current?.focus();
  };

  const formatTimestamp = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return toPersianDigits(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    return toPersianDigits(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  };

  const sortedComments = [...rootComments].sort((a, b) => {
    if (commentSort === 'popular') return (b.likes || 0) - (a.likes || 0);
    if (commentSort === 'oldest') return new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime();
    return new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime();
  });

  const renderComment = (c: Comment, depth: number = 0) => {
    const cid = c.id || (c as any)._id;
    const isHighlighted = highlightedComment === cid;
    const isLiked = likedComments.has(cid);
    return (
    <div key={cid} id={`comment-${cid}`}
      className={`group transition-all duration-300 ${depth > 0 ? 'mr-6 md:mr-10' : ''} ${isHighlighted ? 'animate-highlight' : ''}`}>
      <div className={`relative rounded-2xl transition-all duration-300 overflow-hidden ${
        isHighlighted ? 'ring-2 ring-primary/30 shadow-lg shadow-primary/5 scale-[1.01]' : 'hover:shadow-md'
      } ${depth > 0 ? '' : ''}`}
        style={{
          background: isHighlighted
            ? 'color-mix(in srgb, var(--primary) 6%, var(--surface-2))'
            : depth > 0 ? 'var(--surface-3)' : 'var(--surface-2)',
          border: `1px solid ${isHighlighted ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--border)'}`,
        }}>
        {c.videoTimestamp != null && c.videoTimestamp > 0 && (
          <button onClick={() => handleTimestampClick(c.videoTimestamp!, cid)}
            className="flex items-center gap-1.5 pr-3 pt-2.5 pb-1 cursor-pointer text-[11px] font-bold transition-all hover:opacity-80"
            style={{ color: 'var(--primary)' }}>
            <i className="fas fa-clock text-[9px]" />
            <span>نظر روی {formatTimestamp(c.videoTimestamp)}</span>
          </button>
        )}
        <div className="flex gap-3 p-3.5 md:p-4">
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-lg transition-transform group-hover:scale-105 overflow-hidden"
          style={{ background: `linear-gradient(135deg, hsl(${(c.author.charCodeAt(0) * 37) % 360}, 60%, 50%), hsl(${(c.author.charCodeAt(0) * 73) % 360}, 60%, 40%))` }}>
          {c.authorAvatarUrl ? (
            <img src={c.authorAvatarUrl} alt={c.author} className="w-full h-full object-cover" />
          ) : c.author.charAt(0)}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="text-[13px] font-extrabold" style={{ color: 'var(--primary)' }}>{c.author}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{c.date}</span>
          </div>
          {editingCommentId === cid ? (
            <div>
              <input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)}
                onKeyDown={async (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const { updateComment } = await import('../services/api'); const newText = await updateComment(cid, editCommentText.trim()); if (newText) { onUpdateComment?.(cid, editCommentText.trim()); } setEditingCommentId(null); } if (e.key === 'Escape') setEditingCommentId(null); }}
                className="w-full bg-transparent outline-none text-[13px] leading-[2] font-medium px-2 py-1 rounded-lg" autoFocus
                style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
              <div className="flex gap-1.5 mt-1">
                <button onClick={async () => { const { updateComment } = await import('../services/api'); const newText = await updateComment(cid, editCommentText.trim()); if (newText) { onUpdateComment?.(cid, editCommentText.trim()); } setEditingCommentId(null); }}
                  className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                <button onClick={() => setEditingCommentId(null)}
                  className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
              </div>
            </div>
          ) : (
          <div className="text-[13px] leading-[2] whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>
            {c.text.includes('@') && c.text.match(/@(\S+)/) ? (
              c.text.split(/(@\S+)/).map((part, i) =>
                part.startsWith('@') ? (
                  <span key={i} className="font-bold" style={{ color: 'var(--primary)' }}>{part}</span>
                ) : <span key={i}>{part}</span>
              )
            ) : c.text.length > 300 ? (
              <>{c.text.substring(0, 300)}...
                <button onClick={() => onShowInstantView(c.author, c.text)}
                  className="font-semibold text-[11px] mt-1 block transition-colors hover:underline" style={{ color: 'var(--primary)' }}>مطالعه کامل</button>
              </>
            ) : c.text}
          </div>
          )}
          <div className="flex items-center gap-4 mt-2.5">
            <button onClick={() => handleReply(cid, c.author)}
              className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
              style={{ color: 'var(--text-3)' }}>
              <i className="fas fa-reply text-[9px]" /> پاسخ
            </button>
            {onLikeComment && (
              <button onClick={() => {
                onLikeComment(cid);
                const next = new Set(likedComments);
                if (next.has(cid)) next.delete(cid); else next.add(cid);
                setLikedComments(next);
                localStorage.setItem('soha_liked_comments', JSON.stringify([...next]));
              }}
                className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                style={{ color: isLiked ? 'var(--primary)' : 'var(--text-3)' }}>
                <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-[9px] ${isLiked ? 'text-primary' : ''}`} /> {toPersianDigits(c.likes || 0)}
              </button>
            )}
            {currentUserName === c.author && (
              <button onClick={() => { setEditingCommentId(cid); setEditCommentText(c.text); }}
                className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-pen text-[9px]" />
              </button>
            )}
            {onDeleteComment && currentUserName === c.author && (
              <button onClick={() => onDeleteComment(cid)}
                className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80 text-red-400/70 hover:text-red-400">
                <i className="fas fa-trash text-[9px]" />
              </button>
            )}
          </div>
        </div>
        </div>
      </div>
      {c.replies && c.replies.length > 0 && (
        <div className="space-y-2 mt-2.5">
          {c.replies.map(reply => renderComment(reply, depth + 1))}
        </div>
      )}
      {replyTo === cid && (
        <div className="mt-3 animate-fadeIn">
          <div className="flex gap-2">
            <textarea
              autoFocus
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
              rows={1}
              placeholder={`پاسخ به ${c.author}...`}
              className="flex-1 resize-none rounded-xl px-3 py-2.5 text-[12px] font-medium outline-none transition-all duration-200 focus:ring-2"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 25%, transparent)' } as any}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-30 active:scale-90 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
              <i className="fas fa-paper-plane text-[11px]" />
            </button>
          </div>
          <button onClick={() => { setReplyTo(null); setCommentText(''); }}
            className="mt-1.5 text-[10px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
            style={{ color: 'var(--text-3)' }}>
            <i className="fas fa-times ml-1" /> لغو پاسخ
          </button>
        </div>
      )}
    </div>
    );
  };

  const handleTimeUpdate = useCallback((time: number) => { setCurrentTime(time); onVideoTimeUpdate?.(time); }, [onVideoTimeUpdate]);
  const handlePlay = useCallback(() => { setIsPlaying(true); setSeekLoading(null); onVideoPlay?.(); }, [onVideoPlay]);
  const handlePause = useCallback(() => { setIsPlaying(false); onVideoPause?.(); }, [onVideoPause]);

  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const initialTimeMountRef = useRef(initialTime);

  const [miniPosition, setMiniPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const w = window.innerWidth;
    const pw = w >= 768 ? 360 : 180;
    const ph = pw * 9 / 16;
    return { x: 12, y: window.innerHeight - ph - 88 };
  });
  const [isMiniDragging, setIsMiniDragging] = useState(false);
  const miniDragMovedRef = useRef(false);
  const miniDragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const miniPlayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMini || !isMiniDragging) return;
    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - miniDragStartRef.current.x;
      const dy = clientY - miniDragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        miniDragMovedRef.current = true;
      }
      if (miniDragMovedRef.current && miniPlayerRef.current) {
        const rect = miniPlayerRef.current.getBoundingClientRect();
        const w = window.innerWidth;
        const h = window.innerHeight;
        const newX = Math.max(0, Math.min(w - rect.width, miniDragStartRef.current.posX + dx));
        const newY = Math.max(0, Math.min(h - rect.height, miniDragStartRef.current.posY + dy));
        setMiniPosition({ x: newX, y: newY });
      }
    };
    const handleMouseMove = (e: MouseEvent) => { e.preventDefault(); handleMove(e.clientX, e.clientY); };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleEnd = () => { setIsMiniDragging(false); };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isMini, isMiniDragging]);

  const handleMiniMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    miniDragMovedRef.current = false;
    miniDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: miniPosition.x,
      posY: miniPosition.y,
    };
    setIsMiniDragging(true);
  };

  const handleMiniTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    miniDragMovedRef.current = false;
    const touch = e.touches[0];
    miniDragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: miniPosition.x,
      posY: miniPosition.y,
    };
    setIsMiniDragging(true);
  };

  const handleMiniClick = (e: React.MouseEvent) => {
    if (miniDragMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      miniDragMovedRef.current = false;
      return;
    }
    onBack();
  };

  const handleMiniPlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    videoPlayerRef.current?.togglePlay();
  };

  const videoPlayerElement = useMemo(() => (
    <CustomVideoPlayer
      ref={videoPlayerRef}
      videoId={video.id || (video as any)._id}
      embedId={video.embedId}
      title={video.title}
      poster={video.thumbnailUrl}
      onTimeUpdate={handleTimeUpdate}
      onPlay={handlePlay}
      onPause={handlePause}
      isMini={isMini}
      initialTime={initialTimeMountRef.current}
    />
  ), [video.id, video.embedId, video.title, video.thumbnailUrl, isMini, handleTimeUpdate, handlePlay, handlePause]);

  return (
    <>
      {/* ===== MINI PLAYER ===== */}
      {isMini && (
      <div
        ref={miniPlayerRef}
        className="fixed z-[900] bg-black rounded-xl shadow-2xl overflow-hidden border border-white/15 md:w-[360px] w-[180px] group/mini"
        style={{
          left: miniPosition ? `${miniPosition.x}px` : undefined,
          top: miniPosition ? `${miniPosition.y}px` : undefined,
          aspectRatio: '16/9',
          cursor: isMiniDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onMouseDown={handleMiniMouseDown}
        onTouchStart={handleMiniTouchStart}
        onClick={handleMiniClick}
      >
        {videoPlayerElement}
        <button onClick={(e) => { e.stopPropagation(); if (onCloseMini) onCloseMini(); else onBack(); }}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-red-500/80 transition-all active:scale-90 shadow-lg border border-white/20"
          title="بستن">
          <i className="fas fa-times text-[10px]" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-primary/80 transition-all active:scale-90 shadow-lg border border-white/20"
          title="بزرگ کردن">
          <i className="fas fa-expand text-[10px]" />
        </button>
        <button onClick={handleMiniPlayPause}
          className="absolute bottom-2 right-2 z-10 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-90 shadow-xl border-2 border-white/30"
          style={{ background: isPlaying ? 'rgba(20, 184, 166, 0.85)' : 'rgba(255, 255, 255, 0.9)' }}
          title={isPlaying ? 'توقف' : 'پخش'}>
          <i className={`${isPlaying ? 'fas fa-pause' : 'fas fa-play'} text-[13px] ${!isPlaying ? 'mr-[-2px]' : ''}`} style={{ color: isPlaying ? 'white' : '#0f172a' }} />
        </button>
      </div>
      )}

      {/* ===== FULL PAGE ===== */}
      {!isMini && (
      <div className="min-h-screen" style={{ background: 'var(--surface)' }}>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 rounded-2xl text-sm font-bold text-white shadow-2xl animate-fadeInUp flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
          <i className="fas fa-check-circle text-sm" /> {toast}
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-sm rounded-3xl p-7 animate-fadeInUp"
            style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-6" style={{ color: 'var(--text)' }}>اشتراک‌گذاری</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'تلگرام', icon: 'fab fa-telegram-plane', color: '#2AABEE', url: `https://t.me/share/url?url=https://aparat.com/v/${video.embedId}&text=${encodeURIComponent(video.title)}` },
                { name: 'واتساپ', icon: 'fab fa-whatsapp', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(video.title + ' https://aparat.com/v/' + video.embedId)}` },
                { name: 'توییتر', icon: 'fab fa-x-twitter', color: '#000', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(video.title)}&url=https://aparat.com/v/${video.embedId}` },
                { name: 'کپی لینک', icon: 'fas fa-link', color: 'var(--primary)', action: () => { navigator.clipboard?.writeText(`https://aparat.com/v/${video.embedId}`); showToast('لینک کپی شد!'); setShowShareModal(false); } },
              ].map(s => (
                <button key={s.name} onClick={() => s.action ? s.action() : window.open(s.url, '_blank')}
                  className="flex items-center gap-3 p-3.5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm shadow-lg" style={{ background: s.color }}>
                    <i className={s.icon} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP LAYOUT ===== */}
      {isDesktop && (
      <div style={{ display: 'flex', maxWidth: 1800, marginInline: 'auto' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <div style={{ position: 'relative', zIndex: 40, background: '#000', borderRadius: 16, overflow: 'hidden', margin: '8px 8px 0 8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 50 }}>
              <button onClick={onBack}
                style={{ width: 44, height: 44, borderRadius: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                title="بازگشت">
                <i className="fas fa-arrow-right" style={{ fontSize: 14 }} />
              </button>
            </div>
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 50 }}>
              <button onClick={() => { videoPlayerRef.current?.enterBackground().then(ok => { if (!ok && (window as any).AndroidBridge) { (window as any).AndroidBridge.enterPip?.(); } }).catch(() => {}); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 44, borderRadius: 16,
                  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
                }}
                title="پخش در پس‌زمینه">
                <i className="fas fa-compact-disc" style={{ fontSize: 12, color: '#06b6d4' }} />
                پخش در پس‌زمینه
              </button>
            </div>
            <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative' }}>{videoPlayerElement}
              {seekLoading && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="animate-spin" style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--primary)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
                      <i className="fas fa-clock text-primary" style={{ fontSize: 12 }} />
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{formatTimestamp(seekLoading.time)}</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700 }}>در حال پرش...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Video Info */}
          <div style={{ padding: '28px 32px 24px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 0', minWidth: 0 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.8, minWidth: 0, flex: '1 1 0', color: 'var(--text)' }}>
                {video.title}
              </h1>
              <button onClick={() => { onToggleLibrary(video.id); showToast(isInLibrary ? 'از کتابخانه حذف شد' : 'در کتابخانه ذخیره شد'); }}
                style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isInLibrary ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface-2)',
                  border: `1px solid ${isInLibrary ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                  color: isInLibrary ? '#6ee7b7' : 'var(--text-2)', cursor: 'pointer',
                }}>
                <i className={`${isInLibrary ? 'fas fa-bookmark' : 'far fa-bookmark'}`} style={{ fontSize: 14 }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={handleLike}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    background: liked ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface-2)',
                    color: liked ? 'var(--primary)' : 'var(--text-2)',
                    border: `1px solid ${liked ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : 'var(--border)'}`,
                  }}>
                  <i className={`${liked ? 'fas' : 'far'} fa-heart`} style={{ fontSize: 14, color: liked ? '#ef4444' : undefined }} />
                  <span>{toPersianDigits(likeCount)}</span>
                </button>
                <button onClick={() => setShowShareModal(true)}
                  style={{
                    width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)',
                  }}>
                  <i className="fas fa-share-nodes" style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, marginTop: 14, color: 'var(--text-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="fas fa-eye" style={{ fontSize: 10, opacity: 0.7 }} /> {toPersianDigits(video.viewCount)} بازدید</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.3 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="fas fa-calendar" style={{ fontSize: 10, opacity: 0.7 }} /> {video.uploadDate}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.3 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="fas fa-clock" style={{ fontSize: 10, opacity: 0.7 }} /> {toPersianDigits(formatTime(video.duration))}</span>
            </div>
          </div>

          {/* Description */}
          {video.description && (
            <div style={{ padding: '0 32px 24px', background: 'var(--surface)' }}>
              <div style={{ borderRadius: 16, padding: 20, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className={`${!isDescExpanded ? 'line-clamp-3' : ''}`}
                  style={{ fontSize: 14, lineHeight: 2.2, textAlign: 'justify', color: 'var(--text-2)' }}>
                  {video.description}
                </p>
                {video.description.length > 150 && (
                  <button onClick={() => setIsDescExpanded(!isDescExpanded)}
                    style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {isDescExpanded ? 'کمتر' : 'بیشتر'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Comment Input */}
          {!replyTo && (
          <div style={{ padding: '0 32px 24px', background: 'var(--surface)' }}>
            <div style={{ borderRadius: 16, padding: 20, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                  {currentUserName?.charAt(0) || 'ش'}
                </div>
                <div style={{ flex: '1 1 0' }}>
                  <textarea ref={commentInputRef} value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="نظرت چیه؟"
                    rows={2}
                    style={{ width: '100%', resize: 'none', borderRadius: 12, padding: '14px 18px', fontSize: 14, fontWeight: 500, outline: 'none', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                    <button onClick={() => setMarkTimestamp(!markTimestamp)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, borderRadius: 12, padding: '8px 14px', cursor: 'pointer',
                        color: markTimestamp ? 'var(--primary)' : 'var(--text-3)',
                        background: markTimestamp ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                        border: `1px solid ${markTimestamp ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : 'transparent'}`,
                      }}>
                      <i className={`fas ${markTimestamp ? 'fa-check-circle' : 'fa-clock'}`} style={{ fontSize: 11 }} />
                      <span>{markTimestamp ? 'ذخیره با ویدیو' : 'ذخیره نظر'}</span>
                    </button>
                    <button onClick={handleSubmitComment}
                      disabled={!commentText.trim()}
                      style={{
                        padding: '12px 28px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#fff', border: 'none',
                        cursor: commentText.trim() ? 'pointer' : 'not-allowed', opacity: commentText.trim() ? 1 : 0.3,
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                      }}>
                      <i className="fas fa-paper-plane" style={{ fontSize: 11, marginLeft: 6 }} /> ارسال
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Tabs */}
          <div style={{ position: 'relative', padding: '0 32px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)' }}>
              <button style={{ paddingBottom: 14, fontSize: 15, fontWeight: 700, position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span style={{ color: 'var(--primary)' }}>محفل ({toPersianDigits(videoComments.length)})</span>
                  <div className="animate-tabSlide"
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 99, background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ minHeight: 300, padding: '24px 32px', background: 'var(--surface)' }}>
            <div className="animate-fadeInUp">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>مرتب‌سازی:</span>
                {(['newest', 'popular', 'oldest'] as const).map(s => (
                  <button key={s} onClick={() => setCommentSort(s)}
                    style={{
                      padding: '8px 18px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: commentSort === s ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--surface-2)',
                      color: commentSort === s ? 'var(--primary)' : 'var(--text-3)',
                      border: `1px solid ${commentSort === s ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : 'var(--border)'}`,
                    }}>
                    {s === 'newest' ? 'جدیدترین' : s === 'popular' ? 'محبوب‌ترین' : 'قدیمی‌ترین'}
                  </button>
                ))}
              </div>

              {rootComments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <div style={{ width: 80, height: 80, marginInline: 'auto', marginBottom: 20, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), color-mix(in srgb, var(--secondary) 5%, transparent))' }}>
                    <i className="fas fa-comments" style={{ fontSize: 32, color: 'var(--text-3)' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--text-3)' }}>هنوز نظری ثبت نشده</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>اولین نفری باشید که نظر میده</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {sortedComments.map(c => renderComment(c))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="no-scrollbar" style={{ flex: '0 0 360px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ padding: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)' }}>
              <div style={{ width: 4, height: 20, borderRadius: 4, background: 'linear-gradient(to bottom, var(--primary), var(--secondary))' }} />
              ویدیوهای پیشنهادی
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {related.map((v, i) => (
                <div key={v.id} onClick={() => { onPlayVideo(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="animate-fadeInUp"
                  style={{ cursor: 'pointer', display: 'flex', gap: 14, padding: 14, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${i * 0.05}s` }}>
                  <div style={{ position: 'relative', width: 160, height: 90, flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
                    <img src={v.thumbnailUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={v.title} />
                    <div style={{ position: 'absolute', bottom: 6, right: 6, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {toPersianDigits(formatTime(v.duration))}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 0', minWidth: 0, textAlign: 'right', paddingTop: 4 }}>
                    <h5 className="line-clamp-2" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.7, marginBottom: 8, color: 'var(--text)' }}>{v.title}</h5>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      {toPersianDigits(v.viewCount)} بازدید
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ===== MOBILE/TABLET LAYOUT ===== */}
      {!isDesktop && (
      <div>
        <div className="bg-black relative rounded-2xl overflow-hidden m-2 mb-0">
            <div className="absolute top-3 right-3 z-50">
            <button onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-black/50 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all border border-white/10 hover:scale-105 active:scale-95"
              title="بازگشت">
              <i className="fas fa-arrow-right text-xs" />
            </button>
          </div>
          <div className="absolute top-3 left-3 z-50 flex items-center gap-2">
            <button onClick={() => { videoPlayerRef.current?.enterBackground().then(ok => { if (!ok && (window as any).AndroidBridge) { (window as any).AndroidBridge.enterPip?.(); } }).catch(() => {}); }}
              className="h-10 px-3.5 rounded-2xl bg-black/50 backdrop-blur-md flex items-center gap-1.5 text-white/85 hover:text-white hover:bg-black/70 transition-all border border-white/10 active:scale-95 font-bold text-[11px]"
              title="پخش در پس‌زمینه">
              <i className="fas fa-compact-disc text-xs" style={{ color: '#06b6d4' }} />
              پس‌زمینه
            </button>
          </div>
          <div className="w-full aspect-video relative">{videoPlayerElement}
            {seekLoading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-[3px] border-white/20 border-t-primary animate-spin" />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md">
                    <i className="fas fa-clock text-primary text-xs" />
                    <span className="text-white text-xs font-bold">{formatTimestamp(seekLoading.time)}</span>
                  </div>
                  <span className="text-white/60 text-[10px] font-bold">در حال پرش...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Video Info */}
        <div className="p-4 pb-3" style={{ background: 'var(--surface)' }}>
          <h1 className="text-[15px] font-extrabold leading-relaxed mb-2" style={{ color: 'var(--text)' }}>{video.title}</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[11px]" style={{ color: 'var(--text-3)' }}>
              <span className="flex items-center gap-1"><i className="fas fa-eye text-[8px] opacity-60" /> {toPersianDigits(video.viewCount)}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-current opacity-30" />
              <span className="flex items-center gap-1"><i className="fas fa-clock text-[8px] opacity-60" /> {toPersianDigits(formatTime(video.duration))}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleLike}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl transition-all active:scale-90"
                style={{
                  background: liked ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface-2)',
                  color: liked ? '#ef4444' : 'var(--text-3)',
                  border: `1px solid ${liked ? 'rgba(239,68,68,0.15)' : 'var(--border)'}`,
                }}>
                <i className={`${liked ? 'fas' : 'far'} fa-heart text-sm ${liked ? 'animate-heartBeat' : ''}`} />
                <span className="text-[11px] font-bold">{toPersianDigits(likeCount)}</span>
              </button>
              <button onClick={() => { onToggleLibrary(video.id); showToast(isInLibrary ? 'از کتابخانه حذف شد' : 'در کتابخانه ذخیره شد'); }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: isInLibrary ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface-2)',
                  color: isInLibrary ? 'var(--primary)' : 'var(--text-3)',
                  border: `1px solid ${isInLibrary ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--border)'}`,
                }}>
                <i className={`${isInLibrary ? 'fas' : 'far'} fa-bookmark text-sm`} />
              </button>
              <button onClick={() => setShowShareModal(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--text-3)',
                  border: '1px solid var(--border)',
                }}>
                <i className="fas fa-share-nodes text-sm" />
              </button>
            </div>
          </div>
        </div>

        {video.description && (
          <div className="px-4 pb-3" style={{ background: 'var(--surface)' }}>
            <div className="rounded-2xl p-3 transition-all duration-300"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className={`text-[12px] leading-[2] text-justify transition-all duration-300 ${!isDescExpanded ? 'line-clamp-2' : ''}`}
                style={{ color: 'var(--text-2)' }}>
                {video.description}
              </p>
              {video.description.length > 100 && (
                <button onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-1 text-[11px] font-bold transition-all hover:underline" style={{ color: 'var(--primary)' }}>
                  {isDescExpanded ? 'کمتر' : 'بیشتر'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Recommended Videos */}
        {related.length > 0 && (
          <div className="px-4 pb-4" style={{ background: 'var(--surface)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-3)' }}>
              <div className="w-0.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(to bottom, var(--primary), var(--secondary))' }} />
              ویدیوهای پیشنهادی
            </h3>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 snap-x snap-mandatory">
              {related.map(v => (
                <div key={v.id} onClick={() => { onPlayVideo(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="group cursor-pointer flex-shrink-0 w-44 snap-start rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="relative w-full aspect-video rounded-t-xl overflow-hidden">
                    <img src={v.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={v.title} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-black/60 backdrop-blur-sm border border-white/10">
                      {toPersianDigits(formatTime(v.duration))}
                    </div>
                  </div>
                  <div className="p-2 text-right">
                    <h5 className="text-[11px] font-bold line-clamp-2 leading-relaxed group-hover:text-primary-400 transition-colors"
                      style={{ color: 'var(--text)' }}>{v.title}</h5>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {toPersianDigits(v.viewCount)} بازدید
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Comment Input */}
        <div className="px-4 pb-3" style={{ background: 'var(--surface)' }}>
          <div className="rounded-2xl p-3 transition-all"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {replyTo && replyToComment && (
              <div className="mb-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                    <i className="fas fa-reply text-[8px]" style={{ color: 'var(--primary)' }} />
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-3)' }}>
                    پاسخ به <span className="font-bold" style={{ color: 'var(--primary)' }}>@{replyToComment.author}</span>
                  </span>
                  <button onClick={() => { setReplyTo(null); setReplyToAuthor(''); }} className="mr-auto w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/5 transition-all" style={{ color: 'var(--text-3)' }}>
                    <i className="fas fa-times text-[8px]" />
                  </button>
                </div>
                <div className="flex gap-2 p-2 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {replyToComment.videoTimestamp != null && replyToComment.videoTimestamp > 0 ? (
                    <div className="relative w-24 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                      <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <i className="fas fa-play text-white text-[7px] mr-[-1px]" />
                        </div>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-white bg-black/60 backdrop-blur-sm border border-white/10">
                        {formatTimestamp(replyToComment.videoTimestamp)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold shadow-lg"
                      style={{ background: `linear-gradient(135deg, hsl(${(replyToComment.author.charCodeAt(0) * 37) % 360}, 60%, 50%), hsl(${(replyToComment.author.charCodeAt(0) * 73) % 360}, 60%, 40%))` }}>
                      {replyToComment.author.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-2)' }}>
                      {replyToComment.text.length > 80 ? replyToComment.text.substring(0, 80) + '...' : replyToComment.text}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {replyTo && !replyToComment && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                  <i className="fas fa-reply text-[8px]" style={{ color: 'var(--primary)' }} />
                </div>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-3)' }}>
                  پاسخ به <span className="font-bold" style={{ color: 'var(--primary)' }}>@{replyToAuthor}</span>
                </span>
                <button onClick={() => { setReplyTo(null); setReplyToAuthor(''); }} className="mr-auto w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/5 transition-all" style={{ color: 'var(--text-3)' }}>
                  <i className="fas fa-times text-[8px]" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <textarea ref={commentInputRef} value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={replyTo ? `پاسخ به ${replyToAuthor}...` : 'نظرت چیه؟'}
                rows={1}
                className="flex-1 resize-none rounded-xl px-3 py-2.5 text-[12px] font-medium outline-none transition-all duration-200 focus:ring-2"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 25%, transparent)' } as any}
              />
              <button onClick={handleSubmitComment} disabled={!commentText.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-30 active:scale-90 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
                <i className="fas fa-paper-plane text-[11px]" />
              </button>
            </div>
            {!replyTo && (
              <button onClick={() => setMarkTimestamp(!markTimestamp)}
                className="flex items-center gap-1.5 mt-2 text-[10px] font-bold rounded-lg px-2.5 py-1 transition-all duration-200"
                style={{
                  color: markTimestamp ? 'var(--primary)' : 'var(--text-3)',
                  background: markTimestamp ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                  border: `1px solid ${markTimestamp ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : 'transparent'}`
                }}>
                <i className={`fas ${markTimestamp ? 'fa-check-circle' : 'fa-clock'} text-[8px]`} />
                <span>{markTimestamp ? 'ذخیره با ویدیو' : 'ذخیره نظر'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="px-4" style={{ background: 'var(--surface)' }}>
          <div className="flex gap-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <button className="pb-3 text-[12px] font-bold transition-all relative">
                <span style={{ color: 'var(--primary)' }}>محفل ({toPersianDigits(videoComments.length)})</span>
                <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full animate-tabSlide"
                  style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
            </button>
          </div>
        </div>

        {/* Mobile Tab Content */}
        <div className="pb-24 px-4 pt-3" style={{ background: 'var(--surface)' }}>
          <div className="animate-fadeInUp">
            <div className="flex items-center gap-1.5 mb-3">
              {(['newest', 'popular', 'oldest'] as const).map(s => (
                <button key={s} onClick={() => setCommentSort(s)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200"
                  style={{
                    background: commentSort === s ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--surface-2)',
                    color: commentSort === s ? 'var(--primary)' : 'var(--text-3)',
                    border: `1px solid ${commentSort === s ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : 'var(--border)'}`
                  }}>
                  {s === 'newest' ? 'جدیدترین' : s === 'popular' ? 'محبوب‌ترین' : 'قدیمی‌ترین'}
                </button>
              ))}
            </div>

            {rootComments.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), color-mix(in srgb, var(--secondary) 5%, transparent))' }}>
                  <i className="fas fa-comments text-2xl" style={{ color: 'var(--text-3)' }} />
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-3)' }}>هنوز نظری ثبت نشده</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedComments.map(c => renderComment(c))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      </div>
      )}
    </>
  );
};

export default VideoPlayerPage;
