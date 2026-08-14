import React, { useState, useMemo } from 'react';
import type { Podcast, Author, User } from '../types';
import PodcastCard from '../components/PodcastCard';
import NewEpisodeCard from '../components/NewEpisodeCard';
import LiveBanner from '../components/LiveBanner';
import { SohaIcon } from '../components/SohaLogo';
import { toPersianDigits } from '../utils/helpers';

interface SowtPageProps {
  podcasts: Podcast[];
  authors: Author[];
  liveStream: { isLive: boolean; title: string; url: string; };
  onPodcastSelect: (podcast: Podcast) => void;
  onPlay: (podcast: Podcast, episodeIndex: number) => void;
  userInterests: string[];
  isHeaderVisible: boolean;
  onAuthorSelect: (author: Author) => void;
  userLibrary: string[];
  onToggleLibrary: (id: number) => void;
  onShare: (title: string, text: string) => void;
  onToggleSidebar?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenProfile?: () => void;
  user?: User | null;
}

const audioPodcasts = (podcasts: Podcast[]) => podcasts.filter(p => p.categories?.includes('صوت'));

const SowtPage: React.FC<SowtPageProps> = ({
  podcasts,
  authors,
  liveStream,
  onPodcastSelect,
  onPlay,
  userInterests,
  isHeaderVisible,
  onAuthorSelect,
  userLibrary,
  onToggleLibrary,
  onShare,
  onToggleSidebar,
  theme,
  onToggleTheme,
  onOpenProfile,
  user
}) => {
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const allAudio = useMemo(() => audioPodcasts(podcasts), [podcasts]);

  const years = useMemo(() => {
    const y = [...new Set(allAudio.map(p => p.year))].sort((a, b) => b - a);
    return y;
  }, [allAudio]);

  const types = useMemo(() => {
    const t = new Set<string>();
    allAudio.forEach(p => p.categories?.forEach(c => { if (c !== 'صوت') t.add(c); }));
    return ['همه', ...Array.from(t)];
  }, [allAudio]);

  const filtered = useMemo(() => {
    return allAudio.filter(p => {
      if (selectedYear && p.year !== selectedYear) return false;
      if (selectedType && selectedType !== 'همه' && !p.categories?.includes(selectedType)) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q && !p.title.toLowerCase().includes(q) && !p.categories?.some(c => c.toLowerCase().includes(q))) return false;
      return true;
    }).sort((a, b) => b.id - a.id);
  }, [allAudio, selectedYear, selectedType, searchQuery]);

  const groupedByYear = useMemo(() => {
    const groups: Record<number, Podcast[]> = {};
    filtered.forEach(p => {
      if (!groups[p.year]) groups[p.year] = [];
      groups[p.year].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => Number(b) - Number(a));
  }, [filtered]);

  const newEpisodes = useMemo(() => {
    const currentYear = Math.max(...years);
    return allAudio
      .filter(p => p.year === currentYear)
      .flatMap(p => p.episodes.map((ep, i) => ({ podcast: p, episode: ep, episodeIndex: i })))
      .slice(-12)
      .reverse();
  }, [allAudio, years]);

  return (
    <main className="pb-24 bg-background min-h-screen animate-fadeIn">
      {liveStream.isLive && !isBannerDismissed && (
        <div className="px-4 pt-4">
          <LiveBanner title={liveStream.title} url={liveStream.url} onDismiss={() => setIsBannerDismissed(true)} />
        </div>
      )}

      <header className={`sticky top-0 z-50 transition-all duration-300 ${selectedYear ? 'shadow-lg' : ''}`} style={{ background: selectedYear ? 'color-mix(in srgb, var(--surface) 95%, transparent)' : 'var(--surface)', backdropFilter: selectedYear ? 'blur(20px)' : 'none', borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onToggleSidebar} className="lg:flex hidden items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90" style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-bars text-sm"></i>
              </button>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                <i className="fas fa-headphones text-white text-xs"></i>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-black leading-tight " style={{ color: '#0d9488' }}>صوت</p>
                <p className="text-[8px] font-bold " style={{ color: '#0d9488' }}>{toPersianDigits(allAudio.length)} مجموعه صوتی</p>
              </div>
            </div>
            <div className="relative flex-1">
              <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'var(--text-3)' }} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="جستجو در مجموعه‌های صوتی..." className="w-full pr-10 pl-4 py-2.5 rounded-xl text-[10px] sm:text-sm font-bold outline-none transition-all focus:ring-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 30%, transparent)' } as any} />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2"><i className="fas fa-times text-[9px]" style={{ color: 'var(--text-3)' }} /></button>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={onToggleTheme} className="p-2.5 rounded-xl transition-all duration-300 active:scale-90" title="تغییر تم" style={{ color: 'var(--text-2)' }}><i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[14px]`}></i></button>
              <button onClick={onOpenProfile} className="rounded-xl transition-all duration-300 active:scale-90">
                {user?.avatar ? (
                  <img src={user.avatar} className="w-8 h-8 rounded-xl border-2 object-cover" style={{ borderColor: 'var(--primary)' }} alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-3)' }}>
                    <i className="fas fa-user text-sm" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

        {/* New episodes */}
        {newEpisodes.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-black mb-3 mt-4 text-gray-600 pr-2 border-r-4 border-primary ">
              تازه‌های صوتی
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {newEpisodes.map(item => (
                <div key={`${item.podcast.id}-${item.episodeIndex}`} className="flex-shrink-0 w-64">
                  <NewEpisodeCard
                    podcast={item.podcast}
                    episode={item.episode}
                    episodeIndex={item.episodeIndex}
                    onSelect={() => onPodcastSelect(item.podcast)}
                    onPlay={onPlay}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Year filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar lg:justify-center" dir="ltr">
          <button
            onClick={() => setSelectedYear(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!selectedYear ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            همه سال‌ها
          </button>
          {years.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedYear === y ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {toPersianDigits(y)}
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar" dir="ltr">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t === 'همه' ? null : t)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${(!selectedType && t === 'همه') || selectedType === t ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'}`}
            >
              {t === 'عمومی' ? 'تک‌جلسه‌ای' : t}
            </button>
          ))}
        </div>

      {/* Content */}
      <div className="px-4">
        {filtered.length > 0 ? (
          groupedByYear.map(([year, group]) => (
            <section key={year} className="mb-8">
              <h2 className="text-xs font-black mb-4 text-gray-500 pr-2 border-r-4 border-primary/60 flex items-center gap-2 ">
                <span>{toPersianDigits(Number(year))}</span>
                <span className="text-[10px] text-gray-300 font-normal ">({toPersianDigits(group.length)} مجموعه)</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {group.map(p => {
                  const author = authors.find(a => String(a.id) === String(p.speakerId));
                  return (
                    <PodcastCard
                      key={p.id}
                      podcast={p}
                      author={author}
                      isInLibrary={userLibrary.includes(String(p.id))}
                      onClick={() => onPodcastSelect(p)}
                      onAuthorSelect={onAuthorSelect}
                      onToggleLibrary={onToggleLibrary}
                      onShare={onShare}
                    />
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="text-center py-24 text-gray-300">
            <i className="fas fa-microphone-slash text-5xl mb-4 opacity-10"></i>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] ">مجموعه‌ای یافت نشد</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default SowtPage;
