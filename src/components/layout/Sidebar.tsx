import React, { useEffect, useState } from 'react';
import {
  Home,
  Compass,
  TrendingUp,
  Search,
  Heart,
  Music,
  Disc,
  Users,
  ListMusic,
  Clock,
  BarChart2,
  Settings,
  Plus,
  Radio,
  Sliders,
} from 'lucide-react';
import { PlaylistItem, ScreenType } from '../../types';
import { api } from '../../services/api';

interface SidebarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType, param?: string) => void;
  onOpenEqualizer: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  onOpenEqualizer,
}) => {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const loadPlaylists = async () => {
    try {
      const list = await api.getAllPlaylists();
      setPlaylists(list);
    } catch (e) {
      console.warn('Failed to load playlists:', e);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const id = await api.createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
      await loadPlaylists();
      onNavigate('playlist', id);
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };

  const navItemClass = (active: boolean) =>
    `flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
      active
        ? 'bg-velune-500/15 text-velune-400 font-semibold shadow-sm'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
    }`;

  return (
    <aside className="w-64 h-full bg-[#0d0e12] border-r border-white/[0.06] flex flex-col select-none flex-shrink-0 z-20">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.04]">
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-velune-600 to-velune-400 flex items-center justify-center shadow-lg shadow-velune-500/25 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              Velune
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-velune-500/20 text-velune-400 border border-velune-500/30">
                PC
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">Desktop Edition</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Discovery */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Discover
          </div>
          <button
            onClick={() => onNavigate('home')}
            className={navItemClass(currentScreen === 'home')}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            onClick={() => onNavigate('explore')}
            className={navItemClass(currentScreen === 'explore')}
          >
            <Compass className="w-4 h-4" />
            <span>Explore</span>
          </button>
          <button
            onClick={() => onNavigate('charts')}
            className={navItemClass(currentScreen === 'charts')}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Charts</span>
          </button>
          <button
            onClick={() => onNavigate('search')}
            className={navItemClass(currentScreen === 'search')}
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>

        {/* Library Section */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Your Library</span>
            <button
              onClick={() => setIsCreating(true)}
              title="Create Playlist"
              className="p-1 hover:text-white rounded hover:bg-white/[0.06] transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onNavigate('library', 'liked')}
            className={navItemClass(currentScreen === 'library')}
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-velune-600 to-indigo-600 flex items-center justify-center">
              <Heart className="w-3 h-3 text-white fill-white" />
            </div>
            <span>Liked Songs</span>
          </button>

          <button
            onClick={() => onNavigate('library', 'songs')}
            className={navItemClass(false)}
          >
            <Music className="w-4 h-4" />
            <span>Songs</span>
          </button>

          <button
            onClick={() => onNavigate('library', 'albums')}
            className={navItemClass(false)}
          >
            <Disc className="w-4 h-4" />
            <span>Albums</span>
          </button>

          <button
            onClick={() => onNavigate('library', 'artists')}
            className={navItemClass(false)}
          >
            <Users className="w-4 h-4" />
            <span>Artists</span>
          </button>

          <button
            onClick={() => onNavigate('stats')}
            className={navItemClass(currentScreen === 'stats')}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Stats & Insights</span>
          </button>
        </div>

        {/* Custom Playlists */}
        <div className="space-y-1 pt-2 border-t border-white/[0.04]">
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Playlists</span>
            <span className="text-[10px] text-slate-600">{playlists.length}</span>
          </div>

          {isCreating && (
            <form onSubmit={handleCreatePlaylist} className="px-2 py-1">
              <input
                autoFocus
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onBlur={() => !newPlaylistName.trim() && setIsCreating(false)}
                placeholder="Playlist name..."
                className="w-full px-3 py-1.5 text-xs rounded bg-white/[0.08] text-white border border-velune-500/40 focus:outline-none"
              />
            </form>
          )}

          <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => onNavigate('playlist', pl.id)}
                className="w-full text-left px-3.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] truncate transition block"
              >
                {pl.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <button
          onClick={onOpenEqualizer}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
        >
          <Sliders className="w-4 h-4 text-velune-400" />
          <span>10-Band Equalizer</span>
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentScreen === 'settings'
              ? 'bg-velune-500/15 text-velune-400 font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
