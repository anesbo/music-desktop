import React, { useEffect, useState } from 'react';
import {
  Play,
  Shuffle,
  Heart,
  Bookmark,
  Clock,
  Loader2,
  Calendar,
  Music,
} from 'lucide-react';
import { AlbumPage, SongItem } from '../../types';
import { api } from '../../services/api';
import { SongRow } from '../common/SongRow';
import { MediaCard } from '../common/MediaCard';
import { ContextMenuState } from '../common/ContextMenu';

interface AlbumScreenProps {
  browseId: string;
  currentSong: SongItem | null;
  isPlaying: boolean;
  onPlaySong: (song: SongItem) => void;
  onPlayQueue: (songs: SongItem[], startIndex?: number) => void;
  onTogglePlay: () => void;
  onToggleLike: (song: SongItem) => void;
  onContextMenu: (e: React.MouseEvent, state: ContextMenuState) => void;
  onNavigateToArtist: (artistId: string) => void;
  onNavigateToAlbum: (albumId: string) => void;
}

export const AlbumScreen: React.FC<AlbumScreenProps> = ({
  browseId,
  currentSong,
  isPlaying,
  onPlaySong,
  onPlayQueue,
  onTogglePlay,
  onToggleLike,
  onContextMenu,
  onNavigateToArtist,
  onNavigateToAlbum,
}) => {
  const [data, setData] = useState<AlbumPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getAlbum(browseId)
      .then((res) => {
        setData(res);
        setIsSaved(!!res.album.in_library);
      })
      .catch((err) => console.error('Failed to load album:', err))
      .finally(() => setLoading(false));
  }, [browseId]);

  const handlePlayAll = (shuffle: boolean = false) => {
    if (!data?.songs || data.songs.length === 0) return;
    const list = [...data.songs];
    if (shuffle) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    onPlayQueue(list, 0);
  };

  const handleToggleSave = async () => {
    if (!data?.album) return;
    try {
      const updatedAlbum = {
        ...data.album,
        in_library: isSaved ? 0 : Date.now(),
      };
      await api.upsertAlbum(updatedAlbum);
      setIsSaved(!isSaved);
    } catch (err) {
      console.error('Failed to save album:', err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-accent-red animate-spin mb-3" />
        <p className="text-sm text-neutral-400">Loading album details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-neutral-400">
        Failed to load album.
      </div>
    );
  }

  const { album, songs, other_versions } = data;

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const totalMinutes = Math.floor(totalDuration / 60);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Album Header Banner */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-8 pb-4">
        {/* Album Artwork */}
        <div className="relative w-52 h-52 md:w-60 md:h-60 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 bg-neutral-900 border border-white/10">
          <img
            src={album.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}
            alt={album.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Album Info */}
        <div className="flex flex-col space-y-3 text-center md:text-left min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-red">
            Album
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {album.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-neutral-300">
            {album.artists.map((artist, idx) => (
              <React.Fragment key={artist.id || idx}>
                <span
                  onClick={() => artist.id && onNavigateToArtist(artist.id)}
                  className={`font-semibold text-white ${
                    artist.id ? 'hover:underline cursor-pointer' : ''
                  }`}
                >
                  {artist.name}
                </span>
                {idx < album.artists.length - 1 && <span>•</span>}
              </React.Fragment>
            ))}
            {album.year && <span>• {album.year}</span>}
            <span>• {songs.length} songs,</span>
            <span className="text-neutral-400">{totalMinutes} min</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
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
            <button
              onClick={handleToggleSave}
              className={`p-3 rounded-full border border-white/10 transition-all ${
                isSaved
                  ? 'bg-accent-red/20 text-accent-red border-accent-red/40'
                  : 'bg-white/5 text-neutral-400 hover:text-white'
              }`}
              title={isSaved ? 'Saved in library' : 'Save album to library'}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-accent-red' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tracklist Table */}
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
              onPlay={(s) => onPlayQueue(songs, idx)}
              onTogglePlay={onTogglePlay}
              onToggleLike={onToggleLike}
              onContextMenu={onContextMenu}
              onNavigateToArtist={onNavigateToArtist}
            />
          );
        })}
      </section>

      {/* Other Versions Section */}
      {other_versions && other_versions.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-white/5">
          <h3 className="text-xl font-bold text-white tracking-tight">Other Versions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {other_versions.map((ov, idx) => (
              <MediaCard
                key={idx}
                item={{ type: 'Album', data: ov }}
                onClick={() => onNavigateToAlbum(ov.browse_id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
