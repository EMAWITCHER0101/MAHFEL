
import React from 'react';
import type { Podcast, Author } from '../types';
import { SohaIcon } from './SohaLogo';
import { DEFAULT_COVER } from '../utils/helpers';

interface PodcastCardProps {
  podcast: Podcast;
  author?: Author;
  isSquare?: boolean;
  isInLibrary?: boolean;
  onClick: () => void;
  onAuthorSelect?: (author: Author) => void;
  onToggleLibrary?: (id: number) => void;
  onShare?: (title: string, text: string) => void;
}

const PodcastCard: React.FC<PodcastCardProps> = ({ 
  podcast, 
  author, 
  isSquare = false, 
  isInLibrary = false,
  onClick, 
  onAuthorSelect,
  onToggleLibrary,
  onShare
}) => {
  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(podcast.title, podcast.description);
    }
  };

  const handleLibraryToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleLibrary) {
      onToggleLibrary(podcast.id);
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAuthorSelect && author) {
      onAuthorSelect(author);
    }
  };
  
  const isMaster = author?.role === 'master';
  const hasCover = true;
  const coverSrc = podcast.cover || DEFAULT_COVER;

  return (
    <div
      className="bg-card-bg rounded-xl overflow-hidden shadow-custom hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer border border-border-color/80 group active:scale-95 active:shadow-lg flex flex-col"
      onClick={onClick}
    >
      <div className={`w-full relative overflow-hidden ${isSquare ? 'aspect-square' : 'aspect-[2/3]'}`}>
        {hasCover ? (
          <>
            <img src={coverSrc} alt={podcast.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #4f46e5 50%, #7c3aed 100%)' }}>
            <div className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px), radial-gradient(circle at 50% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 blur-xl"></div>
            <SohaIcon size={56} className="opacity-30 mb-2" />
            <span className="text-[9px] font-black text-white/30 tracking-[0.15em]">بدون جلد</span>
          </div>
        )}

        {isMaster && author && (
             <div 
                className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-black px-2 py-1 rounded-md backdrop-blur-sm shadow-lg cursor-pointer hover:bg-black/80"
                onClick={handleAuthorClick}
            >
                {author.name}
             </div>
        )}
        
        <div className="absolute top-2 left-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <button
              onClick={handleShareClick}
              className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white text-xs shadow-md backdrop-blur-sm active:bg-black/60"
            >
              <i className="fas fa-share-alt"></i>
            </button>
            <button
              onClick={handleLibraryToggleClick}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-md backdrop-blur-sm transition-colors ${isInLibrary ? 'bg-primary text-white' : 'bg-black/40 text-white'}`}
            >
              <i className={`${isInLibrary ? 'fas' : 'far'} fa-bookmark`}></i>
            </button>
        </div>
      </div>
      <div className="p-2 flex-grow flex flex-col">
        <h3 className="text-[11px] font-black leading-tight line-clamp-2 text-text-primary flex-grow ">{podcast.title}</h3>
        {!isMaster && author && (
            <p 
              className="text-[9px] text-text-secondary mt-1 whitespace-nowrap overflow-hidden text-ellipsis font-bold "
              onClick={handleAuthorClick}
            >
                با دبیری: {author.name}
            </p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {podcast.categories.slice(0, 1).map(cat => (
             <span key={cat} className="bg-primary/10 text-primary py-0.5 px-2 rounded-full text-[8px] font-black">{cat}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PodcastCard;
