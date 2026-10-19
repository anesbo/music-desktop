import React, { useEffect, useState } from 'react';
import { ScreenType, SongItem } from './types';
import { audio, AudioState } from './services/audio';
import { api } from './services/api';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { PlayerBar } from './components/layout/PlayerBar';
import { RightDrawer } from './components/layout/RightDrawer';

// Modals
import { EqualizerModal } from './components/common/EqualizerModal';
import { ContextMenu, ContextMenuState } from './components/common/ContextMenu';

// Screen Components
import { HomeScreen } from './components/screens/HomeScreen';
import { ExploreScreen } from './components/screens/ExploreScreen';
import { ChartsScreen } from './components/screens/ChartsScreen';
import { SearchScreen } from './components/screens/SearchScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { AlbumScreen } from './components/screens/AlbumScreen';
import { ArtistScreen } from './components/screens/ArtistScreen';
import { PlaylistScreen } from './components/screens/PlaylistScreen';
import { StatsScreen } from './components/screens/StatsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

interface HistoryEntry {
  screen: ScreenType;
  param?: string;
}

export const App: React.FC = () => {
  // Navigation State
  const [navHistory, setNavHistory] = useState<HistoryEntry[]>([{ screen: 'home' }]);
  const [navIndex, setNavIndex] = useState<number>(0);

  const currentNav = navHistory[navIndex] || { screen: 'home' };
  const currentScreen = currentNav.screen;
  const currentParam = currentNav.param;

  // Drawer & Modal State
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [rightDrawerTab, setRightDrawerTab] = useState<'queue' | 'lyrics'>('lyrics');
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);

  // Audio State from AudioEngine singleton
  const [audioState, setAudioState] = useState<AudioState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    repeatMode: 'off',
    isShuffled: false,
    queue: [],
    history: [],
    isLoadingStream: false,
  });

  useEffect(() => {
    const unsub = audio.subscribe((state) => {
      setAudioState(state);
    });
    return unsub;
  }, []);

  // Navigation handlers
  const navigate = (screen: ScreenType, param?: string) => {
    const newEntry: HistoryEntry = { screen, param };
    const updatedHistory = navHistory.slice(0, navIndex + 1);
    updatedHistory.push(newEntry);
    setNavHistory(updatedHistory);
    setNavIndex(updatedHistory.length - 1);
  };

  const handleGoBack = () => {
    if (navIndex > 0) {
      setNavIndex(navIndex - 1);
    }
  };

  const handleGoForward = () => {
    if (navIndex < navHistory.length - 1) {
      setNavIndex(navIndex + 1);
    }
  };

  // Playback handlers
  const handlePlaySong = (song: SongItem) => {
    audio.playSong(song);
  };

  const handlePlayQueue = (songs: SongItem[], startIndex: number = 0) => {
    if (songs.length === 0) return;
    const targetSong = songs[startIndex];
    const rest = [...songs.slice(startIndex + 1), ...songs.slice(0, startIndex)];
    audio.clearQueue();
    audio.addToQueue(rest);
    audio.playSong(targetSong);
  };

  const handleToggleLike = async (song: SongItem) => {
    try {
      const isLiked = await api.toggleLike(song.id);
      if (audioState.currentSong?.id === song.id) {
        audioState.currentSong.liked = isLiked;
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, state: ContextMenuState) => {
    setContextMenuState(state);
  };

  // Render appropriate screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            onPlaySong={handlePlaySong}
            onNavigateToAlbum={(id) => navigate('album', id)}
            onNavigateToArtist={(id) => navigate('artist', id)}
            onNavigateToPlaylist={(id) => navigate('playlist', id)}
          />
        );

      case 'explore':
        return (
          <ExploreScreen
            onPlaySong={handlePlaySong}
            onNavigateToAlbum={(id) => navigate('album', id)}
            onNavigateToArtist={(id) => navigate('artist', id)}
            onNavigateToPlaylist={(id) => navigate('playlist', id)}
            onSearchGenre={(genre) => navigate('search', genre)}
          />
        );

      case 'charts':
        return (
          <ChartsScreen
            currentSong={audioState.currentSong}
            isPlaying={audioState.isPlaying}
            onPlaySong={handlePlaySong}
            onTogglePlay={() => audio.togglePlay()}
            onToggleLike={handleToggleLike}
            onContextMenu={handleContextMenu}
            onNavigateToAlbum={(id) => navigate('album', id)}
            onNavigateToArtist={(id) => navigate('artist', id)}
            onNavigateToPlaylist={(id) => navigate('playlist', id)}
          />
        );

      case 'search':
        return (
          <SearchScreen
            query={currentParam || ''}
            currentSong={audioState.currentSong}
            isPlaying={audioState.isPlaying}
            onPlaySong={handlePlaySong}
            onTogglePlay={() => audio.togglePlay()}
            onToggleLike={handleToggleLike}
            onContextMenu={handleContextMenu}
            onNavigateToAlbum={(id) => navigate('album', id)}
            onNavigateToArtist={(id) => navigate('artist', id)}
            onNavigateToPlaylist={(id) => navigate('playlist', id)}
          />
        );

      case 'library':
        return (
          <LibraryScreen
            currentSong={audioState.currentSong}
            isPlaying={audioState.isPlaying}
            onPlaySong={handlePlaySong}
            onPlayQueue={handlePlayQueue}
            onTogglePlay={() => audio.togglePlay()}
            onToggleLike={handleToggleLike}
            onContextMenu={handleContextMenu}
            onNavigateToAlbum={(id) => navigate('album', id)}
            onNavigateToArtist={(id) => navigate('artist', id)}
            onNavigateToPlaylist={(id) => navigate('playlist', id)}
          />
        );

      case 'album':
        return (
          <AlbumScreen
            browseId={currentParam || ''}
            currentSong={audioState.currentSong}
            isPlaying={audioState.isPlaying}
            onPlaySong={handlePlaySong}
            onPlayQueue={handlePlayQueue}
            onTogglePlay={() => audio.togglePlay()}
            onToggleLike={handleToggleLike}
            onContextMenu={handleContextMenu}
            onNavigateToArtist={(id) => navigate('artist', id)}
            onNavigateToAlbum={(id) => navigate('album', id)}
          />
        );

      case 'artist':
        return (
          <ArtistScreen
            browseId={currentParam || ''}
            currentSong={audioState.currentSong}
            isPlaying={audioState.isPlaying}
            onPlaySong={handlePlaySong}
            onPlayQueue={handlePlayQueue}
            onTogglePlay={() => audio.togglePlay()}
            onToggleLike={handleToggleLike}
            onContextMenu={handleContextMenu}
            onNavigateToAlbum={(id) => navigate('album', id)}
            onNavigateToArtist={(id) => navigate('artist', id)}
            onNavigateToPlaylist={(id) => navigate('playlist', id)}
          />
        );

      case 'playlist':
        return (
          <PlaylistScreen
            playlistId={currentParam || ''}
            currentSong={audioState.currentSong}
            isPlaying={audioState.isPlaying}
            onPlaySong={handlePlaySong}
            onPlayQueue={handlePlayQueue}
            onTogglePlay={() => audio.togglePlay()}
            onToggleLike={handleToggleLike}
            onContextMenu={handleContextMenu}
            onNavigateToAlbum={(id) => navigate('album', id)}
            onNavigateToArtist={(id) => navigate('artist', id)}
            onDeletePlaylist={() => navigate('library')}
          />
        );

      case 'stats':
        return <StatsScreen onPlaySong={handlePlaySong} />;

      case 'settings':
        return <SettingsScreen />;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0B0E] text-white font-sans select-none">
      {/* Top Main Section (Sidebar + Center Content + Right Drawer) */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={(screen, param) => navigate(screen, param)}
          onOpenEqualizer={() => setIsEqualizerOpen(true)}
        />

        {/* Center Main Stage */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0A0B0E]">
          <TopBar
            canGoBack={navIndex > 0}
            canGoForward={navIndex < navHistory.length - 1}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            onSearchSubmit={(q) => navigate('search', q)}
            onOpenEqualizer={() => setIsEqualizerOpen(true)}
            initialQuery={currentScreen === 'search' ? currentParam : ''}
          />

          <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
            {renderScreen()}
          </main>
        </div>

        {/* Right Drawer (Lyrics / Queue / Canvas) */}
        <RightDrawer
          isOpen={isRightDrawerOpen}
          activeTab={rightDrawerTab}
          onClose={() => setIsRightDrawerOpen(false)}
          onTabChange={(tab) => setRightDrawerTab(tab)}
        />
      </div>

      {/* Bottom Floating/Docked Player Bar */}
      <PlayerBar
        isLyricsOpen={isRightDrawerOpen && rightDrawerTab === 'lyrics'}
        isQueueOpen={isRightDrawerOpen && rightDrawerTab === 'queue'}
        onToggleLyrics={() => {
          if (isRightDrawerOpen && rightDrawerTab === 'lyrics') {
            setIsRightDrawerOpen(false);
          } else {
            setRightDrawerTab('lyrics');
            setIsRightDrawerOpen(true);
          }
        }}
        onToggleQueue={() => {
          if (isRightDrawerOpen && rightDrawerTab === 'queue') {
            setIsRightDrawerOpen(false);
          } else {
            setRightDrawerTab('queue');
            setIsRightDrawerOpen(true);
          }
        }}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
      />

      {/* Equalizer & Audio FX Modal */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
      />

      {/* Song Context Menu */}
      <ContextMenu
        state={contextMenuState}
        onClose={() => setContextMenuState(null)}
        onPlayNow={(s) => audio.playSong(s)}
        onPlayNext={(s) => audio.playNext(s)}
        onAddToQueue={(s) => audio.addToQueue(s)}
        onToggleLike={handleToggleLike}
        onNavigateToAlbum={(id) => navigate('album', id)}
        onNavigateToArtist={(id) => navigate('artist', id)}
      />
    </div>
  );
};

export default App;
