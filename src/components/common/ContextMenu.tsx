import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  ListPlus,
  Heart,
  Disc,
  User,
  Plus,
  Trash2,
  Share2,
} from 'lucide-react';
import { PlaylistItem, SongItem } from '../../types';
import { api } from '../../services/api';

export interface ContextMenuState {
  x: number;
  y: number;
  song: SongItem;
  playlistId?: string; // If inside a custom playlist
}

interface ContextMenuProps {
  state: ContextMenuState | null;
  onClose: () => void;
  onPlayNow: (song: SongItem) => void;
  onPlayNext: (song: SongItem) => void;
  onAddToQueue: (song: SongItem) => void;
  onToggleLike: (song: SongItem) => void;
  onNavigateToAlbum?: (albumId: string) => void;
  onNavigateToArtist?: (artistId: string) => void;
  onRemoveFromPlaylist?: (playlistId: string, songId: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onToggleLike,
  onNavigateToAlbum,
  onNavigateToArtist,
  onRemoveFromPlaylist,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [showPlaylistsSubmenu, setShowPlaylistsSubmenu] = useState(false);

  useEffect(() => {
    if (state) {
      api.getAllPlaylists().then(setPlaylists).catch(console.warn);
    }
  }, [state]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (state) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state, onClose]);

  if (!state) return null;

  const { x, y, song, playlistId } = state;

  // Prevent overflowing viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 320);

  const handleAddToPlaylist = async (pId: string) => {
    try {
      await api.addSongToPlaylist(pId, song.id);
      onClose();
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      className="fixed z-50 w-56 rounded-xl border border-white/10 bg-[#16181F]/95 backdrop-blur-xl p-1.5 text-xs text-neutral-200 shadow-2xl transition-opacity animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-white/5 mb-1">
        <img
          src={song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
          alt=""
          className="w-7 h-7 rounded object-cover flex-shrink-0"
        />
        <div className="truncate">
          <p className="font-medium text-white truncate">{song.title}</p>
          <p className="text-[10px] text-neutral-400 truncate">
            {song.artists.map((a) => a.name).join(', ')}
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          onPlayNow(song);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-colors"
      >
        <Play className="w-3.5 h-3.5 text-accent-red fill-accent-red" />
        <span>Play Now</span>
      </button>

      <button
        onClick={() => {
          onPlayNext(song);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-colors"
      >
        <ListPlus className="w-3.5 h-3.5 text-neutral-400" />
        <span>Play Next</span>
      </button>

      <button
        onClick={() => {
          onAddToQueue(song);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-colors"
      >
        <Plus className="w-3.5 h-3.5 text-neutral-400" />
        <span>Add to Queue</span>
      </button>

      <button
        onClick={() => {
          onToggleLike(song);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-colors"
      >
        <Heart
          className={`w-3.5 h-3.5 ${
            song.liked ? 'text-accent-red fill-accent-red' : 'text-neutral-400'
          }`}
        />
        <span>{song.liked ? 'Remove from Liked' : 'Add to Liked'}</span>
      </button>

      <div className="h-px bg-white/5 my-1" />

      {/* Playlist submenu trigger */}
      <div
        className="relative"
        onMouseEnter={() => setShowPlaylistsSubmenu(true)}
        onMouseLeave={() => setShowPlaylistsSubmenu(false)}
      >
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <Plus className="w-3.5 h-3.5 text-neutral-400" />
            <span>Add to Playlist</span>
          </div>
          <span className="text-[10px] text-neutral-500">▶</span>
        </button>

        {showPlaylistsSubmenu && (
          <div className="absolute left-full top-0 ml-1 w-48 rounded-xl border border-white/10 bg-[#16181F]/95 backdrop-blur-xl p-1.5 shadow-2xl">
            {playlists.length === 0 ? (
              <p className="px-3 py-2 text-neutral-500 text-[11px]">No playlists created</p>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id)}
                  className="w-full truncate text-left px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {pl.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {song.album?.id && onNavigateToAlbum && (
        <button
          onClick={() => {
            onNavigateToAlbum(song.album!.id!);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-colors"
        >
          <Disc className="w-3.5 h-3.5 text-neutral-400" />
          <span>Go to Album</span>
        </button>
      )}

      {song.artists[0]?.id && onNavigateToArtist && (
        <button
          onClick={() => {
            onNavigateToArtist(song.artists[0].id!);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-colors"
        >
          <User className="w-3.5 h-3.5 text-neutral-400" />
          <span>Go to Artist</span>
        </button>
      )}

      {playlistId && onRemoveFromPlaylist && (
        <>
          <div className="h-px bg-white/5 my-1" />
          <button
            onClick={() => {
              onRemoveFromPlaylist(playlistId, song.id);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 text-left transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove from this playlist</span>
          </button>
        </>
      )}
    </div>
  );
};
