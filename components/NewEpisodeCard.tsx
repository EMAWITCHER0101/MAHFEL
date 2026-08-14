

import React from 'react';
import type { Podcast, Episode } from '../types';
import { formatPersianDate, DEFAULT_COVER } from '../utils/helpers';

interface NewEpisodeCardProps {
  podcast: Podcast;
  episode: Episode;
  episodeIndex: number;
  onPlay: (podcast: Podcast, episodeIndex: number) => void;
  onSelect: (podcast: Podcast) => void;
}

const NewEpisodeCard: React.FC<NewEpisodeCardProps> = ({ podcast, episode, episodeIndex, onPlay, onSelect }) => {
  
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(podcast, episodeIndex);
  };
  
  return (
    <div
      className="flex gap-2.5 bg-card-bg rounded-lg p-2 relative transition-all duration-200 ease-in-out items-center shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
    >
      <div className="w-[45px] h-[45px] rounded-lg overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => onSelect(podcast)}>
        <img src={episode.cover || podcast.cover || DEFAULT_COVER} alt={podcast.title} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2.5">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary mb-1 line-clamp-1 leading-snug ">{podcast.title}</h3>
          <div className="mt-1">
            <div className="text-xs text-text-secondary flex items-center gap-2 opacity-90 ">
              <span className="text-xs text-primary font-medium whitespace-nowrap">{formatPersianDate(episode.date)}</span>
              <span className='truncate'>{episode.title}</span>
            </div>
          </div>
        </div>
        <button
          className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer transition-all duration-200 text-xs active:scale-95 active:bg-primary-dark"
          onClick={handlePlayClick}
        >
          <i className="fas fa-play"></i>
        </button>
      </div>
    </div>
  );
};

export default NewEpisodeCard;