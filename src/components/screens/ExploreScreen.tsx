import React, { useEffect, useState } from 'react';
import { Compass, Loader2, Sparkles, Flame, Radio } from 'lucide-react';
import { HomePage, YTItem, SongItem } from '../../types';
import { api } from '../../services/api';
import { MediaCard } from '../common/MediaCard';

interface ExploreScreenProps {
  onPlaySong: (song: SongItem) => void;
  onNavigateToAlbum: (albumId: string) => void;
  onNavigateToArtist: (artistId: string) => void;
  onNavigateToPlaylist: (playlistId: string) => void;
  onSearchGenre: (genre: string) => void;
}

const GENRE_CARDS = [
  { name: 'Hip-Hop', gradient: 'from-orange-500 to-red-600' },
  { name: 'Pop', gradient: 'from-pink-500 to-rose-600' },
  { name: 'Electronic / EDM', gradient: 'from-cyan-500 to-blue-600' },
  { name: 'Rock & Metal', gradient: 'from-red-600 to-amber-700' },
  { name: 'R&B & Soul', gradient: 'from-purple-600 to-indigo-700' },
  { name: 'Lo-Fi & Chill', gradient: 'from-teal-500 to-emerald-700' },
  { name: 'Indie & Alt', gradient: 'from-emerald-500 to-green-700' },
  { name: 'Classical & Study', gradient: 'from-amber-600 to-orange-700' },
  { name: 'Jazz & Blues', gradient: 'from-blue-600 to-slate-800' },
  { name: 'Gaming / Workout', gradient: 'from-fuchsia-600 to-purple-800' },
];

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  onPlaySong,
  onNavigateToAlbum,
  onNavigateToArtist,
  onNavigateToPlaylist,
  onSearchGenre,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomePage | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getExplore()
      .then(setData)
      .catch((err) => console.error('Failed to load explore:', err))
      .finally(() => setLoading(false));
  }, []);

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
        <p className="text-sm text-neutral-400">Discovering new music...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-accent-red/20 via-purple-600/10 to-transparent border border-white/10 p-8">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2 text-accent-red font-semibold text-xs uppercase tracking-wider">
            <Compass className="w-4 h-4" /> Explore & Discover
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            Find what's new and trending worldwide
          </h1>
          <p className="text-sm text-neutral-300">
            Browse through curated mood mixes, new releases, and global genre charts.
          </p>
        </div>
      </div>

      {/* Moods & Genres Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Flame className="w-5 h-5 text-accent-red" /> Moods & Genres
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {GENRE_CARDS.map((genre) => (
            <div
              key={genre.name}
              onClick={() => onSearchGenre(genre.name)}
              className={`group relative h-28 rounded-2xl bg-gradient-to-br ${genre.gradient} p-4 flex flex-col justify-between overflow-hidden shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer`}
            >
              <h3 className="font-bold text-base text-white">{genre.name}</h3>
              <div className="self-end p-2 rounded-full bg-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                <Radio className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Explore Sections from InnerTube */}
      {data?.sections.map((section, idx) => (
        <section key={idx} className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {section.title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {section.items.map((item, itemIdx) => (
              <MediaCard
                key={itemIdx}
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
        </section>
      ))}
    </div>
  );
};
