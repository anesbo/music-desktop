import React from 'react';
import { Play } from 'lucide-react';
import { YTItem } from '../../types';

interface MediaCardProps {
  item: YTItem;
  onClick: () => void;
  onPlayClick?: (e: React.MouseEvent) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onClick, onPlayClick }) => {
  let title = '';
  let subtitle = '';
  let thumbnail = '';
  let isArtist = false;

  switch (item.type) {
    case 'Song':
      title = item.data.title;
      subtitle = item.data.artists.map((a) => a.name).join(', ');
      thumbnail = item.data.thumbnail;
      break;
    case 'Album':
      title = item.data.title;
      subtitle = `${item.data.artists.map((a) => a.name).join(', ')}${
        item.data.year ? ` • ${item.data.year}` : ''
      }`;
      thumbnail = item.data.thumbnail;
      break;
    case 'Artist':
      title = item.data.title;
      subtitle = item.data.subscribers || 'Artist';
      thumbnail = item.data.thumbnail || '';
      isArtist = true;
      break;
    case 'Playlist':
      title = item.data.title;
      subtitle = item.data.author?.name || item.data.song_count_text || 'Playlist';
      thumbnail = item.data.thumbnail || '';
      break;
  }

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer"
    >
      {/* Thumbnail Container */}
      <div
        className={`relative w-full aspect-square overflow-hidden mb-3 bg-neutral-900 shadow-lg ${
          isArtist ? 'rounded-full' : 'rounded-xl'
        }`}
      >
        <img
          src={thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Floating Play Button */}
        {onPlayClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayClick(e);
            }}
            className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-accent-red text-white flex items-center justify-center shadow-xl shadow-accent-red/30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95 transition-all duration-200"
            title="Play"
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0">
        <h4 className="font-semibold text-sm text-white truncate group-hover:text-accent-red transition-colors">
          {title}
        </h4>
        <p className="text-xs text-neutral-400 truncate mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
};
