import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Podcast, Episode } from '../types';
import { DEFAULT_COVER } from '../utils/helpers';

interface MinimizedPlayerProps {
  track: { podcast: Podcast; episode: Episode; episodeIndex: number };
  isPlaying: boolean;
  progress: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onExpand: () => void;
  onClose: () => void;
  onSelectPodcast: (podcast: Podcast) => void;
  isVisible: boolean;
  isInLibrary?: boolean;
  onToggleLibrary: () => void;
  onPlayInBackground?: () => void;
  bottomOffset?: number;
  variant?: 'fixed' | 'inline';
  theme?: 'light' | 'dark';
}

const toPersianDigits = (num: number) => {
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).split('').map(c => persian[parseInt(c)] || c).join('');
};

const MinimizedPlayer: React.FC<MinimizedPlayerProps> = ({
  track, isPlaying, progress, onPlayPause, onNext, onPrev, onExpand, onClose, onSelectPodcast, isVisible,
  isInLibrary, onToggleLibrary, onPlayInBackground, bottomOffset = 0, variant = 'fixed', theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const coverUrl = track.episode.cover || track.podcast.cover || DEFAULT_COVER;
  const total = track.podcast.episodes.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    moved: false,
  });

  const getClientXY = (e: MouseEvent | TouchEvent) => {
    const src = 'touches' in e ? (e.touches[0] || e.changedTouches[0]) : (e as MouseEvent);
    return { x: src.clientX, y: src.clientY };
  };

  const clampX = (v: number) => {
    const w = containerRef.current?.offsetWidth || 300;
    const maxX = window.innerWidth - w;
    return Math.max(-maxX, Math.min(maxX, v));
  };

  const clampY = (v: number) => {
    const h = containerRef.current?.offsetHeight || 60;
    const maxY = 0;
    const minY = -(window.innerHeight - h - 6);
    return Math.max(minY, Math.min(maxY, v));
  };

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getClientXY(e as any);
    dragRef.current = { active: true, startX: x, startY: y, startPosX: pos.x, startPosY: pos.y, moved: false };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current.active) return;
      if ('touches' in e) e.preventDefault();
      const { x, y } = getClientXY(e);
      const dx = x - dragRef.current.startX;
      const dy = y - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      setPos({
        x: clampX(dragRef.current.startPosX + dx),
        y: clampY(dragRef.current.startPosY + dy),
      });
    };

    const onUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, []);

  if (variant === 'inline') {
    return (
      <div ref={containerRef} className={`relative rounded-2xl overflow-hidden shadow-lg border ${isDark ? 'border-white/[0.08]' : 'border-gray-200'} max-w-xl mx-auto cursor-grab active:cursor-grabbing`}
        style={{ background: isDark ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255,255,255,0.95)', transform: `translate(${pos.x}px, ${pos.y}px)`, transition: dragRef.current.active ? 'none' : 'transform 0.3s ease-out', touchAction: 'none' }}
        onMouseDown={(e) => { e.preventDefault(); onDragStart(e); }}
        onTouchStart={(e) => { onDragStart(e); }}>
        {coverUrl && (
          <div className="absolute -left-3 -top-3 w-14 h-14 rounded-full opacity-15 blur-lg pointer-events-none" style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}></div>
        )}
        <div className="relative flex items-center gap-3 px-4 py-3">
          <div className={`relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-1 ${isDark ? 'ring-white/[0.08]' : 'ring-gray-200'} cursor-pointer active:scale-95 transition-transform`}
            onMouseDown={e => e.stopPropagation()} onClick={onExpand}>
            {coverUrl ? (
              <img src={coverUrl} alt="" className={`w-full h-full object-cover ${isPlaying ? 'animate-spinSlow' : ''}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d9488, #4f46e5)' }}>
                <i className="fas fa-headphones text-white/30 text-xs"></i>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onMouseDown={e => e.stopPropagation()} onClick={onExpand}>
            <p className={`text-[12px] font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate leading-tight`}>{track.podcast.title}</p>
            <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'} truncate leading-tight mt-0.5`}>
              {track.episode.title} · {toPersianDigits(track.episodeIndex + 1)}/{toPersianDigits(total)}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span onMouseDown={e => { e.stopPropagation(); onNext(); }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'} active:scale-90 transition-all text-xs cursor-pointer select-none`}>
              <i className="fas fa-forward-step"></i>
            </span>
            <span onMouseDown={e => { e.stopPropagation(); onPlayPause(); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all shadow-lg cursor-pointer select-none"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm ${!isPlaying ? 'mr-0.5' : ''}`}></i>
            </span>
            <span onMouseDown={e => { e.stopPropagation(); onPrev(); }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'} active:scale-90 transition-all text-xs cursor-pointer select-none`}>
              <i className="fas fa-backward-step"></i>
            </span>
            <span onMouseDown={e => { e.stopPropagation(); onToggleLibrary(); }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all text-xs cursor-pointer select-none ${isInLibrary ? 'text-primary' : (isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}`}>
              <i className={`${isInLibrary ? 'fas' : 'far'} fa-bookmark`}></i>
            </span>
            {onPlayInBackground && (
            <span onMouseDown={e => { e.stopPropagation(); onPlayInBackground!(); }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all text-xs cursor-pointer select-none ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
              role="button" aria-label="پخش در پس‌زمینه">
              <i className="fas fa-compact-disc" style={{ color: '#06b6d4' }}></i>
            </span>
            )}
            <span onMouseDown={e => { e.stopPropagation(); onClose(); }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'text-white/20 hover:text-white/50 hover:bg-white/[0.06]' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'} active:scale-90 transition-all text-[10px] cursor-pointer select-none`}>
              <i className="fas fa-times"></i>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <style>{`@media (min-width: 1024px) { .min-player-wrap { padding-bottom: 6px !important; } }`}</style>
    <div
      className={`min-player-wrap fixed bottom-0 z-[900] pointer-events-none ease-out left-0 right-0 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        paddingBottom: `${bottomOffset}px`, paddingLeft: '12px', paddingRight: '12px',
      } as React.CSSProperties}>
      <div className="lg:mr-auto lg:ml-[25rem] mx-auto max-w-2xl lg:max-w-2xl pointer-events-auto"
        ref={containerRef}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: dragRef.current.active ? 'none' : 'transform 0.3s ease-out, opacity 0.5s ease-out',
        } as React.CSSProperties}>
        <div className={`relative rounded-2xl overflow-hidden shadow-2xl border ${isDark ? 'border-white/[0.06]' : 'border-gray-200'} backdrop-blur-2xl lg:rounded-3xl cursor-grab active:cursor-grabbing`}
          style={{ background: isDark ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255,255,255,0.95)', touchAction: 'none' }}
          onMouseDown={(e) => { e.preventDefault(); onDragStart(e); }}
          onTouchStart={(e) => { onDragStart(e); }}>

          {coverUrl && (
            <div className="absolute -left-3 -top-3 w-14 h-14 rounded-full opacity-15 blur-lg pointer-events-none" style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}></div>
          )}

          <div className="flex items-center gap-2 px-3 py-2 lg:gap-4 lg:px-6 lg:py-3.5">
            {/* Cover */}
            <div className={`relative w-10 h-10 lg:w-14 lg:h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-1 ${isDark ? 'ring-white/[0.08]' : 'ring-gray-200'} cursor-pointer active:scale-95 transition-transform lg:rounded-xl`}
              onMouseDown={onExpand}>
              {coverUrl ? (
                <img src={coverUrl} alt="" className={`w-full h-full object-cover ${isPlaying ? 'animate-spinSlow' : ''}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d9488, #4f46e5)' }}>
                  <i className="fas fa-headphones text-white/30 text-xs"></i>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 px-1"
              onClick={() => { if (!dragRef.current.moved) onExpand(); }}>
              <p className={`text-[13px] lg:text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate leading-tight`}>{track.podcast.title}</p>
              <p className={`text-[10px] lg:text-xs ${isDark ? 'text-white/40' : 'text-gray-500'} truncate leading-tight mt-0.5`}>
                {track.episode.title} · {toPersianDigits(track.episodeIndex + 1)}/{toPersianDigits(total)}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
              <span onMouseDown={e => { e.stopPropagation(); onNext(); }}
                className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'} active:scale-90 transition-all text-sm lg:text-sm cursor-pointer select-none`}
                role="button" aria-label="بعدی">
                <i className="fas fa-forward-step"></i>
              </span>
              <span onMouseDown={e => { e.stopPropagation(); onPlayPause(); }}
                className="w-10 h-10 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all shadow-lg cursor-pointer select-none"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                role="button" aria-label={isPlaying ? 'توقف' : 'پخش'}>
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm lg:text-sm ${!isPlaying ? 'mr-0.5' : ''}`}></i>
              </span>
              <span onMouseDown={e => { e.stopPropagation(); onPrev(); }}
                className={`w-9 h-9 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'} active:scale-90 transition-all text-sm lg:text-xs cursor-pointer select-none`}
                role="button" aria-label="قبلی">
                <i className="fas fa-backward-step"></i>
              </span>
              <span onMouseDown={e => { e.stopPropagation(); onToggleLibrary(); }}
                className={`w-9 h-9 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all text-sm lg:text-xs cursor-pointer select-none ${isInLibrary ? 'text-primary' : (isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}`}
                role="button" aria-label="ذخیره">
                <i className={`${isInLibrary ? 'fas' : 'far'} fa-bookmark`}></i>
              </span>
              {onPlayInBackground && (
              <span onMouseDown={e => { e.stopPropagation(); onPlayInBackground!(); }}
                className={`w-9 h-9 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all text-sm lg:text-xs cursor-pointer select-none ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                role="button" aria-label="پخش در پس‌زمینه">
                <i className="fas fa-compact-disc" style={{ color: '#06b6d4' }}></i>
              </span>
              )}
              <span onMouseDown={e => { e.stopPropagation(); onClose(); }}
                className={`w-8 h-8 lg:w-7 lg:h-7 rounded-xl flex items-center justify-center ${isDark ? 'text-white/20 hover:text-white/50 hover:bg-white/[0.06]' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'} active:scale-90 transition-all text-[10px] lg:text-[10px] cursor-pointer select-none`}
                role="button" aria-label="بستن">
                <i className="fas fa-times"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MinimizedPlayer;
