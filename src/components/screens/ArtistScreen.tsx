import React, { useEffect, useState } from 'react';
import {
  Play,
  Shuffle,
  Bookmark,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ArtistPage, SongItem, YTItem } from '../../types';
import { api } from '../../services/api';
import { SongRow } from '../common/SongRow';
import { MediaCard } from '../common/MediaCard';
import { ContextMenuState } from '../common/ContextMenu';

interface ArtistScreenProps {
  browseId: string;
  currentSong: SongItem | null;
  isPlaying: boolean;
  onPlaySong: (song: SongItem) => void;
  onPlayQueue: (songs: SongItem[], startIndex?: number) => void;
  onTogglePlay: () => void;
  onToggleLike: (song: SongItem) => void;
  onContextMenu: (e: React.MouseEvent, state: ContextMenuState) => void;
  onNavigateToAlbum: (albumId: string) => void;
  onNavigateToArtist: (artistId: string) => void;
  onNavigateToPlaylist: (playlistId: string) => void;
}

export const ArtistScreen: React.FC<ArtistScreenProps> = ({
  browseId,
  currentSong,
  isPlaying,
  onPlaySong,
  onPlayQueue,
  onTogglePlay,
  onToggleLike,
  onContextMenu,
  onNavigateToAlbum,
  onNavigateToArtist,
  onNavigateToPlaylist,
}) => {
  const [data, setData] = useState<ArtistPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getArtist(browseId)
      .then((res) => {
        setData(res);
        setIsBookmarked(!!res.artist.bookmarked_at);
      })
      .catch((err) => console.error('Failed to load artist:', err))
      .finally(() => setLoading(false));
  }, [browseId]);

  const handleToggleBookmark = async () => {
    if (!data?.artist) return;
    try {
      const updatedArtist = {
        ...data.artist,
        bookmarked_at: isBookmarked ? 0 : Date.now(),
      };
      await api.upsertArtist(updatedArtist);
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error('Failed to bookmark artist:', err);
    }
  };

  const handleMediaClick = (item: YTItem) => {
    switch (item.type) {
      case 'Song':
        onPlaySong(item.data);
        break;
      case 'Album':
        onNavigateToAlbum(item.data.browse_id);
        break;
      case 'Artist':
        onNavigateToArtist(item.data.id);
        break;
      case 'Playlist':
        onNavigateToPlaylist(item.data.id);
        break;
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-accent-red animate-spin mb-3" />
        <p className="text-sm text-neutral-400">Loading artist...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-neutral-400">
        Artist could not be found.
      </div>
    );
  }

  const { artist, sections, description } = data;

  // Extract all songs from sections to allow "Play Artist"
  const allSongs: SongItem[] = [];
  sections.forEach((sec) => {
    sec.items.forEach((it) => {
      if (it.type === 'Song') allSongs.push(it.data);
    });
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Artist Banner */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-8 pb-4">
        {/* Artist Avatar */}
        <div className="relative w-44 h-44 md:w-52 md:h-52 rounded-full overflow-hidden shadow-2xl flex-shrink-0 bg-neutral-900 border-2 border-white/10">
          <img
            src={artist.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}
            alt={artist.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Artist Info */}
        <div className="flex flex-col space-y-3 text-center md:text-left min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-red">
            Verified Artist
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {artist.title}
          </h1>

          <div className="flex items-center justify-center md:justify-start gap-3 text-sm text-neutral-400">
            {artist.subscribers && <span>{artist.subscribers}</span>}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
            {allSongs.length > 0 && (
              <button
                onClick={() => onPlayQueue(allSongs, 0)}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent-red hover:bg-accent-red-hover text-white font-bold text-sm shadow-xl shadow-accent-red/30 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Play</span>
              </button>
            )}
            <button
              onClick={handleToggleBookmark}
              className={`flex items-center gap-2 px-5 py-3 rounded-full border border-white/10 text-xs font-bold transition-all ${
                isBookmarked
                  ? 'bg-accent-red/20 text-accent-red border-accent-red/40'
                  : 'bg-white/5 text-neutral-300 hover:text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-accent-red' : ''}`} />
              <span>{isBookmarked ? 'Following' : 'Follow'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Description / Bio */}
      {description && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-neutral-300 leading-relaxed max-w-3xl">
          {description}
        </div>
      )}

      {/* Artist Sections (Top songs, Albums, Singles, etc.) */}
      {sections.map((section, sIdx) => {
        const isSongSection = section.items.some((it) => it.type === 'Song');

        return (
          <section key={sIdx} className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {section.title}
            </h2>

            {isSongSection ? (
              <div className="space-y-1">
                {section.items.map((item, idx) => {
                  if (item.type !== 'Song') return null;
                  const song = item.data;
                  const isCurrent = currentSong?.id === song.id;

                  return (
                    <SongRow
                      key={song.id || idx}
                      song={song}
                      index={idx}
                      isPlaying={isPlaying}
                      isCurrentSong={isCurrent}
                      onPlay={(s) => onPlaySong(s)}
                      onTogglePlay={onTogglePlay}
                      onToggleLike={onToggleLike}
                      onContextMenu={onContextMenu}
                      onNavigateToAlbum={onNavigateToAlbum}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {section.items.map((item, idx) => (
                  <MediaCard
                    key={idx}
                    item={item}
                    onClick={() => handleMediaClick(item)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
