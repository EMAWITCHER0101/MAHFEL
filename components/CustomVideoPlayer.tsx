
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getVideoStream } from '../services/api';
import { toPersianDigits } from '../utils/helpers';

interface Quality {
  profile: string;
  label: string;
  url: string;
  size: string;
}

interface CustomVideoPlayerProps {
  videoId: string;
  embedId: string;
  title: string;
  poster?: string;
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  isMini?: boolean;
  initialTime?: number;
}

export interface CustomVideoPlayerHandle {
  seekTo: (time: number, autoPlay?: boolean) => void;
  togglePlay: () => void;
  getCurrentTime: () => number;
  isPaused: () => boolean;
}

const CustomVideoPlayer = forwardRef<CustomVideoPlayerHandle, CustomVideoPlayerProps>(({
  videoId, title, poster, onTimeUpdate, onPlay, onPause, isMini = false, initialTime = 0,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<{ time: number; autoPlay: boolean } | null>(null);
  const seekAppliedRef = useRef(false);
  const initialTimeRef = useRef(initialTime);

  useImperativeHandle(ref, () => ({
    seekTo: (time: number, autoPlay = true) => {
      const v = videoRef.current;
      pendingSeekRef.current = { time, autoPlay };
      seekAppliedRef.current = false;
      if (v) {
        v.currentTime = time;
        if (autoPlay) v.play().catch(() => {});
      }
    },
    togglePlay: () => {
      togglePlay();
    },
    getCurrentTime: () => {
      return videoRef.current?.currentTime ?? 0;
    },
    isPaused: () => {
      return videoRef.current?.paused ?? true;
    }
  }));

  const [videoUrl, setVideoUrl] = useState('');
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showMenus, setShowMenus] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [doubleClickIndicator, setDoubleClickIndicator] = useState<'forward' | 'backward' | null>(null);

  const loadingRef = useRef(true);
  const singleClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const fmt = (sec: number) => {
    if (!sec || !isFinite(sec)) return '۰۰:۰۰';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    return toPersianDigits(h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(false);
      const data = await getVideoStream(videoId);
      if (cancelled) return;
      if (data?.defaultUrl && data.qualities?.length) {
        setQualities(data.qualities);
        const preferred = data.qualities.find(q => q.label === '480p' || q.profile === '480')
          || data.qualities.find(q => q.label === '360p' || q.profile === '360')
          || data.qualities[Math.min(2, data.qualities.length - 1)];
        setVideoUrl(preferred.url);
        setCurrentQuality(preferred.profile);

        const resumeTime = initialTimeRef.current;
        if (resumeTime > 0) {
          pendingSeekRef.current = { time: resumeTime, autoPlay: true };
          seekAppliedRef.current = false;
          initialTimeRef.current = 0;
        }
      } else { setError(true); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [videoId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tryApplyPendingSeek = () => {
      const p = pendingSeekRef.current;
      if (p && !seekAppliedRef.current) {
        seekAppliedRef.current = true;
        v.currentTime = p.time;
        if (p.autoPlay) v.play().catch(() => {});
        pendingSeekRef.current = null;
      }
    };

    const handlePlay = () => { setIsPlaying(true); onPlay?.(); };
    const handlePause = () => { setIsPlaying(false); onPause?.(); };
    const handleTimeUpdate = () => { setCurrentTime(v.currentTime); onTimeUpdate?.(v.currentTime); };
    const onLoadedMetadata = () => { setDuration(v.duration); tryApplyPendingSeek(); };
    const onLoadedData = () => tryApplyPendingSeek();
    const onCanPlay = () => tryApplyPendingSeek();
    const onProgress = () => { if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1)); };

    v.addEventListener('play', handlePlay);
    v.addEventListener('pause', handlePause);
    v.addEventListener('timeupdate', handleTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('loadeddata', onLoadedData);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('progress', onProgress);

    return () => {
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('pause', handlePause);
      v.removeEventListener('timeupdate', handleTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('loadeddata', onLoadedData);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('progress', onProgress);
    };
  }, [videoUrl, onTimeUpdate, onPlay, onPause]);

  useEffect(() => {
    if (isMini || !isPlaying) return;
    setShowControls(true);
    const timer = window.setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [isMini, isPlaying]);

  useEffect(() => {
    if (isMini) {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    } else if (initialTime > 0) {
      const v = videoRef.current;
      if (v) {
        v.currentTime = initialTime;
        v.play().catch(() => {});
      }
    }
  }, [isMini]);

  useEffect(() => {
    const close = () => setShowMenus(null);
    if (showMenus) { document.addEventListener('click', close); return () => document.removeEventListener('click', close); }
  }, [showMenus]);

  useEffect(() => {
    if (isMini) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          v.currentTime = Math.min(v.duration, v.currentTime + 10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (showHelp) { setShowHelp(false); break; }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMini, showHelp]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (loadingRef.current) return; // Don't try to play while loading
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  const seekTo = (pct: number) => { const v = videoRef.current; if (v) { v.currentTime = pct * duration; } };

  const getProgressFromEvent = (clientX: number) => {
    const bar = progressRef.current; if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    seekTo(getProgressFromEvent(e.clientX));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsSeeking(true);
    const pct = getProgressFromEvent(e.touches[0].clientX);
    setHoverProgress(pct);
    setHoverTime(pct * duration);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    const pct = getProgressFromEvent(e.touches[0].clientX);
    setHoverProgress(pct);
    setHoverTime(pct * duration);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const pct = getProgressFromEvent(e.changedTouches[0].clientX);
    seekTo(pct);
    setHoverProgress(null);
    setIsSeeking(false);
  };

  const handleProgressHover = (e: React.MouseEvent) => {
    const bar = progressRef.current; if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverProgress(pct);
    setHoverTime(pct * duration);
  };

  const changeQuality = (q: Quality) => {
    const v = videoRef.current; if (!v) return;
    const wasPlaying = !v.paused; const t = v.currentTime;
    v.src = q.url; v.currentTime = t;
    setCurrentQuality(q.profile);
    if (wasPlaying) v.play().catch(() => {});
    setShowMenus(null);
  };

  const changeSpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setPlaybackRate(s); setShowMenus(null);
  };

  const toggleFullscreen = () => {
    const c = containerRef.current; if (!c) return;
    document.fullscreenElement ? document.exitFullscreen() : c.requestFullscreen?.();
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    if (isMini) { togglePlay(); return; }
    if (singleClickTimer.current) {
      clearTimeout(singleClickTimer.current);
      singleClickTimer.current = null;
      return;
    }
    singleClickTimer.current = setTimeout(() => {
      singleClickTimer.current = null;
      togglePlay();
    }, 250);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isMini) return;
    const v = videoRef.current;
    if (!v) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightHalf = clickX > rect.width / 2;
    if (isRightHalf) {
      v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
      setDoubleClickIndicator('forward');
    } else {
      v.currentTime = Math.max(0, v.currentTime - 10);
      setDoubleClickIndicator('backward');
    }
    setTimeout(() => setDoubleClickIndicator(null), 800);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  if (error) return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <i className="fas fa-exclamation-triangle text-white/30 text-2xl" />
        </div>
        <p className="text-white/60 text-sm font-bold mb-3">امکان بارگذاری ویدیو وجود ندارد</p>
        <button onClick={() => { setError(false); setLoading(true); getVideoStream(videoId).then(d => { if (d?.defaultUrl) { setVideoUrl(d.defaultUrl); } setLoading(false); }).catch(() => setLoading(false)); }}
          className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all">
          <i className="fas fa-redo ml-1.5" /> تلاش مجدد
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full border-[3px] border-white/10 border-t-primary animate-spin" />
        <p className="text-white/50 text-xs font-bold">بارگذاری...</p>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black select-none" onClick={handleVideoClick} onDoubleClick={handleDoubleClick}>
      <video ref={videoRef} src={videoUrl} poster={poster} className="w-full h-full object-contain" preload="metadata" playsInline />

      {/* Double-click indicator */}
      {doubleClickIndicator && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none animate-fadeIn">
          <div className={`px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2`}>
            <i className={`fas ${doubleClickIndicator === 'forward' ? 'fa-forward' : 'fa-backward'} text-white text-xl`}></i>
            <span className="text-white font-black text-lg">۱۰ ثانیه</span>
          </div>
        </div>
      )}

      {/* Center play button when paused - always visible */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10"
          onClick={isMini ? (e => { e.stopPropagation(); handleVideoClick(e); }) : undefined}>
          <div className={`${isMini ? 'w-7 h-7' : 'w-[72px] h-[72px]'} rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-2xl pointer-events-none`}>
            <i className={`fas fa-play text-white ${isMini ? 'text-[10px]' : 'text-2xl'} mr-[-2px]`} />
          </div>
        </div>
      )}

      {/* Mini player progress bar at bottom */}
      {isMini && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/15 pointer-events-none z-[5]">
          <div className="h-full bg-white/25" style={{ width: `${bufPct}%`, transition: isSeeking ? 'none' : 'width 0.3s' }} />
          <div className="absolute top-0 left-0 h-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #14b8a6, #06b6d4)', transition: isSeeking ? 'none' : 'width 0.3s' }} />
        </div>
      )}

      {!isMini && (
        <div className={`absolute inset-0 transition-all duration-300 ease-out ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={e => e.stopPropagation()}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

          {/* Center pause/play button */}
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center z-10"
              onClick={e => { e.stopPropagation(); handleVideoClick(e); }}>
              <div className="w-[72px] h-[72px] rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-2xl pointer-events-none">
                <i className="fas fa-pause text-white text-2xl" />
              </div>
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-3 md:p-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); togglePlay(); }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all">
                <i className="fas fa-arrow-right text-white/80 text-xs" />
              </button>
              <h3 className="text-white text-[13px] md:text-sm font-black truncate max-w-[60vw] drop-shadow-lg">{title}</h3>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-3 md:px-4 pb-3 pt-8" onClick={e => e.stopPropagation()}>
            {/* Progress */}
            <div ref={progressRef} className="relative w-full h-1 hover:h-2 bg-white/15 rounded-full cursor-pointer mb-2.5 group/prog transition-all"
              style={{ direction: 'ltr' }}
              onClick={handleProgressClick}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              onMouseMove={handleProgressHover} onMouseLeave={() => setHoverProgress(null)}>
              <div className="absolute h-full bg-white/20 rounded-full" style={{ width: `${bufPct}%`, transition: isSeeking ? 'none' : 'width 0.3s' }} />
              <div className="absolute h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #14b8a6, #06b6d4)', transition: isSeeking ? 'none' : 'width 0.3s' }} />
              {hoverProgress !== null && (
                <div className="absolute -top-8 px-1.5 py-0.5 rounded-md bg-gray-900/90 text-[10px] text-white font-mono font-bold pointer-events-none whitespace-nowrap"
                  style={{ left: `calc(${hoverProgress * 100}% - 20px)` }}>
                  {fmt(hoverTime)}
                </div>
              )}
              <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-lg opacity-0 group-hover/prog:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${pct}% - 7px)`, background: '#14b8a6', boxShadow: '0 0 10px rgba(20, 184, 166, 0.5)' }} />
            </div>

            <div className="flex items-center justify-between">
              {/* Right side: play, volume, time */}
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); togglePlay(); }}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-all">
                  <i className={`${isPlaying ? 'fas fa-pause' : 'fas fa-play'} text-white text-sm ${!isPlaying ? 'mr-[-2px]' : ''}`} />
                </button>
                <div className="flex items-center gap-1 group/vol">
                  <button onClick={e => { e.stopPropagation(); setIsMuted(!isMuted); if (videoRef.current) videoRef.current.volume = isMuted ? (volume || 1) : 0; }}
                    className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-all">
                    <i className={`fas ${isMuted ? 'fa-volume-xmark' : volume < 0.5 ? 'fa-volume-low' : 'fa-volume-high'} text-white/70 text-[11px]`} />
                  </button>
                  <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200">
                    <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                      onChange={e => { const v = parseFloat(e.target.value); setVolume(v); if (videoRef.current) videoRef.current.volume = v; setIsMuted(v === 0); }}
                      onClick={e => e.stopPropagation()}
                      className="w-full h-1 cursor-pointer" style={{ accentColor: '#14b8a6' }} />
                  </div>
                </div>
                <span className="text-white/50 text-[11px] font-mono font-bold tracking-tight">
                  {fmt(currentTime)} <span className="text-white/25 mx-0.5">/</span> {fmt(duration)}
                </span>
              </div>

              {/* Left side: quality, speed, help, fullscreen */}
              <div className="flex items-center gap-1.5">
                <button onClick={e => { e.stopPropagation(); setShowHelp(!showHelp); }}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white/70 text-[10px] font-bold"
                  title="میانبرها">
                  ?
                </button>
                {qualities.length > 1 && (
                  <div className="relative">
                    <button onClick={e => { e.stopPropagation(); setShowMenus(showMenus === 'quality' ? null : 'quality'); }}
                      className="h-7 px-2.5 rounded-lg text-[10px] font-black text-white/90 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all border border-white/10">
                      {currentQuality} <i className="fas fa-chevron-down text-[7px] mr-0.5 opacity-60" />
                    </button>
                    {showMenus === 'quality' && (
                      <div className="absolute bottom-full left-0 mb-1.5 bg-gray-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden min-w-[140px] shadow-2xl z-50 animate-fadeIn"
                        onClick={e => e.stopPropagation()}>
                        <div className="px-3 py-2 border-b border-white/5"><span className="text-[9px] font-black text-white/40 uppercase tracking-wider">کیفیت</span></div>
                        {qualities.map(q => (
                          <button key={q.profile} onClick={() => changeQuality(q)}
                            className={`w-full px-3 py-2.5 text-xs font-bold text-right flex items-center justify-between transition-all ${
                              currentQuality === q.profile ? 'bg-[#14b8a6]/15 text-[#14b8a6]' : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                            }`}>
                            <span>{q.label}</span>
                            {currentQuality === q.profile && <i className="fas fa-check text-[10px]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="relative">
                  <button onClick={e => { e.stopPropagation(); setShowMenus(showMenus === 'speed' ? null : 'speed'); }}
                    className="h-7 px-2.5 rounded-lg text-[10px] font-black text-white/90 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all border border-white/10">
                    {playbackRate === 1 ? 'عادی' : `${playbackRate}x`}
                  </button>
                  {showMenus === 'speed' && (
                    <div className="absolute bottom-full left-0 mb-1.5 bg-gray-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden min-w-[110px] shadow-2xl z-50 animate-fadeIn"
                      onClick={e => e.stopPropagation()}>
                      <div className="px-3 py-2 border-b border-white/5"><span className="text-[9px] font-black text-white/40 uppercase tracking-wider">سرعت</span></div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                        <button key={s} onClick={() => changeSpeed(s)}
                          className={`w-full px-3 py-2.5 text-xs font-bold text-right flex items-center justify-between transition-all ${
                            playbackRate === s ? 'bg-[#14b8a6]/15 text-[#14b8a6]' : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                          }`}>
                          <span>{s === 1 ? 'عادی' : `${s}x`}</span>
                          {playbackRate === s && <i className="fas fa-check text-[10px]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all">
                  <i className="fas fa-expand text-white/70 text-xs" />
                </button>
              </div>
            </div>
          </div>

          {/* Help Overlay */}
          {showHelp && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={e => { e.stopPropagation(); setShowHelp(false); }}>
              <div className="bg-gray-950/95 rounded-2xl border border-white/10 p-5 mx-4 max-w-[280px] w-full shadow-2xl animate-fadeIn"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white text-sm font-bold">میانبرهای کیبورد</h4>
                  <button onClick={() => setShowHelp(false)} className="text-white/40 hover:text-white/80 transition-colors">
                    <i className="fas fa-times text-xs" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {[
                    { key: 'Space', label: 'پخش / توقف' },
                    { key: '←', label: '۱۰ ثانیه عقب' },
                    { key: '→', label: '۱۰ ثانیه جلو' },
                    { key: 'F', label: 'تمام صفحه' },
                    { key: 'Esc', label: 'بازگشت' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">{item.label}</span>
                      <kbd className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-white/80 bg-white/10 border border-white/10">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default CustomVideoPlayer;
