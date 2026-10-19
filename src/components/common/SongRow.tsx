import React from 'react';
import { Play, Pause, Heart, MoreHorizontal, Volume2 } from 'lucide-react';
import { SongItem } from '../../types';
import { ContextMenuState } from './ContextMenu';

interface SongRowProps {
  song: SongItem;
  index: number;
  isPlaying: boolean;
  isCurrentSong: boolean;
  onPlay: (song: SongItem) => void;
  onTogglePlay: () => void;
  onToggleLike: (song: SongItem) => void;
  onContextMenu: (e: React.MouseEvent, state: ContextMenuState) => void;
  onNavigateToAlbum?: (albumId: string) => void;
  onNavigateToArtist?: (artistId: string) => void;
  playlistId?: string;
}

export const SongRow: React.FC<SongRowProps> = ({
  song,
  index,
  isPlaying,
  isCurrentSong,
  onPlay,
  onTogglePlay,
  onToggleLike,
  onContextMenu,
  onNavigateToAlbum,
  onNavigateToArtist,
  playlistId,
}) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRowClick = () => {
    if (isCurrentSong) {
      onTogglePlay();
    } else {
      onPlay(song);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, {
      x: e.clientX,
      y: e.clientY,
      song,
      playlistId,
    });
  };

  return (
    <div
      onContextMenu={handleRightClick}
      onDoubleClick={handleRowClick}
      className={`group grid grid-cols-[auto_48px_1fr_1fr_auto_auto] items-center gap-4 px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer select-none ${
        isCurrentSong
          ? 'bg-accent-red/10 text-accent-red font-medium'
          : 'hover:bg-white/[0.04] text-neutral-300'
      }`}
    >
      {/* Index / Play Indicator */}
      <div className="w-6 flex items-center justify-center text-xs text-neutral-500">
        {isCurrentSong ? (
          isPlaying ? (
            <Volume2 className="w-4 h-4 text-accent-red animate-pulse" />
          ) : (
            <Play className="w-3.5 h-3.5 text-accent-red fill-accent-red" />
          )
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(song);
              }}
              className="hidden group-hover:block text-white hover:scale-110 transition-transform"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900">
        <img
          src={song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Title & Artists */}
      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-1.5">
          <p
            className={`truncate font-medium text-sm ${
              isCurrentSong ? 'text-accent-red' : 'text-white'
            }`}
          >
            {song.title}
          </p>
          {song.explicit && (
            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-neutral-700 text-neutral-300 flex-shrink-0">
              E
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-neutral-400 truncate">
          {song.artists.map((artist, idx) => (
            <React.Fragment key={artist.id || artist.name || idx}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (artist.id && onNavigateToArtist) onNavigateToArtist(artist.id);
                }}
                className={`truncate ${
                  artist.id
                    ? 'hover:underline hover:text-white cursor-pointer'
                    : ''
                }`}
              >
                {artist.name}
              </span>
              {idx < song.artists.length - 1 && <span>,</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Album */}
      <div className="min-w-0 pr-4 hidden md:block">
        {song.album?.title ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (song.album?.id && onNavigateToAlbum) onNavigateToAlbum(song.album.id);
            }}
            className={`text-xs text-neutral-400 truncate block ${
              song.album.id ? 'hover:underline hover:text-white cursor-pointer' : ''
            }`}
          >
            {song.album.title}
          </span>
        ) : (
          <span className="text-xs text-neutral-600">--</span>
        )}
      </div>

      {/* Like Button */}
      <div className="flex items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(song);
          }}
          className={`p-1.5 rounded-lg transition-transform hover:scale-110 ${
            song.liked
              ? 'text-accent-red fill-accent-red'
              : 'text-neutral-500 opacity-0 group-hover:opacity-100 hover:text-white'
          }`}
          title={song.liked ? 'Remove from Liked' : 'Like'}
        >
          <Heart className={`w-4 h-4 ${song.liked ? 'fill-accent-red' : ''}`} />
        </button>
      </div>

      {/* Duration & More options */}
      <div className="flex items-center gap-3 text-xs text-neutral-400 w-20 justify-end">
        <span>{formatDuration(song.duration)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRightClick(e);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
          title="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
