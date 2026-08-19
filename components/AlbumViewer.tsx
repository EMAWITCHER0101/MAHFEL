import React from 'react';
import { toPersianDigits } from '../utils/helpers';

interface AlbumViewerProps {
  album: any;
  onClose: () => void;
  onPlayAll: (album: any) => void;
  onPlayItem: (item: any) => void;
}

const AlbumViewer: React.FC<AlbumViewerProps> = ({ album, onClose, onPlayAll, onPlayItem }) => {
  if (!album) return null;
  const items: any[] = album.items || [];
  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl flex flex-col max-h-[80vh] overflow-hidden animate-scaleIn"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b"
          style={{ borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-3)' }}>
              {album.cover || items[0]?.cover ? (
                <img src={album.cover || items[0]?.cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className={`fas ${album.type === 'video' ? 'fa-video' : 'fa-music'} text-sm`} style={{ color: 'var(--text-3)' }}></i>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{String(album.title)}</h3>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>
                {album.type === 'video' ? 'آلبوم ویدیویی' : 'آلبوم صوتی'} · {toPersianDigits(items.length)} قطعه
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
            style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
            <i className="fas fa-xmark text-xs"></i>
          </button>
        </div>

        {/* Play all */}
        {items.some(it => it.noteId == null) && (
        <div className="px-5 pt-3">
          <button onClick={() => onPlayAll(album)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-white active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
            <i className="fas fa-play text-[10px]"></i>
            پخش همه ({toPersianDigits(items.filter(it => it.noteId == null).length)} قطعه)
          </button>
        </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-1">
          {items.length === 0 && (
            <p className="text-center text-[11px] py-6" style={{ color: 'var(--text-3)' }}>این آلبوم خالی است</p>
          )}
          {items.map((it, i) => (
            <div key={i} className="w-full flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              style={{ background: 'var(--surface-3)' }}
              onClick={() => onPlayItem(it)}>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                style={{ background: 'color-mix(in srgb, #14b8a6 12%, transparent)', color: '#14b8a6' }}>
                {toPersianDigits(i + 1)}
              </span>
              {it.noteId ? (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#f59e0b' }}>
                  <i className="fas fa-file-lines text-[12px]"></i>
                </div>
              ) : it.cover ? (
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                  <img src={it.cover} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text)' }}>{String(it.title || 'بدون عنوان')}</p>
                <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>
                  <i className={`fas ${it.noteId ? 'fa-file-lines' : it.videoId ? 'fa-video' : 'fa-music'} text-[7px] ml-1`} />
                  {it.noteId ? 'یادداشت' : it.videoId ? 'ویدیو' : 'صوت'}
                </p>
                {it.noteId && it.content && (
                  <p className="text-[9px] leading-relaxed mt-1 line-clamp-2" style={{ color: 'var(--text-2)' }}>{String(it.content)}</p>
                )}
              </div>
              <i className={`fas ${it.noteId ? 'fa-chevron-left' : 'fa-play'} text-[10px] flex-shrink-0`} style={{ color: 'var(--text-3)' }}></i>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlbumViewer;