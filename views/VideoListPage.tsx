
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Video, Comment } from '../types';
import VideoCard from '../components/VideoCard';
import { toPersianDigits, formatTime } from '../utils/helpers';
import InstantView from '../components/InstantView';

interface VideoListPageProps {
  videos: Video[];
  initialVideoToPlay: Video | null;
  onVideoPlayed: () => void;
  isHeaderVisible: boolean;
  onVideoSelect: (video: Video) => void;
  activeVideo: Video | null;
  isPlayerInline: boolean;
  allVideos: Video[];
  comments: Comment[];
  onAddComment: (text: string, video: Video, videoTimestamp?: number, parentId?: string, audioTimestamp?: number) => void;
  onEnterStandalone: () => void;
  onShowInstantView: (title: string, content: string) => void;
  userLibrary: string[];
  onToggleLibrary: (id: string) => void;
  onShare: (title: string, text: string) => void;
  onOpenSearch?: () => void;
  onOpenSidebar?: () => void;
  onProfileClick?: () => void;
  user?: { name?: string; avatar?: string } | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const VideoListPage: React.FC<VideoListPageProps> = ({ 
  videos, 
  initialVideoToPlay, 
  onVideoPlayed, 
  isHeaderVisible, 
  onVideoSelect,
  activeVideo,
  isPlayerInline,
  allVideos,
  comments,
  onAddComment,
  onEnterStandalone,
  onShowInstantView,
  userLibrary,
  onToggleLibrary,
  onShare,
  onOpenSearch,
  onOpenSidebar,
  onProfileClick,
  user,
  theme,
  onToggleTheme,
}) => {
  const [activePlayerTab, setActivePlayerTab] = useState<'details' | 'comments' | 'upNext'>('details');
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 80); };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    if (initialVideoToPlay) {
      onVideoSelect(initialVideoToPlay);
      onVideoPlayed();
    }
  }, [initialVideoToPlay, onVideoPlayed, onVideoSelect]);

  const handleVideoCardSelect = (video: Video) => {
    onVideoSelect(video);
    setActivePlayerTab('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  if (isPlayerInline && activeVideo) {
      const relatedVideos = allVideos.filter(v => v.id !== activeVideo.id).slice(0, 12);
      const videoSrc = `https://www.aparat.com/video/video/embed/videohash/${activeVideo.embedId}/vt/frame?autoplay=true&recom=none&titleShow=true`;
      const isInLibrary = userLibrary.includes(activeVideo.id);

      return (
        <div className="bg-gray-900 text-white min-h-screen">
            <div className="w-full aspect-video bg-black sticky top-0 z-40 border-b border-white/5 shadow-2xl">
                 <iframe key={activeVideo.id} src={videoSrc} title={activeVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen={true} className="w-full h-full border-0" />
            </div>

            <div className="bg-gray-900 relative">
                <div className="p-4 pb-2 text-right">
                  <h1 className="text-base font-black leading-tight mb-3 text-gray-100 ">{activeVideo.title}</h1>
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <div className="flex items-center gap-5 text-lg">
                      <button onClick={() => onToggleLibrary(activeVideo.id)} className={`transition-colors ${isInLibrary ? 'text-primary' : 'hover:text-primary'}`}>
                          <i className={`${isInLibrary ? 'fas' : 'far'} fa-bookmark`}></i>
                      </button>
                      <button onClick={() => onShare(activeVideo.title, activeVideo.description)} className="hover:text-primary">
                          <i className="fas fa-share-alt"></i>
                      </button>
                    </div>
                    <span className="">{toPersianDigits(activeVideo.viewCount)} بازدید • {activeVideo.uploadDate}</span>
                  </div>
                </div>
                
                <div className="border-y border-gray-800 bg-gray-900 mt-2 sticky top-[56.25vw] z-30 backdrop-blur-md">
                    <div className="flex items-center justify-around px-2">
                        <button onClick={() => setActivePlayerTab('details')} className={`flex-1 py-3 text-xs font-black text-center border-b-2  ${activePlayerTab === 'details' ? 'text-primary border-primary' : 'text-gray-500 border-transparent'}`}>توضیحات</button>
                        <button onClick={() => setActivePlayerTab('comments')} className={`flex-1 py-3 text-xs font-black text-center border-b-2  ${activePlayerTab === 'comments' ? 'text-primary border-primary' : 'text-gray-500 border-transparent'}`}>{`نظرات (${toPersianDigits(comments.length)})`}</button>
                        <button onClick={() => setActivePlayerTab('upNext')} className={`flex-1 py-3 text-xs font-black text-center border-b-2  ${activePlayerTab === 'upNext' ? 'text-primary border-primary' : 'text-gray-500 border-transparent'}`}>مرتبط</button>
                    </div>
                </div>

                <div className="bg-gray-900 pb-24">
                    {activePlayerTab === 'details' && (
                        <div className="p-4 text-sm text-gray-300 leading-loose text-justify bg-gray-800/30 m-4 rounded-3xl border border-gray-800 animate-fadeIn text-right">
                            <p className="line-clamp-6 ">{activeVideo.description || 'توضیحاتی برای این ویدیو وجود ندارد.'}</p>
                            <button onClick={() => onShowInstantView(activeVideo.title, activeVideo.fullText || activeVideo.description)} className="w-full mt-4 bg-primary/10 text-primary py-3 rounded-2xl font-black text-xs border border-primary/20 flex items-center justify-center gap-2 "><i className="fas fa-align-justify"></i> مطالعه متن کامل</button>
                        </div>
                    )}
                    {activePlayerTab === 'comments' && (
                        <div className="p-4 space-y-4 animate-fadeIn">
                            <button 
                                onClick={() => onAddComment('', activeVideo)}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-right text-xs text-gray-400 font-black flex items-center justify-between group active:scale-95 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-comment-dots text-primary"></i>
                                    <span className="">نوشتن یادداشت یا پرسش...</span>
                                </div>
                                <i className="fas fa-arrow-left opacity-0 group-hover:opacity-100 transition-opacity"></i>
                            </button>
                            {comments.map(c => (
                                <div key={c.id} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/5 flex-row-reverse">
                                    <div className="w-10 h-10 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white font-black">{c.author.charAt(0)}</div>
                                    <div className="text-gray-200 flex-1 min-w-0 text-right">
                                        <div className="flex justify-between mb-1 flex-row-reverse"><span className="font-bold text-sm text-primary-light ">{c.author}</span><span className="text-[10px] text-gray-500">{c.date}</span></div>
                                        <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap ">
                                             {c.text.length > 250 ? (
                                                <>
                                                    {c.text.substring(0, 250)}...
                                                    <button onClick={() => onShowInstantView(`${c.author}`, c.text)} className="text-primary font-black text-xs block mt-1 hover:underline ">مطالعه کامل</button>
                                                </>
                                            ) : c.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activePlayerTab === 'upNext' && (
                        <div className="p-4 space-y-3 animate-fadeIn text-right">
                            {relatedVideos.map(nextVideo => (
                                <div key={nextVideo.id} onClick={() => handleVideoCardSelect(nextVideo)} className="bg-gray-800/40 p-2 rounded-2xl border border-white/5 flex gap-4 items-center cursor-pointer hover:bg-gray-800 transition-colors flex-row-reverse">
                                    <img src={nextVideo.thumbnailUrl} className="w-24 h-16 rounded-xl object-cover shadow-md" alt={nextVideo.title} />
                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-bold text-xs text-gray-100 line-clamp-2 leading-snug ">{nextVideo.title}</h5>
                                        <p className="text-[10px] text-gray-400 mt-1 ">{toPersianDigits(nextVideo.viewCount)} بازدید</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  const filteredVideos = searchQuery.trim()
    ? videos.filter(v => v.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) || (v.description || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : videos;

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ VIDEO LIST HEADER ═══ */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`} style={{ background: isScrolled ? 'color-mix(in srgb, var(--surface) 95%, transparent)' : 'var(--surface)', backdropFilter: isScrolled ? 'blur(20px)' : 'none', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Right: Brand + Title */}
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={onOpenSidebar} className="lg:flex hidden items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90" style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-bars text-sm"></i>
              </button>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                <i className="fas fa-play text-white text-xs" />
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-black leading-tight " style={{ color: 'var(--text)' }}>ویدیوها</p>
                <p className="text-[8px] font-bold " style={{ color: 'var(--text-3)' }}>{toPersianDigits(String(filteredVideos.length))} ویدیو</p>
              </div>
            </div>

            {/* Center: Search */}
            <div className="flex-1">
              <div className="relative">
                <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'var(--text-3)' }} />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="جستجوی ویدیو..." className="w-full pr-9 pl-4 py-2 rounded-xl text-xs font-bold outline-none transition-all focus:ring-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'color-mix(in srgb, #ef4444 30%, transparent)' } as any} />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2"><i className="fas fa-times text-[9px]" style={{ color: 'var(--text-3)' }} /></button>}
              </div>
            </div>

            {/* Left: Profile */}
            <div className="flex items-center gap-2 shrink-0">
              {onToggleTheme && (
                <button onClick={onToggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[11px]`} style={{ color: 'var(--text-2)' }}></i>
                </button>
              )}
              {onProfileClick && (
                <button onClick={onProfileClick} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <i className="fas fa-user text-xs" style={{ color: 'var(--text-2)' }} />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ VIDEO GRID ═══ */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-24 max-w-[1920px] mx-auto">
        {filteredVideos.map(video => (
          <VideoCard 
            key={video.id} 
            video={video} 
            onSelect={() => handleVideoCardSelect(video)} 
          />
        ))}
        {filteredVideos.length === 0 && (
          <div className="col-span-full text-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)', border: '2px dashed var(--border)' }}>
              <i className="fas fa-film text-2xl" style={{ color: 'var(--text-3)' }} />
            </div>
            <p className="text-sm font-black mb-1 " style={{ color: 'var(--text)' }}>ویدیویی یافت نشد</p>
            <p className="text-xs " style={{ color: 'var(--text-3)' }}>عبارت جستجو را تغییر دهید</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoListPage;
