
import React from 'react';
import type { Video } from '../types';
import { toPersianDigits, formatTime } from '../utils/helpers';

interface VideoCardProps {
  video: Video;
  onSelect: () => void;
  index?: number;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect, index = 0 }) => {
  return (
    <div
      className={`group cursor-pointer animate-fadeInUp stagger-${Math.min(index + 1, 6)}`}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-3 shadow-lg group-hover:shadow-2xl transition-all duration-500">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-black/50 backdrop-blur-md border border-white/10 shadow-lg">
          {toPersianDigits(formatTime(video.duration))}
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border-2 border-white/30 shadow-2xl scale-50 group-hover:scale-100 transition-transform duration-500">
            <i className="fas fa-play text-white text-lg mr-[-2px]" />
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 px-1">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-extrabold leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors duration-300 "
            style={{ color: 'var(--text)' }}>
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-xs " style={{ color: 'var(--text-3)' }}>
            <span>{toPersianDigits(video.viewCount)} بازدید</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-30" />
            <span>{video.uploadDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
