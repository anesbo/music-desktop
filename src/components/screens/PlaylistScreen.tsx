import React, { useEffect, useState } from 'react';
import {
  Play,
  Shuffle,
  Trash2,
  Edit2,
  ListMusic,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { PlaylistItem, PlaylistPage, SongItem } from '../../types';
import { api } from '../../services/api';
import { SongRow } from '../common/SongRow';
import { ContextMenuState } from '../common/ContextMenu';

interface PlaylistScreenProps {
  playlistId: string;
  currentSong: SongItem | null;
  isPlaying: boolean;
  onPlaySong: (song: SongItem) => void;
  onPlayQueue: (songs: SongItem[], startIndex?: number) => void;
  onTogglePlay: () => void;
  onToggleLike: (song: SongItem) => void;
  onContextMenu: (e: React.MouseEvent, state: ContextMenuState) => void;
  onNavigateToAlbum: (albumId: string) => void;
  onNavigateToArtist: (artistId: string) => void;
  onDeletePlaylist?: () => void;
}

export const PlaylistScreen: React.FC<PlaylistScreenProps> = ({
  playlistId,
  currentSong,
  isPlaying,
  onPlaySong,
  onPlayQueue,
  onTogglePlay,
  onToggleLike,
  onContextMenu,
  onNavigateToAlbum,
  onNavigateToArtist,
  onDeletePlaylist,
}) => {
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<PlaylistItem | null>(null);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const isLocal = !playlistId.startsWith('VL') && !playlistId.startsWith('RD') && !playlistId.startsWith('PL');

  const loadPlaylist = async () => {
    setLoading(true);
    try {
      if (isLocal) {
        const all = await api.getAllPlaylists();
        const found = all.find((p) => p.id === playlistId);
        if (found) {
          setPlaylist(found);
          setEditedTitle(found.title);
          const pSongs = await api.getPlaylistSongs(playlistId);
          setSongs(pSongs);
        }
      } else {
        const page: PlaylistPage = await api.getPlaylist(playlistId);
        setPlaylist(page.playlist);
        setSongs(page.songs);
        setEditedTitle(page.playlist.title);
      }
    } catch (err) {
      console.error('Failed to load playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const handlePlayAll = (shuffle: boolean = false) => {
    if (songs.length === 0) return;
    const list = [...songs];
    if (shuffle) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    onPlayQueue(list, 0);
  };

  const handleRename = async () => {
    if (!editedTitle.trim() || !playlist) return;
    try {
      await api.renamePlaylist(playlist.id, editedTitle.trim());
      setPlaylist({ ...playlist, title: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to rename playlist:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await api.deletePlaylist(playlistId);
      if (onDeletePlaylist) onDeletePlaylist();
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  };

  const handleRemoveSong = async (pId: string, songId: string) => {
    try {
      await api.removeSongFromPlaylist(pId, songId);
      setSongs(songs.filter((s) => s.id !== songId));
    } catch (err) {
      console.error('Failed to remove song:', err);
    }
  };

  if (loading && !playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-accent-red animate-spin mb-3" />
        <p className="text-sm text-neutral-400">Loading playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-8 text-center text-neutral-400">
        Playlist not found.
      </div>
    );
  }

  const thumbnail = songs[0]?.thumbnail || playlist.thumbnail;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-8 pb-4">
        {/* Thumbnail */}
        <div className="relative w-52 h-52 md:w-60 md:h-60 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 bg-neutral-900 border border-white/10 flex items-center justify-center">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <ListMusic className="w-20 h-20 text-neutral-600" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col space-y-3 text-center md:text-left min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-red">
            Playlist
          </span>

          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-2xl md:text-4xl font-bold bg-white/10 border border-white/20 rounded-xl px-3 py-1 text-white focus:outline-none focus:border-accent-red"
                autoFocus
              />
              <button
                onClick={handleRename}
                className="p-2 rounded-xl bg-accent-red text-white hover:bg-accent-red-hover"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditingTitle(false)}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {playlist.title}
              </h1>
              {isLocal && (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 text-neutral-400 hover:text-white"
                  title="Rename Playlist"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-neutral-400">
            {playlist.author && <span>By {playlist.author.name} • </span>}
            <span>{songs.length} songs</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
            {songs.length > 0 && (
              <>
                <button
                  onClick={() => handlePlayAll(false)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent-red hover:bg-accent-red-hover text-white font-bold text-sm shadow-xl shadow-accent-red/30 active:scale-95 transition-all"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Play</span>
                </button>
                <button
                  onClick={() => handlePlayAll(true)}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
                  title="Shuffle"
                >
                  <Shuffle className="w-5 h-5" />
                </button>
              </>
            )}

            {isLocal && (
              <button
                onClick={handleDelete}
                className="p-3 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
                title="Delete Playlist"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Song list */}
      {songs.length === 0 ? (
        <div className="py-16 text-center text-neutral-500 text-sm">
          This playlist is currently empty. Right click any song to add it here.
        </div>
      ) : (
        <section className="space-y-1">
          {songs.map((song, idx) => {
            const isCurrent = currentSong?.id === song.id;
            return (
              <SongRow
                key={song.id || idx}
                song={song}
                index={idx}
                isPlaying={isPlaying}
                isCurrentSong={isCurrent}
                onPlay={() => onPlayQueue(songs, idx)}
                onTogglePlay={onTogglePlay}
                onToggleLike={onToggleLike}
                onContextMenu={onContextMenu}
                onNavigateToAlbum={onNavigateToAlbum}
                onNavigateToArtist={onNavigateToArtist}
                playlistId={isLocal ? playlistId : undefined}
              />
            );
          })}
        </section>
      )}
    </div>
  );
};
