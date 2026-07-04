import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Post, Video, Podcast, PostComment, Author, Comment, PublishedBook } from '../types';
import { toPersianDigits, formatTimeFromISO, DEFAULT_COVER } from '../utils/helpers';
import { ImageLightbox, VideoLightbox } from '../components/MediaLightbox';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import type { CustomVideoPlayerHandle } from '../components/CustomVideoPlayer';
import AudioPlayer from '../components/AudioPlayer';
import MinimizedPlayer from '../components/MinimizedPlayer';

interface DiscussionTarget {
    type: 'post' | 'video-comment';
    post: Post | null;
    video?: Video | null;
    podcast?: Podcast | null;
    comment?: Comment | null;
}

const PostHeader: React.FC<{
    target: DiscussionTarget;
    authors: Author[];
    onAudioRef?: (el: HTMLAudioElement | null) => void;
    onVideoClick?: (url: string) => void;
    onImageClick?: (data: { src: string; text?: string; author?: string; authorAvatar?: string; time?: string }) => void;
    currentUser?: string;
    onUpdatePost?: (post: Post) => void;
    publishedBook?: PublishedBook;
    onShowBook?: (book: PublishedBook) => void;
    onPlayEpisode?: (podcast: Podcast, episodeIndex: number) => void;
    miniPlayerProps?: any;
}> = ({ target, authors, onAudioRef, onVideoClick, onImageClick, currentUser, onUpdatePost, publishedBook, onShowBook, onPlayEpisode, miniPlayerProps }) => {
    const { post, video, podcast, comment, type } = target;
    const isAdminPost = post?.author === 'سرای هنر و اندیشه';
    const authorName = type === 'video-comment' ? comment?.author : post?.author;
    const authorAvatar = type === 'video-comment' ? (comment as any)?.authorAvatarUrl : post?.authorAvatarUrl;
    const authorText = type === 'video-comment' ? comment?.text : post?.text;
    const authorMedia = type === 'video-comment' ? (comment as any)?.media : post?.media;
    const lastImageIndex = authorMedia ? authorMedia.reduce((last, m, i) => m.type === 'image' ? i : last, -1) : -1;
    const hasImages = lastImageIndex !== -1;
    const isOwn = currentUser ? authorName === currentUser : false;

    const [liked, setLiked] = useState(() => {
      try { return JSON.parse(localStorage.getItem('soha_liked_posts') || '[]').includes(String(post?.id)); } catch { return false; }
    });
    const [likesCount, setLikesCount] = useState(post?.likes || 0);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(authorText || '');

    const handleLike = async () => {
      const next = !liked;
      setLiked(next);
      setLikesCount(prev => next ? prev + 1 : Math.max(0, prev - 1));
      try {
        const arr = JSON.parse(localStorage.getItem('soha_liked_posts') || '[]');
        const pid = String(post?.id);
        if (next) arr.push(pid); else { const idx = arr.indexOf(pid); if (idx > -1) arr.splice(idx, 1); }
        localStorage.setItem('soha_liked_posts', JSON.stringify(arr));
      } catch {}
      try { const { likePost } = await import('../services/api'); await likePost(String(post?.id)); } catch {}
    };

    const handleSaveEdit = async () => {
      if (!editText.trim() || editText.trim() === authorText) { setIsEditing(false); return; }
      try {
        const { updatePost } = await import('../services/api');
        const updated = await updatePost(String(post?.id), { text: editText.trim() });
        if (updated && onUpdatePost) onUpdatePost(updated);
      } catch {}
      setIsEditing(false);
    };

    const renderText = () => (
      isEditing ? (
        <div className="flex flex-col gap-1.5">
          <input value={editText} onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') { setIsEditing(false); setEditText(authorText || ''); } }}
            className="w-full bg-transparent outline-none text-sm px-2 py-1.5 rounded-lg"
            style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
          <div className="flex gap-1.5">
            <button onClick={handleSaveEdit} className="text-[10px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
            <button onClick={() => { setIsEditing(false); setEditText(authorText || ''); }} className="text-[10px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
          </div>
        </div>
      ) : (
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text)' }}>{authorText}</div>
      )
    );

    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3 sm:gap-4" style={{ maxWidth: '700px', margin: '0 auto' }}>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex-shrink-0 overflow-hidden shadow-sm ring-2 ring-white/80"
                  style={{ background: `linear-gradient(135deg, hsl(${(authorName?.charCodeAt(0) || 0) * 37 % 360}, 55%, 50%), hsl(${(authorName?.charCodeAt(0) || 0) * 73 % 360}, 55%, 40%))` }}>
                  {authorAvatar ? (
                    <img src={authorAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{authorName?.charAt(0)}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm leading-none" style={{ color: isAdminPost ? 'var(--primary)' : 'var(--text-1)' }}>
                            {authorName}
                        </span>
                        {isAdminPost && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--primary)', color: '#fff', lineHeight: '1.2' }}>
                                مدیر
                            </span>
                        )}
                        <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                            {formatTimeFromISO(type === 'video-comment' ? (comment as Comment).isoDate : (post as Post).isoDate)}
                        </span>
                        {isOwn && !isEditing && (
                          <button onClick={() => { setEditText(authorText || ''); setIsEditing(true); }}
                            className="flex items-center justify-center w-6 h-6 rounded-full opacity-50 hover:opacity-100 transition-opacity active:scale-90"
                            style={{ color: 'var(--text-3)' }}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                    </div>
                    {podcast && (() => {
                        const epIdx = post?.episodeIndex != null ? post.episodeIndex : 0;
                        if (!podcast.episodes?.[epIdx]) return null;
                        const ep = podcast.episodes[epIdx];
                        return (
                        <div className="rounded-xl overflow-hidden my-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-3 p-3 cursor-pointer active:scale-[0.98] transition-all" onClick={(e) => { e.stopPropagation(); onPlayEpisode?.(podcast, epIdx); }}>
                                <div className="relative w-14 h-14 lg:w-16 lg:h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-white/10">
                                    <img src={ep.cover || podcast.cover || DEFAULT_COVER} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}>
                                            <i className="fas fa-play text-xs text-white" style={{ marginRight: '-1px' }}></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{ep.title}</p>
                                    <p className="text-[10px] font-bold mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                                        <i className="fas fa-podcast text-[8px]"></i>{podcast.title}
                                    </p>
                                </div>
                                <div className="flex items-center flex-shrink-0">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer active:scale-95 transition-all" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontSize: '8px' }} onClick={(e) => { e.stopPropagation(); onPlayEpisode?.(podcast, epIdx); }}>
                                        <i className="fas fa-headphones text-[9px]"></i>
                                        {miniPlayerProps?.track && String(miniPlayerProps.track.podcast.id || (miniPlayerProps.track.podcast as any)._id) === String(podcast.id || (podcast as any)._id) && miniPlayerProps.track.episodeIndex === epIdx ? (
                                            <span className="font-bold">{toPersianDigits(Math.floor((miniPlayerProps.progress * miniPlayerProps.duration) / 60))}:{toPersianDigits(String(Math.floor((miniPlayerProps.progress * miniPlayerProps.duration) % 60)).padStart(2, '0'))}</span>
                                        ) : (
                                            <span className="font-bold">{ep.duration || '00:00'}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })()}
                    {publishedBook && (
                        <div className="flex justify-center">
                        <div onClick={() => onShowBook?.(publishedBook)} className="group cursor-pointer w-40 md:w-48 animate-fadeInUp">
                            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 transition-all duration-500 group-hover:-translate-y-3 group-hover:shadow-xl" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid var(--border)' }}>
                                {publishedBook.cover ? (
                                    <img src={publishedBook.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={publishedBook.title} loading="lazy" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                                        <i className="fas fa-book text-white/30 text-2xl mb-2" />
                                        <span className="text-[11px] text-white font-black">{publishedBook.title.slice(0, 12)}</span>
                                    </div>
                                )}
                                <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-white/10 via-black/20 to-white/10" />
                                {publishedBook.isNew && (
                                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9px] font-black text-white shadow-lg flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                                        <i className="fas fa-bolt text-[7px]" /> تازه
                                    </div>
                                )}
                            </div>
                            <h3 className="text-[13px] font-black line-clamp-2 text-right leading-snug mb-1" style={{ color: 'var(--text)' }}>{publishedBook.title}</h3>
                            <div className="flex items-center justify-between mt-auto mb-2">
                                <span className="text-[10px] font-bold truncate" style={{ color: 'var(--text-3)' }}>{publishedBook.authorName}</span>
                                {publishedBook.price && publishedBook.price !== '۰' && (
                                    <span className="text-[11px] font-black tabular-nums" style={{ color: 'var(--primary)' }}>{toPersianDigits(publishedBook.price)}</span>
                                )}
                            </div>
                        </div>
                        </div>
                    )}
                    {authorMedia && authorMedia.length > 0 && (
                      <div className="space-y-2">
                        {authorMedia.map((m: any, i: number) => (
                          m.type === 'image' ? (
                            <div key={i} className="group relative cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.99]"
                              style={{ background: 'var(--surface-3)' }}
                              onClick={() => onImageClick?.({ src: m.url, text: authorText || undefined, author: authorName, authorAvatar: authorAvatar || undefined, time: formatTimeFromISO(type === 'video-comment' ? (comment as Comment).isoDate : (post as Post).isoDate) })}>
                              <img src={m.url}
                                className="w-full h-auto rounded-xl"
                                alt="" loading="lazy" />
                              {i === lastImageIndex && authorText && !isEditing && (
                                <div className="px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text)' }}>
                                  {authorText}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors duration-300"></div>
                              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                                <div className="backdrop-blur-md bg-white/20 rounded-full p-2 shadow-lg border border-white/30">
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          ) : m.type === 'audio' ? (
                            <div key={i}>
                              <AudioPlayer src={m.url} onAudioRef={onAudioRef} />
                            </div>
                          ) : (
                            <div key={i} className="w-full aspect-video flex items-center justify-center cursor-pointer rounded-xl overflow-hidden group relative"
                              style={{ background: 'var(--surface-3)' }}
                              onClick={() => onVideoClick?.(m.url)}>
                              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl transform group-hover:scale-110 transition-all duration-300">
                                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    {!hasImages && authorText && !isEditing && (
                        <div className="rounded-xl px-3 py-2 transition-all duration-200" style={{ background: 'color-mix(in srgb, var(--surface-2) 80%, transparent)', border: '1px solid var(--border)' }}>
                            <div className="text-[13px] leading-[1.7] font-medium whitespace-pre-wrap break-words" style={{ color: 'var(--text)' }}>
                                {authorText}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1.5 mt-1.5" style={{ borderTop: '1px solid color-mix(in srgb, var(--border) 30%, transparent)' }}>
                              {isOwn && (
                                <button onClick={() => { setEditText(authorText || ''); setIsEditing(true); }}
                                  className="flex items-center gap-1.5 rounded-lg py-1 px-2 transition-all active:scale-90"
                                  style={{ color: '#475569' }}>
                                  <i className="fas fa-pen text-[11px]"></i>
                                  <span className="text-[10px] font-bold">ویرایش</span>
                                </button>
                              )}
                              {isOwn && (
                                <button onClick={() => onUpdatePost?.({ ...post, text: '' } as any)}
                                  className="rounded-lg py-1 px-2 transition-all active:scale-90"
                                  style={{ color: '#475569' }}>
                                  <i className="fas fa-trash text-[11px]"></i>
                                </button>
                              )}
                              <button onClick={handleLike} className="flex items-center gap-1 transition-all active:scale-90" style={{ color: liked ? '#ef4444' : '#475569' }}>
                                <svg className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={liked ? 0 : 2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span className="text-[10px] font-bold">{toPersianDigits(likesCount)}</span>
                              </button>
                            </div>
                        </div>
                    )}
                    {isEditing && renderText()}
        </div>
      </div>
    </div>
    );
};

const QuotedReply: React.FC<{ replyToId: string | number; quotedText?: string; allComments: PostComment[]; onTimestampClick?: (seconds: number) => void; onAudioTimestampClick?: (seconds: number) => void }> = ({ replyToId, quotedText, allComments, onTimestampClick, onAudioTimestampClick }) => {
    const quoted = allComments.find(c => String(c.id) === String(replyToId) || String((c as any)._id) === String(replyToId));
    if (!quoted) return null;
    const hasMedia = quoted.media && quoted.media.length > 0;
    const firstMedia = hasMedia ? quoted.media![0] : null;
    const quotedAudioTs = quoted.audioTimestamp;
    const quotedVideoTs = quoted.videoTimestamp;
    const audioTsText = quotedAudioTs != null
      ? `${toPersianDigits(Math.floor(quotedAudioTs / 60))}:${toPersianDigits(String(Math.floor(quotedAudioTs % 60)).padStart(2, '0'))}`
      : null;
    const videoTsText = quotedVideoTs != null
      ? `${toPersianDigits(Math.floor(quotedVideoTs / 60))}:${toPersianDigits(String(Math.floor(quotedVideoTs % 60)).padStart(2, '0'))}`
      : null;
    return (
        <div className="p-1.5 rounded-lg mb-1.5 cursor-pointer" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', borderRight: '3px solid var(--primary)' }}
             onClick={(e) => {
               e.stopPropagation();
               const el = document.getElementById(`bubble-${String(replyToId)}`);
               if (el) {
                 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 el.classList.add('highlight-bubble');
                 setTimeout(() => el.classList.remove('highlight-bubble'), 1500);
               }
             }}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>{quoted.author}</p>
              {audioTsText && (
                <button onClick={(e) => { e.stopPropagation(); onAudioTimestampClick?.(quotedAudioTs!); }}
                  className="flex items-center gap-0.5 px-1 py-0.5 rounded transition-all active:scale-90"
                  style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', fontSize: '7px' }}>
                  <i className="fas fa-music text-[6px]"></i>
                  {audioTsText}
                </button>
              )}
              {videoTsText && (
                <button onClick={(e) => { e.stopPropagation(); onTimestampClick?.(quotedVideoTs!); }}
                  className="flex items-center gap-0.5 px-1 py-0.5 rounded transition-all active:scale-90"
                  style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', fontSize: '7px' }}>
                  <i className="fas fa-video text-[6px]"></i>
                  {videoTsText}
                </button>
              )}
            </div>
            {firstMedia?.type === 'image' && (
              <img src={firstMedia.url} className="w-16 h-12 object-cover rounded-md mt-0.5" alt="" />
            )}
            {firstMedia?.type === 'video' && (
              <div className="w-16 h-12 rounded-md mt-0.5 flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
                <i className="fas fa-play text-[8px]" style={{ color: 'var(--primary)' }}></i>
              </div>
            )}
            {firstMedia?.type === 'audio' && (
              <div className="w-16 h-12 rounded-md mt-0.5 flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
                <i className="fas fa-music text-[8px]" style={{ color: 'var(--primary)' }}></i>
              </div>
            )}
            {!firstMedia && (
              <p className="text-[10px] truncate leading-relaxed" style={{ color: 'var(--text-3)' }}>
                {quotedText || quoted.text || ''}
              </p>
            )}
            {firstMedia && quoted.text && (
              <p className="text-[10px] truncate leading-relaxed mt-0.5" style={{ color: 'var(--text-3)' }}>
                {quoted.text}
              </p>
            )}
        </div>
    );
};

const ChatBubble: React.FC<{
    comment: PostComment;
    allComments: PostComment[];
    isOwn: boolean;
    showAuthor: boolean;
    currentUser?: string;
    onReply: (comment: PostComment, quotedText?: string) => void;
    onLike: (comment: PostComment) => void;
    onDelete?: (comment: PostComment) => void;
    onEdit?: (comment: PostComment, newText: string) => void;
    onImageClick?: (data: { src: string; text?: string; author?: string; authorAvatar?: string; time?: string; comment?: PostComment }) => void;
    onVideoClick?: (url: string) => void;
    onTimestampClick?: (seconds: number) => void;
    onAudioTimestampClick?: (seconds: number) => void;
}> = ({ comment, allComments, isOwn, showAuthor, currentUser, onReply, onLike, onDelete, onEdit, onImageClick, onVideoClick, onTimestampClick, onAudioTimestampClick }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState<{ top: number; right?: number; left?: number } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.text || '');
    const [liked, setLiked] = useState(() => {
      try { return JSON.parse(localStorage.getItem('soha_liked_post_comments') || '[]').includes(String(comment.id || comment._id)); } catch { return false; }
    });
    const [likesCount, setLikesCount] = useState(comment.likes || 0);
    const [displayText, setDisplayText] = useState(comment.text || '');
    const [showQuoteBtn, setShowQuoteBtn] = useState(false);
    const [selectedQuoteText, setSelectedQuoteText] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setDisplayText(comment.text || ''); }, [comment.text]);
    useEffect(() => { if (isEditing) editInputRef.current?.focus(); }, [isEditing]);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) { setShowMenu(false); setMenuPos(null); }
      };
      if (showMenu) document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    useEffect(() => {
      if (!showMenu) return;
      const handler = () => { setShowMenu(false); setMenuPos(null); };
      document.addEventListener('scroll', handler, true);
      return () => document.removeEventListener('scroll', handler, true);
    }, [showMenu]);

    useEffect(() => {
      const handler = () => {
        setTimeout(() => {
          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0 && bubbleRef.current?.contains(sel.anchorNode)) {
            setSelectedQuoteText(sel.toString().trim());
            setShowQuoteBtn(true);
          } else {
            setShowQuoteBtn(false);
            setSelectedQuoteText('');
          }
        }, 10);
      };
      document.addEventListener('selectionchange', handler);
      return () => document.removeEventListener('selectionchange', handler);
    }, []);

    const handleLike = () => {
      const next = !liked;
      setLiked(next);
      setLikesCount(prev => next ? prev + 1 : Math.max(0, prev - 1));
      try {
        const arr = JSON.parse(localStorage.getItem('soha_liked_post_comments') || '[]');
        const cid = String(comment.id || comment._id);
        if (next) arr.push(cid); else { const idx = arr.indexOf(cid); if (idx > -1) arr.splice(idx, 1); }
        localStorage.setItem('soha_liked_post_comments', JSON.stringify(arr));
      } catch {}
      onLike(comment);
    };

    const handleSaveEdit = () => {
      if (!editText.trim()) { setIsEditing(false); return; }
      setDisplayText(editText.trim());
      setIsEditing(false);
      if (onEdit) onEdit(comment, editText.trim());
    };

    const handleQuoteReply = () => {
      if (selectedQuoteText) {
        onReply(comment, selectedQuoteText);
      } else {
        onReply(comment);
      }
      setShowQuoteBtn(false);
      setSelectedQuoteText('');
      window.getSelection()?.removeAllRanges();
    };

    const time = formatTimeFromISO(comment.isoDate);
    const commentId = String(comment.id || (comment as any)._id || '');
    const avatarColor = `linear-gradient(135deg, hsl(${(comment.author?.charCodeAt(0) || 0) * 37 % 360}, 55%, 50%), hsl(${(comment.author?.charCodeAt(0) || 0) * 73 % 360}, 55%, 40%))`;
    const hasImage = comment.media && comment.media.length > 0 && comment.media.some(m => m.type === 'image');

    return (
      <div className="mb-1">
      <div id={`bubble-${commentId}`} className={`flex items-end gap-1.5 px-3 group/bubble animate-fadeIn ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden shadow-sm mb-0.5"
             style={{ background: avatarColor }}>
          {(comment as any).authorAvatarUrl ? (
            <img src={(comment as any).authorAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black">{comment.author?.charAt(0)}</div>
          )}
        </div>
        )}
        <div ref={bubbleRef} className={`relative ${hasImage ? 'max-w-[75%]' : 'max-w-[80%]'}`}
             onClick={() => { if (isEditing) return; if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; return; } clickTimer.current = setTimeout(() => { clickTimer.current = null; setShowMenu(true); if (bubbleRef.current) { const r = bubbleRef.current.getBoundingClientRect(); setMenuPos({ top: Math.round(r.bottom), right: Math.round(document.documentElement.clientWidth - r.right) }); } }, 200); }}
             onDoubleClick={handleLike}
             onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); if (bubbleRef.current) { const r = bubbleRef.current.getBoundingClientRect(); setMenuPos({ top: Math.round(r.bottom), right: Math.round(document.documentElement.clientWidth - r.right) }); } }}>
          <div className={`relative ${hasImage ? 'rounded-2xl overflow-hidden' : `rounded-2xl p-2.5 ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}`}
               style={{
                 background: isOwn ? 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, var(--surface-2)), color-mix(in srgb, var(--primary) 8%, var(--surface-2)))' : 'var(--surface-2)',
                 border: isOwn ? '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' : '1px solid var(--border)',
                 boxShadow: isOwn ? '0 2px 8px color-mix(in srgb, var(--primary) 8%, transparent)' : '0 1px 3px rgba(0,0,0,0.03)',
                 ...(hasImage ? { padding: 0 } : {}),
               }}>

            {(comment as any).replyTo && !hasImage && (
              <QuotedReply replyToId={(comment as any).replyTo} quotedText={(comment as any).quotedText} allComments={allComments} onTimestampClick={onTimestampClick} onAudioTimestampClick={onAudioTimestampClick} />
            )}

            {showAuthor && !isOwn && !hasImage && (
              <p className="text-[11px] font-bold mb-0.5" style={{ color: 'var(--primary)' }}>{comment.author}</p>
            )}

            {comment.audioTimestamp != null && onAudioTimestampClick && (
              <button onClick={(e) => { e.stopPropagation(); const ts = comment.audioTimestamp; if (ts != null) onAudioTimestampClick!(ts); }}
                className="flex items-center gap-1.5 mb-1.5 rounded-lg transition-all active:scale-95"
                style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', padding: '3px 8px', fontSize: '9px', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
                <i className="fas fa-music text-[8px]"></i>
                <span className="font-medium">پاسخ به </span>
                <span className="font-bold">{toPersianDigits(Math.floor(comment.audioTimestamp / 60))}:{toPersianDigits(String(Math.floor(comment.audioTimestamp % 60)).padStart(2, '0'))}</span>
                <span className="font-medium"> از صوت</span>
              </button>
            )}
            {comment.videoTimestamp != null && onTimestampClick && (
              <button onClick={(e) => { e.stopPropagation(); const ts = comment.videoTimestamp; if (ts != null) onTimestampClick!(ts); }}
                className="flex items-center gap-1.5 mb-1.5 rounded-lg transition-all active:scale-95"
                style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', padding: '3px 8px', fontSize: '9px', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
                <i className="fas fa-video text-[8px]"></i>
                <span className="font-bold">{toPersianDigits(Math.floor(comment.videoTimestamp / 60))}:{toPersianDigits(String(Math.floor(comment.videoTimestamp % 60)).padStart(2, '0'))}</span>
              </button>
            )}

            {comment.media && comment.media.length > 0 && hasImage ? (
              <div className="flex flex-col gap-0.5">
                {comment.media.length === 1 ? (
                  <img src={comment.media[0].url}
                    className="w-full max-h-[400px] object-contain rounded-2xl cursor-pointer"
                    alt="" loading="lazy"
                    onClick={() => onImageClick?.({ src: comment.media[0].url, text: comment.text, author: comment.author, authorAvatar: (comment as any).authorAvatarUrl, time: formatTimeFromISO(comment.isoDate), comment })}
                    style={{ border: '2px solid var(--border)', background: 'var(--surface-3)' }} />
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {comment.media.filter(m => m.type === 'image').map((m, i) => (
                      <img key={i} src={m.url}
                        className="w-full aspect-square object-cover rounded-xl cursor-pointer"
                        alt="" loading="lazy"
                        onClick={() => onImageClick?.({ src: m.url, text: comment.text, author: comment.author, authorAvatar: (comment as any).authorAvatarUrl, time: formatTimeFromISO(comment.isoDate), comment })}
                        style={{ border: '2px solid var(--border)' }} />
                    ))}
                  </div>
                )}
                {comment.media.filter(m => m.type !== 'image').length > 0 && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {comment.media.filter(m => m.type !== 'image').map((m, i) => (
                      m.type === 'audio' ? (
                        <AudioPlayer key={i} src={m.url} compact />
                      ) : (
                        <div key={i} className="w-full aspect-video flex items-center justify-center cursor-pointer rounded-xl overflow-hidden group"
                          style={{ background: 'var(--surface-3)' }}
                          onClick={() => onVideoClick?.(m.url)}>
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                            <i className="fas fa-play text-white text-lg"></i>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
                {(comment.text || displayText) && (
                  <div className="px-3 py-2">
                    <p className="text-[13px] leading-[2] font-medium whitespace-pre-wrap break-words" style={{ color: 'var(--text)' }}>{displayText}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {isOwn && (comment as any).isEdited && <span style={{ fontSize: '8px', color: 'var(--text-3)' }}>ویرایش شده ·</span>}
                      <span style={{ fontSize: '9px', color: 'var(--text-3)', direction: 'ltr' }}>{time}</span>
                      {isOwn && <i className="fas fa-check-double text-[8px]" style={{ color: 'var(--primary)' }}></i>}
                    </div>
                  </div>
                )}
              </div>
            ) : comment.media && comment.media.length > 0 ? (
              <div className="flex flex-col gap-1.5 mb-1.5 p-2.5">
                {comment.media.map((m, i) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)' }}>
                    {m.type === 'audio' ? (
                      <div><AudioPlayer src={m.url} compact /></div>
                    ) : (
                      <div className="w-full aspect-video flex items-center justify-center cursor-pointer rounded-xl overflow-hidden group relative"
                        style={{ background: 'var(--surface-3)' }} onClick={() => onVideoClick?.(m.url)}>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                          <i className="fas fa-play text-white text-lg"></i>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {!hasImage && (isEditing ? (
              <div className="flex flex-col gap-1.5">
                <input ref={editInputRef} value={editText} onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                  className="w-full bg-transparent outline-none text-[13px] font-medium px-2 py-1 rounded-lg"
                  style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
                <div className="flex gap-1.5">
                  <button onClick={handleSaveEdit} className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                  <button onClick={() => { setIsEditing(false); setEditText(comment.text || ''); }} className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                {displayText && <p className="text-[13px] leading-[2] font-medium whitespace-pre-wrap break-words flex-1" style={{ color: 'var(--text)' }}>{displayText}</p>}
                <div className="flex items-center gap-1 flex-shrink-0 translate-y-[2px]">
                  {isOwn && (comment as any).isEdited && <span style={{ fontSize: '8px', color: 'var(--text-3)' }}>ویرایش شده ·</span>}
                  <span style={{ fontSize: '9px', color: 'var(--text-3)', direction: 'ltr' }}>{time}</span>
                  {isOwn && <i className="fas fa-check-double text-[8px]" style={{ color: 'var(--primary)' }}></i>}
                </div>
              </div>
            ))}

            {likesCount > 0 && (
              <div className="absolute -bottom-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-sm"
                   style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '9px', color: liked ? '#ef4444' : 'var(--text-3)' }}
                   onClick={handleLike}>
                <i className={`${liked ? 'fas' : 'far'} fa-heart text-[8px]`}></i>
                <span>{toPersianDigits(likesCount)}</span>
              </div>
            )}
          </div>
      </div>
          {showQuoteBtn && (
            <div className="absolute z-50 rounded-xl shadow-xl py-1 animate-fadeIn"
                 style={{
                   background: 'var(--surface-2)', border: '1px solid var(--border)',
                   top: '-40px', left: '50%', transform: 'translateX(-50%)',
                 }}>
              <button onClick={handleQuoteReply}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/5 whitespace-nowrap"
                style={{ color: 'var(--primary)' }}>
                <i className="fas fa-quote-right text-[9px]"></i>
                نقل‌قول و پاسخ
              </button>
            </div>
          )}

          {showMenu && menuPos && createPortal(
            <div ref={menuRef} className="fixed z-[9999] animate-fadeIn"
                 style={{ top: menuPos.top, right: menuPos.right, left: menuPos.left }}>
              <div className="rounded-xl shadow-lg py-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: '150px' }}>
                <div className="flex items-center justify-between px-2.5 py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>عملیات</span>
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setMenuPos(null); }}
                    className="w-4 h-4 rounded-full flex items-center justify-center transition-all active:scale-90 hover:opacity-70"
                    style={{ color: 'var(--text-3)' }}>
                    <i className="fas fa-times text-[7px]"></i>
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onReply(comment); setShowMenu(false); setMenuPos(null); }}
                  className="w-full text-right px-2.5 py-2 text-[11px] font-medium flex items-center gap-2 transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text)' }}>
                  <i className="fas fa-reply text-[9px]" style={{ color: 'var(--text-3)' }}></i> پاسخ
                </button>
                <button onClick={(e) => { e.stopPropagation(); onReply(comment, comment.text); setShowMenu(false); setMenuPos(null); }}
                  className="w-full text-right px-2.5 py-2 text-[11px] font-medium flex items-center gap-2 transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text)' }}>
                  <i className="fas fa-quote-right text-[9px]" style={{ color: 'var(--text-3)' }}></i> نقل‌قول
                </button>
                <div className="h-px mx-2.5" style={{ background: 'var(--border)' }}></div>
                <button onClick={(e) => { e.stopPropagation(); handleLike(); setShowMenu(false); setMenuPos(null); }}
                  className="w-full text-right px-2.5 py-2 text-[11px] font-medium flex items-center gap-2 transition-colors hover:bg-white/5"
                  style={{ color: liked ? '#ef4444' : 'var(--text)' }}>
                  <i className={`${liked ? 'fas' : 'far'} fa-heart text-[9px]`}></i> {liked ? 'برداشتن لایک' : 'لایک'}
                </button>
                {isOwn && (
                  <button onClick={(e) => { e.stopPropagation(); setEditText(comment.text || ''); setIsEditing(true); setShowMenu(false); setMenuPos(null); }}
                    className="w-full text-right px-2.5 py-2 text-[11px] font-medium flex items-center gap-2 transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text)' }}>
                    <i className="fas fa-pen text-[9px]" style={{ color: 'var(--text-3)' }}></i> ویرایش
                  </button>
                )}
                {isOwn && onDelete && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(comment); setShowMenu(false); setMenuPos(null); }}
                    className="w-full text-right px-2.5 py-2 text-[11px] font-medium flex items-center gap-2 transition-colors hover:bg-red-500/10 text-red-400">
                    <i className="fas fa-trash-alt text-[9px]"></i> حذف
                  </button>
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
        {(() => {
          const children = allComments.filter((c: any) => String((c as any).replyTo || (c as any).parentId) === commentId);
          if (children.length === 0) return null;
          return (
            <div className={`${isOwn ? 'mr-5' : 'ml-5'} mt-1 space-y-1`}>
              {children.map((child: any) => (
                <ChatBubble
                  key={child.id || (child as any)._id}
                  comment={child}
                  allComments={allComments}
                  isOwn={currentUser ? child.author === currentUser : false}
                  showAuthor={true}
                  currentUser={currentUser}
                  onReply={onReply}
                  onLike={onLike}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onImageClick={onImageClick}
                  onVideoClick={onVideoClick}
                  onTimestampClick={onTimestampClick}
                  onAudioTimestampClick={onAudioTimestampClick}
                />
              ))}
            </div>
          );
        })()}
      </div>
    );
};

const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
    <div className="flex items-center justify-center my-3 px-4">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
        <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>{date}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
    </div>
);

function isSameDay(d1: string, d2: string): boolean {
    try { const a = new Date(d1); const b = new Date(d2); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); } catch { return false; }
}

function toJalaliDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
}

interface PostCommentsPageProps {
  post: Post;
  video?: Video;
  podcast?: Podcast;
  authors: Author[];
  currentUser?: string;
  userRole?: string;
  onBack: () => void;
  onAddComment: (postId: number | string, text: string, replyTo?: number | string, media?: { type: string; url: string }[], quotedText?: string, audioTimestamp?: number, videoTimestamp?: number) => void;
  onUpdatePost?: (post: Post) => void;
  onDeleteComment?: (commentId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  publishedBooks?: PublishedBook[];
  onShowBook?: (book: PublishedBook) => void;
  onPlayEpisode?: (podcast: Podcast, episodeIndex: number) => void;
  miniPlayerProps?: any;
  onSeekAudio?: (seconds: number) => void;
  discussionComments?: PostComment[];
  parentCommentId?: string | number;
}

const PostCommentsPage: React.FC<PostCommentsPageProps> = ({ post, video, podcast, authors, currentUser, userRole, onBack, onAddComment, onUpdatePost, onDeleteComment: onParentDeleteComment, onLikeComment: onParentLikeComment, onUpdateComment: onParentUpdateComment, publishedBooks, onShowBook, onPlayEpisode, miniPlayerProps, onSeekAudio, discussionComments, parentCommentId }) => {
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
    const [quotedText, setQuotedText] = useState<string>('');
    const [inputMedia, setInputMedia] = useState<{ type: 'image' | 'audio' | 'video'; url: string } | null>(null);
    const [lightboxData, setLightboxData] = useState<{ src: string; text?: string; author?: string; authorAvatar?: string; time?: string; comment?: PostComment } | null>(null);
    const [videoLightbox, setVideoLightbox] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const videoPlayerRef = useRef<CustomVideoPlayerHandle>(null);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const pendingVideoSeekRef = useRef<number | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [markAudioTimestamp, setMarkAudioTimestamp] = useState(false);
    const [markVideoTimestamp, setMarkVideoTimestamp] = useState(false);
    const hasAudio = !!(post.media?.some(m => m.type === 'audio') || podcast);
    const hasVideo = !!(video || post.media?.some(m => m.type === 'video'));
    const [localComments, setLocalComments] = useState<PostComment[]>(discussionComments || post.comments);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const tempIdCounter = useRef(0);

    useEffect(() => { setLocalComments(discussionComments || post.comments); }, [discussionComments, post.comments]);
    useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [localComments.length]);
    useEffect(() => { if (replyingTo) inputRef.current?.focus(); }, [replyingTo]);

    useEffect(() => {
        const el = audioElementRef.current;
        if (!el) return;
        const handler = () => setAudioCurrentTime(el.currentTime);
        el.addEventListener('timeupdate', handler);
        return () => el.removeEventListener('timeupdate', handler);
    }, []);

    useEffect(() => {
        if (podcast && miniPlayerProps?.progress != null && miniPlayerProps?.duration != null) {
            setAudioCurrentTime(Math.floor(miniPlayerProps.progress * miniPlayerProps.duration));
        }
    }, [podcast, miniPlayerProps?.progress, miniPlayerProps?.duration]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'video';
        const reader = new FileReader();
        reader.onload = (ev) => setInputMedia({ type, url: ev.target?.result as string });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleReply = (comment: PostComment, selectedText?: string) => {
        setReplyingTo(comment);
        setQuotedText(selectedText || '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!commentText.trim() && !inputMedia) || sending) return;
        setSending(true);
        const text = commentText.trim() || '[attachment]';
        const media = inputMedia ? [inputMedia] : [];
        const replyToId = replyingTo?.id || (replyingTo as any)?._id;
        const quoteText = quotedText || (replyingTo?.text ? replyingTo.text.substring(0, 100) : undefined);

        // Optimistic add
        tempIdCounter.current -= 1;
        const tempId = tempIdCounter.current;
        const audioTs = markAudioTimestamp
          ? Math.floor(audioCurrentTime)
          : (replyingTo as any)?.audioTimestamp != null
            ? (replyingTo as any).audioTimestamp
            : undefined;
        const videoTs = markVideoTimestamp
          ? Math.floor(videoPlayerRef.current?.getCurrentTime() ?? 0)
          : (replyingTo as any)?.videoTimestamp != null
            ? (replyingTo as any).videoTimestamp
            : undefined;
        const tempComment: PostComment = {
            id: tempId,
            _id: String(tempId),
            author: currentUser || 'کاربر',
            authorAvatarUrl: '',
            text,
            date: new Date().toLocaleDateString('fa-IR'),
            isoDate: new Date().toISOString(),
            replyTo: replyToId ? String(replyToId) : undefined,
            quotedText: replyToId ? quoteText : undefined,
            likes: 0,
            media: media.length > 0 ? media : undefined,
            audioTimestamp: audioTs,
            videoTimestamp: videoTs,
        };
        setLocalComments(prev => [...prev, tempComment]);
        setCommentText('');
        setReplyingTo(null);
        setQuotedText('');
        setInputMedia(null);
        setMarkAudioTimestamp(false);
        setMarkVideoTimestamp(false);
        setSending(false);

        onAddComment(post.id, text, replyToId as any, media.length > 0 ? media : undefined, replyToId ? quoteText : undefined, audioTs, videoTs);
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
        setQuotedText('');
    };

    const handleLikeComment = (comment: PostComment) => {
        const cid = String(comment.id || (comment as any)._id);
        onParentLikeComment?.(cid);
    };

    const handleDeleteComment = async (comment: PostComment) => {
        const cid = String(comment.id || (comment as any)._id);
        onParentDeleteComment?.(cid);
        const removeFromLocal = (list: PostComment[]): PostComment[] =>
            list.filter(c => String(c.id || (c as any)._id) !== cid)
                .map(c => ({ ...c, replies: (c as any).replies ? removeFromLocal((c as any).replies) : [] }) as any);
        setLocalComments(prev => removeFromLocal(prev));
    };

    const handleEditComment = async (comment: PostComment, newText: string) => {
        const cid = String(comment.id || (comment as any)._id);
        onParentUpdateComment?.(cid, newText);
        const updateInLocal = (list: PostComment[]): PostComment[] =>
            list.map(c => {
                if (String(c.id || (c as any)._id) === cid) return { ...c, text: newText } as PostComment;
                if ((c as any).replies?.length) return { ...c, replies: updateInLocal((c as any).replies) } as any;
                return c;
            });
        setLocalComments(prev => updateInLocal(prev));
    };

    const handleVideoTimeUpdate = useCallback((time: number) => {
        setVideoCurrentTime(time);
        if (pendingVideoSeekRef.current !== null) {
            pendingVideoSeekRef.current = null;
        }
    }, []);

    const handleVideoTimestampClick = (seconds: number) => {
        if (videoPlayerRef.current) {
            videoPlayerRef.current.seekTo(seconds, true);
        } else {
            pendingVideoSeekRef.current = seconds;
        }
    };

    const handleAudioTimestampClick = (seconds: number) => {
        if (onSeekAudio) {
            onSeekAudio(seconds);
        } else if (audioElementRef.current) {
            audioElementRef.current.currentTime = seconds;
            audioElementRef.current.play();
        }
    };

    return (
    <>
        <div className="fixed inset-0 z-[700] flex flex-col" style={{ background: 'var(--surface)' }}>
            {/* Messages */}
            <main ref={mainRef} className="flex-1 overflow-y-auto chat-bg" style={{ position: 'relative' }}>
                <header className="border-b backdrop-blur-md flex justify-center" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 92%, transparent)' }}>
                  <div className="flex items-center gap-2 p-3 w-full max-w-2xl">
                    <button onClick={onBack}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                      style={{ color: 'var(--text-2)', background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                        <i className="fas fa-times text-sm"></i>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>گفتگو</h2>
                        <p className="truncate" style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                          {video ? video.title : post.author} · {toPersianDigits(localComments.length)} پیام
                        </p>
                    </div>
                  </div>
                </header>
                <div className="max-w-2xl mx-auto">
                {video && (
                  <div className="px-3 pt-2">
                    <div className="rounded-lg overflow-hidden chat-video-player" style={{ border: '1px solid var(--border)', background: '#000' }}>
                      <CustomVideoPlayer
                        ref={videoPlayerRef}
                        videoId={String((video as any)._id || video.id)}
                        embedId={video.embedId}
                        title={video.title}
                        poster={video.thumbnailUrl}
                        onTimeUpdate={handleVideoTimeUpdate}
                      />
                    </div>
                  </div>
                )}
                <PostHeader target={{ type: 'post', post, video, podcast }} authors={authors} onAudioRef={(el) => { audioElementRef.current = el; }} onVideoClick={setVideoLightbox} onImageClick={(data) => setLightboxData(data)} currentUser={currentUser} onUpdatePost={onUpdatePost} publishedBook={publishedBooks?.find((b: any) => String(b.id) === String(post.bookId))} onShowBook={onShowBook} onPlayEpisode={onPlayEpisode} miniPlayerProps={miniPlayerProps} />
                <div className="py-3 pb-28 sm:pb-40">
                    {localComments.length > 0 ? (
                        (() => {
                            const rootComments = localComments.filter((c: any) => {
                                if (!(c as any).replyTo && !(c as any).parentId) return true;
                                const parentId = String((c as any).replyTo || (c as any).parentId);
                                return !localComments.some((p: any) => String(p.id || (p as any)._id) === parentId);
                            });
                            return rootComments.map((comment, idx) => {
                            const prevComment = idx > 0 ? rootComments[idx - 1] : null;
                            const showAuthor = !prevComment || prevComment.author !== comment.author;
                            const showDate = !prevComment || !isSameDay(comment.isoDate, prevComment.isoDate);

                            return (
                                <React.Fragment key={comment.id || (comment as any)._id || idx}>
                                    {showDate && <DateSeparator date={toJalaliDate(comment.isoDate)} />}
                                    <ChatBubble
                                        comment={comment}
                                        allComments={localComments}
                                        isOwn={currentUser ? comment.author === currentUser : false}
                                        showAuthor={showAuthor}
                                        currentUser={currentUser}
                                        onReply={handleReply}
                                        onLike={handleLikeComment}
                                        onDelete={handleDeleteComment}
                                        onEdit={handleEditComment}
                                        onImageClick={(data) => setLightboxData(data)}
                                        onVideoClick={setVideoLightbox}
                                        onTimestampClick={handleVideoTimestampClick}
                                        onAudioTimestampClick={handleAudioTimestampClick}
                                    />
                                </React.Fragment>
                            );
                            });
                            })()
                    ) : (
                        <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                <i className="fas fa-comments text-2xl opacity-30"></i>
                            </div>
                            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-2)' }}>هنوز پیامی نیست</p>
                            <p className="text-xs opacity-60">اولین نفری باشید که شروع می‌کند.</p>
                        </div>
                    )}
                    <div ref={commentsEndRef} />
                </div>
                </div>
            </main>

            {/* Input area */}
            <footer className="flex-shrink-0 border-t flex justify-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="w-full max-w-2xl">
                {inputMedia && (
                  <div className="flex items-center gap-2 px-3 pt-2">
                    <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      {inputMedia.type === 'image' ? (
                        <img src={inputMedia.url} className="w-14 h-14 object-cover" alt="" />
                      ) : inputMedia.type === 'audio' ? (
                        <div className="w-14 h-14 flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
                          <i className="fas fa-music" style={{ color: 'var(--primary)' }}></i>
                        </div>
                      ) : (
                        <div className="w-14 h-14 flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
                          <i className="fas fa-video" style={{ color: 'var(--primary)' }}></i>
                        </div>
                      )}
                      <button onClick={() => setInputMedia(null)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                        style={{ background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)', fontSize: '8px' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>
                      {inputMedia.type === 'image' ? 'تصویر' : inputMedia.type === 'audio' ? 'صوت' : 'ویدیو'}
                    </span>
                  </div>
                )}

                {miniPlayerProps && (
                  <div className="px-2 pt-1">
                    <MinimizedPlayer {...miniPlayerProps} variant="inline" />
                  </div>
                )}

                {replyingTo && (
                    <div className="flex items-center gap-2 px-3 py-2 border-b animate-fadeIn" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--primary) 5%, var(--surface))' }}>
                        <div className="flex-1 min-w-0 border-r-[3px] pr-2 mr-1" style={{ borderColor: 'var(--primary)' }}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <i className="fas fa-reply text-[9px]" style={{ color: 'var(--primary)' }}></i>
                                <span className="text-[11px] font-bold" style={{ color: 'var(--primary)' }}>پاسخ به {replyingTo.author}</span>
                                {(replyingTo as any).audioTimestamp != null && (
                                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', fontSize: '7px' }}>
                                    <i className="fas fa-music text-[6px]"></i>
                                    {toPersianDigits(Math.floor((replyingTo as any).audioTimestamp / 60))}:{toPersianDigits(String(Math.floor((replyingTo as any).audioTimestamp % 60)).padStart(2, '0'))}
                                  </span>
                                )}
                                {(replyingTo as any).videoTimestamp != null && (
                                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', fontSize: '7px' }}>
                                    <i className="fas fa-video text-[6px]"></i>
                                    {toPersianDigits(Math.floor((replyingTo as any).videoTimestamp / 60))}:{toPersianDigits(String(Math.floor((replyingTo as any).videoTimestamp % 60)).padStart(2, '0'))}
                                  </span>
                                )}
                            </div>
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                              {quotedText || replyingTo.text || (replyingTo.media?.length ? '📎 پیام رسانه‌ای' : '')}
                            </p>
                        </div>
                        <button onClick={handleCancelReply}
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                          style={{ color: 'var(--text-3)', background: 'var(--surface-3)' }}>
                            <i className="fas fa-times text-[10px]"></i>
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-2 p-2.5 lg:p-3">
                    {(userRole === 'author' || userRole === 'admin') && (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                        style={{ color: 'var(--text-2)', border: '1.5px solid var(--border)', background: 'var(--surface-2)' }}>
                        <i className="fas fa-plus text-[11px]"></i>
                    </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*" onChange={handleFileChange} className="hidden" />
                    {hasAudio && (
                      <button type="button" onClick={() => setMarkAudioTimestamp(!markAudioTimestamp)}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                        style={{ color: markAudioTimestamp ? 'white' : 'var(--text-2)', background: markAudioTimestamp ? 'var(--primary)' : 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                        <i className="fas fa-music text-[11px]"></i>
                      </button>
                    )}
                    {hasVideo && (
                      <button type="button" onClick={() => setMarkVideoTimestamp(!markVideoTimestamp)}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                        style={{ color: markVideoTimestamp ? 'white' : 'var(--text-2)', background: markVideoTimestamp ? 'var(--primary)' : 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                        <i className="fas fa-video text-[11px]"></i>
                      </button>
                    )}
                    <div className="flex-1 min-w-0 rounded-full overflow-hidden transition-all duration-200"
                        style={{ border: `2px solid ${commentText.trim() || inputMedia ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--surface-2)' }}>
                        <input ref={inputRef} value={commentText} onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                            placeholder="پیام..."
                            className="w-full bg-transparent px-4 py-2.5 text-[13px] font-medium focus:outline-none min-h-[38px]"
                            style={{ color: 'var(--text)' }}
                            autoComplete="off" />
                    </div>
                    <button onClick={handleSubmit} disabled={(!commentText.trim() && !inputMedia) || sending}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all disabled:opacity-40 shadow-md"
                        style={{ background: (commentText.trim() || inputMedia) && !sending ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)', color: (commentText.trim() || inputMedia) && !sending ? 'white' : 'var(--text-2)' }}>
                        <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-[11px]`}></i>
                    </button>
                </div>
              </div>
            </footer>
        </div>
        {lightboxData && <ImageLightbox src={lightboxData.src} onClose={() => setLightboxData(null)} text={lightboxData.text} author={lightboxData.author} authorAvatar={lightboxData.authorAvatar} time={lightboxData.time} onReply={lightboxData.comment ? (replyText) => { handleReply(lightboxData.comment!, replyText); setLightboxData(null); } : undefined} onAttachMedia={() => fileInputRef.current?.click()} />}
        {videoLightbox && <VideoLightbox url={videoLightbox} onClose={() => setVideoLightbox(null)} />}
    </>
    );
};

export default PostCommentsPage;
