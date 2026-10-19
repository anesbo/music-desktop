import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Sliders,
  ListMusic,
  Quote,
  Loader2,
} from 'lucide-react';
import { audio, AudioState } from '../../services/audio';
import { api } from '../../services/api';

interface PlayerBarProps {
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onOpenEqualizer: () => void;
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  onToggleLyrics,
  onToggleQueue,
  onOpenEqualizer,
  isLyricsOpen,
  isQueueOpen,
}) => {
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

  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const unsub = audio.subscribe((state) => {
      setAudioState(state);
      if (state.currentSong) {
        setIsLiked(state.currentSong.liked);
      }
    });
    return unsub;
  }, []);

  const handleToggleLike = async () => {
    if (!audioState.currentSong) return;
    try {
      const liked = await api.toggleLike(audioState.currentSong.id);
      setIsLiked(liked);
      audioState.currentSong.liked = liked;
    } catch (e) {
      console.warn('Failed to toggle like:', e);
    }
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const current = audioState.currentSong;

  return (
    <footer className="h-22 w-full bg-[#0D0E12]/95 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-between px-6 select-none z-30 flex-shrink-0">
      {/* Left: Track Information */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
        {current ? (
          <>
            <div className="relative group w-13 h-13 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 shadow-md">
              <img
                src={current.thumbnail}
                alt={current.title}
                className="w-full h-full object-cover"
              />
              {audioState.isLoadingStream && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-velune-400 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
                {current.title}
              </span>
              <span className="text-xs text-slate-400 truncate hover:text-slate-200 cursor-pointer">
                {current.artists.map((a) => a.name).join(', ') || 'Unknown Artist'}
              </span>
            </div>

            <button
              onClick={handleToggleLike}
              className={`p-2 rounded-full hover:bg-white/[0.08] transition ${
                isLiked ? 'text-velune-500 fill-velune-500' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-velune-500' : ''}`} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-600">
              <Quote className="w-5 h-5" />
            </div>
            <span className="text-xs text-slate-500 font-medium">No track playing</span>
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Timeline Slider */}
      <div className="flex flex-col items-center max-w-xl w-2/4 px-4">
        <div className="flex items-center gap-4 mb-1">
          {/* Shuffle */}
          <button
            onClick={() => audio.toggleShuffle()}
            title="Shuffle"
            className={`p-1.5 rounded-full transition ${
              audioState.isShuffled ? 'text-velune-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous Track */}
          <button
            onClick={() => audio.skipPrev()}
            title="Previous Track (Arrow Left)"
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/[0.06] transition"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          {/* Play / Pause Toggle Button */}
          <button
            onClick={() => audio.togglePlay()}
            title="Play / Pause (Space)"
            className="w-10 h-10 rounded-full bg-velune-500 hover:bg-velune-400 text-white flex items-center justify-center shadow-lg shadow-velune-500/30 hover:scale-105 active:scale-95 transition-transform"
          >
            {audioState.isPlaying ? (
              <Pause className="w-5 h-5 fill-white text-white" />
            ) : (
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={() => audio.skipNext()}
            title="Next Track (Arrow Right)"
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/[0.06] transition"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          {/* Repeat Mode */}
          <button
            onClick={() => audio.toggleRepeat()}
            title={`Repeat: ${audioState.repeatMode}`}
            className={`p-1.5 rounded-full transition ${
              audioState.repeatMode !== 'off' ? 'text-velune-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            {audioState.repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Timeline Slider with live progress */}
        <div className="w-full flex items-center gap-2.5 text-[11px] text-slate-400 font-mono">
          <span className="w-9 text-right">{formatTime(audioState.currentTime)}</span>
          <div className="flex-1 relative flex items-center group">
            <input
              type="range"
              min={0}
              max={audioState.duration || 100}
              value={audioState.currentTime}
              onChange={(e) => audio.seek(Number(e.target.value))}
              className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer group-hover:h-1.5 transition-all"
            />
          </div>
          <span className="w-9">{formatTime(audioState.duration)}</span>
        </div>
      </div>

      {/* Right: Toggles & Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* Equalizer Modal Toggle */}
        <button
          onClick={onOpenEqualizer}
          title="10-Band Equalizer"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Lyrics Drawer Toggle */}
        <button
          onClick={onToggleLyrics}
          title="Synced Lyrics"
          className={`p-2 rounded-lg transition ${
            isLyricsOpen
              ? 'bg-velune-500/20 text-velune-400'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Quote className="w-4 h-4" />
        </button>

        {/* Queue Drawer Toggle */}
        <button
          onClick={onToggleQueue}
          title="Playing Queue"
          className={`p-2 rounded-lg transition relative ${
            isQueueOpen
              ? 'bg-velune-500/20 text-velune-400'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          {audioState.queue.length > 0 && (
            <span className="absolute 1 top-1.5 right-1.5 w-2 h-2 rounded-full bg-velune-500 ring-2 ring-[#0e1014]" />
          )}
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
          <button
            onClick={() => audio.toggleMute()}
            className="text-slate-400 hover:text-white transition"
          >
            {audioState.isMuted || audioState.volume === 0 ? (
              <VolumeX className="w-4 h-4 text-velune-400" />
            ) : audioState.volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={audioState.isMuted ? 0 : audioState.volume}
            onChange={(e) => audio.setVolume(Number(e.target.value))}
            className="w-20 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
};
