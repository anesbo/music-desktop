import React, { useEffect, useState } from 'react';
import {
  Heart,
  Music,
  Disc,
  User,
  ListMusic,
  Search,
  Play,
  Shuffle,
  Loader2,
  FolderHeart,
} from 'lucide-react';
import {
  AlbumItem,
  ArtistItem,
  PlaylistItem,
  SongItem,
  YTItem,
} from '../../types';
import { api } from '../../services/api';
import { SongRow } from '../common/SongRow';
import { MediaCard } from '../common/MediaCard';
import { ContextMenuState } from '../common/ContextMenu';

interface LibraryScreenProps {
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
  initialTab?: LibraryTab;
}

export type LibraryTab = 'songs' | 'liked' | 'albums' | 'artists' | 'playlists';

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
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
  initialTab = 'songs',
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Loaded collections
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [likedSongs, setLikedSongs] = useState<SongItem[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'songs') {
        const res = await api.getLibrarySongs();
        setSongs(res);
      } else if (activeTab === 'liked') {
        const res = await api.getLikedSongs();
        setLikedSongs(res);
      } else if (activeTab === 'albums') {
        const res = await api.getLibraryAlbums();
        setAlbums(res);
      } else if (activeTab === 'artists') {
        const res = await api.getLibraryArtists();
        setArtists(res);
      } else if (activeTab === 'playlists') {
        const res = await api.getAllPlaylists();
        setPlaylists(res);
      }
    } catch (err) {
      console.error('Failed to load library data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const displayedSongs = (activeTab === 'liked' ? likedSongs : songs).filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artists.some((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayedAlbums = albums.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedArtists = artists.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedPlaylists = playlists.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayAll = (shuffle: boolean = false) => {
    const list = [...displayedSongs];
    if (list.length === 0) return;
    if (shuffle) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    onPlayQueue(list, 0);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-300">
      {/* Header and Tab Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-accent-red/10 text-accent-red">
            <FolderHeart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Your Library</h1>
            <p className="text-xs text-neutral-400">
              Locally saved tracks, liked music, and custom playlists
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5">
          <button
            onClick={() => setActiveTab('songs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'songs'
                ? 'bg-accent-red text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Songs</span>
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'liked'
                ? 'bg-accent-red text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Liked</span>
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'albums'
                ? 'bg-accent-red text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Albums</span>
          </button>
          <button
            onClick={() => setActiveTab('artists')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'artists'
                ? 'bg-accent-red text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Artists</span>
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'playlists'
                ? 'bg-accent-red text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Playlists</span>
          </button>
        </div>
      </div>

      {/* Action Bar (Search & Play All) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${activeTab}...`}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-accent-red/50"
          />
        </div>

        {(activeTab === 'songs' || activeTab === 'liked') && displayedSongs.length > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => handlePlayAll(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold shadow-lg shadow-accent-red/20 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play All</span>
            </button>
            <button
              onClick={() => handlePlayAll(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold active:scale-95 transition-all"
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-accent-red animate-spin mb-3" />
          <p className="text-sm text-neutral-400">Loading library...</p>
        </div>
      ) : (activeTab === 'songs' || activeTab === 'liked') ? (
        displayedSongs.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-sm">
            No {activeTab === 'liked' ? 'liked' : 'library'} songs found.
          </div>
        ) : (
          <div className="space-y-1">
            {displayedSongs.map((song, idx) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <SongRow
                  key={song.id}
                  song={song}
                  index={idx}
                  isPlaying={isPlaying}
                  isCurrentSong={isCurrent}
                  onPlay={onPlaySong}
                  onTogglePlay={onTogglePlay}
                  onToggleLike={async (s) => {
                    await onToggleLike(s);
                    loadData();
                  }}
                  onContextMenu={onContextMenu}
                  onNavigateToAlbum={onNavigateToAlbum}
                  onNavigateToArtist={onNavigateToArtist}
                />
              );
            })}
          </div>
        )
      ) : activeTab === 'albums' ? (
        displayedAlbums.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-sm">
            No saved albums found in your library.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedAlbums.map((album) => (
              <MediaCard
                key={album.browse_id}
                item={{ type: 'Album', data: album }}
                onClick={() => onNavigateToAlbum(album.browse_id)}
              />
            ))}
          </div>
        )
      ) : activeTab === 'artists' ? (
        displayedArtists.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-sm">
            No saved artists found.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedArtists.map((artist) => (
              <MediaCard
                key={artist.id}
                item={{ type: 'Artist', data: artist }}
                onClick={() => onNavigateToArtist(artist.id)}
              />
            ))}
          </div>
        )
      ) : (
        /* Playlists */
        displayedPlaylists.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-sm">
            No playlists created yet. Create one from the sidebar!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedPlaylists.map((pl) => (
              <MediaCard
                key={pl.id}
                item={{ type: 'Playlist', data: pl }}
                onClick={() => onNavigateToPlaylist(pl.id)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};
