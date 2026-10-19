import React, { useEffect, useState } from 'react';
import { BarChart2, Play, Flame, Clock, Music, Loader2 } from 'lucide-react';
import { PlayCountStat, SongItem } from '../../types';
import { api } from '../../services/api';

interface StatsScreenProps {
  onPlaySong: (song: SongItem) => void;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ onPlaySong }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlayCountStat[]>([]);

  useEffect(() => {
    setLoading(true);
    api.getTopPlayedSongs(50)
      .then(setStats)
      .catch((err) => console.error('Failed to load stats:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-accent-red animate-spin mb-3" />
        <p className="text-sm text-neutral-400">Calculating your listening stats...</p>
      </div>
    );
  }

  const totalPlays = stats.reduce((acc, s) => acc + s.play_count, 0);
  const totalPlaySeconds = stats.reduce((acc, s) => acc + s.total_play_time, 0);
  const totalHours = Math.floor(totalPlaySeconds / 3600);
  const totalRemainingMinutes = Math.floor((totalPlaySeconds % 3600) / 60);

  const maxPlayCount = stats.length > 0 ? stats[0].play_count : 1;

  const handlePlayStat = (s: PlayCountStat) => {
    const songItem: SongItem = {
      id: s.song_id,
      title: s.title,
      artists: [{ name: s.artist_name }],
      thumbnail: s.thumbnail_url || '',
      explicit: false,
      liked: false,
      total_play_time: s.total_play_time,
      is_local: false,
    };
    onPlaySong(songItem);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-accent-red/10 text-accent-red">
          <BarChart2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Listening Statistics</h1>
          <p className="text-xs text-neutral-400">
            Insights on your most played tracks and personal music habits
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Clock className="w-4 h-4 text-accent-red" />
            <span>Total Listening Time</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalHours}h {totalRemainingMinutes}m
          </p>
          <p className="text-[11px] text-neutral-500">Across all recorded playback</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Total Plays</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalPlays}</p>
          <p className="text-[11px] text-neutral-500">Completed play sessions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Music className="w-4 h-4 text-purple-400" />
            <span>Unique Tracks</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.length}</p>
          <p className="text-[11px] text-neutral-500">Different songs enjoyed</p>
        </div>
      </div>

      {/* Top 50 Songs Leaderboard */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Top Played Songs</h2>

        {stats.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-sm">
            No playback events recorded yet. Start listening to tracks to see your stats!
          </div>
        ) : (
          <div className="space-y-2">
            {stats.map((s, idx) => {
              const percentage = Math.round((s.play_count / maxPlayCount) * 100);

              return (
                <div
                  key={s.song_id}
                  onClick={() => handlePlayStat(s)}
                  className="group relative flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all cursor-pointer overflow-hidden"
                >
                  {/* Subtle progress fill */}
                  <div
                    style={{ width: `${percentage}%` }}
                    className="absolute inset-y-0 left-0 bg-accent-red/[0.07] pointer-events-none transition-all duration-500"
                  />

                  {/* Left rank & info */}
                  <div className="relative flex items-center gap-4 min-w-0 z-10">
                    <span className="w-6 text-center text-xs font-bold text-neutral-500 group-hover:text-accent-red">
                      #{idx + 1}
                    </span>

                    <img
                      src={s.thumbnail_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-accent-red transition-colors">
                        {s.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">{s.artist_name}</p>
                    </div>
                  </div>

                  {/* Right count */}
                  <div className="relative flex items-center gap-4 z-10 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">{s.play_count}</span>
                      <span className="text-[11px] text-neutral-500 ml-1">plays</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayStat(s);
                      }}
                      className="p-2 rounded-full bg-accent-red text-white opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
