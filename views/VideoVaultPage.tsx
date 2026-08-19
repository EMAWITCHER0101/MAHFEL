import React, { useState, useEffect, useCallback } from 'react';
import type { Video } from '../types';
import VideoCard from '../components/VideoCard';
import { toPersianDigits } from '../utils/helpers';
import { getVideoPlaylists, getVideoPlaylist } from '../services/api';

type Tab = 'videos' | 'playlists' | 'both' | 'about';

interface VideoVaultPageProps {
  videos: Video[];
  onVideoSelect: (video: Video) => void;
  user?: { name?: string; avatar?: string } | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onProfileClick?: () => void;
  onOpenSidebar?: () => void;
  onOpenSearch?: () => void;
  onPlaylistOpen?: (open: boolean) => void;
  vaultBackSignal?: number;
}

interface PL { id: string; name: string; slug: string; description: string; cover: string; count: number; order: number }
interface PLDetail { name: string; slug: string; cover: string; description: string; videos: Video[] }

const CHANNEL = {
  name: 'سیمای هنر و اندیشه',
  username: 'soha_sima',
  followers: '۴۸۲',
  following: '۶',
  videos: '۲۴۸',
  bio: 'سیما؛ سیمای هنر و اندیشه. پیگیر برنامه‌های سیمای هنر و اندیشه باشید؛ صفراهای ما در ایتا و تلگرام را دنبال کنید.',
  aparat: 'soha_sima@',
};

const VideoVaultPage: React.FC<VideoVaultPageProps> = ({ videos, onVideoSelect, user, theme, onToggleTheme, onProfileClick, onOpenSidebar, onOpenSearch, onPlaylistOpen, vaultBackSignal }) => {
  const [tab, setTab] = useState<Tab>('both');
  const [playlists, setPlaylists] = useState<PL[]>([]);
  const [playlist, setPlaylist] = useState<PLDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    const data = await getVideoPlaylists();
    setPlaylists(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadPlaylists(); }, [loadPlaylists]);

  useEffect(() => { onPlaylistOpen?.(!!playlist); }, [playlist, onPlaylistOpen]);

  useEffect(() => {
    if (vaultBackSignal) setPlaylist(null);
  }, [vaultBackSignal]);

  const openPlaylist = async (slug: string) => {
    const data = await getVideoPlaylist(slug);
    if (data) {
      setPlaylist({ name: data.name, slug: data.slug, description: data.description, cover: data.cover, videos: data.videos });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredVideos = q
    ? videos.filter(v => v.title.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q))
    : videos;
  const filteredPlaylists = q
    ? playlists.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
    : playlists;

  const isDark = theme === 'dark';

  const renderHeader = () => (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`} style={{ background: 'var(--surface)', backdropFilter: isScrolled ? 'blur(20px)' : 'none', borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            {onOpenSidebar && (
              <button onClick={onOpenSidebar} className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90" style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-bars text-sm"></i>
              </button>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
              <i className="fas fa-play text-white text-xs" />
            </div>
            <div>
              <p className="text-xs font-black leading-tight " style={{ color: 'var(--text)' }}>نگارخانه</p>
              <p className="text-[8px] font-bold " style={{ color: 'var(--text-3)' }}>سیمای هنر و اندیشه</p>
            </div>
          </div>

          <div className="flex-1">
            <div className="relative">
              <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'var(--text-3)' }} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="جستجوی ویدیو و پلی‌لیست..." className="w-full pr-9 pl-4 py-2 rounded-xl text-xs font-bold outline-none transition-all focus:ring-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'color-mix(in srgb, #ef4444 30%, transparent)' } as any} />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2"><i className="fas fa-times text-[9px]" style={{ color: 'var(--text-3)' }} /></button>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleTheme && (
              <button onClick={onToggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-[11px]`} style={{ color: 'var(--text-2)' }}></i>
              </button>
            )}
            {onProfileClick && (
              <button onClick={onProfileClick} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-xl object-cover" /> : <i className="fas fa-user text-xs" style={{ color: 'var(--text-2)' }} />}
              </button>
            )}
          </div>
        </div>

        {/* Sub tabs */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { t: 'both' as Tab, l: 'خانه', icon: 'fa-layer-group' },
            { t: 'videos' as Tab, l: 'ویدیوها', icon: 'fa-film' },
            { t: 'playlists' as Tab, l: 'پلی‌لیست‌ها', icon: 'fa-list-ul' },
            { t: 'about' as Tab, l: 'درباره ما', icon: 'fa-channel' },
          ].map(x => (
            <button key={x.t} onClick={() => { setTab(x.t); setPlaylist(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${tab === x.t ? 'text-white shadow-md' : ''}`} style={tab === x.t
              ? { background: 'linear-gradient(135deg, #ef4444, #f97316)' }
              : { background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              <i className={`fas ${x.icon} text-[10px]`} />
              {x.l}
            </button>
          ))}
        </div>
      </div>
    </header>
  );

  /* ── About page ── */
  if (tab === 'about') {
    return (
      <div className="min-h-screen bg-background pb-24" dir="rtl">
        {renderHeader()}
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-4">
          <div className="rounded-3xl overflow-hidden shadow-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="h-20 bg-gradient-to-l from-rose-500 via-orange-500 to-amber-400"></div>
            <div className="px-6 pb-5 -mt-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-xl border-2 border-white dark:border-gray-900">
                <i className="fas fa-video text-white text-lg"></i>
              </div>
              <h1 className="text-base font-black mt-2 " style={{ color: 'var(--text)' }}>{CHANNEL.name}</h1>
                    <p className="text-[10px] font-bold mt-0.5 " style={{ color: 'var(--text-3)' }}>@{CHANNEL.username}</p>

              <div className="grid grid-cols-3 gap-2.5 mt-4">
                {[{ v: CHANNEL.videos, l: 'ویدیو', icon: 'fa-film' }, { v: CHANNEL.followers, l: 'دنبال‌کننده', icon: 'fa-users' }, { v: CHANNEL.following, l: 'دنبال‌شده', icon: 'fa-user-plus' }].map((s, i) => (
                  <div key={i} className="rounded-xl py-2.5" style={{ background: 'var(--surface-2)' }}>
                    <i className={`fas ${s.icon} text-xs mb-1`} style={{ color: '#ef4444' }} />
                    <p className="text-base font-black leading-tight " style={{ color: 'var(--text)' }}>{s.v}</p>
                    <p className="text-[8px] font-bold mt-0.5 " style={{ color: 'var(--text-3)' }}>{s.l}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl p-4 text-right" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <h2 className="text-[11px] font-black mb-1.5 flex items-center gap-2 " style={{ color: 'var(--text)' }}><i className="fas fa-quote-right text-primary"></i> درباره ما</h2>
                <p className="text-[11px] leading-relaxed " style={{ color: 'var(--text-2)' }}>{CHANNEL.bio}</p>
              </div>

              </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Playlist detail ── */
  if (playlist) {
    const playlistVideos = q
      ? playlist.videos.filter(v => v.title.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q))
      : playlist.videos;
    return (
      <div className="min-h-screen bg-background pb-24" dir="rtl">
        {renderHeader()}
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <button onClick={() => setPlaylist(null)} className="mb-5 flex items-center gap-2 text-[11px] font-black px-3 py-1.5 rounded-xl transition-all active:scale-95 " style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
            <i className="fas fa-arrow-right text-[10px]"></i> <span>بازگشت به پلی‌لیست‌ها</span>
          </button>
          <div className="rounded-3xl overflow-hidden shadow-lg border mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="relative aspect-[3/1]">
              <img src={playlist.cover || ''} alt={playlist.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              <div className="absolute bottom-4 right-5">
                <h1 className="text-xl font-black text-white drop-shadow">{playlist.name}</h1>
                <p className="text-[11px] font-bold text-white/80 mt-1 font-aramesh ">{q ? `نتیجه جستجو: ${toPersianDigits(playlistVideos.length)} ویدیو` : `${toPersianDigits(playlistVideos.length)} ویدیو`}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {playlistVideos.map((v, i) => (
              <VideoCard key={v.id} video={v} onSelect={() => onVideoSelect(v)} index={i} />
            ))}
            {playlistVideos.length === 0 && (
              <div className="col-span-full text-center py-16">
                <i className="fas fa-magnifying-glass text-3xl mb-3" style={{ color: 'var(--text-3)' }} />
                <p className="text-sm font-black" style={{ color: 'var(--text)' }}>{q ? `ویدیویی با «${searchQuery.trim()}» در این پلی‌لیست نیست` : 'ویدیویی در این پلی‌لیست نیست'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Playlists grid ── */
  if (tab === 'playlists') {
    return (
      <div className="min-h-screen bg-background pb-24" dir="rtl">
        {renderHeader()}
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text)' }}><i className="fas fa-list-ul text-primary"></i> پلی‌لیست‌ها</h2>
            <span className="text-[10px] font-bold " style={{ color: 'var(--text-3)' }}>{q ? `نتیجه جستجو: ${toPersianDigits(filteredPlaylists.length)}` : toPersianDigits(playlists.length) + ' پلی‌لیست'}</span>
          </div>
          {loading && <div className="text-center py-20 text-xs " style={{ color: 'var(--text-3)' }}>در حال بارگذاری...</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {!loading && filteredPlaylists.map((p, i) => (
              <button key={p.id} onClick={() => openPlaylist(p.slug)} className="group text-right rounded-2xl overflow-hidden shadow-md transition-all hover:shadow-xl active:scale-[.98] cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="relative aspect-video">
                  <img src={p.cover} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white text-[10px] font-black">
                    <i className="fas fa-play text-[9px]"></i> <span className="font-aramesh">{toPersianDigits(p.count)} ویدیو</span>
                  </div>
                </div>
                <div className="p-3.5">
                  <h3 className="text-xs font-black line-clamp-1 group-hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>{p.name}</h3>
                </div>
              </button>
            ))}
            {!loading && filteredPlaylists.length === 0 && <div className="col-span-full text-center py-16 text-xs font-aramesh " style={{ color: 'var(--text-3)' }}>{q ? `پلی‌لیستی با «${searchQuery.trim()}» یافت نشد` : 'پلی‌لیستی یافت نشد'}</div>}
          </div>
        </div>
      </div>
    );
  }

  /* ── Combined tab (playlists strip + videos) ── */
  const isCombined = tab === 'both' || tab === 'videos';
  const topPlaylists = tab === 'both' ? filteredPlaylists : [];
  const displayedVideos = isCombined ? [...filteredVideos].reverse() : filteredVideos;
  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {renderHeader()}

      {/* Playlists strip (combined) */}
      {topPlaylists.length > 0 && (
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black flex items-center gap-2" style={{ color: 'var(--text)' }}><i className="fas fa-list-ul text-primary"></i> پلی‌لیست‌ها</h2>
            <button onClick={() => setTab('playlists')} className="text-[10px] font-black flex items-center gap-1.5 shrink-0 " style={{ color: 'var(--primary)' }}>
              مشاهده همه <i className="fas fa-chevron-left text-[9px]"></i>
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {topPlaylists.map((p) => (
              <button key={p.id} onClick={() => openPlaylist(p.slug)} className="group text-center cursor-pointer shrink-0 w-36 lg:w-44">
                <div className="relative aspect-video rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-all">
                  <img src={p.cover} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[8px] font-black">{toPersianDigits(p.count)}</span>
                </div>
                <p className="mt-1.5 text-[10px] font-black line-clamp-1" style={{ color: 'var(--text-2)' }}>{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Videos grid */}
      <div className="max-w-[1800px] mx-auto px-4 lg:px-6 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black flex items-center gap-2" style={{ color: 'var(--text)' }}><i className="fas fa-film text-primary"></i> همه ویدیوها</h2>
          <span className="text-[10px] font-bold font-aramesh " style={{ color: 'var(--text-3)' }}>{toPersianDigits(String(displayedVideos.length))} ویدیو</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedVideos.map((video, i) => (
            <VideoCard key={video.id} video={video} onSelect={() => onVideoSelect(video)} index={i} />
          ))}
          {displayedVideos.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)', border: '2px dashed var(--border)' }}>
                <i className="fas fa-film text-2xl" style={{ color: 'var(--text-3)' }} />
              </div>
              <p className="text-sm font-black mb-1" style={{ color: 'var(--text)' }}>ویدیویی یافت نشد</p>
              <p className="text-xs font-aramesh " style={{ color: 'var(--text-3)' }}>عبارت جستجو را تغییر دهید</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoVaultPage;