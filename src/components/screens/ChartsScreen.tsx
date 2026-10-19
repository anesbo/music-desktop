import React, { useEffect, useState } from 'react';
import { TrendingUp, Loader2, Play } from 'lucide-react';
import { ChartsPage, SongItem, YTItem } from '../../types';
import { api } from '../../services/api';
import { SongRow } from '../common/SongRow';
import { MediaCard } from '../common/MediaCard';
import { ContextMenuState } from '../common/ContextMenu';

interface ChartsScreenProps {
  currentSong: SongItem | null;
  isPlaying: boolean;
  onPlaySong: (song: SongItem) => void;
  onTogglePlay: () => void;
  onToggleLike: (song: SongItem) => void;
  onContextMenu: (e: React.MouseEvent, state: ContextMenuState) => void;
  onNavigateToAlbum: (albumId: string) => void;
  onNavigateToArtist: (artistId: string) => void;
  onNavigateToPlaylist: (playlistId: string) => void;
}

export const ChartsScreen: React.FC<ChartsScreenProps> = ({
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  onToggleLike,
  onContextMenu,
  onNavigateToAlbum,
  onNavigateToArtist,
  onNavigateToPlaylist,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartsPage | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getCharts()
      .then(setData)
      .catch((err) => console.error('Failed to load charts:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-accent-red animate-spin mb-3" />
        <p className="text-sm text-neutral-400">Loading global charts...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-accent-red/10 text-accent-red">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Top Charts & Trending</h1>
          <p className="text-xs text-neutral-400">The most played and trending tracks right now</p>
        </div>
      </div>

      {data?.sections.map((section, sIdx) => {
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
                      onPlay={onPlaySong}
                      onTogglePlay={onTogglePlay}
                      onToggleLike={onToggleLike}
                      onContextMenu={onContextMenu}
                      onNavigateToAlbum={onNavigateToAlbum}
                      onNavigateToArtist={onNavigateToArtist}
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
                    onClick={() => {
                      if (item.type === 'Album') onNavigateToAlbum(item.data.browse_id);
                      if (item.type === 'Artist') onNavigateToArtist(item.data.id);
                      if (item.type === 'Playlist') onNavigateToPlaylist(item.data.id);
                    }}
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
