import React, { useMemo, useState } from 'react';
import type { Video, Podcast, Author, User, PublishedBook, Post } from '../types';
import { toPersianDigits, formatTime, DEFAULT_COVER } from '../utils/helpers';
import { getAlbums, createAlbum, updateAlbum, deleteAlbum } from '../services/api';
import ConfirmToast from '../components/ConfirmToast';

interface LibraryPageProps {
  savedVideoIds: string[];
  allVideos: Video[];
  onPlayVideo: (video: Video) => void;
  onRemoveVideo: (id: string) => void;
  savedPodcastIds?: string[];
  savedEpisodes?: { podcastId: string; episodeIndex: number }[];
  allPodcasts?: Podcast[];
  authors?: Author[];
  onPlayPodcast?: (podcast: Podcast, episodeIndex: number) => void;
  onSelectPodcast?: (podcast: Podcast) => void;
  onRemovePodcast?: (podcast: Podcast) => void;
  onRemoveEpisode?: (podcastId: string, episodeIndex: number) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  user?: User | null;
  onOpenProfile?: () => void;
  onOpenSearch?: () => void;
  onToggleSidebar?: () => void;
  albums?: { mine: any[]; shared: any[] };
  onAlbumsChange?: (a: { mine: any[]; shared: any[] }) => void;
  queue?: any[];
  queueAuto?: boolean;
  onQueueAutoToggle?: (v: boolean) => void;
  onPlayQueueItem?: (item: any) => void;
  onRemoveQueueItem?: (index: number) => void;
  onClearQueue?: () => void;
  onPlayAlbum?: (album: any) => void;
  onOpenAlbum?: (album: any) => void;
  onAlbumSaved?: (albumId: string, items: any[]) => void;
  notes?: any[];
  bookmarks?: any[];
  onRemoveBookmark?: (bookId: string, text: string) => void;
  onToggleSaveNote?: (note: any) => void;
  posts?: Post[];
  savedPostIds?: string[];
  onOpenPost?: (post: Post) => void;
  publishedBooks?: PublishedBook[];
  onShowBook?: (book: PublishedBook) => void;
  savedNoteIds?: (string | number)[];
  onUpdateNote?: (id: string, data: { title: string; content: string; isDraft?: boolean }) => Promise<PublishedBook | null>;
  onDeleteNote?: (id: string) => Promise<boolean>;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ savedVideoIds, allVideos, onPlayVideo, onRemoveVideo, savedPodcastIds = [], savedEpisodes = [], allPodcasts = [], authors = [], onPlayPodcast, onSelectPodcast, onRemovePodcast, onRemoveEpisode, theme, onToggleTheme, user, onOpenProfile, onOpenSearch, onToggleSidebar, albums = { mine: [], shared: [] }, onAlbumsChange, queue = [], queueAuto = true, onQueueAutoToggle, onPlayQueueItem, onRemoveQueueItem, onClearQueue, onPlayAlbum, onOpenAlbum, onAlbumSaved, notes = [], bookmarks = [], onRemoveBookmark, onToggleSaveNote, posts = [], savedPostIds = [], onOpenPost, publishedBooks = [], onShowBook, savedNoteIds = [], onUpdateNote, onDeleteNote }) => {
  const [noteEditor, setNoteEditor] = useState<{ note: any } | null>(null);
  const [noteEditTitle, setNoteEditTitle] = useState('');
  const [noteEditContent, setNoteEditContent] = useState('');
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<any | null>(null);

  const openNoteEditor = (n: any) => {
    setNoteEditor({ note: n });
    setNoteEditTitle(String(n.title || ''));
    setNoteEditContent(String(n.contentHtml || n.description || ''));
  };
  const savedVideos = useMemo(() =>
    allVideos.filter(v => savedVideoIds.some(id => String(id) === String(v.id) || String(id) === String((v as any)._id))),
    [allVideos, savedVideoIds]
  );

  const savedPodcasts = useMemo(() =>
    allPodcasts.filter(p => savedPodcastIds.includes(String(p.id || (p as any)._id))),
    [allPodcasts, savedPodcastIds]
  );

  const savedEpisodeItems = useMemo(() => {
    return savedEpisodes.map(se => {
      const podcast = allPodcasts.find(p => String(p.id || (p as any)._id) === String(se.podcastId));
      if (!podcast || !podcast.episodes[se.episodeIndex]) return null;
      return { podcast, episode: podcast.episodes[se.episodeIndex], episodeIndex: se.episodeIndex, podcastId: se.podcastId };
    }).filter(Boolean) as { podcast: Podcast; episode: any; episodeIndex: number; podcastId: string }[];
  }, [savedEpisodes, allPodcasts]);

  const savedPostItems = useMemo(() => {
    return posts.filter(p => savedPostIds.some(id => String(id) === String((p as any).id || (p as any)._id)));
  }, [posts, savedPostIds]);

  const savedNoteItems = useMemo(() => {
    return publishedBooks.filter(b => savedNoteIds.some(id => String(id) === String((b as any).id || (b as any)._id)));
  }, [publishedBooks, savedNoteIds]);

  const myPublicNotes = useMemo(() => notes.filter((n: any) => !n.isDraft), [notes]);
  const myDraftNotes = useMemo(() => notes.filter((n: any) => n.isDraft), [notes]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<any | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumType, setNewAlbumType] = useState<'audio' | 'video'>('audio');
  const [albumItems, setAlbumItems] = useState<any[]>([]);
  const [pickerMode, setPickerMode] = useState<null | 'audio' | 'video' | 'note'>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [openPickerPodcast, setOpenPickerPodcast] = useState<string | null>(null);
  const [albumBusy, setAlbumBusy] = useState(false);

  const totalSaved = savedVideos.length + savedPodcasts.length + savedEpisodeItems.length + savedPostItems.length + savedNoteItems.length;

  const q = searchQuery.trim().toLowerCase();
  const filteredPodcasts = useMemo(() =>
    q ? savedPodcasts.filter(p => p.title.toLowerCase().includes(q)) : savedPodcasts,
    [savedPodcasts, q]
  );
  const filteredEpisodes = useMemo(() =>
    q ? savedEpisodeItems.filter(item => item.episode.title.toLowerCase().includes(q) || item.podcast.title.toLowerCase().includes(q)) : savedEpisodeItems,
    [savedEpisodeItems, q]
  );
  const filteredVideos = useMemo(() =>
    q ? savedVideos.filter(v => v.title.toLowerCase().includes(q)) : savedVideos,
    [savedVideos, q]
  );

  const refreshAlbums = async () => {
    const d = await getAlbums();
    if (d && onAlbumsChange) onAlbumsChange(d);
  };

  const openCreateAlbum = () => {
    setEditingAlbum(null);
    setNewAlbumTitle('');
    setNewAlbumType('audio');
    setAlbumItems([]);
    setPickerMode(null);
    setShowCreateAlbum(true);
  };

  const openEditAlbum = (album: any) => {
    setEditingAlbum(album);
    setNewAlbumTitle(String(album.title || ''));
    setNewAlbumType(album.type === 'video' ? 'video' : 'audio');
    setAlbumItems((album.items || []).map((it: any) => ({ ...it })));
    setPickerMode(null);
    setShowCreateAlbum(true);
  };

  const handleSaveAlbum = async () => {
    if (!newAlbumTitle.trim()) return;
    setAlbumBusy(true);
    try {
      const payload = { type: newAlbumType, title: newAlbumTitle.trim(), items: albumItems };
      const saved = editingAlbum
        ? await updateAlbum(String(editingAlbum._id || editingAlbum.id), payload)
        : await createAlbum(payload);
      if (saved) {
        if (editingAlbum) onAlbumSaved?.(String(editingAlbum._id || editingAlbum.id), albumItems);
        setShowCreateAlbum(false);
        setEditingAlbum(null);
        setNewAlbumTitle('');
        setAlbumItems([]);
        await refreshAlbums();
      }
    } catch {}
    setAlbumBusy(false);
  };

  const handleToggleShare = async (album: any) => {
    await updateAlbum(String(album._id || album.id), { shared: !album.shared });
    await refreshAlbums();
  };

  const handleDeleteAlbum = async (album: any) => {
    await deleteAlbum(String(album._id || album.id));
    await refreshAlbums();
  };

  const addAudioItem = (podcastId: string, episodeIndex: number) => {
    const podcast = allPodcasts.find(p => String(p.id || (p as any)._id) === podcastId);
    const ep = podcast?.episodes[episodeIndex];
    if (!podcast || !ep) return;
    setAlbumItems(prev => [...prev, { podcastId, episodeIndex, title: ep.title, cover: ep.cover || podcast.cover || '' }]);
    setPickerMode(null);
  };

  const addVideoItem = (video: Video) => {
    setAlbumItems(prev => [...prev, { videoId: String(video.id || (video as any)._id), title: video.title, cover: video.thumbnailUrl || '' }]);
    setPickerMode(null);
  };

  const addNoteItem = (note: any) => {
    setAlbumItems(prev => [...prev, { noteId: String(note.id || (note as any)._id), title: String(note.title || 'بدون عنوان'), content: String(note.content || note.contentHtml || note.description || '').replace(/<[^>]*>/g, ''), cover: '' }]);
    setPickerMode(null);
  };

  const addAudioPlaylist = (podcastId: string) => {
    const podcast = allPodcasts.find(p => String(p.id || (p as any)._id) === podcastId);
    if (!podcast) return;
    const items = (podcast.episodes || []).map((ep, idx) => ({ podcastId, episodeIndex: idx, title: ep.title, cover: ep.cover || podcast.cover || '' }));
    setAlbumItems(prev => [...prev, ...items]);
    setPickerMode(null);
  };

  const itemKey = (it: any, i: number) => `${it.noteId || it.videoId || it.podcastId}-${it.episodeIndex ?? ''}-${i}`;

  const queueIcon = (item: any) => item.type === 'video' ? 'fa-video' : 'fa-headphones';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--surface)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-6 pt-5 pb-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onToggleSidebar} className="lg:flex hidden items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90" style={{ color: 'var(--text-3)' }}>
            <i className="fas fa-bars text-sm"></i>
          </button>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
            <i className="fas fa-bookmark text-sm" style={{ color: 'var(--primary)' }} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-extrabold" style={{ color: 'var(--text)' }}>کتابخانه من</h1>
            <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              {toPersianDigits(totalSaved)} مورد ذخیره شده
            </p>
          </div>
        </div>
        <div className="relative flex-1">
          <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'var(--text-3)' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="جستجو در کتابخانه..." className="w-full pr-10 pl-4 py-2 rounded-xl text-[10px] sm:text-sm font-bold outline-none transition-all focus:ring-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 30%, transparent)' } as any} />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2"><i className="fas fa-times text-[9px]" style={{ color: 'var(--text-3)' }} /></button>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onToggleTheme && (
            <button onClick={onToggleTheme} className="p-2.5 rounded-xl transition-all duration-300 active:scale-90" title="تغییر تم" style={{ color: 'var(--text-2)' }}>
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[14px]`}></i>
            </button>
          )}
          {onOpenProfile && (
            <button onClick={onOpenProfile} className="rounded-xl transition-all duration-300 active:scale-90">
              {user?.avatar ? (
                <img src={user.avatar} className="w-8 h-8 rounded-xl border-2 object-cover" style={{ borderColor: 'var(--primary)' }} alt="profile" />
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-3)' }}>
                  <i className="fas fa-user text-sm" />
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {totalSaved === 0 && queue.length === 0 && albums.mine.length === 0 && albums.shared.length === 0 && (
        <div className="text-center py-10 px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), color-mix(in srgb, var(--secondary) 5%, transparent))' }}>
            <i className="fas fa-bookmark text-2xl" style={{ color: 'var(--text-3)', opacity: 0.3 }} />
          </div>
          <p className="text-sm font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>هنوز چیزی ذخیره نکردی</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)', opacity: 0.7 }}>
            روی آیکون بوکمارک در صفحه ویدیو یا پادکست کلیک کن تا ذخیره بشه
          </p>
        </div>
      )}
      <div className="px-4 space-y-6">

          {/* صف پخش */}
          {queue.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-list-ol text-xs" style={{ color: 'var(--primary)' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>صف پخش ({toPersianDigits(queue.length)})</h2>
                <div className="flex items-center gap-1 mr-auto">
                  <button onClick={() => onQueueAutoToggle?.(!queueAuto)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black transition-all ${queueAuto ? '' : 'opacity-60'}`}
                    style={{ background: queueAuto ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'var(--surface-2)', color: queueAuto ? 'var(--primary)' : 'var(--text-3)', border: '1px solid var(--border)' }}>
                    <i className="fas fa-forward text-[8px]"></i>
                    {queueAuto ? 'پخش خودکار بعدی' : 'پخش خودکار خاموش'}
                  </button>
                  <button onClick={() => onClearQueue?.()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black transition-all"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                    <i className="fas fa-trash text-[8px]"></i>
                    خالی کردن
                  </button>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {queue.map((item, i) => (
                  <div key={itemKey(item, i)} className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: i < queue.length - 1 ? '1px solid color-mix(in srgb, var(--border) 40%, transparent)' : 'none' }}>
                    <span className="w-5 text-center text-[9px] font-black flex-shrink-0" style={{ color: 'var(--text-3)' }}>{toPersianDigits(i + 1)}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}>
                      <i className={`fas ${queueIcon(item)} text-[10px]`}></i>
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text)' }}>{item.title || 'بدون عنوان'}</p>
                    </div>
                    <button onClick={() => onPlayQueueItem?.(item)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all" title="پخش"
                      style={{ background: 'var(--primary)', color: 'white' }}>
                      <i className="fas fa-play text-[9px] mr-[-1px]"></i>
                    </button>
                    <button onClick={() => onRemoveQueueItem?.(i)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all" title="حذف از صف"
                      style={{ color: 'var(--text-3)' }}>
                      <i className="fas fa-times text-[9px]"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* بوم شخصی */}
          {(albums.mine.length > 0 || true) && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-palette text-xs" style={{ color: '#14b8a6' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>بوم شخصی ({toPersianDigits(albums.mine.length)})</h2>
                <button onClick={() => setShowCreateAlbum(true)}
                  className="flex items-center gap-1 mr-auto px-2.5 py-1.5 rounded-xl text-[9px] font-black transition-all active:scale-95 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: 'white' }}>
                  <i className="fas fa-plus text-[8px]"></i>
                  آلبوم جدید
                </button>
              </div>
              {albums.mine.length === 0 ? (
                <div className="rounded-2xl px-4 py-6 text-center" style={{ background: 'color-mix(in srgb, #14b8a6 5%, var(--surface-2))', border: '1px dashed color-mix(in srgb, #14b8a6 35%, var(--border))' }}>
                  <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--text-2)' }}>بوم شخصی تو هنوز خالیه</p>
                  <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                    از جلسات سها و ویدیوهای سیما آلبوم صوتی/ویدیویی بساز و با اعضای محفل به اشتراک بذار
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {albums.mine.map((album) => {
                    const cover = album.cover || album.items?.[0]?.cover || DEFAULT_COVER;
                    return (
                      <div key={String(album._id || album.id)}
                        className="group rounded-2xl p-3 transition-all duration-300 hover:shadow-lg cursor-pointer"
                        style={{ background: 'color-mix(in srgb, #14b8a6 4%, var(--surface-2))', border: '1px solid color-mix(in srgb, #14b8a6 14%, var(--border))' }}
                        onClick={() => onOpenAlbum?.(album)}>
                        <div className="flex gap-3">
                          <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 relative">
                            <img src={cover} alt={String(album.title)} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded-md text-[7px] font-black text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>
                              <i className={`fas ${album.type === 'video' ? 'fa-video' : 'fa-music'} text-[6px] ml-0.5`} />
                              {toPersianDigits(album.items?.length || 0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-[12px] font-black truncate flex-1" style={{ color: 'var(--text)' }}>{String(album.title)}</h4>
                              {album.shared && <span className="px-1.5 py-0.5 rounded-md text-[7px] font-black" style={{ background: 'color-mix(in srgb, #10b981 15%, transparent)', color: '#10b981' }}>مشترک</span>}
                            </div>
                            <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>{album.type === 'video' ? 'آلبوم ویدیویی' : 'آلبوم صوتی'} · {toPersianDigits(album.items?.length || 0)} قطعه</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <button onClick={(e) => { e.stopPropagation(); onPlayAlbum?.(album); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black active:scale-95 transition-all text-white"
                                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                                <i className="fas fa-play text-[8px] mr-[-1px]"></i>
                                پخش
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleToggleShare(album); }} title="اشتراک با اعضا"
                                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                                style={{ background: album.shared ? 'color-mix(in srgb, #10b981 15%, transparent)' : 'var(--surface-3)', color: album.shared ? '#10b981' : 'var(--text-3)' }}>
                                <i className="fas fa-share-alt text-[9px]"></i>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openEditAlbum(album); }} title="ویرایش آلبوم"
                                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                                style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                                <i className="fas fa-pen text-[9px]"></i>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album); }} title="حذف آلبوم"
                                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                                style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                                <i className="fas fa-trash text-[9px]"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* آلبوم‌های اشتراکی */}
          {albums.shared.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-users text-xs" style={{ color: '#10b981' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>آلبوم‌های اشتراکی اعضا ({toPersianDigits(albums.shared.length)})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {albums.shared.map((album) => {
                  const cover = album.cover || album.items?.[0]?.cover || DEFAULT_COVER;
                  return (
                    <div key={String(album._id || album.id)}
                      className="group rounded-2xl p-3 transition-all duration-300 hover:shadow-lg cursor-pointer"
                      style={{ background: 'var(--surface-2)', border: '1px solid color-mix(in srgb, #10b981 14%, var(--border))' }}
                      onClick={() => onOpenAlbum?.(album)}>
                      <div className="flex gap-3">
                        <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 relative">
                          <img src={cover} alt={String(album.title)} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded-md text-[7px] font-black text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>
                            <i className={`fas ${album.type === 'video' ? 'fa-video' : 'fa-music'} text-[6px] ml-0.5`} />
                            {toPersianDigits(album.items?.length || 0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[12px] font-black truncate" style={{ color: 'var(--text)' }}>{String(album.title)}</h4>
                          <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>
                            {String((album as any).userName || 'عضو محفل')} · {album.type === 'video' ? 'آلبوم ویدیویی' : 'آلبوم صوتی'}
                          </p>
                          <button onClick={(e) => { e.stopPropagation(); onPlayAlbum?.(album); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black active:scale-95 transition-all mt-2 text-white"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <i className="fas fa-play text-[8px] mr-[-1px]"></i>
                            پخش
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* پست‌های ذخیره‌شده */}
          {savedPostItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-comment-dots text-xs" style={{ color: '#f59e0b' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>پست‌های محفل ({toPersianDigits(savedPostItems.length)})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedPostItems.map((p) => (
                  <div key={String((p as any).id || (p as any)._id)}
                    className="group p-3 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                    style={{ background: 'color-mix(in srgb, #f59e0b 4%, var(--surface-2))', border: '1px solid color-mix(in srgb, #f59e0b 14%, var(--border))' }}
                    onClick={() => onOpenPost?.(p)}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {p.authorAvatarUrl ? <img src={p.authorAvatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" /> : <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px]" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}><i className="fas fa-user"></i></div>}
                      <span className="text-[10px] font-black" style={{ color: 'var(--text-2)' }}>{p.author}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: 'var(--text)' }}>{p.text || '(بدون متن)'}</p>
                    <p className="text-[9px] mt-1.5 font-bold" style={{ color: 'var(--primary)' }}>مشاهده در محفل <i className="fas fa-chevron-left text-[7px] mr-1"></i></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* یادداشت‌های ذخیره‌شده */}
          {savedNoteItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-book text-xs" style={{ color: 'var(--primary)' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>یادداشت‌ها ({toPersianDigits(savedNoteItems.length)})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedNoteItems.map((b) => (
                  <div key={String((b as any).id || (b as any)._id)}
                    className="group flex gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    onClick={() => onShowBook?.(b)}>
                    <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                      {b.cover ? <img src={b.cover} className="w-full h-full object-cover" alt="" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-book text-white/30"></i></div>}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-[12px] font-black line-clamp-2" style={{ color: 'var(--text)' }}>{b.title}</h4>
                      {b.authorName && <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>{b.authorName}</p>}
                    </div>
                    {onToggleSaveNote && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleSaveNote(b); }} title="حذف از کتابخانه"
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                        <i className="fas fa-trash text-[9px]"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* یادداشت‌های عمومی من */}
          {myPublicNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-globe text-xs" style={{ color: '#10b981' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>یادداشت‌های منتشرشده من ({toPersianDigits(myPublicNotes.length)})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myPublicNotes.map((n) => (
                  <div key={String((n as any).id || (n as any)._id)}
                    className="group flex gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                    style={{ background: 'var(--surface-2)', border: '1px solid color-mix(in srgb, #10b981 14%, var(--border))' }}
                    onClick={() => onShowBook?.(n)}>
                    <div className="w-10 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, #10b981 12%, transparent)', color: '#10b981' }}>
                      <i className="fas fa-file-lines text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-[12px] font-black line-clamp-2" style={{ color: 'var(--text)' }}>{String(n.title || 'بدون عنوان')}</h4>
                      <p className="text-[9px] font-bold mt-0.5 line-clamp-2" style={{ color: 'var(--text-3)' }}>{String(n.description || n.contentHtml || '').replace(/<[^>]*>/g, '')}</p>
                      {n.pendingApproval && (
                        <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black self-start" style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>
                          <i className="fas fa-hourglass-half text-[6px]"></i> در انتظار تأیید مدیر
                        </span>
                      )}
                    </div>
                    {(onUpdateNote || onDeleteNote) && (
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); openNoteEditor(n); }} title="ویرایش یادداشت"
                          className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                          style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                          <i className="fas fa-pen text-[9px]"></i>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteNote(n); }} title="حذف یادداشت"
                          className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                          style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--surface-3))', color: '#ef4444' }}>
                          <i className="fas fa-trash text-[9px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* پیش‌نویس‌های من */}
          {myDraftNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-lock text-xs" style={{ color: '#f59e0b' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>پیش‌نویس‌های من ({toPersianDigits(myDraftNotes.length)})</h2>
                <span className="text-[8px] font-bold" style={{ color: 'var(--text-3)' }}>فقط برای شما قابل مشاهده است</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myDraftNotes.map((n) => (
                  <div key={String((n as any).id || (n as any)._id)}
                    className="group flex gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                    style={{ background: 'var(--surface-2)', border: '1px solid color-mix(in srgb, #f59e0b 14%, var(--border))' }}
                    onClick={() => onShowBook?.(n)}>
                    <div className="w-10 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#f59e0b' }}>
                      <i className="fas fa-file-pen text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-[12px] font-black line-clamp-2" style={{ color: 'var(--text)' }}>{String(n.title || 'بدون عنوان')}</h4>
                      <p className="text-[9px] font-bold mt-0.5 line-clamp-2" style={{ color: 'var(--text-3)' }}>{String(n.description || n.contentHtml || '').replace(/<[^>]*>/g, '')}</p>
                    </div>
                    {(onUpdateNote || onDeleteNote) && (
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); openNoteEditor(n); }} title="ویرایش یادداشت"
                          className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                          style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                          <i className="fas fa-pen text-[9px]"></i>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteNote(n); }} title="حذف یادداشت"
                          className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                          style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--surface-3))', color: '#ef4444' }}>
                          <i className="fas fa-trash text-[9px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* نشان‌های کتاب */}
          {bookmarks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-bookmark text-xs" style={{ color: '#f59e0b' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>نشان‌های کتاب ({toPersianDigits(bookmarks.length)})</h2>
              </div>
              <div className="space-y-2">
                {bookmarks.map((bm, i) => {
                  const foundBook = publishedBooks.find((b: any) => String((b as any).id || (b as any)._id) === String(bm.bookId));
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-2xl"
                      style={{ background: 'var(--surface-2)', border: '1px solid color-mix(in srgb, #f59e0b 14%, var(--border))' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#f59e0b' }}>
                        <i className="fas fa-bookmark text-[10px]"></i>
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => foundBook && onShowBook?.(foundBook)}>
                        <p className="text-[11px] font-black truncate" style={{ color: 'var(--text)' }}>
                          {String(bm.bookTitle || 'کتاب')}
                          {bm.page != null && <span className="text-[8px] font-bold mr-1" style={{ color: 'var(--text-3)' }}>صفحه {toPersianDigits(bm.page + 1)}</span>}
                        </p>
                        <p className="text-[9.5px] font-bold leading-relaxed mt-1 line-clamp-2 text-right" style={{ color: 'var(--text-2)' }}>«{String(bm.text || '')}»</p>
                      </div>
                      {onRemoveBookmark && (
                        <button onClick={() => onRemoveBookmark(String(bm.bookId), String(bm.text))} title="حذف نشان"
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                          style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                          <i className="fas fa-trash text-[9px]"></i>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Saved Podcasts */}
          {filteredPodcasts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-layer-group text-xs" style={{ color: 'var(--primary)' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>پلی‌لیست‌ها ({toPersianDigits(filteredPodcasts.length)})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPodcasts.map((p) => {
                  const author = authors.find(a => String(a.id) === String(p.speakerId));
                  return (
                    <div key={String(p.id) || String((p as any)._id)}
                      className="group relative flex gap-3 p-3 rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div className="relative w-[80px] h-[80px] rounded-xl overflow-hidden cursor-pointer flex-shrink-0"
                          onClick={() => onSelectPodcast?.(p)}>
                        <img src={String(p.cover || DEFAULT_COVER)} alt={String(p.title)}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                        <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ top: '38px' }}>
                          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 scale-75 group-hover:scale-100 transition-transform shadow-2xl">
                            <i className="fas fa-play text-white text-[10px] mr-[-1px]" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black w-fit mb-1"
                          style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
                          <i className="fas fa-layer-group text-[7px]"></i>
                          پلی‌لیست
                        </span>
                        <h4 className="text-[13px] font-bold line-clamp-2 leading-relaxed group-hover:text-primary-400 transition-colors cursor-pointer min-w-0"
                          style={{ color: 'var(--text)' }}
                          onClick={() => onSelectPodcast?.(p)}>{String(p.title)}</h4>
                        {author && <p className="text-[10px] mb-1" style={{ color: 'var(--text-3)' }}>{String(author.name)}</p>}
                        <div className="flex items-center justify-between">
                          <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                            {toPersianDigits(p.episodes.length)} جلسه
                          </p>
                          <button onClick={() => onRemovePodcast?.(p)}
                            className="flex items-center gap-1 text-[9px] font-bold transition-all hover:scale-105 active:scale-95"
                            style={{ color: 'var(--text-3)' }}>
                            <i className="fas fa-bookmark text-[9px]" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Saved Episodes */}
          {savedEpisodeItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-headphones text-xs" style={{ color: '#f59e0b' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>صوت‌ها ({toPersianDigits(savedEpisodeItems.length)})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedEpisodeItems.map((item, i) => {
                  const author = authors.find(a => String(a.id) === String(item.podcast.speakerId));
                  return (
                    <div key={`${item.podcastId}-${item.episodeIndex}`}
                      className="group relative flex gap-3 p-3 rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                      style={{ background: 'color-mix(in srgb, #f59e0b 4%, var(--surface-2))', border: '1px solid color-mix(in srgb, #f59e0b 12%, var(--border))' }}>
                      <div className="relative w-[80px] h-[80px] rounded-xl overflow-hidden cursor-pointer flex-shrink-0"
                          onClick={() => onPlayPodcast?.(item.podcast, item.episodeIndex)}>
                        <img src={String(item.episode.cover || item.podcast.cover || DEFAULT_COVER)} alt={String(item.episode.title)}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                        <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ top: '38px' }}>
                          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 scale-75 group-hover:scale-100 transition-transform shadow-2xl">
                            <i className="fas fa-play text-white text-[10px] mr-[-1px]" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black w-fit mb-1"
                          style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>
                          <i className="fas fa-headphones text-[7px]"></i>
                          صوت · جلسه {toPersianDigits(item.episodeIndex + 1)}
                        </span>
                        <h4 className="text-[13px] font-bold line-clamp-1 leading-relaxed group-hover:text-primary-400 transition-colors cursor-pointer min-w-0"
                          style={{ color: 'var(--text)' }}
                          onClick={() => onPlayPodcast?.(item.podcast, item.episodeIndex)}>{String(item.episode.title)}</h4>
                        <p className="text-[10px] mb-1" style={{ color: 'var(--text-3)' }}>{String(item.podcast.title)}</p>
                        <div className="flex items-center justify-between">
                          {author && <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{String(author.name)}</p>}
                          <button onClick={() => onRemoveEpisode?.(item.podcastId, item.episodeIndex)}
                            className="flex items-center gap-1 text-[9px] font-bold transition-all hover:scale-105 active:scale-95"
                            style={{ color: 'var(--text-3)' }}>
                            <i className="fas fa-bookmark text-[9px]" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Saved Videos */}
          {savedVideos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1 mt-3">
                <i className="fas fa-video text-xs" style={{ color: 'var(--primary)' }}></i>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>ویدیوها ({toPersianDigits(savedVideos.length)})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedVideos.map((v, i) => (
                  <div key={v.id || i}
                    className="group flex gap-3 p-3 rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="relative w-[140px] h-[80px] flex-shrink-0 rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => onPlayVideo(v)}>
                      <img src={v.thumbnailUrl} alt={v.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 scale-75 group-hover:scale-100 transition-transform shadow-2xl">
                          <i className="fas fa-play text-white text-xs mr-[-1px]" />
                        </div>
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold text-white bg-black/60 backdrop-blur-sm border border-white/10">
                        {toPersianDigits(formatTime(v.duration))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <h4 className="text-[13px] font-bold line-clamp-2 leading-relaxed mb-1.5 group-hover:text-primary-400 transition-colors cursor-pointer"
                        style={{ color: 'var(--text)' }}
                        onClick={() => onPlayVideo(v)}>{v.title}</h4>
                      <p className="text-[10px] mb-2" style={{ color: 'var(--text-3)' }}>
                        {toPersianDigits(v.viewCount)} بازدید • {v.uploadDate}
                      </p>
                      <button onClick={() => onRemoveVideo(v.id || (v as any)._id)}
                        className="flex items-center gap-1.5 text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ color: 'var(--text-3)' }}>
                        <i className="fas fa-bookmark text-[10px]" />
                        <span>حذف از کتابخانه</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* مودال ساخت آلبوم */}
      {showCreateAlbum && (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => { if (!pickerMode) setShowCreateAlbum(false); }}>
          <div className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 animate-slideUp" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            {!pickerMode ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}><i className="fas fa-palette ml-1.5" style={{ color: '#14b8a6' }}></i> {editingAlbum ? 'ویرایش آلبوم' : 'آلبوم جدید'}</h3>
                  <button onClick={() => setShowCreateAlbum(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ color: 'var(--text-3)' }}><i className="fas fa-times"></i></button>
                </div>
                <input value={newAlbumTitle} onChange={e => setNewAlbumTitle(e.target.value)} placeholder="عنوان آلبوم..." className="w-full px-3.5 py-2.5 rounded-xl text-[12px] font-bold outline-none mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setNewAlbumType('audio')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${newAlbumType === 'audio' ? 'text-white' : ''}`}
                    style={newAlbumType === 'audio' ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : { background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                    <i className="fas fa-music ml-1 text-[9px]"></i> آلبوم صوتی
                  </button>
                  <button onClick={() => setNewAlbumType('video')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${newAlbumType === 'video' ? 'text-white' : ''}`}
                    style={newAlbumType === 'video' ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : { background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                    <i className="fas fa-video ml-1 text-[9px]"></i> آلبوم ویدیویی
                  </button>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black" style={{ color: 'var(--text-2)' }}>قطعه‌ها ({toPersianDigits(albumItems.length)})</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setPickerSearch(''); setPickerMode('note'); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black active:scale-95 transition-all"
                      style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#f59e0b' }}>
                      <i className="fas fa-file-lines text-[8px]"></i> افزودن یادداشت
                    </button>
                    <button onClick={() => { setPickerSearch(''); setOpenPickerPodcast(null); setPickerMode(newAlbumType); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black active:scale-95 transition-all"
                      style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
                      <i className="fas fa-plus text-[8px]"></i> افزودن {newAlbumType === 'video' ? 'ویدیو' : 'جلسه'}
                    </button>
                  </div>
                </div>
                {albumItems.length === 0 ? (
                  <p className="text-[10px] text-center py-6" style={{ color: 'var(--text-3)' }}>هنوز قطعه‌ای اضافه نشده</p>
                ) : (
                  <div className="space-y-1.5 mb-3">
                    {albumItems.map((it, i) => (
                      <div key={itemKey(it, i)} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        {it.noteId ? (
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#f59e0b' }}>
                            <i className="fas fa-file-lines text-[10px]"></i>
                          </div>
                        ) : (
                          <img src={it.cover || DEFAULT_COVER} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>{it.title}</p>
                          {it.noteId && <p className="text-[8px] font-bold truncate mt-0.5" style={{ color: 'var(--text-3)' }}>{it.content || 'یادداشت'}</p>}
                        </div>
                        <button onClick={() => setAlbumItems(prev => prev.filter((_, k) => k !== i))} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-3)' }}><i className="fas fa-times text-[8px]"></i></button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={handleSaveAlbum} disabled={!newAlbumTitle.trim() || albumBusy}
                  className="w-full py-3 rounded-2xl text-[11px] font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  {albumBusy ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check ml-1"></i> {editingAlbum ? 'ذخیره تغییرات' : 'ساخت آلبوم'}</>}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setPickerMode(null)} className="flex items-center gap-1 text-[10px] font-black" style={{ color: 'var(--text-3)' }}>
                    <i className="fas fa-chevron-right text-[8px]"></i> بازگشت
                  </button>
                  <h3 className="text-xs font-black" style={{ color: 'var(--text)' }}>انتخاب {pickerMode === 'video' ? 'ویدیو' : pickerMode === 'note' ? 'یادداشت' : 'جلسه یا پلی‌لیست'} از آرشیو</h3>
                </div>
                <div className="relative mb-3">
                  <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[9px]" style={{ color: 'var(--text-3)' }} />
                  <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder={`جستجو در ${pickerMode === 'video' ? 'ویدیوها' : 'صوت‌ها و پلی‌لیست‌ها'}...`}
                    className="w-full pr-8 pl-8 py-2 rounded-xl text-[10px] font-bold outline-none transition-all focus:ring-2"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 30%, transparent)' } as any} />
                  {pickerSearch && <button onClick={() => setPickerSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2"><i className="fas fa-times text-[8px]" style={{ color: 'var(--text-3)' }} /></button>}
                </div>
                {pickerMode === 'note' ? (
                  <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
                    {(() => {
                      const combined = [
                        ...notes,
                        ...savedNoteItems.filter(s => !notes.some(n => String(n.id || (n as any)._id) === String((s as any).id || (s as any)._id))),
                        ...publishedBooks.filter((pb: any) => pb.type === 'note' && !pb.isDraft
                          && !notes.some(n => String(n.id || (n as any)._id) === String(pb.id || pb._id))
                          && !savedNoteItems.some(s => String((s as any).id || (s as any)._id) === String(pb.id || pb._id)))
                      ];
                      const query = pickerSearch.trim().toLowerCase();
                      const filtered = query
                        ? combined.filter(n => String(n.title || '').toLowerCase().includes(query) || String(n.content || n.contentHtml || n.description || '').toLowerCase().includes(query))
                        : combined;
                      if (filtered.length === 0) return <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>{query ? 'چیزی یافت نشد' : 'یادداشتی برای افزودن ندارید'}</p>;
                      return filtered.map((n, i) => (
                        <button key={String(n.id || (n as any)._id) || i} onClick={() => addNoteItem(n)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right active:scale-[0.98] transition-all"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#f59e0b' }}>
                            <i className="fas fa-file-lines text-[12px]"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>{String(n.title || 'بدون عنوان')}</p>
                              {n.isDraft && (
                                <span className="flex-shrink-0 text-[6.5px] font-black px-1.5 py-0.5 rounded-md" style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>پیش‌نویس</span>
                              )}
                            </div>
                            <p className="text-[8px] font-bold truncate mt-0.5" style={{ color: 'var(--text-3)' }}>{String(n.content || n.contentHtml || n.description || '').replace(/<[^>]*>/g, '')}</p>
                          </div>
                          <i className="fas fa-plus text-[9px]" style={{ color: '#f59e0b' }}></i>
                        </button>
                      ));
                    })()}
                  </div>
                ) : pickerMode === 'video' ? (
                  <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
                    {(() => {
                      const query = pickerSearch.trim().toLowerCase();
                      const filtered = query ? allVideos.filter(v => v.title.toLowerCase().includes(query)) : allVideos;
                      if (query && filtered.length === 0) return <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>چیزی یافت نشد</p>;
                      return filtered.map((v, i) => (
                      <button key={String(v.id || (v as any)._id) || i} onClick={() => addVideoItem(v)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right active:scale-[0.98] transition-all"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <img src={v.thumbnailUrl} className="w-12 h-8 rounded-lg object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>{v.title}</p>
                          <p className="text-[8px] font-bold" style={{ color: 'var(--text-3)' }}>{toPersianDigits(v.viewCount)} بازدید</p>
                        </div>
                        <i className="fas fa-plus text-[9px]" style={{ color: 'var(--primary)' }}></i>
                      </button>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                    {(() => {
                      const query = pickerSearch.trim().toLowerCase();
                      const filtered = query
                        ? allPodcasts.filter(p => String(p.title || '').toLowerCase().includes(query) || (p.episodes || []).some(ep => String(ep.title || '').toLowerCase().includes(query)))
                        : allPodcasts;
                      if (query && filtered.length === 0) return <p className="text-[10px] text-center py-8" style={{ color: 'var(--text-3)' }}>چیزی یافت نشد</p>;
                      return filtered.map((p) => {
                        const pid = String(p.id || (p as any)._id);
                        const open = openPickerPodcast === pid;
                        const eps = query ? (p.episodes || []).filter(ep => String(ep.title || '').toLowerCase().includes(query)) : (p.episodes || []);
                        return (
                          <div key={pid} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2.5 px-3 py-2.5">
                              <button onClick={() => setOpenPickerPodcast(open ? null : pid)} className="flex items-center gap-2.5 flex-1 min-w-0 text-right active:scale-[0.99] transition-all">
                                <img src={String(p.cover || DEFAULT_COVER)} className="w-9 h-9 rounded-xl object-cover" alt="" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-black truncate" style={{ color: 'var(--text)' }}>{String(p.title)}</p>
                                  <p className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>{toPersianDigits(p.episodes?.length || 0)} جلسه</p>
                                </div>
                                <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[8px] transition-transform duration-300`} style={{ color: 'var(--text-3)' }}></i>
                              </button>
                              <button onClick={() => addAudioPlaylist(pid)} title="انتخاب کل پلی‌لیست"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black active:scale-95 transition-all flex-shrink-0 text-white"
                                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                                <i className="fas fa-list text-[7px]"></i>
                                انتخاب پلی‌لیست
                              </button>
                            </div>
                            {open && (
                              <div className="space-y-1 px-2 pb-2">
                                {eps.length === 0 && <p className="text-[9px] text-center py-3" style={{ color: 'var(--text-3)' }}>جلسه‌ای نیست</p>}
                                {eps.map((ep, idx) => (
                                  <button key={idx} onClick={() => addAudioItem(pid, idx)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-right active:scale-[0.98] transition-all"
                                    style={{ background: 'var(--surface-3)', border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)' }}>
                                    <i className="fas fa-headphones text-[9px]" style={{ color: '#f59e0b' }}></i>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>{String(ep.title)}</p>
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
              </>
            )}
          </div>
        </div>
      )}

      {/* ویرایش یادداشت */}
      {noteEditor && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4" onClick={() => setNoteEditor(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-3xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>ویرایش یادداشت</h3>
              <button onClick={() => setNoteEditor(null)} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <i className="fas fa-xmark text-[10px]" style={{ color: 'var(--text-3)' }}></i>
              </button>
            </div>
            <label className="block text-[10px] font-black mb-1.5" style={{ color: 'var(--text-3)' }}>عنوان یادداشت</label>
            <input value={noteEditTitle} onChange={e => setNoteEditTitle(e.target.value)} placeholder="عنوان را بنویسید..." className="w-full px-3.5 py-3 rounded-xl text-[13px] font-bold outline-none focus:ring-2 transition-all" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--primary)' } as any} />
            <label className="block text-[10px] font-black mt-4 mb-1.5" style={{ color: 'var(--text-3)' }}>متن یادداشت</label>
            <textarea value={noteEditContent} onChange={e => setNoteEditContent(e.target.value)} placeholder="متن یادداشت خود را بنویسید..." rows={7} className="w-full px-3.5 py-3 rounded-xl text-[12px] font-medium outline-none focus:ring-2 transition-all resize-none leading-7" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--primary)' } as any} />
            <div className="flex items-center gap-2 mt-4">
              {noteEditor.note?.isDraft && (
                <button onClick={async () => {
                  if (!noteEditTitle.trim() || !noteEditContent.trim() || !onUpdateNote) return;
                  await onUpdateNote(String(noteEditor.note.id || noteEditor.note._id), { title: noteEditTitle, content: noteEditContent, isDraft: false });
                  setNoteEditor(null);
                }} className="flex-1 py-2.5 rounded-xl text-[10px] font-black text-white transition-all active:scale-95 shadow-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 6px 16px rgba(16,185,129,0.35)' }}>
                  <i className="fas fa-send ml-1.5 text-[9px]" /> انتشار
                </button>
              )}
              <button onClick={async () => {
                if (!noteEditTitle.trim() || !noteEditContent.trim() || !onUpdateNote) return;
                await onUpdateNote(String(noteEditor.note.id || noteEditor.note._id), { title: noteEditTitle, content: noteEditContent, isDraft: !!noteEditor.note?.isDraft });
                setNoteEditor(null);
              }} className="flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95" style={{ background: 'color-mix(in srgb, var(--primary) 12%, var(--surface-2))', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                <i className="fas fa-check ml-1.5 text-[9px]" /> {noteEditor.note?.isDraft ? 'ذخیره پیش‌نویس' : 'ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmToast
        open={!!confirmDeleteNote}
        message={confirmDeleteNote ? `یادداشت «${String(confirmDeleteNote.title || 'بدون عنوان')}» حذف شود؟` : ''}
        onConfirm={async () => {
          if (!confirmDeleteNote) return;
          if (await onDeleteNote?.(String(confirmDeleteNote.id || confirmDeleteNote._id))) {
            setConfirmDeleteNote(null);
            if (noteEditor && String(noteEditor.note.id || noteEditor.note._id) === String(confirmDeleteNote.id || confirmDeleteNote._id)) setNoteEditor(null);
          }
        }}
        onCancel={() => setConfirmDeleteNote(null)}
      />
    </div>
  );
};

export default LibraryPage;