import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Post, Video, Comment, Podcast, Episode, Author, PublishedBook, PostComment } from '../types';
import { toPersianDigits, isSameDay, formatDateSeparator, formatTimeFromISO, formatTime, DEFAULT_COVER } from '../utils/helpers';
import AudioPlayer from '../components/AudioPlayer';
import MinimizedPlayer from '../components/MinimizedPlayer';
import TimestampThumbnail from '../components/TimestampThumbnail';
import { createPost, addPostComment, getCommunitySettings } from '../services/api';
import UserProfileModal from '../components/UserProfileModal';
import { ImageLightbox, VideoLightbox } from '../components/MediaLightbox';
import ConfirmToast from '../components/ConfirmToast';

const BRAND_AVATAR = '/images/brand-avatar.jpg';

const formatTimestamp = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return toPersianDigits(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  return toPersianDigits(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
};

const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <div className="text-center my-4 date-separator">
    <span className="backdrop-blur-md text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm"
      style={{ background: 'color-mix(in srgb, var(--surface-3) 80%, transparent)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
      {formatDateSeparator(date)}
    </span>
  </div>
);

const QuoteChip: React.FC<{ text: string; onCancel?: () => void }> = ({ text, onCancel }) => (
  <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', borderRight: '2px solid var(--primary)' }}>
    <i className="fas fa-quote-right text-[7px] flex-shrink-0" style={{ color: 'var(--primary)' }}></i>
    <span className="text-[9px] font-medium leading-relaxed line-clamp-1 flex-1 min-w-0" style={{ color: 'var(--text-2)' }}>{text}</span>
    {onCancel && (
      <button onClick={onCancel} className="flex-shrink-0 hover:opacity-60 transition-opacity" style={{ color: 'var(--text-3)' }}>
        <i className="fas fa-times text-[8px]"></i>
      </button>
    )}
  </div>
);

const QuoteBlock: React.FC<{ text: string; author: string }> = ({ text, author }) => (
  <div className="mb-1.5 pr-2 py-1.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)', borderRight: '2px solid var(--primary)' }}>
    <div className="flex items-center gap-1">
      <i className="fas fa-quote-right text-[6px]" style={{ color: 'var(--primary)' }}></i>
      <span className="text-[8px] font-black" style={{ color: 'var(--primary)' }}>{author}</span>
    </div>
    <div className="text-[8px] font-medium mt-0.5 leading-relaxed line-clamp-1 opacity-70" style={{ color: 'var(--text-3)' }}>{text}</div>
  </div>
);

// ─── منوی عملیات (پاسخ / نقل‌قول / لایک / ویرایش / حذف) — مشترک بین همه کارت‌های محفل ───
const useActionMenu = () => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const openAt = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: Math.round(r.bottom + 2), right: Math.round(document.documentElement.clientWidth - r.right) });
  }, []);
  const close = useCallback(() => setPos(null), []);
  return { pos, openAt, close };
};

type ActionMenuItem = { icon?: string; label?: string; color?: string; divider?: boolean; onClick?: () => void };

const ActionMenu: React.FC<{ pos: { top: number; right: number }; onClose: () => void; items: ActionMenuItem[] }> = ({ pos, onClose, items }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose(); };
    const s = () => onClose();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', h);
    document.addEventListener('scroll', s, true);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('scroll', s, true); document.removeEventListener('keydown', k); };
  }, [onClose]);
  return createPortal(
    <div ref={ref} className="fixed z-[9999] animate-fadeIn" style={{ top: pos.top, right: pos.right }}>
      <div className="rounded-xl shadow-lg py-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: '150px' }}>
        <div className="flex items-center justify-between px-2.5 py-1 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>عملیات</span>
          <button onClick={onClose} className="w-4 h-4 rounded-full flex items-center justify-center transition-all active:scale-90 hover:opacity-70" style={{ color: 'var(--text-3)' }}>
            <i className="fas fa-times text-[7px]"></i>
          </button>
        </div>
        {items.map((it, i) => it.divider ? (
          <div key={i} className="h-px mx-2.5" style={{ background: 'var(--border)' }}></div>
        ) : (
          <button key={i} onClick={() => { it.onClick?.(); onClose(); }} className="w-full text-right px-2.5 py-2 text-[11px] font-medium flex items-center gap-2 transition-colors hover:bg-white/5" style={{ color: it.color || 'var(--text)' }}>
            {it.icon && <i className={`${it.icon} text-[9px]`} style={{ color: it.color || 'var(--text-3)' }}></i>} {it.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

const MediaCard: React.FC<{
    video?: Video;
    podcast?: Podcast;
    episode?: Episode | null;
    book?: PublishedBook;
    album?: any;
    onPlayVideo: (video: Video) => void;
    onPlayPodcast: (podcast: Podcast, episodeIndex: number) => void;
    onShowBook: (book: PublishedBook) => void;
    onPlayAlbum?: (album: any) => void;
    onOpenAlbum?: (album: any) => void;
    onShowDiscussion?: () => void;
}> = React.memo(({ video, podcast, episode, book, album, onPlayVideo, onPlayPodcast, onShowBook, onPlayAlbum, onOpenAlbum, onShowDiscussion }) => {
    if (album) return (
        <div className="my-2 rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div onClick={(e) => { e.stopPropagation(); onOpenAlbum?.(album); }}
              className="flex items-center gap-3 p-2.5 cursor-pointer transition-all duration-300 hover:shadow-md active:scale-[0.98]">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={album.cover || album.items?.[0]?.cover || DEFAULT_COVER} className="w-full h-full object-cover" alt={album.title} />
                    <span className="absolute bottom-0.5 left-0.5 px-1 rounded text-[6px] font-black text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        {toPersianDigits(album.items?.length || 0)}
                    </span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                    <p className="font-black text-[10px] truncate" style={{ color: 'var(--text)' }}>{album.title}</p>
                    <p className="text-[8px] font-bold mt-0.5" style={{ color: '#14b8a6' }}>
                        <i className="fas fa-palette text-[7px] ml-1" />
                        {album.type === 'video' ? 'آلبوم ویدیویی' : 'آلبوم صوتی'}
                    </p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] shadow-sm" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: 'white' }}>
                    <i className="fas fa-play ml-0.5"></i>
                </div>
            </div>
        </div>
    );
    if (video) return (
        <div className="my-2 rounded-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg" onClick={(e) => { e.stopPropagation(); onPlayVideo(video); }}
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
            <div className="aspect-video relative">
                <img src={video.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" alt={video.title} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25">
                    <i className="fas fa-play text-white text-sm mr-[-2px]"></i>
                  </div>
                </div>
            </div>
        </div>
    );
    if (book) return (
        <div onClick={(e) => { e.stopPropagation(); onShowBook(book); }} className="flex gap-3 p-2.5 my-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 shadow-md relative"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                {book.cover ? (
                    <img src={book.cover} className="w-full h-full object-cover" alt={book.title} loading="lazy" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                        <i className="fas fa-book text-white/30 text-xl mb-1" />
                        <span className="text-[9px] text-white font-black">{book.title.slice(0, 10)}</span>
                    </div>
                )}
                <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-white/10 via-black/20 to-white/10" />
                {book.isNew && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[7px] font-black text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                        <i className="fas fa-bolt text-[6px]" /> تازه
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0 text-right flex flex-col justify-center py-0.5">
                <p className="font-black text-[12px] leading-snug line-clamp-2 mb-1" style={{ color: 'var(--text)' }}>{book.title}</p>
                {book.authorName && <p className="text-[9px] font-bold truncate" style={{ color: 'var(--text-3)' }}>{book.authorName}</p>}
            </div>
            <i className="fas fa-chevron-left text-[8px] self-center" style={{ color: 'var(--text-3)' }}></i>
        </div>
    );
    const ep = episode || (podcast?.episodes ? podcast.episodes[0] : null);
    if (podcast && ep) return (
        <div className="my-2 rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div onClick={(e) => { e.stopPropagation(); onPlayPodcast(podcast, podcast.episodes.findIndex(e => e.title === ep.title)); }}
              className="flex items-center gap-3 p-2.5 cursor-pointer transition-all duration-300 hover:shadow-md active:scale-[0.98]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] shadow-sm"
                  style={{ background: 'var(--primary)', color: 'white' }}><i className="fas fa-play ml-0.5"></i></div>
                <div className="flex-1 min-w-0 text-right">
                    <p className="font-black text-[10px] truncate" style={{ color: 'var(--text)' }}>{ep.title}</p>
                    <p className="text-[8px] font-bold mt-0.5 opacity-80" style={{ color: 'var(--primary)' }}>{podcast.title}</p>
                </div>
                <img src={ep.cover || podcast.cover || DEFAULT_COVER} className="w-9 h-9 rounded-lg object-cover" alt={ep.title} />
            </div>
            {onShowDiscussion && (
                <div className="flex items-center gap-2 px-3 pb-2 pt-1" style={{ borderTop: '1px solid color-mix(in srgb, var(--border) 30%, transparent)' }}>
                    <button onClick={(e) => { e.stopPropagation(); onShowDiscussion(); }}
                      className="flex items-center gap-1.5 rounded-lg py-1 px-2 transition-all active:scale-90"
                      style={{ color: 'var(--primary)' }}>
                        <i className="fas fa-comments text-[11px]"></i>
                        <span className="text-[10px] font-bold">گفتگو</span>
                    </button>
                </div>
            )}
        </div>
    );
    return null;
});

type RenderReplyProps = {
  comment: PostComment;
  depth: number;
  postId: number;
  localComments: PostComment[];
  currentUser?: string;
  likedReplies: Set<string>;
  touchStartX: React.MutableRefObject<number>;
  onSwipeReply?: (target: { postId: number; author: string; text: string; commentId?: string; quotedText?: string }) => void;
  getCommentId: (c: any) => string;
  handleLikeReply: (id: string) => void;
  handleDeleteReply: (id: string) => void;
  onOpenProfile?: (userId?: string, name?: string, avatar?: string) => void;
};

const RenderReply = React.memo<RenderReplyProps>(({ comment, depth, postId, localComments, currentUser, likedReplies, touchStartX, onSwipeReply, getCommentId, handleLikeReply, handleDeleteReply, onOpenProfile }) => {
  const commentId = getCommentId(comment);
  const repliedTo = comment.replyTo ? localComments.find(c => getCommentId(c) === comment.replyTo) : null;
  const children = localComments.filter(c => c.replyTo === commentId);
  const [showChildReplies, setShowChildReplies] = useState(depth < 3);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const isOwn = currentUser && comment.author === currentUser;
  const colorSeed = comment.author.charCodeAt(0) * 37;
  const [imgLightbox, setImgLightbox] = useState<{ src: string; text?: string; author?: string; authorAvatar?: string; time?: string } | null>(null);
  const [vidLightbox, setVidLightbox] = useState<string | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [showQuoteBtn, setShowQuoteBtn] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');
  const menu = useActionMenu();

  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && textRef.current?.contains(sel.anchorNode)) {
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

  const handleQuoteReply = () => {
    if (!selectedQuoteText) return;
    onSwipeReply?.({ postId, author: comment.author, text: selectedQuoteText, commentId, quotedText: selectedQuoteText });
    setShowQuoteBtn(false);
    setSelectedQuoteText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === comment.text) { setIsEditing(false); return; }
    try {
      const { updatePostComment } = await import('../services/api');
      const updated = await updatePostComment(String(postId), commentId, { text: editText.trim() });
      if (updated) {
        comment.text = editText.trim();
        setIsEditing(false);
      }
    } catch { setIsEditing(false); }
  };

  return (<>
    <div className="flex items-start gap-2 group/reply py-1"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const d = e.changedTouches[0].clientX - touchStartX.current; if (d > 50 && onSwipeReply) onSwipeReply({ postId, author: comment.author, text: comment.text, commentId }); }}>
      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-0.5 shadow-sm cursor-pointer active:scale-95 transition-transform" style={{ background: `linear-gradient(135deg, hsl(${colorSeed % 360}, 55%, 50%), hsl(${(colorSeed + 40) % 360}, 55%, 40%))` }} onClick={() => onOpenProfile?.(comment.userId, comment.author, comment.authorAvatarUrl)}>
        {comment.authorAvatarUrl ? (
          <img src={comment.authorAvatarUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-[7px] font-black">{comment.author?.charAt(0)}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
          <div className="rounded-xl px-3 py-2 transition-all duration-200 relative" style={{ background: comment.isFeatured ? 'linear-gradient(145deg, #fef9c3, #fef3c7, #fffbeb)' : 'color-mix(in srgb, var(--surface-3) 80%, transparent)', border: comment.isFeatured ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid color-mix(in srgb, var(--border) 40%, transparent)', boxShadow: comment.isFeatured ? '0 1px 6px rgba(234, 179, 8, 0.15)' : undefined }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-[10px] cursor-pointer hover:opacity-70 transition-opacity" style={{ color: 'var(--text-1)' }} onClick={() => onOpenProfile?.(comment.userId, comment.author, comment.authorAvatarUrl)}>{comment.author}</span>
              {comment.isFeatured && <span className="text-[6px] px-1 py-0.5 rounded-full font-black" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#b45309', boxShadow: '0 1px 3px rgba(234,179,8,0.2)' }}><i className="fas fa-star"></i></span>}
              {comment.isPinned && <span className="text-[6px] px-1 py-0.5 rounded-full bg-orange-100 text-orange-600 font-black"><i className="fas fa-thumbtack"></i></span>}
              <div className="w-0.5 h-0.5 rounded-full" style={{ background: 'var(--text-3)' }}></div>
              <span className="text-[8px] font-medium" style={{ color: 'var(--text-3)' }}>{formatTimeFromISO(comment.isoDate)}</span>
              <button onClick={menu.openAt} className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-0 group-hover/reply:opacity-50 hover:!opacity-80 flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-ellipsis-vertical text-[8px]"></i>
              </button>
            </div>
            {((comment as any).quotedText || repliedTo) && (
              <div className="mb-1.5 pr-2 py-1.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)', borderRight: '2px solid var(--primary)' }}>
                <div className="flex items-center gap-1">
                  <i className={`fas ${(comment as any).quotedText ? 'fa-quote-right' : 'fa-reply'} text-[6px]`} style={{ color: 'var(--primary)' }}></i>
                  <span className="text-[8px] font-black" style={{ color: 'var(--primary)' }}>{repliedTo ? repliedTo.author : comment.author}</span>
                </div>
                <div className="text-[8px] font-medium mt-0.5 leading-relaxed line-clamp-1 opacity-70" style={{ color: 'var(--text-3)' }}>{(comment as any).quotedText || repliedTo?.text || ''}</div>
              </div>
            )}
            {comment.media && comment.media.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
                {comment.media.map((m, i) => {
                  const isSingleImage = m.type === 'image' && comment.media!.length === 1;
                  const imgWidth = m.type === 'image' ? (isSingleImage ? 'fit-content' : 'calc(50% - 3px)') : '100%';
                  return (
                  <div key={i} className="rounded-xl overflow-hidden shadow-sm" style={{ boxShadow: '0 0 0 1px var(--border)', width: imgWidth, maxWidth: 'min(100%, 420px)', margin: isSingleImage ? '0 auto' : undefined, background: 'var(--surface-3)' }}>
                    {m.type === 'image' ? (
                      <img src={m.url} className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity duration-300" alt="" loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} onClick={(e) => { e.stopPropagation(); setImgLightbox({ src: m.url, text: comment.text, author: comment.author, authorAvatar: comment.authorAvatarUrl, time: formatTimeFromISO(comment.isoDate) }); }} />
                    ) : m.type === 'audio' ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <AudioPlayer src={m.url} compact />
                      </div>
                    ) : (
                      <div className="aspect-video relative group flex items-center justify-center cursor-pointer" style={{ background: 'var(--surface-3)' }} onClick={(e) => { e.stopPropagation(); setVidLightbox(m.url); }}>
                        <div className="w-10 h-10 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-transform group-hover:scale-110">
                          <i className="fas fa-play text-white text-xs mr-[-1px]"></i>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
            {isEditing ? (
              <div>
                <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                  className="w-full bg-transparent outline-none text-[11px] leading-relaxed px-1 py-0.5 rounded" autoFocus
                  style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
                <div className="flex gap-1.5 mt-1">
                  <button onClick={handleSaveEdit} className="text-[8px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                  <button onClick={() => { setIsEditing(false); setEditText(comment.text); }} className="text-[8px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
                </div>
              </div>
            ) : (
              <>
                {comment.audioTimestamp != null && (
                   <button onClick={() => { const el = document.querySelector('audio'); const ts = comment.audioTimestamp; if (el && ts != null) { el.currentTime = ts; el.play().catch(() => {}); } }}
                    className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-lg transition-all active:scale-95"
                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontSize: '8px', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                    <i className="fas fa-music text-[7px]"></i>
                    <span className="font-medium">پاسخ به </span>
                    <span className="font-bold" style={{ fontSize: '9px' }}>{toPersianDigits(Math.floor(comment.audioTimestamp / 60))}:{toPersianDigits(String(Math.floor(comment.audioTimestamp % 60)).padStart(2, '0'))}</span>
                    <span className="font-medium"> از صوت</span>
                  </button>
                )}
                <p ref={textRef} className="text-[11px] leading-relaxed whitespace-pre-wrap select-text" style={{ color: 'var(--text)' }}>{comment.text}</p>
              </>
            )}
            {showQuoteBtn && !isEditing && (
              <div className="absolute z-50 rounded-xl shadow-xl py-1 animate-fadeIn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', top: '-40px', left: '50%', transform: 'translateX(-50%)' }}>
                <button onClick={handleQuoteReply} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/5 whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                  <i className="fas fa-quote-right text-[9px]"></i>
                  نقل‌قول و پاسخ
                </button>
              </div>
            )}
            {isOwn && !isEditing && (
              <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-0 group-hover/reply:opacity-40 hover:!opacity-70"
                style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-pen text-[7px]"></i>
              </button>
            )}
          </div>
        <div className="flex items-center gap-1 pr-1 pt-0.5 transition-opacity mr-auto">
          <button onClick={(e) => { e.stopPropagation(); onSwipeReply?.({ postId, author: comment.author, text: comment.text, commentId }); }}
            className="text-[7px] font-bold transition-all duration-200 hover:bg-black/5 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5" style={{ color: 'var(--text-3)' }}>
            <i className="fas fa-reply text-[7px]"></i><span>پاسخ</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleLikeReply(commentId); }}
            className="text-[7px] font-bold transition-all duration-200 hover:bg-black/5 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5" style={{ color: likedReplies.has(commentId) ? '#ef4444' : 'var(--text-3)' }}>
            <i className={`${likedReplies.has(commentId) ? 'fas' : 'far'} fa-heart text-[7px]`}></i><span>{toPersianDigits((comment.likes || 0) + (likedReplies.has(commentId) ? 1 : 0))}</span>
          </button>
          {isOwn && (
            <button onClick={(e) => { e.stopPropagation(); handleDeleteReply(commentId); }}
              className="text-[7px] font-bold transition-all duration-200 hover:bg-red-500/5 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5" style={{ color: 'var(--text-3)' }}>
              <i className="fas fa-trash-alt text-[7px]"></i>
            </button>
          )}
          {children.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setShowChildReplies(!showChildReplies); }}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[8px] font-bold transition-all duration-300 hover:shadow-sm active:scale-95"
              style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }}>
              <i className={`fas ${showChildReplies ? 'fa-chevron-up' : 'fa-chevron-down'} text-[7px] transition-transform duration-300`}></i>
              <span>{toPersianDigits(children.length)} پاسخ</span>
            </button>
          )}
        </div>
        {showChildReplies && children.length > 0 && (
          <div className="pr-3 mt-1 space-y-1" style={{ borderRight: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
            {children.map(child => (
              <RenderReply key={getCommentId(child)} comment={child} depth={depth + 1} postId={postId} localComments={localComments} currentUser={currentUser} likedReplies={likedReplies} touchStartX={touchStartX} onSwipeReply={onSwipeReply} getCommentId={getCommentId} handleLikeReply={handleLikeReply} handleDeleteReply={handleDeleteReply} onOpenProfile={onOpenProfile} />
            ))}
          </div>
               )}
           </div>
    </div>
    {imgLightbox && <ImageLightbox src={imgLightbox.src} onClose={() => setImgLightbox(null)} text={imgLightbox.text} author={imgLightbox.author} authorAvatar={imgLightbox.authorAvatar} time={imgLightbox.time} />}
    {vidLightbox && <VideoLightbox url={vidLightbox} onClose={() => setVidLightbox(null)} />}
    {menu.pos && (
      <ActionMenu pos={menu.pos} onClose={menu.close} items={[
        { icon: 'fas fa-reply', label: 'پاسخ', onClick: () => onSwipeReply?.({ postId, author: comment.author, text: comment.text, commentId }) },
        { icon: 'fas fa-quote-right', label: 'نقل‌قول', onClick: () => onSwipeReply?.({ postId, author: comment.author, text: selectedQuoteText || comment.text, commentId, quotedText: selectedQuoteText || comment.text }) },
        { divider: true },
        { icon: 'far fa-heart', label: 'لایک', onClick: () => handleLikeReply(commentId) },
        ...(isOwn ? [
          { icon: 'fas fa-pen', label: 'ویرایش', onClick: () => setIsEditing(true) },
          { icon: 'fas fa-trash-alt', label: 'حذف', color: '#ef4444', onClick: () => handleDeleteReply(commentId) },
        ] : []),
      ]} />
    )}
    </>
  );
});

const PostBubble: React.FC<{
  post: Post;
  video?: Video;
  podcast?: Podcast;
  episode?: Episode | null;
  publishedBook?: PublishedBook;
  album?: any;
  saved?: boolean;
  onToggleSave?: (post: Post) => void;
  onPlayAlbum?: (album: any) => void;
  onOpenAlbum?: (album: any) => void;
  onShowComments: (post: Post, podcast?: Podcast) => void;
  onPlayVideo: (video: Video) => void;
  onPlayPodcast: (podcast: Podcast, episodeIndex: number) => void;
  onShowBook: (book: PublishedBook) => void;
  onOpenMenu: (post: Post, rect: DOMRect) => void;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onShowInstantView: (title: string, content: string) => void;
  onAddComment?: (text: string, video: any, videoTimestamp?: number, parentId?: string, audioTimestamp?: number) => void;
  onNewPost?: (post: Post) => void;
  onUpdatePost?: (post: Post) => void;
  onDeletePost?: (postId: number) => void;
  currentUser?: string;
  userRole?: string;
  onSwipeReply?: (target: { postId: number; author: string; text: string; commentId?: string; quotedText?: string }) => void;
  onOpenProfile?: (userId?: string, name?: string, avatar?: string) => void;
}> = React.memo(({ post, video, podcast, episode, publishedBook, album, saved, onToggleSave, onPlayAlbum, onOpenAlbum, onShowComments, onPlayVideo, onPlayPodcast, onShowBook, onOpenMenu, isFirstInGroup, isLastInGroup, onShowInstantView, onAddComment, onNewPost, onUpdatePost, onDeletePost, currentUser, userRole, onSwipeReply, onOpenProfile }) => {
  const isAdminPost = post.author === 'سرای هنر و اندیشه' || post.author?.includes('مجموعه:');
  const [liked, setLiked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('soha_liked_posts') || '[]').includes(String(post.id)); } catch { return false; }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostText, setEditPostText] = useState(post.text);
  const [localComments, setLocalComments] = useState<PostComment[]>(post.comments);
  const [showReplies, setShowReplies] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('soha_liked_replies') || '[]')); } catch { return new Set(); }
  });
  const [imgLightbox, setImgLightbox] = useState<{ src: string; text?: string; author?: string; authorAvatar?: string; time?: string } | null>(null);
  const [vidLightbox, setVidLightbox] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const textRef = useRef<HTMLDivElement>(null);
  const [showQuoteBtn, setShowQuoteBtn] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');

  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && textRef.current?.contains(sel.anchorNode)) {
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

  const handleQuoteReply = () => {
    if (!selectedQuoteText) return;
    onSwipeReply?.({ postId: post.id, author: post.author, text: selectedQuoteText, commentId: undefined, quotedText: selectedQuoteText });
    setShowQuoteBtn(false);
    setSelectedQuoteText('');
    window.getSelection()?.removeAllRanges();
  };

  const menu = useActionMenu();

  const getCommentId = (c: any): string => String(c._id ?? c.id);

  useEffect(() => {
    setLocalComments(post.comments);
  }, [post.comments]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX > 50 && onSwipeReply) {
      onSwipeReply({ postId: post.id, author: post.author, text: post.text || '' });
    }
  };

  const toggleLike = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !liked;
    setLiked(next);
    try {
      const arr = JSON.parse(localStorage.getItem('soha_liked_posts') || '[]');
      const id = String(post.id);
      if (next) {
        arr.push(id);
      } else {
        const idx = arr.indexOf(id);
        if (idx > -1) arr.splice(idx, 1);
      }
      localStorage.setItem('soha_liked_posts', JSON.stringify(arr));
    } catch {}
  };

  const handleDelete = () => {
    if (onDeletePost) onDeletePost(post.id);
    setShowDeleteConfirm(false);
  };

  const handleLikeReply = (commentId: string) => {
    const next = new Set(likedReplies);
    if (next.has(commentId)) {
      next.delete(commentId);
    } else {
      next.add(commentId);
    }
    setLikedReplies(next);
    try { localStorage.setItem('soha_liked_replies', JSON.stringify([...next])); } catch {}
  };

  const handleDeleteReply = async (commentId: string) => {
    try {
      const { deletePostComment } = await import('../services/api');
      const ok = await deletePostComment(String(post.id), commentId);
      if (ok) {
        setLocalComments(prev => prev.filter(c => getCommentId(c) !== commentId));
        if (onUpdatePost) {
          const updated = { ...post, comments: post.comments.filter(c => getCommentId(c) !== commentId) };
          onUpdatePost(updated);
        }
      }
    } catch {}
  };

  const handleSavePostEdit = async () => {
    if (!editPostText?.trim() || editPostText.trim() === post.text) { setIsEditingPost(false); return; }
    try {
      const { updatePost } = await import('../services/api');
      const updated = await updatePost(String(post.id), { text: editPostText!.trim() });
      if (updated) {
        if (onUpdatePost) onUpdatePost({ ...updated, id: updated.id ?? post.id });
        setIsEditingPost(false);
      }
    } catch { setIsEditingPost(false); }
  };

  return (<>
    <div id={`post-${post._id || (post as any).id || ''}`} className={`flex items-start gap-1.5 ${isAdminPost ? 'flex-row-reverse' : ''} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}>
       <div className={`w-8 flex-shrink-0 ${isFirstInGroup ? '' : 'invisible'}`}>
         {isFirstInGroup && (post.authorAvatarUrl ? <img src={post.authorAvatarUrl} className="w-8 h-8 rounded-full object-cover shadow-sm cursor-pointer active:scale-95 transition-transform" alt={post.author} onClick={(e) => { e.stopPropagation(); onOpenProfile?.(post.userId, post.author, post.authorAvatarUrl); }} /> : <button onClick={(e) => { e.stopPropagation(); onOpenProfile?.(post.userId, post.author, post.authorAvatarUrl); }} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm cursor-pointer active:scale-95 transition-transform" style={{ background: `hsl(${post.author.charCodeAt(0) * 37 % 360}, 55%, 45%)` }}>{post.author[0]}</button>)}
       </div>

       <div className={`flex flex-col flex-1 min-w-0 ${isAdminPost ? 'items-end' : 'items-start'}`}>
           <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`relative w-[92%] lg:w-[88%] transition-all duration-200 hover:shadow-md cursor-default ${isFirstInGroup ? 'rounded-2xl' : isAdminPost ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`}
            style={{
              background: (post as any).isFeatured
                ? 'linear-gradient(145deg, #fef9c3, #fef3c7, #fffbeb)'
                : isAdminPost
                ? 'linear-gradient(145deg, color-mix(in srgb, var(--primary) 14%, var(--surface-2)), color-mix(in srgb, var(--primary) 4%, var(--surface-2)))'
                : 'var(--surface-2)',
              boxShadow: (post as any).isFeatured
                ? '0 1px 8px rgba(234, 179, 8, 0.18), 0 0 0 1px rgba(234, 179, 8, 0.15)'
                : isAdminPost
                ? '0 1px 6px color-mix(in srgb, var(--primary) 10%, transparent)'
                : '0 1px 4px rgba(0,0,0,0.03)',
              border: (post as any).isFeatured ? '1px solid rgba(234, 179, 8, 0.3)' : isAdminPost ? '1px solid color-mix(in srgb, var(--primary) 12%, transparent)' : '1px solid var(--border)',
            }}>
            {isAdminPost && (
              <div className="h-[2px] rounded-t-2xl" style={{ background: 'linear-gradient(to left, var(--primary), transparent)' }}></div>
            )}

           <div className="px-3 pt-2.5 pb-1.5">
               {/* Header */}
               <div className="flex items-center justify-between mb-1">
                 <div className="flex items-center gap-1.5">
                    <span className="font-black text-[11px] cursor-pointer hover:opacity-70 transition-opacity" style={{ color: isAdminPost ? 'var(--primary)' : 'var(--text-1)' }} onClick={(e) => { e.stopPropagation(); onOpenProfile?.(post.userId, post.author, post.authorAvatarUrl); }}>{post.author}</span>
                    {(post as any).isFeatured && <span className="text-[7px] px-1.5 py-0.5 rounded-full font-black" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#b45309', boxShadow: '0 1px 4px rgba(234,179,8,0.25)' }}><i className="fas fa-star"></i> ویژه</span>}
                    {(post as any).isPinned && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-black"><i className="fas fa-thumbtack"></i> سنجاق</span>}
                    <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>{formatTimeFromISO(post.isoDate)}</span>
                 </div>
{currentUser && (post.author === currentUser || userRole === 'admin' || userRole === 'superadmin') && (
                     <button onClick={(e) => { e.stopPropagation(); setIsEditingPost(true); setEditPostText(post.text || ''); }}
                       className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-50 hover:opacity-80"
                       style={{ color: 'var(--text-3)' }}>
                       <i className="fas fa-pen text-[8px]"></i>
                     </button>
                   )}
                </div>

               {/* Text */}
               {post.text && (
                 <div className="text-right mb-1.5 relative">
                   {isEditingPost ? (
                     <div>
                       <input value={editPostText} onChange={(e) => setEditPostText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSavePostEdit(); } if (e.key === 'Escape') setIsEditingPost(false); }}
                         className="w-full bg-transparent outline-none text-[13px] leading-[1.7] font-medium px-2 py-1 rounded-lg" autoFocus
                         style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
                       <div className="flex gap-1.5 mt-1">
                         <button onClick={handleSavePostEdit} className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                         <button onClick={() => { setIsEditingPost(false); setEditPostText(post.text || ''); }} className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
                       </div>
                    </div>
                   ) : (
                     <div ref={textRef} className="text-[13px] leading-[1.7] font-medium whitespace-pre-wrap select-text" style={{ color: 'var(--text)' }}>{post.text}</div>
                   )}
                   {showQuoteBtn && !isEditingPost && (
                     <div className="absolute z-50 rounded-xl shadow-xl py-1 animate-fadeIn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', top: '-40px', left: '50%', transform: 'translateX(-50%)' }}>
                       <button onClick={handleQuoteReply} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/5 whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                         <i className="fas fa-quote-right text-[9px]"></i>
                         نقل‌قول و پاسخ
                       </button>
                     </div>
                   )}
                 </div>
               )}

               {/* Media */}
                 {post.media && post.media.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {post.media.map((m, i) => {
                      const isSingleImage = m.type === 'image' && post.media!.length === 1;
                      const imgWidth = m.type === 'image' ? (isSingleImage ? 'fit-content' : 'calc(50% - 2px)') : '100%';
                      return (
                      <div key={i} className="rounded-xl overflow-hidden" style={{ boxShadow: '0 0 0 1px var(--border)', width: imgWidth, maxWidth: 'min(100%, 420px)', margin: isSingleImage ? '0 auto' : undefined, background: 'var(--surface-3)' }}>
                         {m.type === 'image' ? (
                           <img src={m.url} className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity" alt="" loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} onClick={(e) => { e.stopPropagation(); setImgLightbox({ src: m.url, text: post.text, author: post.author, authorAvatar: post.authorAvatarUrl, time: formatTimeFromISO(post.isoDate) }); }} />
                          ) : m.type === 'audio' ? (
                           <div onClick={(e) => e.stopPropagation()}>
                             <AudioPlayer src={m.url} compact />
                           </div>
                        ) : (
                          <div className="aspect-video relative group flex items-center justify-center cursor-pointer" style={{ background: 'var(--surface-3)' }} onClick={(e) => { e.stopPropagation(); setVidLightbox(m.url); }}>
                           <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 transition-all group-hover:scale-110">
                             <i className="fas fa-play text-white text-sm mr-[-2px]"></i>
                           </div>
                         </div>
                       )}
                     </div>
                     );
                   })}
                 </div>
               )}
               <MediaCard video={video} podcast={podcast} episode={episode} book={publishedBook} album={album} onPlayVideo={onPlayVideo} onPlayPodcast={onPlayPodcast} onShowBook={onShowBook} onPlayAlbum={onPlayAlbum} onOpenAlbum={onOpenAlbum} onShowDiscussion={podcast ? () => onShowComments(post) : undefined} />
           </div>

             {/* Action buttons */}
            <div className="flex items-center gap-2 px-3 pb-2 pt-1" onClick={(e) => e.stopPropagation()}>
<button onClick={(e) => { e.stopPropagation(); onSwipeReply?.({ postId: post.id, author: post.author, text: post.text || '' }); }}
                  className="flex items-center gap-1.5 rounded-lg py-1 px-2 transition-all active:scale-90"
                  style={{ color: '#475569' }}>
                  <i className="fas fa-reply text-[11px]"></i>
                  <span className="text-[10px] font-bold">پاسخ</span>
                </button>
                {currentUser && onToggleSave && (
                <button onClick={(e) => { e.stopPropagation(); onToggleSave(post); }}
                  className="flex items-center gap-1.5 rounded-lg py-1 px-2 transition-all active:scale-90"
                  title={saved ? 'حذف از کتابخانه' : 'ذخیره در کتابخانه'}
                  style={{ color: saved ? 'var(--primary)' : '#475569' }}>
                  <i className={`${saved ? 'fas' : 'far'} fa-bookmark text-[11px]`}></i>
                  <span className="text-[10px] font-bold">{saved ? 'ذخیره شد' : 'ذخیره'}</span>
                </button>
                )}
               <button onClick={toggleLike}
                 className="flex items-center gap-1.5 rounded-lg py-1 px-2 transition-all active:scale-90"
                 style={{ color: liked ? '#ef4444' : '#475569' }}>
                 <i className={`${liked ? 'fas' : 'far'} fa-heart text-[11px]`}></i>
                 <span className="text-[10px] font-bold">{toPersianDigits(post.likes + (liked ? 1 : 0))}</span>
                </button>
{currentUser && (post.author === currentUser || userRole === 'admin' || userRole === 'superadmin') && (
               <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                 className="rounded-lg py-1 px-2 transition-all active:scale-90"
                 style={{ color: '#475569' }}>
                 <i className="fas fa-trash text-[11px]"></i>
               </button>
               )}
               <button onClick={(e) => { e.stopPropagation(); onShowComments(post); }}
                 className="flex items-center gap-1.5 rounded-lg py-1 px-2 transition-all active:scale-90 mr-auto"
                 style={{ color: 'var(--primary)' }}>
                 <i className="fas fa-comments text-[11px]"></i>
                 <span className="text-[10px] font-bold">گفتگو</span>
               </button>
            </div>
            {/* Replies */}
            {localComments.length > 0 && (
              <div onClick={(e) => e.stopPropagation()}>
                <div className="px-2 pb-1">
                 <button onClick={(e) => { e.stopPropagation(); setShowReplies(v => !v); }}
                  className="flex items-center gap-1.5 py-1 px-3 rounded-full text-[9px] font-bold transition-all duration-300 hover:shadow-sm active:scale-95"
                  style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}>
                  <i className={`fas fa-chevron-${showReplies ? 'up' : 'down'} text-[8px] transition-transform duration-300`}></i>
                  <span>{toPersianDigits(localComments.length)} پاسخ</span>
                </button>
                </div>
                 {showReplies && (
                   <div className="pb-2 px-2 ml-2 border-r-2" style={{ borderColor: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                      {localComments.filter(c => !c.replyTo || !localComments.find(x => getCommentId(x) === c.replyTo)).map((rootComment) => (
                         <RenderReply key={getCommentId(rootComment)} comment={rootComment} depth={0} postId={post.id} localComments={localComments} currentUser={currentUser} likedReplies={likedReplies} touchStartX={touchStartX} onSwipeReply={onSwipeReply} getCommentId={getCommentId} handleLikeReply={handleLikeReply} handleDeleteReply={handleDeleteReply} onOpenProfile={onOpenProfile} />
                      ))}
                   </div>
                )}
           </div>
)}
           </div>
    </div>
    </div>
    {imgLightbox && <ImageLightbox src={imgLightbox.src} onClose={() => setImgLightbox(null)} text={imgLightbox.text} author={imgLightbox.author} authorAvatar={imgLightbox.authorAvatar} time={imgLightbox.time} />}
    {vidLightbox && <VideoLightbox url={vidLightbox} onClose={() => setVidLightbox(null)} />}
    {menu.pos && (
      <ActionMenu pos={menu.pos} onClose={menu.close} items={[
        { icon: 'fas fa-reply', label: 'پاسخ', onClick: () => onSwipeReply?.({ postId: post.id, author: post.author, text: post.text || '' }) },
        { icon: 'fas fa-quote-right', label: 'نقل‌قول', onClick: () => onSwipeReply?.({ postId: post.id, author: post.author, text: selectedQuoteText || post.text || '', quotedText: selectedQuoteText || post.text || '' }) },
        { divider: true },
        { icon: liked ? 'fas fa-heart' : 'far fa-heart', label: liked ? 'برداشتن لایک' : 'لایک', color: liked ? '#ef4444' : undefined, onClick: () => toggleLike() },
        ...(currentUser && (post.author === currentUser || userRole === 'admin' || userRole === 'superadmin') ? [
          { icon: 'fas fa-pen', label: 'ویرایش', onClick: () => { setIsEditingPost(true); setEditPostText(post.text || ''); } },
          { icon: 'fas fa-trash-alt', label: 'حذف', color: '#ef4444', onClick: () => setShowDeleteConfirm(true) },
        ] : []),
      ]} />
    )}
    {showDeleteConfirm && (
      <ConfirmToast open message="این پست حذف شود؟" bottom={120} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />
    )}
  </>
  );
});

const VideoCommentItem: React.FC<{
  comment: Comment;
  video: Video;
  allComments: Comment[];
  onOpenVideo: (video: Video, timestamp?: number, highlightId?: string) => void;
  onAddComment: (text: string, video: Video, videoTimestamp?: number, parentId?: string, audioTimestamp?: number, quotedText?: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  onShowDiscussion?: (comment: Comment, video: Video) => void;
  currentUserName?: string;
  userRole?: string;
  depth?: number;
  likedComments?: Set<string>;
  onOpenProfile?: (userId?: string, name?: string, avatar?: string) => void;
}> = ({ comment, video, allComments, onOpenVideo, onAddComment, onDeleteComment, onLikeComment, onUpdateComment, onShowDiscussion, currentUserName, userRole, depth = 0, likedComments = new Set(), onOpenProfile }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [replyTimestamp, setReplyTimestamp] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [includeAudioTs, setIncludeAudioTs] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [commentText, setCommentText] = useState(comment.text);
  const replyTimerRef = useRef<number | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [showQuoteBtn, setShowQuoteBtn] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');
  const [replyQuoteText, setReplyQuoteText] = useState('');
  const menu = useActionMenu();

  const childReplies = comment.replies || allComments.filter(c => c.parentId === (comment._id || String(comment.id)));
  const totalReplyCount = (() => {
    const countAll = (list: any[]): number => list.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length ? countAll(c.replies) : 0), 0);
    return countAll(childReplies);
  })();
  const hasTimestamp = typeof comment.videoTimestamp === 'number' && comment.videoTimestamp >= 0;
  const isOwner = comment.author === currentUserName;
  const isAdmin = userRole === 'admin';
  const cid = comment._id || String(comment.id);
  const isLiked = likedComments.has(cid);

  const startRecordingTimestamp = () => {
    setIsRecording(true);
    setReplyTimestamp(0);
    let sec = 0;
    replyTimerRef.current = window.setInterval(() => {
      sec += 1;
      setReplyTimestamp(sec);
    }, 1000);
  };

  const stopRecordingTimestamp = () => {
    setIsRecording(false);
    if (replyTimerRef.current) clearInterval(replyTimerRef.current);
  };

  useEffect(() => {
    return () => { if (replyTimerRef.current) clearInterval(replyTimerRef.current); };
  }, []);

  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && textRef.current?.contains(sel.anchorNode)) {
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

  const handleQuoteReply = () => {
    if (!selectedQuoteText) return;
    setReplyQuoteText(selectedQuoteText);
    setReplyTo(cid);
    setIsReplying(true);
    setReplyText('');
    setShowQuoteBtn(false);
    setSelectedQuoteText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo(commentId);
    setIsReplying(true);
    setReplyText('');
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) { setIsEditing(false); return; }
    setCommentText(editText.trim());
    onUpdateComment?.(cid, editText.trim());
    setIsEditing(false);
  };


  const handleSendReply = () => {
    if (!replyText.trim()) return;
    const audioTs = includeAudioTs && (comment as any).audioTimestamp != null ? (comment as any).audioTimestamp : undefined;
    onAddComment(replyText, video, replyTimestamp || undefined, replyTo || (comment._id || String(comment.id)), audioTs, replyQuoteText || undefined);
    setReplyText('');
    setReplyTo('');
    setIsReplying(false);
    setReplyTimestamp(null);
    setIncludeAudioTs(false);
    setReplyQuoteText('');
    setShowReplies(true);
  };

    if (depth === 0) {
    return (
        <div className="mt-3 mb-4 sm:mt-0 lg:mb-5">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
          style={{ background: comment.isFeatured ? 'linear-gradient(145deg, #fef9c3, #fef3c7, #fffbeb)' : 'var(--surface-2)', border: comment.isFeatured ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid var(--border)', boxShadow: comment.isFeatured ? '0 2px 12px rgba(234, 179, 8, 0.15)' : undefined }}>
          <div
            className="relative aspect-video lg:aspect-[2.2/1] cursor-pointer group overflow-hidden"
            onClick={() => onOpenVideo(video, comment.videoTimestamp || 0)}
          >
            {hasTimestamp ? (
              <TimestampThumbnail
                videoId={String((video as any)._id || video.id)}
                timestamp={comment.videoTimestamp!}
                alt={video.title}
                poster={video.thumbnailUrl}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <img
                src={video.thumbnailUrl}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt={video.title}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />

            {hasTimestamp && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white rounded-xl px-3 py-1.5 shadow-2xl border border-white/10">
                <i className="fas fa-clock text-[9px] text-primary-300"></i>
                <span className="text-[11px] font-black font-mono">{formatTimestamp(comment.videoTimestamp!)}</span>
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                <i className="fas fa-play text-white text-xl mr-[-3px]"></i>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-[13px] font-black truncate drop-shadow-lg leading-relaxed">{video.title}</p>
            </div>
          </div>

            <div className="p-4 relative">
            {hasTimestamp && (
              <button onClick={(e) => { e.stopPropagation(); onOpenVideo(video, comment.videoTimestamp!, comment._id || String(comment.id)); }}
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-lg"
                style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
                <i className="fas fa-play text-[7px]"></i>
                <span className="text-[10px] font-black font-mono">{formatTimestamp(comment.videoTimestamp!)}</span>
              </button>
            )}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold shadow-lg transition-transform group-hover:scale-105 overflow-hidden cursor-pointer active:scale-95"
                style={{ background: `linear-gradient(135deg, hsl(${(comment.author.charCodeAt(0) * 37) % 360}, 60%, 50%), hsl(${(comment.author.charCodeAt(0) * 73) % 360}, 60%, 40%))` }} onClick={() => onOpenProfile?.(comment.userId, comment.author, comment.authorAvatarUrl)}>
                {comment.authorAvatarUrl ? (
                  <img src={comment.authorAvatarUrl} alt={comment.author} className="w-full h-full object-cover" />
                ) : comment.author.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-black text-[12px] cursor-pointer hover:opacity-70 transition-opacity" style={{ color: 'var(--primary)' }} onClick={() => onOpenProfile?.(comment.userId, comment.author, comment.authorAvatarUrl)}>{comment.author}</span>
                  {comment.isFeatured && <span className="text-[7px] px-1.5 py-0.5 rounded-full font-black" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#b45309', boxShadow: '0 1px 3px rgba(234,179,8,0.2)' }}><i className="fas fa-star"></i> ویژه</span>}
                  {comment.isPinned && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-black"><i className="fas fa-thumbtack"></i> سنجاق</span>}
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{formatTimeFromISO(comment.isoDate)}</span>
                  <button onClick={menu.openAt} className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-0 group-hover:opacity-50 hover:!opacity-80 flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                    <i className="fas fa-ellipsis-vertical text-[9px]"></i>
                  </button>
                </div>
                {isEditing ? (
                  <div>
                    <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                      className="w-full bg-transparent outline-none text-[12px] leading-[2] font-medium px-2 py-1 rounded-lg" autoFocus
                      style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
                    <div className="flex gap-1.5 mt-1.5">
                      <button onClick={handleSaveEdit} className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                      <button onClick={() => { setIsEditing(false); setEditText(comment.text); }} className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(comment as any).audioTimestamp != null && (
                      <button onClick={() => {
                        const el = document.querySelector('audio');
                        if (el) { el.currentTime = (comment as any).audioTimestamp; el.play().catch(() => {}); }
                      }}
                        className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-lg transition-all active:scale-95"
                        style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontSize: '8px', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                        <i className="fas fa-music text-[7px]"></i>
                        <span className="font-medium">پاسخ به </span>
                        <span className="font-bold" style={{ fontSize: '9px' }}>{toPersianDigits(Math.floor((comment as any).audioTimestamp / 60))}:{toPersianDigits(String(Math.floor((comment as any).audioTimestamp % 60)).padStart(2, '0'))}</span>
                        <span className="font-medium"> از صوت</span>
                      </button>
                    )}
                    {(comment as any).quotedText && <QuoteBlock text={(comment as any).quotedText} author={comment.author} />}
                    <p ref={textRef} className="text-[12px] leading-[2] font-medium whitespace-pre-wrap select-text relative" style={{ color: 'var(--text-2)' }}>{commentText}</p>
                    {showQuoteBtn && !isEditing && (
                      <div className="absolute z-50 rounded-xl shadow-xl py-1 animate-fadeIn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', top: '-40px', left: '50%', transform: 'translateX(-50%)' }}>
                        <button onClick={handleQuoteReply} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/5 whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                          <i className="fas fa-quote-right text-[9px]"></i>
                          نقل‌قول و پاسخ
                        </button>
                      </div>
                    )}
                  </>
                  )}

                <div className="flex items-center gap-3.5 mt-2.5">
                  {(isOwner || isAdmin) && !isEditing && (
                    <button onClick={() => { setIsEditing(true); setEditText(comment.text); }} className="text-[10px] font-bold transition-colors" style={{ color: 'var(--text-3)' }}>
                      <i className="fas fa-pen ml-1 text-[8px]"></i>ویرایش
                    </button>
                  )}
                  <button onClick={() => { if (!isReplying) handleReply(comment._id || String(comment.id), comment.author || ''); else { setIsReplying(false); setReplyTo(''); } }} className="text-[10px] font-bold transition-colors" style={{ color: 'var(--text-3)' }}>
                    <i className="fas fa-reply ml-1"></i>پاسخ
                  </button>
                  {onLikeComment && (
                    <button onClick={() => onLikeComment(cid)} className="text-[10px] font-bold flex items-center gap-1 transition-colors" style={{ color: isLiked ? 'var(--primary)' : 'var(--text-3)' }}>
                      <i className={`${isLiked ? 'fas' : 'far'} fa-heart ml-1 ${isLiked ? 'text-primary' : ''}`}></i>{toPersianDigits(comment.likes || 0)}
                    </button>
                  )}
                  {(isOwner || isAdmin) && onDeleteComment && (
                    <button onClick={() => onDeleteComment(comment._id || String(comment.id))} className="text-[10px] font-bold transition-colors text-red-400/70 hover:text-red-400">
                      <i className="fas fa-trash-alt ml-1"></i>حذف
                    </button>
                  )}
                  {onShowDiscussion && (
                    <button onClick={(e) => { e.stopPropagation(); onShowDiscussion(comment, video); }} className="text-[10px] font-bold transition-colors" style={{ color: 'var(--primary)' }}>
                      <i className="fas fa-comments ml-1"></i>گفتگو
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isReplying && replyTo && replyTo === cid && (
              <div className="mt-3 pt-3 border-t animate-fadeIn" style={{ borderColor: 'var(--border)' }}>
                {replyQuoteText && <QuoteChip text={replyQuoteText} onCancel={() => setReplyQuoteText('')} />}
                {(comment as any).audioTimestamp != null && (
                  <button type="button" onClick={() => setIncludeAudioTs(!includeAudioTs)}
                    className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                    style={{ background: includeAudioTs ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'color-mix(in srgb, var(--primary) 5%, transparent)', border: `1px solid ${includeAudioTs ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 12%, transparent)'}` }}>
                    <i className={`fas ${includeAudioTs ? 'fa-check-circle' : 'fa-music'} text-[9px]`} style={{ color: 'var(--primary)' }}></i>
                    <span className="text-[9px] font-bold" style={{ color: 'var(--primary)' }}>
                      {includeAudioTs ? `پاسخ به ${toPersianDigits(Math.floor((comment as any).audioTimestamp / 60))}:${toPersianDigits(String(Math.floor((comment as any).audioTimestamp % 60)).padStart(2, '0'))}` : `ارسال ریپلای به این تیکه از صوت`}
                    </span>
                  </button>
                )}
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    placeholder="پاسخ خود را بنویسید..."
                    className="flex-1 rounded-xl px-3 py-2.5 text-[11px] font-medium outline-none transition-all duration-200 focus:ring-2"
                    style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 25%, transparent)' } as any}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-md disabled:opacity-30 active:scale-95 transition-all flex-shrink-0 hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
                  >
                    <i className="fas fa-paper-plane text-[9px]"></i>
                  </button>
                  <button
                    onClick={() => { setIsReplying(false); setReplyTo(''); setReplyText(''); setReplyQuoteText(''); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                  >
                    <i className="fas fa-times text-[9px]"></i>
                  </button>
                </div>
              </div>
            )}

            {childReplies.length > 0 && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="space-y-2.5">
                    {childReplies.map(reply => {
                       const replyId = String(reply._id || reply.id);
                       const isNestedTarget = (() => {
                         if (!replyTo) return false;
                         const findInReplies = (list: any[]): boolean => {
                           for (const r of list) {
                             if (String(r._id || r.id) === replyTo) return true;
                             if (r.replies?.length && findInReplies(r.replies)) return true;
                           }
                           return false;
                         };
                         return findInReplies(reply.replies || []);
                       })();
                       return (
                        <ReplyItem
                         key={replyId}
                         reply={reply}
                         video={video}
                         allComments={allComments}
                        onOpenVideo={onOpenVideo}
                        onDeleteComment={onDeleteComment}
                        onLikeComment={onLikeComment}
                        onUpdateComment={onUpdateComment}
                        onReply={(rid, author) => { handleReply(rid, author); }}
                        currentUserName={currentUserName}
                        userRole={userRole}
                        likedComments={likedComments}
                        isReplyingHere={isReplying && (replyTo === replyId || isNestedTarget)}
                        replyText={isReplying && (replyTo === replyId || isNestedTarget) ? replyText : ''}
                        replyTo={replyTo}
                        onReplyTextChange={setReplyText}
                        onSendReply={handleSendReply}
                        onCancelReply={() => { setIsReplying(false); setReplyTo(''); setReplyText(''); setReplyQuoteText(''); }}
                        quoteText={replyQuoteText}
                        onQuoteTextChange={setReplyQuoteText}
                       />
                       );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
        {menu.pos && (
          <ActionMenu pos={menu.pos} onClose={menu.close} items={[
            { icon: 'fas fa-reply', label: 'پاسخ', onClick: () => handleReply(cid, comment.author) },
            { icon: 'fas fa-quote-right', label: 'نقل‌قول', onClick: () => { setReplyQuoteText(selectedQuoteText || comment.text); setReplyTo(cid); setIsReplying(true); setReplyText(''); } },
            { divider: true },
            { icon: isLiked ? 'fas fa-heart' : 'far fa-heart', label: 'لایک', color: isLiked ? '#ef4444' : undefined, onClick: () => onLikeComment?.(cid) },
            ...(isOwner ? [
              { icon: 'fas fa-pen', label: 'ویرایش', onClick: () => setIsEditing(true) },
              { icon: 'fas fa-trash-alt', label: 'حذف', color: '#ef4444', onClick: () => onDeleteComment?.(cid) },
            ] : []),
          ]} />
        )}
      </div>
    );
  }

  return null;
};

const ReplyItem: React.FC<{
  reply: Comment;
  video: Video;
  allComments: Comment[];
  onOpenVideo: (video: Video, timestamp?: number, highlightId?: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  onReply?: (commentId: string, authorName: string) => void;
  currentUserName?: string;
  userRole?: string;
  likedComments?: Set<string>;
  isReplyingHere?: boolean;
  replyText?: string;
  onReplyTextChange?: (text: string) => void;
  onSendReply?: () => void;
  onCancelReply?: () => void;
  replyTo?: string;
  quoteText?: string;
  onQuoteTextChange?: (text: string) => void;
  onOpenProfile?: (userId?: string, name?: string, avatar?: string) => void;
}> = ({ reply, video, allComments, onOpenVideo, onDeleteComment, onLikeComment, onUpdateComment, onReply, currentUserName, userRole, likedComments = new Set(), isReplyingHere, replyText, onReplyTextChange, onSendReply, onCancelReply, replyTo = '', quoteText = '', onQuoteTextChange, onOpenProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(reply.text);
  const [showNestedReplies, setShowNestedReplies] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const [showQuoteBtn, setShowQuoteBtn] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');
  const menu = useActionMenu();
  const hasTimestamp = typeof reply.videoTimestamp === 'number' && reply.videoTimestamp >= 0;
  const isOwner = reply.author === currentUserName;
  const isAdmin = userRole === 'admin';
  const rid = reply._id || String(reply.id);
  const isLiked = likedComments.has(rid);
  const nestedReplies = (() => {
    if (reply.replies?.length) return reply.replies;
    return allComments.filter((c: any) => String(c.parentId) === rid);
  })();

  const handleSaveEdit = () => {
    if (!editText.trim()) { setIsEditing(false); return; }
    onUpdateComment?.(rid, editText.trim());
    setIsEditing(false);
  };

  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && textRef.current?.contains(sel.anchorNode)) {
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

  const handleQuoteReply = () => {
    if (!selectedQuoteText) return;
    onQuoteTextChange?.(selectedQuoteText);
    onReply?.(rid, reply.author);
    setShowQuoteBtn(false);
    setSelectedQuoteText('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div>
    <div className="relative">
    {hasTimestamp && (
      <button onClick={(e) => { e.stopPropagation(); onOpenVideo(video, reply.videoTimestamp!, rid); }}
        className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold shadow-sm transition-all active:scale-95"
        style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
        <i className="fas fa-play text-[6px]"></i>{formatTimestamp(reply.videoTimestamp!)}
      </button>
    )}
    <div className="flex gap-2.5 p-3 rounded-xl transition-all"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-transform"
        style={{ background: `linear-gradient(135deg, hsl(${(reply.author.charCodeAt(0) * 37) % 360}, 60%, 50%), hsl(${(reply.author.charCodeAt(0) * 73) % 360}, 60%, 40%))` }} onClick={() => onOpenProfile?.(reply.userId, reply.author, reply.authorAvatarUrl)}>
        {reply.authorAvatarUrl ? (
          <img src={reply.authorAvatarUrl} alt={reply.author} className="w-full h-full object-cover" />
        ) : reply.author.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-[11px] cursor-pointer hover:opacity-70 transition-opacity" style={{ color: 'var(--primary)' }} onClick={() => onOpenProfile?.(reply.userId, reply.author, reply.authorAvatarUrl)}>{reply.author}</span>
          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{formatTimeFromISO(reply.isoDate)}</span>
          <button onClick={menu.openAt} className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-0 group-hover:opacity-50 hover:!opacity-80 flex-shrink-0" style={{ color: 'var(--text-3)' }}>
            <i className="fas fa-ellipsis-vertical text-[8px]"></i>
          </button>
        </div>
        {isEditing ? (
          <div>
            <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
              className="w-full bg-transparent outline-none text-[11px] leading-relaxed px-2 py-1 rounded-lg" autoFocus
              style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
            <div className="flex gap-1.5 mt-1">
              <button onClick={handleSaveEdit} className="text-[8px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
              <button onClick={() => { setIsEditing(false); setEditText(reply.text); }} className="text-[8px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
            </div>
          </div>
        ) : reply.text ? (
          <>
            {(reply as any).quotedText && <QuoteBlock text={(reply as any).quotedText} author={reply.author} />}
            {reply.audioTimestamp != null && (
              <button onClick={() => { const el = document.querySelector('audio'); const ts = reply.audioTimestamp; if (el && ts != null) { el.currentTime = ts; el.play().catch(() => {}); } }}
                className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-lg transition-all active:scale-95"
                style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontSize: '8px', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                <i className="fas fa-music text-[7px]"></i>
                <span className="font-medium">پاسخ به </span>
                <span className="font-bold" style={{ fontSize: '9px' }}>{toPersianDigits(Math.floor(reply.audioTimestamp / 60))}:{toPersianDigits(String(Math.floor(reply.audioTimestamp % 60)).padStart(2, '0'))}</span>
                <span className="font-medium"> از صوت</span>
              </button>
            )}
            <div className="relative">
              <p ref={textRef} className="text-[11px] leading-relaxed whitespace-pre-wrap select-text" style={{ color: 'var(--text-2)' }}>{reply.text}</p>
              {showQuoteBtn && !isEditing && (
                <div className="absolute z-50 rounded-xl shadow-xl py-1 animate-fadeIn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', top: '-36px', left: '50%', transform: 'translateX(-50%)' }}>
                  <button onClick={handleQuoteReply} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/5 whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                    <i className="fas fa-quote-right text-[9px]"></i>
                    نقل‌قول و پاسخ
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}
        <div className="flex items-center gap-2.5 mt-1.5">
          {(isOwner || isAdmin) && !isEditing && (
            <button onClick={() => { setIsEditing(true); setEditText(reply.text); }} className="text-[9px] font-bold flex items-center gap-1 transition-colors" style={{ color: 'var(--text-3)' }}>
              <i className="fas fa-pen text-[7px]"></i>ویرایش
            </button>
          )}
          {onReply && (
            <button onClick={() => onReply(rid, reply.author)} className="text-[9px] font-bold flex items-center gap-1 transition-colors" style={{ color: isReplyingHere ? 'var(--primary)' : 'var(--text-3)' }}>
              <i className="fas fa-reply text-[7px]"></i> پاسخ
            </button>
          )}
          {onLikeComment && (
            <button onClick={() => onLikeComment(rid)} className="text-[9px] font-bold flex items-center gap-1 transition-colors" style={{ color: isLiked ? 'var(--primary)' : 'var(--text-3)' }}>
              <i className={`${isLiked ? 'fas' : 'far'} fa-heart ${isLiked ? 'text-primary' : ''}`}></i>{toPersianDigits(reply.likes || 0)}
            </button>
          )}
          {(isOwner || isAdmin) && onDeleteComment && (
            <button onClick={() => onDeleteComment(reply._id || String(reply.id))} className="text-[9px] font-bold transition-colors text-red-400/70 hover:text-red-400">
              <i className="fas fa-trash-alt"></i>
            </button>
          )}
        </div>
      </div>
    </div>
    {isReplyingHere && !nestedReplies.some((r: any) => String(r._id || r.id) === replyTo) && (
      <div className="mt-2 ml-9 animate-fadeIn">
        {quoteText && <QuoteChip text={quoteText} onCancel={() => onQuoteTextChange?.('')} />}
        <div className="flex gap-2">
          <input
            autoFocus
            value={replyText || ''}
            onChange={(e) => onReplyTextChange?.(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendReply?.(); } }}
            placeholder="پاسخ خود را بنویسید..."
            className="flex-1 rounded-xl px-3 py-2 text-[10px] font-medium outline-none transition-all duration-200 focus:ring-2"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 25%, transparent)' } as any}
          />
          <button
            onClick={onSendReply}
            disabled={!replyText?.trim()}
            className="w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-md disabled:opacity-30 active:scale-95 transition-all flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
          >
            <i className="fas fa-paper-plane text-[8px]"></i>
          </button>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              style={{ background: 'var(--surface-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
            >
              <i className="fas fa-times text-[8px]"></i>
            </button>
          )}
        </div>
      </div>
    )}
    </div>
    {nestedReplies.length > 0 && (
      <div className="mt-1.5 mr-6">
        <div className="space-y-1.5">
            {nestedReplies.map((sub: any) => {
              const subId = String(sub._id || sub.id);
              const isNestedTarget = (() => {
                if (!replyTo) return false;
                const findInReplies = (list: any[]): boolean => {
                  for (const r of list) {
                    if (String(r._id || r.id) === replyTo) return true;
                    if (r.replies?.length && findInReplies(r.replies)) return true;
                  }
                  return false;
                };
                return findInReplies(sub.replies || []);
              })();
              return (
              <ReplyItem
                key={subId}
                reply={sub}
                video={video}
                allComments={allComments}
                onOpenVideo={onOpenVideo}
                onDeleteComment={onDeleteComment}
                onLikeComment={onLikeComment}
                onUpdateComment={onUpdateComment}
                onReply={onReply}
                currentUserName={currentUserName}
                userRole={userRole}
                likedComments={likedComments}
                isReplyingHere={isReplyingHere && (replyTo === subId || isNestedTarget)}
                replyText={isReplyingHere && (replyTo === subId || isNestedTarget) ? replyText : ''}
                replyTo={replyTo}
                onReplyTextChange={onReplyTextChange}
                onSendReply={onSendReply}
                onCancelReply={onCancelReply}
                quoteText={quoteText}
                onQuoteTextChange={onQuoteTextChange}
                onOpenProfile={onOpenProfile}
              />
              );
            })}
        </div>
      </div>
    )}
    {menu.pos && (
      <ActionMenu pos={menu.pos} onClose={menu.close} items={[
        { icon: 'fas fa-reply', label: 'پاسخ', onClick: () => onReply?.(rid, reply.author) },
        { icon: 'fas fa-quote-right', label: 'نقل‌قول', onClick: () => { onQuoteTextChange?.(selectedQuoteText || reply.text); onReply?.(rid, reply.author); } },
        { divider: true },
        { icon: isLiked ? 'fas fa-heart' : 'far fa-heart', label: 'لایک', color: isLiked ? '#ef4444' : undefined, onClick: () => onLikeComment?.(rid) },
        ...(isOwner ? [
          { icon: 'fas fa-pen', label: 'ویرایش', onClick: () => setIsEditing(true) },
          { icon: 'fas fa-trash-alt', label: 'حذف', color: '#ef4444', onClick: () => onDeleteComment?.(rid) },
        ] : []),
      ]} />
    )}
    </div>
  );
};

const PodcastReplyItem: React.FC<{
  reply: Comment;
  allComments: Comment[];
  podcast: Podcast;
  epIdx: number;
  onPlayPodcast: (podcast: Podcast, episodeIndex: number, seekTime?: number, expandPlayer?: boolean) => void;
  onAddComment: (text: string, video: any, videoTimestamp?: number, parentId?: string, audioTimestamp?: number, quotedText?: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  onRequestReply?: (commentId: string, author: string, text: string, podcastId: string, episodeIndex: number, audioTimestamp?: number, quotedText?: string) => void;
  currentUserName?: string;
  userRole?: string;
  likedComments?: Set<string>;
  onOpenProfile?: (userId?: string, name?: string, avatar?: string) => void;
}> = ({ reply, allComments, podcast, epIdx, onPlayPodcast, onDeleteComment, onLikeComment, onUpdateComment, onRequestReply, onAddComment, currentUserName, userRole, likedComments = new Set(), onOpenProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(reply.text);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyQuoteText, setReplyQuoteText] = useState('');
  const textRef = useRef<HTMLDivElement>(null);
  const [showQuoteBtn, setShowQuoteBtn] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');
  const rid = reply._id || String(reply.id);
  const isOwner = reply.author === currentUserName;
  const isAdmin = userRole === 'admin';
  const isLiked = likedComments.has(rid);

  const nestedReplies = (() => {
    if (reply.replies?.length) return reply.replies;
    return allComments.filter((c: any) => String(c.parentId) === rid);
  })();

  const openProfile = () => onOpenProfile?.(reply.userId, reply.author, reply.authorAvatarUrl);

  const handleSaveEdit = () => {
    if (!editText.trim()) { setIsEditing(false); return; }
    onUpdateComment?.(rid, editText.trim());
    setIsEditing(false);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !onAddComment) return;
    const audioTs = (reply.audioTimestamp ?? reply.timestamp) != null ? Number(reply.audioTimestamp ?? reply.timestamp) : undefined;
    onAddComment(replyText, { id: (podcast as any)._id || podcast.id, title: podcast.title }, undefined, rid, audioTs, replyQuoteText || undefined);
    setReplyText('');
    setIsReplying(false);
    setReplyQuoteText('');
  };

  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && textRef.current?.contains(sel.anchorNode)) {
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

  const handleQuoteReply = () => {
    if (!selectedQuoteText) return;
    setReplyQuoteText(selectedQuoteText);
    setIsReplying(true);
    setShowQuoteBtn(false);
    setSelectedQuoteText('');
    window.getSelection()?.removeAllRanges();
  };

  const menu = useActionMenu();

  return (
    <div>
      <div className="relative flex gap-2 p-2.5 rounded-xl" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
        {(isOwner || isAdmin) && !isEditing && (
          <button onClick={() => { setIsEditing(true); setEditText(reply.text); }}
            className="absolute top-2.5 left-2.5 w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-40 hover:!opacity-70"
            style={{ color: 'var(--text-3)' }}>
            <i className="fas fa-pen text-[7px]"></i>
          </button>
        )}
        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[7px] font-bold overflow-hidden cursor-pointer active:scale-95 transition-transform"
          style={{ background: `linear-gradient(135deg, hsl(${(reply.author.charCodeAt(0) * 37) % 360}, 60%, 50%), hsl(${(reply.author.charCodeAt(0) * 73) % 360}, 60%, 40%))` }} onClick={openProfile}>
          {reply.authorAvatarUrl ? <img src={reply.authorAvatarUrl} alt="" className="w-full h-full object-cover" /> : reply.author.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-[10px] cursor-pointer hover:opacity-70 transition-opacity" style={{ color: 'var(--primary)' }} onClick={openProfile}>{reply.author}</span>
            <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>{formatTimeFromISO(reply.isoDate)}</span>
            <button onClick={menu.openAt} className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-0 group-hover:opacity-50 hover:!opacity-80 flex-shrink-0" style={{ color: 'var(--text-3)' }}>
              <i className="fas fa-ellipsis-vertical text-[8px]"></i>
            </button>
          </div>
          {(reply.audioTimestamp ?? reply.timestamp) != null && (
            <button onClick={() => { if (onPlayPodcast) onPlayPodcast(podcast, epIdx, Number(reply.audioTimestamp ?? reply.timestamp), true); }}
              className="flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontSize: '7px', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
              <i className="fas fa-music text-[6px]"></i>
              <span className="font-bold">{formatTime(Number(reply.audioTimestamp ?? reply.timestamp))}</span>
            </button>
          )}
          {isEditing ? (
            <div>
              <input value={editText} onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                className="w-full bg-transparent outline-none text-[10px] leading-relaxed px-1.5 py-0.5 rounded" autoFocus
                style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
              <div className="flex gap-1 mt-1">
                <button onClick={handleSaveEdit} className="text-[8px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                <button onClick={() => { setIsEditing(false); setEditText(reply.text); }} className="text-[8px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
              </div>
            </div>
          ) : (
            <>
              {(reply as any).quotedText && <QuoteBlock text={(reply as any).quotedText} author={reply.author} />}
              <div className="relative">
                <p ref={textRef} className="text-[10px] leading-relaxed whitespace-pre-wrap select-text" style={{ color: 'var(--text-2)' }}>{reply.text}</p>
                {showQuoteBtn && !isEditing && (
                  <div className="absolute z-50 rounded-xl shadow-xl py-1 animate-fadeIn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', top: '-34px', left: '50%', transform: 'translateX(-50%)' }}>
                    <button onClick={handleQuoteReply} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/5 whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                      <i className="fas fa-quote-right text-[9px]"></i>
                      نقل‌قول و پاسخ
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => { if (onRequestReply) { const audioTs = (reply.audioTimestamp ?? reply.timestamp) != null ? Number(reply.audioTimestamp ?? reply.timestamp) : undefined; onRequestReply(rid, reply.author, reply.text, String((podcast as any)._id || podcast.id), epIdx, audioTs, replyQuoteText || undefined); } else { setIsReplying(true); } }}
                  className="text-[8px] font-bold transition-colors" style={{ color: isReplying ? 'var(--primary)' : 'var(--text-3)' }}>
                  <i className="fas fa-reply text-[6px] ml-1"></i>پاسخ
                </button>
                {onLikeComment && (
                  <button onClick={() => onLikeComment(rid)} className="text-[8px] font-bold flex items-center gap-1 transition-colors"
                    style={{ color: isLiked ? 'var(--primary)' : 'var(--text-3)' }}>
                    <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-[7px]`}></i>{toPersianDigits(reply.likes || 0)}
                  </button>
                )}
                {(isOwner || isAdmin) && onDeleteComment && (
                  <button onClick={() => onDeleteComment(rid)} className="text-[8px] font-bold text-red-400/70 hover:text-red-400">
                    <i className="fas fa-trash-alt text-[7px]"></i>
                  </button>
                )}
              </div>
            </>
          )}
          {isReplying && (
            <div className="mt-2 animate-fadeIn">
              {replyQuoteText && <QuoteChip text={replyQuoteText} onCancel={() => setReplyQuoteText('')} />}
              <div className="flex gap-1.5">
                <input autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  placeholder="پاسخ..."
                  className="flex-1 rounded-lg px-2 py-1.5 text-[9px] font-medium outline-none transition-all focus:ring-1"
                  style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 25%, transparent)' } as any}
                />
                <button onClick={handleSendReply} disabled={!replyText.trim()}
                  className="w-7 h-7 rounded-lg text-white flex items-center justify-center shadow-md disabled:opacity-30 active:scale-95 transition-all flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
                  <i className="fas fa-paper-plane text-[7px]"></i>
                </button>
                <button onClick={() => { setIsReplying(false); setReplyText(''); setReplyQuoteText(''); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  <i className="fas fa-times text-[7px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {nestedReplies.length > 0 && (
        <div className="mt-1 mr-6">
          <div className="space-y-1.5">
            {nestedReplies.map((sub: any) => (
              <PodcastReplyItem
                key={sub._id || sub.id}
                reply={sub}
                allComments={allComments}
                podcast={podcast}
                epIdx={epIdx}
                onPlayPodcast={onPlayPodcast}
                onDeleteComment={onDeleteComment}
                onLikeComment={onLikeComment}
                onUpdateComment={onUpdateComment}
                onRequestReply={onRequestReply}
                onAddComment={onAddComment}
                currentUserName={currentUserName}
                userRole={userRole}
                likedComments={likedComments}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        </div>
      )}
    {menu.pos && (
      <ActionMenu pos={menu.pos} onClose={menu.close} items={[
        { icon: 'fas fa-reply', label: 'پاسخ', onClick: () => { if (onRequestReply) { const audioTs = (reply.audioTimestamp ?? reply.timestamp) != null ? Number(reply.audioTimestamp ?? reply.timestamp) : undefined; onRequestReply(rid, reply.author, reply.text, String((podcast as any)._id || podcast.id), epIdx, audioTs, undefined); } else { setIsReplying(true); } } },
        { icon: 'fas fa-quote-right', label: 'نقل‌قول', onClick: () => { if (onRequestReply) { const audioTs = (reply.audioTimestamp ?? reply.timestamp) != null ? Number(reply.audioTimestamp ?? reply.timestamp) : undefined; onRequestReply(rid, reply.author, selectedQuoteText || reply.text, String((podcast as any)._id || podcast.id), epIdx, audioTs, selectedQuoteText || reply.text); } else { setIsReplying(true); setReplyQuoteText(selectedQuoteText || reply.text); } } },
        { divider: true },
        { icon: isLiked ? 'fas fa-heart' : 'far fa-heart', label: 'لایک', color: isLiked ? '#ef4444' : undefined, onClick: () => onLikeComment?.(rid) },
        ...((isOwner || isAdmin) ? [
          { icon: 'fas fa-pen', label: 'ویرایش', onClick: () => { setIsEditing(true); setEditText(reply.text); } },
          { icon: 'fas fa-trash-alt', label: 'حذف', color: '#ef4444', onClick: () => onDeleteComment?.(rid) },
        ] : []),
      ]} />
    )}
    </div>
  );
};

const PodcastCommentItem: React.FC<{
  comment: Comment;
  podcast: Podcast;
  allComments: Comment[];
  onPlayPodcast: (podcast: Podcast, episodeIndex: number, seekTime?: number, expandPlayer?: boolean) => void;
  onAddComment: (text: string, video: any, videoTimestamp?: number, parentId?: string, audioTimestamp?: number, quotedText?: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  currentUserName?: string;
  userRole?: string;
  depth?: number;
  likedComments?: Set<string>;
  currentPlayingPodcastId?: number | string;
  currentPlayingEpIdx?: number;
  isGloballyPlaying?: boolean;
  onGlobalTogglePlay?: () => void;
  onShowDiscussion?: () => void;
  onRequestReply?: (commentId: string, author: string, text: string, podcastId: string, episodeIndex: number, audioTimestamp?: number, quotedText?: string) => void;
  onOpenProfile?: (userId?: string, name?: string, avatar?: string) => void;
}> = ({ comment, podcast, allComments, onPlayPodcast, onAddComment, onDeleteComment, onLikeComment, onUpdateComment, currentUserName, userRole, depth = 0, likedComments = new Set(), currentPlayingPodcastId, currentPlayingEpIdx, isGloballyPlaying, onGlobalTogglePlay, onShowDiscussion, onRequestReply, onOpenProfile }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [commentText, setCommentText] = useState(comment.text);
  const textRef = useRef<HTMLDivElement>(null);
  const [showQuoteBtn, setShowQuoteBtn] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');
  const menu = useActionMenu();
  const epIdx = comment.episodeIndex != null ? comment.episodeIndex : 0;
  const episode = podcast.episodes?.[epIdx];
  const hasAudioTs = (comment.audioTimestamp ?? comment.timestamp) != null;
  const isOwner = comment.author === currentUserName;
  const isAdmin = userRole === 'admin';
  const cid = comment._id || String(comment.id);
  const isLiked = likedComments.has(cid);
  const childReplies = (() => {
    if (comment.replies?.length) return comment.replies;
    const flatten = (list: any[]): any[] => list.reduce((acc: any[], c: any) => { acc.push(c); if (c.replies?.length) acc.push(...flatten(c.replies)); return acc; }, []);
    return flatten(allComments).filter((c: any) => String(c.parentId) === cid);
  })();
  const totalReplyCount = (() => {
    const countAll = (list: any[]): number => list.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length ? countAll(c.replies) : 0), 0);
    return countAll(childReplies);
  })();

  const handleReply = (commentId: string) => {
    setReplyTo(commentId);
    setIsReplying(true);
    setReplyText('');
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) { setIsEditing(false); return; }
    setCommentText(editText.trim());
    onUpdateComment?.(cid, editText.trim());
    setIsEditing(false);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !onAddComment) return;
    const audioTs = hasAudioTs ? Number(comment.audioTimestamp ?? comment.timestamp) : undefined;
    onAddComment(replyText, { id: (podcast as any)._id || podcast.id, title: podcast.title }, undefined, replyTo || cid, audioTs);
    setReplyText('');
    setReplyTo('');
    setIsReplying(false);
    setShowReplies(true);
  };

  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && textRef.current?.contains(sel.anchorNode)) {
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

  const handleQuoteReply = () => {
    if (!selectedQuoteText) return;
    if (onRequestReply) {
      const audioTs = hasAudioTs ? Number(comment.audioTimestamp ?? comment.timestamp) : undefined;
      onRequestReply(cid, comment.author, selectedQuoteText, String((podcast as any)._id || podcast.id), epIdx, audioTs, selectedQuoteText);
    } else {
      handleReply(cid);
    }
    setShowQuoteBtn(false);
    setSelectedQuoteText('');
    window.getSelection()?.removeAllRanges();
  };

  if (depth === 0) {
    const ts = Number(comment.audioTimestamp ?? comment.timestamp);
    return (
      <div className="mt-3 mb-5 sm:mt-0">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl"
          style={{
            background: comment.isFeatured ? 'linear-gradient(145deg, #fef9c3, #fef3c7, #fffbeb)' : 'var(--surface-2)',
            border: comment.isFeatured ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid var(--border)',
            boxShadow: comment.isFeatured ? '0 2px 12px rgba(234, 179, 8, 0.15)' : '0 2px 20px rgba(6, 182, 212, 0.04)'
          }}>
          <div className="p-3 pb-0">
            <div className="flex items-center gap-2.5 mb-3" dir="rtl">
              <div className="relative w-14 h-14 lg:w-16 lg:h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-white/10 cursor-pointer group"
                onClick={() => {
                  if (String(currentPlayingPodcastId) === String(podcast.id) && currentPlayingEpIdx === epIdx && isGloballyPlaying) {
                    onGlobalTogglePlay?.();
                  } else {
                    if (onPlayPodcast) onPlayPodcast(podcast, epIdx, undefined, true);
                  }
                }}>
                <img src={episode?.cover || podcast.cover || DEFAULT_COVER} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-all duration-200 group-hover:bg-black/35">
                  {String(currentPlayingPodcastId) === String(podcast.id) && currentPlayingEpIdx === epIdx && isGloballyPlaying ? (
                    <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md"
                      style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}>
                      <i className="fas fa-pause text-xs text-white"></i>
                    </div>
                  ) : (
                    <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md"
                      style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}>
                      <i className="fas fa-play text-xs text-white" style={{ marginRight: '-1px' }}></i>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  if (String(currentPlayingPodcastId) === String(podcast.id) && currentPlayingEpIdx === epIdx && isGloballyPlaying) {
                    onGlobalTogglePlay?.();
                  } else {
                    if (onPlayPodcast) onPlayPodcast(podcast, epIdx, undefined, true);
                  }
                }}>
                <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{episode?.title || podcast.title}</p>
                <p className="text-[10px] font-bold mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                  <i className="fas fa-podcast text-[8px]"></i>
                  {podcast.title}
                </p>
              </div>
              <div className="flex items-center flex-shrink-0">
                {hasAudioTs && (
                  <button onClick={() => { if (onPlayPodcast) onPlayPodcast(podcast, epIdx, Number(comment.audioTimestamp ?? comment.timestamp), true); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontSize: '8px', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                    {String(currentPlayingPodcastId) === String(podcast.id) && currentPlayingEpIdx === epIdx && isGloballyPlaying ? (
                      <i className="fas fa-pause text-[7px]"></i>
                    ) : (
                      <i className="fas fa-play text-[7px]"></i>
                    )}
                    <span className="font-bold">{formatTime(ts)}</span>
                  </button>
                )}
                {!hasAudioTs && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontSize: '8px' }}>
                    <i className="fas fa-headphones text-[9px]"></i>
                    <span className="font-bold">{formatTime(typeof episode?.duration === 'number' ? episode.duration : (typeof episode?.duration === 'string' && episode.duration.includes(':') ? episode.duration.split(':').reduce((a, b) => a * 60 + Number(b), 0) : (Number(episode?.duration) || 0)))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-3 pb-3 relative">
            {(isOwner || isAdmin) && !isEditing && (
              <button onClick={() => { setIsEditing(true); setEditText(comment.text); }}
                className="absolute top-0 left-2 w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-30 hover:!opacity-70"
                style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-pen text-[7px]"></i>
              </button>
            )}
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[8px] font-bold overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform"
                style={{ background: `linear-gradient(135deg, hsl(${(comment.author.charCodeAt(0) * 37) % 360}, 60%, 50%), hsl(${(comment.author.charCodeAt(0) * 73) % 360}, 60%, 40%))` }} onClick={() => onOpenProfile?.(comment.userId, comment.author, comment.authorAvatarUrl)}>
                {comment.authorAvatarUrl ? <img src={comment.authorAvatarUrl} alt="" className="w-full h-full object-cover" /> : comment.author.charAt(0)}
              </div>
              <span className="text-[11px] font-bold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: 'var(--primary)' }} onClick={() => onOpenProfile?.(comment.userId, comment.author, comment.authorAvatarUrl)}>{comment.author}</span>
              {comment.isFeatured && <span className="text-[7px] px-1.5 py-0.5 rounded-full font-black" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#b45309', boxShadow: '0 1px 3px rgba(234,179,8,0.2)' }}><i className="fas fa-star"></i> ویژه</span>}
              {comment.isPinned && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-black"><i className="fas fa-thumbtack"></i> سنجاق</span>}
              <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>{formatTimeFromISO(comment.isoDate)}</span>
              <button onClick={menu.openAt} className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-black/5 active:scale-90 opacity-30 hover:!opacity-70 flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-ellipsis-vertical text-[8px]"></i>
              </button>
            </div>
            {isEditing ? (
              <div>
                <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                  className="w-full bg-transparent outline-none text-[11px] leading-relaxed px-2 py-1 rounded-lg" autoFocus
                  style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
                <div className="flex gap-1.5 mt-1">
                  <button onClick={handleSaveEdit} className="text-[8px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                  <button onClick={() => { setIsEditing(false); setEditText(comment.text); }} className="text-[8px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
                </div>
              </div>
            ) : (
              <>
                {(comment as any).quotedText && <QuoteBlock text={(comment as any).quotedText} author={comment.author} />}
                <div className="relative">
                  <p ref={textRef} className="text-[11px] leading-relaxed whitespace-pre-wrap select-text" style={{ color: 'var(--text-2)' }}>{commentText}</p>
                  {showQuoteBtn && !isEditing && (
                    <div className="absolute z-50 rounded-xl shadow-xl py-1 animate-fadeIn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', top: '-34px', left: '50%', transform: 'translateX(-50%)' }}>
                      <button onClick={handleQuoteReply} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/5 whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                        <i className="fas fa-quote-right text-[9px]"></i>
                        نقل‌قول و پاسخ
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => { if (onRequestReply) { const audioTs = hasAudioTs ? Number(comment.audioTimestamp ?? comment.timestamp) : undefined; onRequestReply(cid, comment.author, comment.text, String((podcast as any)._id || podcast.id), epIdx, audioTs); } else { handleReply(cid); } }} className="text-[9px] font-bold transition-colors flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-reply text-[7px]"></i>پاسخ
              </button>
              {onLikeComment && (
                <button onClick={() => onLikeComment(cid)} className="text-[9px] font-bold flex items-center gap-1 transition-colors" style={{ color: isLiked ? 'var(--primary)' : 'var(--text-3)' }}>
                  <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-[8px]`}></i>{toPersianDigits(comment.likes || 0)}
                </button>
              )}
              {(isOwner || isAdmin) && onDeleteComment && (
                <button onClick={() => onDeleteComment(cid)} className="text-[9px] font-bold transition-colors text-red-400/70 hover:text-red-400">
                  <i className="fas fa-trash-alt text-[8px]"></i>
                </button>
              )}
              {onShowDiscussion && (
                <button onClick={onShowDiscussion} className="text-[9px] font-bold transition-colors flex items-center gap-1 mr-auto" style={{ color: 'var(--primary)' }}>
                  <i className="fas fa-comments text-[8px]"></i>گفتگو
                </button>
              )}
            </div>
          </div>

          {childReplies.length > 0 && (
            <div className="px-3 pb-3">
              <div className="space-y-2">
                  {childReplies.map(reply => (
                    <PodcastReplyItem
                      key={reply._id || reply.id}
                      reply={reply}
                      allComments={allComments}
                      podcast={podcast}
                      epIdx={epIdx}
                      onPlayPodcast={onPlayPodcast}
                      onDeleteComment={onDeleteComment}
                      onLikeComment={onLikeComment}
                      onUpdateComment={onUpdateComment}
                      onRequestReply={onRequestReply}
                      onAddComment={onAddComment}
                      currentUserName={currentUserName}
                      userRole={userRole}
                      likedComments={likedComments}
                      onOpenProfile={onOpenProfile}
                    />
                  ))}
                </div>
            </div>
          )}
        </div>
        {menu.pos && (
          <ActionMenu pos={menu.pos} onClose={menu.close} items={[
            { icon: 'fas fa-reply', label: 'پاسخ', onClick: () => handleReply(cid) },
            { icon: 'fas fa-quote-right', label: 'نقل‌قول', onClick: () => { if (onRequestReply) { const audioTs = hasAudioTs ? Number(comment.audioTimestamp ?? comment.timestamp) : undefined; onRequestReply(cid, comment.author, selectedQuoteText || comment.text, String((podcast as any)._id || podcast.id), epIdx, audioTs, selectedQuoteText || comment.text); } else { handleReply(cid); } } },
            { divider: true },
            { icon: isLiked ? 'fas fa-heart' : 'far fa-heart', label: 'لایک', color: isLiked ? '#ef4444' : undefined, onClick: () => onLikeComment?.(cid) },
            ...((isOwner || isAdmin) ? [
              { icon: 'fas fa-pen', label: 'ویرایش', onClick: () => { setIsEditing(true); setEditText(comment.text); } },
              { icon: 'fas fa-trash-alt', label: 'حذف', color: '#ef4444', onClick: () => onDeleteComment?.(cid) },
            ] : []),
          ]} />
        )}
      </div>
    );
  }
  return null;
};

const MahfelPage: React.FC<any> = ({ tabsHidden, showInput, onToggleInput, posts, videos, podcasts, authors, publishedBooks, comments, currentUser, userRole, onPlayVideoFromFeed, onPlayPodcastFromFeed, onPlayPodcastComment, onShowComments, onShowVideoDiscussion, onDeletePost, onShowBook, onShowInstantView, onDeleteComment, onAddComment, onLikeComment, onUpdateComment, onNewPost, onUpdatePost, onToggleSidebar, user, onOpenSearch, onOpenProfile, miniPlayerProps, albums = { mine: [], shared: [] }, savedPostIds = [], onToggleSavePost, onPlayAlbum, onOpenAlbum }) => {
  const [menuState, setMenuState] = useState<{ post: Post | null, rect: DOMRect | null }>({ post: null, rect: null });
  const [feedMode, setFeedMode] = useState<'all' | 'posts' | 'video-comments' | 'podcast-comments'>('all');
  const [expandedPinned, setExpandedPinned] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('soha_liked_comments') || '[]')); } catch { return new Set(); }
  });
  const [inputText, setInputText] = useState('');
  const [inputMedia, setInputMedia] = useState<{ type: 'image' | 'audio' | 'video'; url: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [postAttachment, setPostAttachment] = useState<{ type: 'podcast' | 'video' | 'album'; podcastId?: string; episodeIndex?: number; videoId?: string; albumId?: string; title: string; cover?: string } | null>(null);
  const [attachTab, setAttachTab] = useState<'audio' | 'video' | 'album'>('audio');
  const [attachSearch, setAttachSearch] = useState('');
  const [openPodcastList, setOpenPodcastList] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ postId: number; author: string; text: string; commentId?: string; quotedText?: string } | null>(null);
  const [podcastReplyTarget, setPodcastReplyTarget] = useState<{ commentId: string; author: string; text: string; podcastId: string; episodeIndex: number; audioTimestamp?: number; quotedText?: string } | null>(null);
  const [markAudioTimestamp, setMarkAudioTimestamp] = useState(false);
  const [adminBrandMode, setAdminBrandMode] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [profileTarget, setProfileTarget] = useState<{ userId?: string; name?: string; avatar?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const s = await getCommunitySettings();
        if (alive && s) { setChatEnabled(s.chatEnabled); setChatMessage(s.chatMessage || ''); }
      } catch {}
    };
    load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const openProfile = (userId?: string, name?: string, avatar?: string) => setProfileTarget({ userId, name, avatar });

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) {
      const main = el.closest('main');
      if (main && main.scrollHeight > main.clientHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [posts.length, comments.length]);

  useEffect(() => {
    if (replyTarget) {
      inputRef.current?.focus();
      setMarkAudioTimestamp(false);
    }
  }, [replyTarget]);

  const handleCreatePost = async () => {
    if ((!inputText.trim() && !inputMedia && !postAttachment) || sending || !currentUser) return;
    if (!chatEnabled && userRole !== 'admin') {
      setToastMessage('🚫 چت محفل توسط ادمین بسته شده است — فعلاً فقط میتوانید پیامها را ببینید');
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 4000);
      return;
    }
    setSending(true);
    if (podcastReplyTarget) {
      const text = inputText.trim();
      if (text) {
        onAddComment?.(text, { id: podcastReplyTarget.podcastId, episodes: [] }, undefined, podcastReplyTarget.commentId, podcastReplyTarget.audioTimestamp, podcastReplyTarget.quotedText || podcastReplyTarget.text);
        setInputText('');
        setInputMedia(null);
        setPodcastReplyTarget(null);
        if (inputRef.current) inputRef.current.style.height = 'auto';
      }
    } else if (replyTarget) {
      try {
        const { addPostComment } = await import('../services/api');
        const text = inputText.trim() || '[attachment]';
        const media = inputMedia ? [inputMedia] : [];
        const replyPost = posts.find((p: Post) => String(p.id) === String(replyTarget.postId));
        const hasAudio = replyPost?.media?.some(m => m.type === 'audio');
        const audioTs = markAudioTimestamp && hasAudio ? Math.floor((document.querySelector('audio') as HTMLAudioElement)?.currentTime || 0) : undefined;
        const updated = await addPostComment(String(replyTarget.postId), text, replyTarget.commentId ? String(replyTarget.commentId) : undefined, media.length > 0 ? media : undefined, replyTarget.quotedText || replyTarget.text, audioTs);
        if (updated && (updated as any).warnings) {
          setToastMessage(`⚠️ اخطار ${(updated as any).warnings} از ۳ — پیام شما حذف شد`);
          setToastVisible(true);
          setTimeout(() => setToastVisible(false), 4000);
          setSending(false);
          return;
        } else if (updated && (updated as any).banned) {
          setToastMessage('🚫 شما از سایت اخراج شده‌اید');
          setToastVisible(true);
          setSending(false);
          return;
        } else if (updated) {
          if (onUpdatePost) onUpdatePost(updated);
          setInputText('');
          setInputMedia(null);
          setReplyTarget(null);
          setMarkAudioTimestamp(false);
          if (inputRef.current) inputRef.current.style.height = 'auto';
          setTimeout(() => {
            const main = messagesEndRef.current?.closest('main');
            if (main && main.scrollHeight > main.clientHeight) {
              main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
            }
          }, 100);
        }
      } catch (err: any) {
        if (err?.chatClosed) {
          setChatEnabled(false);
          setToastMessage('🚫 چت محفل توسط ادمین بسته شده است — فعلاً فقط میتوانید پیامها را ببینید');
          setToastVisible(true);
          setTimeout(() => setToastVisible(false), 4000);
        }
      }
    } else {
      const media = inputMedia ? [{ type: inputMedia.type, url: inputMedia.url }] : [];
      const postData: any = {
        text: inputText.trim(),
        media: media.length > 0 ? media : undefined,
        author: userRole === 'admin' && adminBrandMode ? 'سرای هنر و اندیشه' : undefined,
        authorAvatarUrl: userRole === 'admin' && adminBrandMode ? BRAND_AVATAR : undefined,
        podcastId: postAttachment?.type === 'podcast' ? postAttachment.podcastId : undefined,
        episodeIndex: postAttachment?.type === 'podcast' ? postAttachment.episodeIndex : undefined,
        videoId: postAttachment?.type === 'video' ? postAttachment.videoId : undefined,
        albumId: postAttachment?.type === 'album' ? postAttachment.albumId : undefined,
      };
      let newPost;
      try {
        newPost = await createPost(postData);
      } catch (err: any) {
        if (err?.chatClosed) {
          setChatEnabled(false);
          setToastMessage('🚫 چت محفل توسط ادمین بسته شده است — فعلاً فقط میتوانید پیامها را ببینید');
          setToastVisible(true);
          setTimeout(() => setToastVisible(false), 4000);
        }
        setSending(false);
        return;
      }
      if (newPost && (newPost as any).warnings) {
        setToastMessage(`⚠️ اخطار ${(newPost as any).warnings} از ۳ — پیام شما حذف شد`);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 4000);
      } else if (newPost && (newPost as any).banned) {
        setToastMessage('🚫 شما از سایت اخراج شده‌اید');
        setToastVisible(true);
      } else if (newPost) {
        if (onNewPost) onNewPost(newPost);
        setInputText('');
        setInputMedia(null);
        setPostAttachment(null);
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setTimeout(() => {
          const main = messagesEndRef.current?.closest('main');
          if (main && main.scrollHeight > main.clientHeight) {
            main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
          }
        }, 100);
      }
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreatePost();
    }
  };

  const handleAttachFile = () => {
    setShowAttachMenu(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : null;
    if (!type) {
      setToastMessage('فقط ارسال عکس و صوت مجاز است');
      setToastVisible(true);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputMedia({ type, url: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const videoComments = useMemo(() => {
    return (comments || []).filter(c => c.type === 'video');
  }, [comments]);

  const rootVideoComments = useMemo(() => {
    return videoComments.filter(c => !c.parentId);
  }, [videoComments]);

  const podcastComments = useMemo(() => {
    return (comments || []).filter(c => c.type === 'podcast');
  }, [comments]);

  const rootPodcastComments = useMemo(() => {
    return podcastComments.filter(c => !c.parentId);
  }, [podcastComments]);

  const feedItems = useMemo(() => {
    const items: any[] = [];
    const q = searchQuery.trim().toLowerCase();

    const matchesQuery = (text?: string) => {
      if (!q) return true;
      return text && text.toLowerCase().includes(q);
    };

    if (feedMode === 'all' || feedMode === 'posts') {
      const sorted = [...posts].sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());
      let lastDate: Date | null = null;
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (!matchesQuery(current.text)) continue;
        const currentDate = new Date(current.isoDate);
        if (!lastDate || !isSameDay(currentDate, lastDate)) items.push({ itemType: 'date', date: current.isoDate });
        const isFirstInGroup = !sorted[i-1] || sorted[i-1].author !== current.author || !isSameDay(new Date(sorted[i-1].isoDate), currentDate);
        const isLastInGroup = !sorted[i+1] || sorted[i+1].author !== current.author || !isSameDay(new Date(sorted[i+1].isoDate), currentDate);
        items.push({ ...current, itemType: 'post', sortDate: new Date(current.isoDate).getTime(), isFirst: isFirstInGroup, isLast: isLastInGroup });
        lastDate = currentDate;
      }
    }

    if (feedMode === 'all' || feedMode === 'video-comments') {
      rootVideoComments.forEach(c => {
        if (!matchesQuery(c.text)) return;
        const video = videos.find((v: any) => String(v.id) === String(c.videoId));
        if (video) {
          items.push({ itemType: 'video-comment', comment: c, video, sortDate: new Date(c.isoDate).getTime() });
        }
      });
    }

    if (feedMode === 'all' || feedMode === 'podcast-comments') {
      rootPodcastComments.forEach(c => {
        if (!matchesQuery(c.text)) return;
        const podcast = podcasts.find((p: any) => String(p.id) === String(c.podcastId));
        if (podcast) {
          items.push({ itemType: 'podcast-comment', comment: c, podcast, sortDate: new Date(c.isoDate).getTime() });
        }
      });
    }

    return items.sort((a, b) => a.sortDate - b.sortDate);
  }, [posts, rootVideoComments, rootPodcastComments, videos, podcasts, feedMode, searchQuery]);

  const handleOpenVideo = (video: Video, timestamp: number) => {
    (window as any).__pendingVideoTimestamp = timestamp;
    onPlayVideoFromFeed(video);
  };

  const handleLikeComment = (commentId: string) => {
    const next = new Set(likedComments);
    if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
    setLikedComments(next);
    localStorage.setItem('soha_liked_comments', JSON.stringify([...next]));
    if (onLikeComment) onLikeComment(commentId);
  };

  return (
    <div className="flex flex-col h-dvh chat-bg">
        <div className="border-b px-3 py-3 flex-shrink-0"
          style={{ background: 'color-mix(in srgb, var(--surface) 85%, transparent)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <button onClick={onToggleSidebar}
              className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all hover:opacity-70 flex-shrink-0"
              style={{ color: 'var(--text-3)' }}>
              <i className="fas fa-bars text-sm"></i>
            </button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), #0d9488)' }}>
              <i className="fas fa-comments"></i>
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center mx-2">
              <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl flex-1 min-w-0 transition-all duration-200"
                style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: `1px solid ${searchFocused ? 'var(--primary)' : 'var(--border)'}` }}>
                <i className="fas fa-search text-[10px] flex-shrink-0"></i>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="جستجو..." className="w-full bg-transparent outline-none text-[10px] font-bold" style={{ color: 'var(--text)', outline: 'none', boxShadow: 'none' }} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center hover:opacity-70">
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="hidden lg:flex gap-1.5 ml-2">
              <button onClick={() => setFeedMode('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                  feedMode === 'all' ? 'text-white shadow-lg shadow-primary/20' : 'hover:opacity-80'
                }`}
                style={{
                  background: feedMode === 'all' ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)',
                  color: feedMode === 'all' ? 'white' : 'var(--text-3)',
                  border: `1px solid ${feedMode === 'all' ? 'transparent' : 'var(--border)'}`
                }}>همه</button>
              <button onClick={() => setFeedMode('posts')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                  feedMode === 'posts' ? 'text-white shadow-lg shadow-primary/20' : 'hover:opacity-80'
                }`}
                style={{
                  background: feedMode === 'posts' ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)',
                  color: feedMode === 'posts' ? 'white' : 'var(--text-3)',
                  border: `1px solid ${feedMode === 'posts' ? 'transparent' : 'var(--border)'}`
                }}>یادداشت‌ها</button>
              <button onClick={() => setFeedMode('video-comments')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                  feedMode === 'video-comments' ? 'text-white shadow-lg shadow-primary/20' : 'hover:opacity-80'
                }`}
                style={{
                  background: feedMode === 'video-comments' ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)',
                  color: feedMode === 'video-comments' ? 'white' : 'var(--text-3)',
                  border: `1px solid ${feedMode === 'video-comments' ? 'transparent' : 'var(--border)'}`
                }}>نظرات ویدیوها</button>
              <button onClick={() => setFeedMode('podcast-comments')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                  feedMode === 'podcast-comments' ? 'text-white shadow-lg shadow-primary/20' : 'hover:opacity-80'
                }`}
                style={{
                  background: feedMode === 'podcast-comments' ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)',
                  color: feedMode === 'podcast-comments' ? 'white' : 'var(--text-3)',
                  border: `1px solid ${feedMode === 'podcast-comments' ? 'transparent' : 'var(--border)'}`
                }}>نظرات صوت‌ها</button>
            </div>
            <button onClick={onOpenProfile}
              className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all hover:opacity-70 overflow-hidden flex-shrink-0"
              style={{ color: 'var(--text-3)' }}>
              {user?.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <i className="fas fa-user text-sm"></i>
              )}
            </button>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="pt-4 px-3 lg:px-0 lg:max-w-2xl lg:mx-auto xl:max-w-3xl">
          <div className="flex lg:hidden gap-2 justify-center mb-4">
            <button onClick={() => setFeedMode('all')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                feedMode === 'all' ? 'text-white shadow-lg shadow-primary/20' : 'hover:opacity-80'
              }`}
              style={{
                background: feedMode === 'all' ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)',
                color: feedMode === 'all' ? 'white' : 'var(--text-3)',
                border: `1px solid ${feedMode === 'all' ? 'transparent' : 'var(--border)'}`
              }}>همه</button>
            <button onClick={() => setFeedMode('posts')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                feedMode === 'posts' ? 'text-white shadow-lg shadow-primary/20' : 'hover:opacity-80'
              }`}
              style={{
                background: feedMode === 'posts' ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)',
                color: feedMode === 'posts' ? 'white' : 'var(--text-3)',
                border: `1px solid ${feedMode === 'posts' ? 'transparent' : 'var(--border)'}`
              }}>یادداشت‌ها</button>
            <button onClick={() => setFeedMode('video-comments')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                feedMode === 'video-comments' ? 'text-white shadow-lg shadow-primary/20' : 'hover:opacity-80'
              }`}
              style={{
                background: feedMode === 'video-comments' ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)',
                color: feedMode === 'video-comments' ? 'white' : 'var(--text-3)',
                border: `1px solid ${feedMode === 'video-comments' ? 'transparent' : 'var(--border)'}`
              }}>نظرات ویدیوها</button>
            <button onClick={() => setFeedMode('podcast-comments')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200 ${
                feedMode === 'podcast-comments' ? 'text-white shadow-lg shadow-primary/20' : 'hover:opacity-80'
              }`}
              style={{
                background: feedMode === 'podcast-comments' ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)',
                color: feedMode === 'podcast-comments' ? 'white' : 'var(--text-3)',
                border: `1px solid ${feedMode === 'podcast-comments' ? 'transparent' : 'var(--border)'}`
              }}>نظرات صوت‌ها</button>
          </div>
          {feedItems.length === 0 && (
            <div className="text-center py-20 animate-fadeIn" style={{ color: 'var(--text-3)' }}>
              <div className="w-24 h-24 mx-auto mb-5 rounded-[2rem] flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, #0d9488 8%, transparent))', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                <i className="fas fa-feather-alt text-3xl" style={{ color: 'color-mix(in srgb, var(--primary) 50%, transparent)' }}></i>
              </div>
              <p className="text-sm  mb-2" style={{ color: 'var(--text-2)' }}>هنوز گفتگویی آغاز نشده</p>
              <p className="text-[10px] font-bold opacity-60">اولین یادداشت را شما بنویسید</p>
            </div>
          )}

          {/* پست‌های سنجاق‌شده */}
          {(() => {
            const pinnedPosts = posts.filter((p: any) => p.isPinned);
            if (pinnedPosts.length === 0) return null;
            const shown = expandedPinned ? pinnedPosts : pinnedPosts.slice(0, 1);
            return (
              <div className="mb-3 animate-fadeIn sticky top-0 z-20">
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #fff7ed, #fffbeb, #fef3c7)', border: '1px solid rgba(234, 179, 8, 0.2)', boxShadow: '0 2px 12px rgba(234, 179, 8, 0.1)' }}>
                  <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(234, 179, 8, 0.15)' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      <i className="fas fa-thumbtack text-white text-[8px]"></i>
                    </div>
                    <span className="text-[10px] font-black" style={{ color: '#92400e' }}>سنجاق‌شده</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#b45309' }}>{toPersianDigits(pinnedPosts.length)}</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(234, 179, 8, 0.1)' }}>
                    {shown.map((p: any) => (
                      <div key={p._id || p.id} className="px-3 py-2.5 cursor-pointer transition-all hover:bg-white/50 active:scale-[0.98]" onClick={() => {
                        const el = document.getElementById(`post-${p._id || p.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}>
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `hsl(${(p.author || 'ک').charCodeAt(0) * 37 % 360}, 55%, 50%)` }}>
                            <span className="text-white text-[7px] font-bold">{(p.author || 'ک').charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-black" style={{ color: '#92400e' }}>{p.author}</span>
                              <span className="text-[7px]" style={{ color: '#b45309' }}>{p.date}</span>
                            </div>
                            <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: '#78350f' }}>{p.text || '(بدون متن)'}</p>
                          </div>
                          <i className="fas fa-thumbtack text-[8px] flex-shrink-0 mt-1" style={{ color: '#d97706' }}></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pinnedPosts.length > 1 && (
                    <button onClick={() => setExpandedPinned(!expandedPinned)} className="w-full py-2 text-[9px] font-black flex items-center justify-center gap-1 transition-all hover:bg-white/50" style={{ color: '#b45309', borderTop: '1px solid rgba(234, 179, 8, 0.1)' }}>
                      <i className={`fas ${expandedPinned ? 'fa-chevron-up' : 'fa-chevron-down'} text-[8px]`}></i>
                      {expandedPinned ? 'بستن' : `مشاهده همه (${toPersianDigits(pinnedPosts.length)})`}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {feedItems.map((item, index) => {
            if (item.itemType === 'date') return <DateSeparator key={`${item.date}-${index}`} date={item.date} />;
            if (item.itemType === 'post') {
              return (
                <div key={item.id}>
                    <PostBubble post={item} video={item.videoId ? videos.find((v:any) => String(v.id) === String(item.videoId)) : undefined} podcast={item.podcastId ? podcasts.find((p:any) => String(p.id) === String(item.podcastId)) : undefined} episode={item.episodeIndex != null && item.podcastId ? (() => { const p = podcasts.find((pp:any) => String(pp.id) === String(item.podcastId)); return p?.episodes[item.episodeIndex] || null; })() : null} publishedBook={item.bookId ? publishedBooks.find((b:any) => String(b.id) === String(item.bookId)) : undefined} album={item.albumId ? albums.mine.find((a:any) => String(a._id || a.id) === String(item.albumId)) || albums.shared.find((a:any) => String(a._id || a.id) === String(item.albumId)) : undefined} saved={savedPostIds.some((sid: string) => String(sid) === String(item.id || (item as any)._id))} onToggleSave={onToggleSavePost} onPlayAlbum={onPlayAlbum} onOpenAlbum={onOpenAlbum} onShowComments={onShowComments} onPlayVideo={onPlayVideoFromFeed} onPlayPodcast={onPlayPodcastFromFeed} onShowBook={onShowBook} onOpenMenu={(post, rect) => setMenuState({ post, rect })} isFirstInGroup={item.isFirst} isLastInGroup={item.isLast} onShowInstantView={onShowInstantView} onNewPost={onNewPost} onUpdatePost={onUpdatePost} onDeletePost={onDeletePost} currentUser={currentUser} userRole={userRole} onSwipeReply={(t) => { setReplyTarget(t); inputRef.current?.focus(); }} onOpenProfile={openProfile} />
                </div>
              );
            }
            if (item.itemType === 'video-comment') {
              return (
                <div key={item.comment._id || item.comment.id} className="animate-fadeIn">
                   <VideoCommentItem
                    comment={item.comment}
                    video={item.video}
                    allComments={videoComments}
                    onOpenVideo={handleOpenVideo}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    onLikeComment={handleLikeComment}
                    onUpdateComment={onUpdateComment}
                    onShowDiscussion={onShowVideoDiscussion}
                    currentUserName={currentUser}
                    userRole={userRole}
                    likedComments={likedComments}
                    onOpenProfile={openProfile}
                  />
                </div>
              );
            }
            if (item.itemType === 'podcast-comment') {
              return (
                <div key={item.comment._id || item.comment.id} className="animate-fadeIn">
                   <PodcastCommentItem
                    comment={item.comment}
                    podcast={item.podcast}
                    allComments={podcastComments}
                    onPlayPodcast={onPlayPodcastComment || ((p, epIdx) => { if (onPlayPodcastFromFeed) onPlayPodcastFromFeed(p, epIdx); })}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    onLikeComment={handleLikeComment}
                    onUpdateComment={onUpdateComment}
                    currentUserName={currentUser}
                    userRole={userRole}
                    likedComments={likedComments}
                    onOpenProfile={openProfile}
                    currentPlayingPodcastId={miniPlayerProps?.track?.podcast?.id}
                    currentPlayingEpIdx={miniPlayerProps?.track?.episodeIndex}
                    isGloballyPlaying={miniPlayerProps?.isPlaying}
                    onGlobalTogglePlay={miniPlayerProps?.onPlayPause}
                    onShowDiscussion={() => {
                      const c = item.comment;
                      const virtualPost: any = { id: Date.now(), author: c.author, authorAvatarUrl: c.authorAvatarUrl || '', date: c.date || '', isoDate: c.isoDate || '', text: c.text, comments: c.replies || [], likes: 0, podcastId: String(item.podcast?.id || (item.podcast as any)?._id || ''), episodeIndex: c.episodeIndex != null ? c.episodeIndex : 0, parentCommentId: c._id || c.id };
                      (onShowComments as any)?.(virtualPost, item.podcast);
                    }}
                    onRequestReply={(commentId, author, text, podcastId, episodeIndex, audioTimestamp, quotedText) => {
                      setReplyTarget(null);
                      setPodcastReplyTarget({ commentId, author, text, podcastId, episodeIndex, audioTimestamp, quotedText });
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                  />
                </div>
              );
            }
            return null;
          })}
          <div ref={messagesEndRef} className="mb-24 lg:mb-4" />
          </div>
        </main>

        {/* Mini player - desktop, above input */}
        {miniPlayerProps && (
          <div className="hidden lg:block flex-shrink-0 px-3 pt-2">
            <MinimizedPlayer {...miniPlayerProps} variant="inline" />
          </div>
        )}

        {/* Input bar at bottom */}
        <div className="border-t px-3 py-2.5 flex justify-center flex-shrink-0" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="w-full max-w-2xl">
          {!chatEnabled && (
            <div className="flex items-center gap-2.5 mb-2 px-3 py-2.5 rounded-xl shadow-sm animate-fadeIn"
              style={{ background: 'color-mix(in srgb, #f59e0b 8%, var(--surface-2))', border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <i className="fas fa-lock text-[10px]"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black" style={{ color: '#b45309' }}>چت محفل توسط ادمین بسته شده است</p>
                <p className="text-[9px] font-medium mt-0.5 leading-relaxed" style={{ color: '#92400e' }}>
                  {chatMessage || 'فعلاً فقط میتوانید پیامها را ببینید — بهزودی دوباره باز میشود'}
                </p>
              </div>
            </div>
          )}
          {/* Reply banner */}
          {replyTarget && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl shadow-sm" style={{ background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-2))', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className="w-0.5 h-7 rounded-full" style={{ background: 'var(--primary)' }}></div>
                <i className={`fas ${replyTarget.commentId ? 'fa-reply-all' : 'fa-reply'} text-[9px]`} style={{ color: 'var(--primary)' }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-chevron-left text-[7px]" style={{ color: 'var(--text-3)' }}></i>
                  <span className="text-[10px] font-black" style={{ color: 'var(--primary)' }}>پاسخ به {replyTarget.author}</span>
                  {replyTarget.commentId && <span className="text-[7px] font-medium opacity-60" style={{ color: 'var(--primary)' }}>· در ریپلای</span>}
                </div>
                <div className="text-[9px] font-medium leading-relaxed line-clamp-2 mt-0.5" style={{ color: 'var(--text-3)' }}>
                  <span className="opacity-70">{replyTarget.text}</span>
                </div>
              </div>
              <button onClick={() => { setReplyTarget(null); setMarkAudioTimestamp(false); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-60 transition-opacity"
                style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-times text-[9px]"></i>
              </button>
            </div>
          )}
          {podcastReplyTarget && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl shadow-sm" style={{ background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-2))', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className="w-0.5 h-7 rounded-full" style={{ background: 'var(--primary)' }}></div>
                <i className="fas fa-reply text-[9px]" style={{ color: 'var(--primary)' }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <i className={`fas ${podcastReplyTarget.quotedText ? 'fa-quote-right' : 'fa-headphones'} text-[7px]`} style={{ color: 'var(--primary)' }}></i>
                  <span className="text-[10px] font-black" style={{ color: 'var(--primary)' }}>پاسخ به {podcastReplyTarget.author}</span>
                </div>
                <div className="text-[9px] font-medium leading-relaxed line-clamp-2 mt-0.5" style={{ color: 'var(--text-3)' }}>
                  <span className="opacity-70">{podcastReplyTarget.quotedText || podcastReplyTarget.text}</span>
                </div>
              </div>
              <button onClick={() => setPodcastReplyTarget(null)}
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-60 transition-opacity"
                style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-times text-[9px]"></i>
              </button>
            </div>
          )}
          {inputMedia && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {inputMedia.type === 'image' ? (
                  <img src={inputMedia.url} className="w-12 h-12 object-cover" alt="" />
                ) : inputMedia.type === 'audio' ? (
                  <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
                    <i className="fas fa-music" style={{ color: 'var(--primary)' }}></i>
                  </div>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
                    <i className="fas fa-video" style={{ color: 'var(--primary)' }}></i>
                  </div>
                )}
                <button onClick={() => setInputMedia(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md text-[8px]"
                  style={{ background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>
                {inputMedia.type === 'image' ? 'تصویر' : inputMedia.type === 'audio' ? 'صوت' : 'ویدیو'}
              </span>
              <button onClick={() => setInputMedia(null)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black transition-all active:scale-95"
                style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--surface-2))', color: '#ef4444', border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)' }}>
                <i className="fas fa-times text-[8px]"></i> بستن انتخاب
              </button>
            </div>
          )}
          {postAttachment && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
                  {postAttachment.cover ? <img src={postAttachment.cover} className="w-12 h-12 object-cover" alt="" /> : <i className={`fas ${postAttachment.type === 'video' ? 'fa-video' : postAttachment.type === 'album' ? 'fa-palette' : 'fa-headphones'}`} style={{ color: 'var(--primary)' }}></i>}
                </div>
                <button onClick={() => setPostAttachment(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md text-[8px]"
                  style={{ background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold" style={{ color: 'var(--primary)' }}>
                  {postAttachment.type === 'podcast' ? (postAttachment.episodeIndex != null ? 'صوت از آرشیو' : 'پلی‌لیست از آرشیو') : postAttachment.type === 'video' ? 'ویدیو از آرشیو' : 'آلبوم'}
                </span>
                <p className="text-[10px] font-black truncate" style={{ color: 'var(--text)' }}>{postAttachment.title}</p>
              </div>
              <button onClick={() => setPostAttachment(null)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black transition-all active:scale-95 flex-shrink-0"
                style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--surface-2))', color: '#ef4444', border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)' }}>
                <i className="fas fa-times text-[8px]"></i> بستن انتخاب
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            {(userRole === 'admin' || userRole === 'author') && (
            <div className="relative flex-shrink-0">
            <button onClick={() => setAttachMenuOpen(v => !v)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all ${attachMenuOpen ? 'opacity-80' : ''}`}
              title="افزودن فایل یا پیوست آرشیو"
              style={{ color: attachMenuOpen ? 'white' : 'var(--text-2)', border: '1.5px solid var(--border)', background: attachMenuOpen ? 'var(--primary)' : 'var(--surface-2)' }}>
              <i className="fas fa-plus text-sm"></i>
            </button>
            {attachMenuOpen && (
              <div className="absolute bottom-11 right-0 z-[2600] w-44 rounded-2xl shadow-2xl p-1.5 animate-fadeIn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                {userRole === 'admin' && (
                  <button onClick={() => { setAttachMenuOpen(false); setAdminBrandMode(!adminBrandMode); }}
                    className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${adminBrandMode ? 'text-white' : ''}`} style={adminBrandMode ? { background: 'linear-gradient(135deg, var(--primary), #0d9488)' } : { background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                      <i className="fas fa-mask text-[10px]"></i>
                    </span>
                    <span className="text-[11px] font-black flex-1" style={{ color: 'var(--text)' }}>
                      {adminBrandMode ? 'ارسال با نام سرای هنر و اندیشه' : 'ارسال با نام خودتان'}
                    </span>
                    {adminBrandMode && <i className="fas fa-check text-[10px]" style={{ color: 'var(--primary)' }}></i>}
                  </button>
                )}
                {userRole === 'admin' && (
                  <button onClick={() => { setAttachMenuOpen(false); fileInputRef.current?.click(); }}
                    className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, var(--primary), #0d9488)' }}>
                      <i className="fas fa-file-upload text-[10px]"></i>
                    </span>
                    <span className="text-[11px] font-black" style={{ color: 'var(--text)' }}>ارسال فایل (عکس و صوت)</span>
                  </button>
                )}
                <button onClick={() => { setAttachMenuOpen(false); setAttachSearch(''); setAttachTab('audio'); setShowAttachMenu(true); }}
                  className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                    <i className="fas fa-paperclip text-[10px]"></i>
                  </span>
                  <span className="text-[11px] font-black" style={{ color: 'var(--text)' }}>پیوست از آرشیو</span>
                </button>
              </div>
            )}
            </div>
            )}
            {replyTarget && (() => {
              const replyPost = posts.find((p: Post) => String(p.id) === String(replyTarget.postId));
              const hasAudio = replyPost?.media?.some(m => m.type === 'audio');
              return hasAudio ? (
                <button onClick={() => setMarkAudioTimestamp(!markAudioTimestamp)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                  style={{ color: markAudioTimestamp ? 'white' : 'var(--text-2)', background: markAudioTimestamp ? 'var(--primary)' : 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                  <i className="fas fa-music text-sm"></i>
                </button>
              ) : null;
            })()}
            <div className="flex-1 min-w-0 rounded-xl overflow-hidden transition-all duration-200"
              style={{ border: `1.5px solid var(--border)`, background: 'var(--surface-2)' }}>
              <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} readOnly={!chatEnabled && userRole !== 'admin'} placeholder={!chatEnabled && userRole !== 'admin' ? 'چت محفل بسته شده است...' : podcastReplyTarget ? `پاسخ به ${podcastReplyTarget.author}...` : "پیام..."} className="w-full bg-transparent outline-none px-3.5 py-2.5 text-[13px] font-medium" style={{ color: 'var(--text)', direction: 'rtl', opacity: !chatEnabled && userRole !== 'admin' ? 0.5 : 1 }} />
            </div>
            <button onClick={handleCreatePost} disabled={(!inputText.trim() && !inputMedia && !postAttachment) || sending || !currentUser || (!chatEnabled && userRole !== 'admin')}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all disabled:opacity-40 shadow-md"
              style={{ background: (inputText.trim() || inputMedia || postAttachment) && !sending ? 'linear-gradient(135deg, var(--primary), #0d9488)' : 'var(--surface-2)', color: (inputText.trim() || inputMedia || postAttachment) && !sending ? 'white' : 'var(--text-2)', border: `1.5px solid ${(inputText.trim() || inputMedia || postAttachment) && !sending ? 'transparent' : 'var(--border)'}` }}>
              <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-sm`}></i>
            </button>
          </div>
          </div>
        </div>

        <InteractionMenu post={menuState.post} rect={menuState.rect} onClose={() => setMenuState({ post: null, rect: null })} isAdmin={userRole === 'admin'} onDelete={onDeletePost} />

        {profileTarget && (
          <UserProfileModal userId={profileTarget.userId} name={profileTarget.name} avatar={profileTarget.avatar} onClose={() => setProfileTarget(null)} />
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*,audio/*" className="hidden" onChange={handleFileChange} />

        {/* مودال انتخاب پیوست آرشیو */}
        {showAttachMenu && (
          <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowAttachMenu(false)}>
            <div className="w-full sm:max-w-lg max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl flex flex-col animate-slideUp" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}><i className="fas fa-paperclip ml-1.5" style={{ color: 'var(--primary)' }}></i> پیوست از آرشیو</h3>
                <button onClick={() => setShowAttachMenu(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ color: 'var(--text-3)' }}><i className="fas fa-times"></i></button>
              </div>
              <div className="flex gap-2 px-5 pb-3">
                <button onClick={() => setAttachTab('audio')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${attachTab === 'audio' ? 'text-white' : ''}`}
                  style={attachTab === 'audio' ? { background: 'linear-gradient(135deg, var(--primary), #0d9488)' } : { background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  <i className="fas fa-headphones ml-1 text-[9px]"></i> صوت (سها)
                </button>
                <button onClick={() => setAttachTab('video')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${attachTab === 'video' ? 'text-white' : ''}`}
                  style={attachTab === 'video' ? { background: 'linear-gradient(135deg, var(--primary), #0d9488)' } : { background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  <i className="fas fa-video ml-1 text-[9px]"></i> ویدیو (سیما)
                </button>
                <button onClick={() => setAttachTab('album')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${attachTab === 'album' ? 'text-white' : ''}`}
                  style={attachTab === 'album' ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : { background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  <i className="fas fa-palette ml-1 text-[9px]"></i> آلبوم
                </button>
              </div>
              <div className="px-5 pb-5 overflow-y-auto flex-1 min-h-0">
                <div className="relative mb-3">
                  <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[9px]" style={{ color: 'var(--text-3)' }} />
                  <input value={attachSearch} onChange={e => setAttachSearch(e.target.value)} placeholder={`جستجو در ${attachTab === 'audio' ? 'صوت‌ها' : attachTab === 'video' ? 'ویدیوها' : 'آلبوم‌ها'}...`}
                    className="w-full pr-8 pl-8 py-2 rounded-xl text-[10px] font-bold outline-none transition-all focus:ring-2"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 30%, transparent)' } as any} />
                  {attachSearch && <button onClick={() => setAttachSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2"><i className="fas fa-times text-[8px]" style={{ color: 'var(--text-3)' }} /></button>}
                </div>
                {attachTab === 'audio' && (
                  <div className="space-y-2">
                    {podcasts.length === 0 && <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>آرشیو صوتی خالی است</p>}
                    {(() => {
                      const query = attachSearch.trim().toLowerCase();
                      const filtered = query
                        ? podcasts.filter((p: any) => String(p.title || '').toLowerCase().includes(query) || (p.episodes || []).some((ep: any) => String(ep.title || '').toLowerCase().includes(query)))
                        : podcasts;
                      if (query && filtered.length === 0) return <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>چیزی یافت نشد</p>;
                      return filtered.map((p: any) => {
                        const pid = String(p.id || p._id);
                        const open = openPodcastList === pid;
                        const eps = query ? (p.episodes || []).filter((ep: any) => String(ep.title || '').toLowerCase().includes(query)) : (p.episodes || []);
                        return (
                          <div key={pid} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <div className="flex items-stretch">
                            <button onClick={() => setOpenPodcastList(open ? null : pid)}
                              className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5 text-right active:scale-[0.99] transition-all">
                              <img src={String(p.cover || DEFAULT_COVER)} className="w-9 h-9 rounded-xl object-cover" alt="" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black truncate" style={{ color: 'var(--text)' }}>{String(p.title)}</p>
                                <p className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>{toPersianDigits(p.episodes?.length || 0)} جلسه</p>
                              </div>
                              <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[8px] transition-transform duration-300`} style={{ color: 'var(--text-3)' }}></i>
                            </button>
                            <button onClick={() => { setPostAttachment({ type: 'podcast', podcastId: pid, title: String(p.title || ''), cover: p.cover || '' }); setShowAttachMenu(false); }}
                              className="flex-shrink-0 flex items-center gap-1 px-2.5 my-2 mr-1 rounded-lg text-[8px] font-black text-white active:scale-95 transition-all"
                              title="انتخاب کل پلی‌لیست"
                              style={{ background: 'linear-gradient(135deg, var(--primary), #0d9488)' }}>
                              <i className="fas fa-plus text-[7px]"></i> انتخاب پلی‌لیست
                            </button>
                            </div>
                            {open && (
                              <div className="space-y-1 px-2 pb-2">
                                {eps.length === 0 && <p className="text-[9px] text-center py-3" style={{ color: 'var(--text-3)' }}>جلسه‌ای نیست</p>}
                                {eps.map((ep: any, idx: number) => (
                                  <button key={idx} onClick={() => { setPostAttachment({ type: 'podcast', podcastId: pid, episodeIndex: idx, title: String(ep.title || ''), cover: ep.cover || p.cover || '' }); setShowAttachMenu(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-right active:scale-[0.98] transition-all"
                                    style={{ background: 'var(--surface-3)', border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)' }}>
                                    <i className="fas fa-headphones text-[9px]" style={{ color: '#f59e0b' }}></i>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>{String(ep.title)}</p>
                                      <p className="text-[8px] font-bold" style={{ color: 'var(--text-3)' }}>جلسه {toPersianDigits(idx + 1)}</p>
                                    </div>
                                    <i className="fas fa-plus text-[8px]" style={{ color: 'var(--primary)' }}></i>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
                {attachTab === 'video' && (
                  <div className="space-y-1.5">
                    {videos.length === 0 && <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>آرشیو ویدیویی خالی است</p>}
                    {(() => {
                      const query = attachSearch.trim().toLowerCase();
                      const filtered = query ? videos.filter((v: any) => String(v.title || '').toLowerCase().includes(query)) : videos;
                      if (query && filtered.length === 0) return <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>چیزی یافت نشد</p>;
                      return filtered.map((v: any) => (
                      <button key={String(v.id || v._id)} onClick={() => { setPostAttachment({ type: 'video', videoId: String(v.id || v._id), title: String(v.title || ''), cover: v.thumbnailUrl || '' }); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right active:scale-[0.98] transition-all"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <img src={v.thumbnailUrl} className="w-12 h-8 rounded-lg object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>{String(v.title)}</p>
                          <p className="text-[8px] font-bold" style={{ color: 'var(--text-3)' }}>{toPersianDigits(v.viewCount || 0)} بازدید</p>
                        </div>
                        <i className="fas fa-plus text-[8px]" style={{ color: 'var(--primary)' }}></i>
                      </button>
                      ));
                    })()}
                  </div>
                )}
                {attachTab === 'album' && (
                  <div className="space-y-1.5">
                    {albums.mine.length === 0 && albums.shared.length === 0 && <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>هنوز آلبومی ساخته نشده — از کتابخانه بساز</p>}
                    {(() => {
                      const query = attachSearch.trim().toLowerCase();
                      const all = [...albums.mine, ...albums.shared];
                      const filtered = query ? all.filter((a: any) => String(a.title || '').toLowerCase().includes(query)) : all;
                      if (query && filtered.length === 0) return <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>چیزی یافت نشد</p>;
                      return filtered.map((a: any) => (
                      <button key={String(a._id || a.id)} onClick={() => { setPostAttachment({ type: 'album', albumId: String(a._id || a.id), title: String(a.title || ''), cover: a.cover || a.items?.[0]?.cover || '' }); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right active:scale-[0.98] transition-all"
                        style={{ background: 'color-mix(in srgb, #14b8a6 4%, var(--surface-2))', border: '1px solid color-mix(in srgb, #14b8a6 16%, var(--border))' }}>
                        <img src={a.cover || a.items?.[0]?.cover || DEFAULT_COVER} className="w-12 h-8 rounded-lg object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>{String(a.title)}</p>
                          <p className="text-[8px] font-bold" style={{ color: '#14b8a6' }}>
                            <i className="fas fa-palette text-[7px] ml-1" />{a.type === 'video' ? 'آلبوم ویدیویی' : 'آلبوم صوتی'} · {toPersianDigits(a.items?.length || 0)} قطعه
                          </p>
                        </div>
                        <i className="fas fa-plus text-[8px]" style={{ color: '#14b8a6' }}></i>
                      </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toastVisible && toastMessage && (
          <div className="fixed top-5 right-5 z-[3000] px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-2xl animate-toastIn border border-white/10 max-w-[80vw]" style={{ background: toastMessage.includes('اخراج') ? '#ef4444' : '#f59e0b' }}>
            {toastMessage}
          </div>
        )}
    </div>
  );
};

const InteractionMenu: React.FC<{
  post: Post | null;
  rect: DOMRect | null;
  onClose: () => void;
  isAdmin: boolean;
  onDelete: (id: number) => void;
}> = ({ post, rect, onClose, isAdmin, onDelete }) => {
  if (!post || !rect) return null;
  return (
    <div className="fixed inset-0 z-[2000] animate-fadeIn" onClick={onClose}>
        <div className="absolute rounded-2xl shadow-2xl p-2 w-48 backdrop-blur-xl"
          style={{ top: Math.min(rect.top, window.innerHeight - 150), left: rect.left, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="w-full text-right p-2.5 hover:bg-white/5 rounded-xl text-xs font-black flex items-center gap-3 transition-colors"
              style={{ color: 'var(--text)' }}><i className="fas fa-share-alt" style={{ color: 'var(--text-3)' }}></i> اشتراک‌گذاری</button>
            {isAdmin && <button onClick={() => { onDelete(post.id); onClose(); }} className="w-full text-right p-2.5 hover:bg-red-500/10 rounded-xl text-xs font-black flex items-center gap-3 transition-colors text-red-400"><i className="fas fa-trash-alt"></i> حذف پیام</button>}
        </div>
    </div>
  );
};

export default MahfelPage;
