import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, Play } from 'lucide-react';
import { HomePage, HomeChip, SongItem, YTItem } from '../../types';
import { api } from '../../services/api';
import { MediaCard } from '../common/MediaCard';

interface HomeScreenProps {
  onPlaySong: (song: SongItem) => void;
  onNavigateToAlbum: (albumId: string) => void;
  onNavigateToArtist: (artistId: string) => void;
  onNavigateToPlaylist: (playlistId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlaySong,
  onNavigateToAlbum,
  onNavigateToArtist,
  onNavigateToPlaylist,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const loadHome = async (params?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHome(params);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load home page:', err);
      setError(err?.message || 'Failed to connect to music service. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  const handleChipClick = (chip: HomeChip) => {
    if (selectedChip === chip.title) {
      setSelectedChip(null);
      loadHome();
    } else {
      setSelectedChip(chip.title);
      loadHome(chip.params);
    }
  };

  const handleItemClick = (item: YTItem) => {
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
        <p className="text-sm text-neutral-400">Loading your feed...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-accent-red">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Unable to load feed</h3>
        <p className="text-sm text-neutral-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => loadHome(selectedChip || undefined)}
          className="px-6 py-2.5 rounded-full bg-accent-red hover:bg-accent-red/90 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-accent-red/20 active:scale-95"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Category Chips Bar */}
      {data?.chips && data.chips.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {data.chips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedChip === chip.title
                  ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                  : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {chip.title}
            </button>
          ))}
        </div>
      )}

      {/* Sections */}
      {data?.sections.map((section, sIdx) => {
        if (!section.items || section.items.length === 0) return null;

        // Separate quick picks if they are mostly songs
        const isQuickPicks = sIdx === 0 && section.items.every((it) => it.type === 'Song');

        return (
          <section key={sIdx} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {section.title}
              </h2>
            </div>

            {isQuickPicks ? (
              /* Quick Picks 4x2 or 4x1 grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {section.items.slice(0, 12).map((item, idx) => {
                  if (item.type !== 'Song') return null;
                  const song = item.data;
                  return (
                    <div
                      key={song.id || idx}
                      onClick={() => onPlaySong(song)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                    >
                      <img
                        src={song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white truncate group-hover:text-accent-red transition-colors">
                          {song.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          {song.artists.map((a) => a.name).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlaySong(song);
                        }}
                        className="w-8 h-8 rounded-full bg-accent-red text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all shadow-lg flex-shrink-0"
                      >
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Responsive card grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {section.items.map((item, idx) => (
                  <MediaCard
                    key={idx}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    onPlayClick={
                      item.type === 'Song'
                        ? () => onPlaySong(item.data)
                        : undefined
                    }
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
