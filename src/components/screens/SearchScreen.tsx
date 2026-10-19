import React, { useEffect, useState } from 'react';
import { Search, Loader2, Music, Disc, User, ListMusic } from 'lucide-react';
import {
  SearchSummaryPage,
  SearchResult,
  SongItem,
  YTItem,
} from '../../types';
import { api } from '../../services/api';
import { SongRow } from '../common/SongRow';
import { MediaCard } from '../common/MediaCard';
import { ContextMenuState } from '../common/ContextMenu';

interface SearchScreenProps {
  query: string;
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

type FilterTab = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

export const SearchScreen: React.FC<SearchScreenProps> = ({
  query,
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
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SearchSummaryPage | null>(null);
  const [filteredItems, setFilteredItems] = useState<YTItem[]>([]);

  useEffect(() => {
    if (!query.trim()) return;

    setLoading(true);
    if (activeTab === 'all') {
      api.getSearchSummary(query)
        .then(setSummaryData)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      let filterParam: string | undefined;
      if (activeTab === 'songs') filterParam = 'songs';
      if (activeTab === 'albums') filterParam = 'albums';
      if (activeTab === 'artists') filterParam = 'artists';
      if (activeTab === 'playlists') filterParam = 'playlists';

      api.search(query, filterParam)
        .then((res) => setFilteredItems(res.items))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [query, activeTab]);

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

  const tabs: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'songs', label: 'Songs', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'albums', label: 'Albums', icon: <Disc className="w-3.5 h-3.5" /> },
    { id: 'artists', label: 'Artists', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'playlists', label: 'Playlists', icon: <ListMusic className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-300">
      {/* Search Header & Filter Tabs */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Results for <span className="text-accent-red">"{query}"</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <Loader2 className="w-8 h-8 text-accent-red animate-spin mb-3" />
          <p className="text-sm text-neutral-400">Searching YouTube Music...</p>
        </div>
      ) : activeTab === 'all' ? (
        /* Summary view */
        <div className="space-y-8">
          {summaryData?.summaries.map((summary, sIdx) => {
            const isSongSection = summary.items.some((it) => it.type === 'Song');

            return (
              <section key={sIdx} className="space-y-4">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {summary.title}
                </h2>

                {isSongSection ? (
                  <div className="space-y-1">
                    {summary.items.map((item, idx) => {
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
                    {summary.items.map((item, idx) => (
                      <MediaCard
                        key={idx}
                        item={item}
                        onClick={() => handleMediaClick(item)}
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
      ) : (
        /* Filtered List View */
        <div>
          {activeTab === 'songs' ? (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => {
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
              {filteredItems.map((item, idx) => (
                <MediaCard
                  key={idx}
                  item={item}
                  onClick={() => handleMediaClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
