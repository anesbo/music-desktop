import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Music, Video, Sparkles, RefreshCw } from 'lucide-react';
import { audio, AudioState } from '../../services/audio';
import { CanvasArtwork, LyricsLine, LyricsResult, SongItem } from '../../types';
import { api } from '../../services/api';

interface RightDrawerProps {
  isOpen: boolean;
  activeTab: 'queue' | 'lyrics';
  onClose: () => void;
  onTabChange: (tab: 'queue' | 'lyrics') => void;
}

export const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  activeTab,
  onClose,
  onTabChange,
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

  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);
  const [canvasArtwork, setCanvasArtwork] = useState<CanvasArtwork | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = audio.subscribe((state) => {
      setAudioState(state);
    });
    return unsub;
  }, []);

  // Fetch Lyrics & Canvas when track changes
  useEffect(() => {
    const song = audioState.currentSong;
    if (!song) {
      setLyricsResult(null);
      setCanvasArtwork(null);
      return;
    }

    const artistName = song.artists.map((a) => a.name).join(', ') || 'Unknown';

    setIsLoadingLyrics(true);
    api.getLyrics(song.title, artistName, song.id, song.duration)
      .then((res) => {
        setLyricsResult(res);
        setIsLoadingLyrics(false);
      })
      .catch((e) => {
        console.warn('Lyrics load failed:', e);
        setIsLoadingLyrics(false);
      });

    api.getCanvas(song.title, artistName)
      .then((canvas) => {
        setCanvasArtwork(canvas);
      })
      .catch(console.warn);
  }, [audioState.currentSong?.id]);

  // Scroll active lyrics line into view smoothly
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [audioState.currentTime]);

  if (!isOpen) return null;

  const currentMs = audioState.currentTime * 1000;
  const currentSong = audioState.currentSong;

  // Determine active lyrics line index
  let activeIndex = -1;
  if (lyricsResult && lyricsResult.synced.length > 0) {
    for (let i = 0; i < lyricsResult.synced.length; i++) {
      if (currentMs >= lyricsResult.synced[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  return (
    <aside className="w-96 h-full glass-panel border-l border-white/[0.08] flex flex-col select-none flex-shrink-0 z-20 relative overflow-hidden transition-all duration-300">
      {/* Background Canvas Video or Blurred Artwork */}
      {activeTab === 'lyrics' && (
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden opacity-30">
          {canvasArtwork?.video_url ? (
            <video
              src={canvasArtwork.video_url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-110 blur-sm"
            />
          ) : currentSong?.thumbnail ? (
            <img
              src={currentSong.thumbnail}
              alt=""
              className="w-full h-full object-cover scale-150 blur-3xl filter brightness-50"
            />
          ) : null}
          <div className="absolute inset-0 bg-[#0d0e12]/80 backdrop-blur-md" />
        </div>
      )}

      {/* Drawer Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-white/[0.06] bg-[#101217]/60">
        <div className="flex items-center gap-1 bg-white/[0.05] p-1 rounded-lg">
          <button
            onClick={() => onTabChange('queue')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeTab === 'queue'
                ? 'bg-velune-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Queue ({audioState.queue.length})
          </button>
          <button
            onClick={() => onTabChange('lyrics')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'lyrics'
                ? 'bg-velune-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Lyrics</span>
            {canvasArtwork && <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />}
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Queue Content */}
      {activeTab === 'queue' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Now Playing Card */}
          {currentSong && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Now Playing
              </span>
              <div className="p-3 rounded-xl bg-velune-500/10 border border-velune-500/30 flex items-center gap-3">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">
                    {currentSong.title}
                  </h4>
                  <p className="text-xs text-velune-400 truncate">
                    {currentSong.artists.map((a) => a.name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Queue List Header */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Up Next
            </span>
            {audioState.queue.length > 0 && (
              <button
                onClick={() => audio.clearQueue()}
                className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Queue Items */}
          {audioState.queue.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
              <Music className="w-8 h-8 opacity-40" />
              <p className="text-xs">Queue is empty</p>
            </div>
          ) : (
            <div className="space-y-1">
              {audioState.queue.map((song, idx) => (
                <div
                  key={`${song.id}-${idx}`}
                  className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition cursor-pointer"
                  onClick={() => audio.playSong(song)}
                >
                  <span className="text-xs text-slate-500 w-4 text-center font-mono">
                    {idx + 1}
                  </span>
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {song.artists.map((a) => a.name).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.removeFromQueue(idx);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-400 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lyrics Content */}
      {activeTab === 'lyrics' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Provider Badge */}
          {lyricsResult && (
            <div className="px-5 py-2 flex items-center justify-between text-[11px] text-slate-400 border-b border-white/[0.04]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Provider: <strong className="text-slate-200">{lyricsResult.provider}</strong>
              </span>
              {canvasArtwork && (
                <span className="flex items-center gap-1 text-velune-400">
                  <Video className="w-3 h-3" />
                  Spotify Canvas
                </span>
              )}
            </div>
          )}

          {/* Lyrics Scroller */}
          <div className="flex-1 overflow-y-auto px-6 py-12 space-y-7">
            {isLoadingLyrics ? (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-velune-400" />
                <p className="text-xs">Fetching lyrics...</p>
              </div>
            ) : !lyricsResult || (lyricsResult.synced.length === 0 && !lyricsResult.plain) ? (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                <p className="text-sm font-semibold">No lyrics available for this song</p>
              </div>
            ) : lyricsResult.synced.length > 0 ? (
              lyricsResult.synced.map((line, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={idx}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => audio.seek(line.time / 1000)}
                    className={`cursor-pointer transition-all duration-300 leading-relaxed ${
                      isActive
                        ? 'text-white text-lg font-bold scale-105 origin-left drop-shadow-md text-velune-300'
                        : 'text-slate-400/70 hover:text-slate-200 text-sm font-medium'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })
            ) : (
              <div className="whitespace-pre-line text-sm text-slate-300 leading-relaxed font-medium">
                {lyricsResult.plain}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
