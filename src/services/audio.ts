import { SongItem, RepeatMode } from '../types';
import { api } from './api';

export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 1, 2, 3],
  Rock: [4, 3, 2, 0, -1, 0, 2, 3, 4, 4],
  Pop: [-1, 1, 3, 4, 3, 1, -1, 1, 2, 3],
  Jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  Electronic: [5, 4, 2, 0, -2, 2, 1, 2, 4, 5],
  'Vocal Boost': [-2, -1, -1, 1, 4, 5, 4, 2, 0, -1],
  Classical: [4, 3, 2, 2, -1, -1, 0, 2, 3, 3],
};

export interface AudioState {
  currentSong: SongItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  queue: SongItem[];
  history: SongItem[];
  isLoadingStream: boolean;
}

type AudioListener = (state: AudioState) => void;

class AudioEngine {
  private audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private state: AudioState = {
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
  };

  private listeners: Set<AudioListener> = new Set();
  private hasScrobbledCurrent = false;
  private playStartedTimestamp = 0;
  private crossfadeSeconds = 3;
  private normalizationEnabled = true;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    this.audio.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audio.currentTime;
      this.state.duration = this.audio.duration || 0;
      this.checkScrobbleThreshold();
      this.notify();
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.notify();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e, this.audio.error);
      this.state.isLoadingStream = false;
      this.state.isPlaying = false;
      this.notify();
    });

    this.setupMediaSession();
  }

  private initWebAudio() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.source = this.ctx.createMediaElementSource(this.audio);
      this.gainNode = this.ctx.createGain();

      // Equalizer filters (10 bands)
      this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Bass Boost filter (lowshelf at 80Hz)
      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 80;
      this.bassFilter.gain.value = 0;

      // Dynamics compressor for audio normalization
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      // Connect graph: Source -> EQ0 -> EQ1 -> ... -> Bass -> Compressor -> Gain -> Destination
      let lastNode: AudioNode = this.source;
      for (const filter of this.eqFilters) {
        lastNode.connect(filter);
        lastNode = filter;
      }
      lastNode.connect(this.bassFilter);
      lastNode = this.bassFilter;

      if (this.normalizationEnabled) {
        lastNode.connect(this.compressor);
        lastNode = this.compressor;
      }

      lastNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Could not initialize Web Audio context (will use direct audio element):', e);
    }
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public async playSong(song: SongItem, newQueue?: SongItem[]) {
    this.initWebAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.state.currentSong) {
      this.state.history.push(this.state.currentSong);
    }

    if (newQueue) {
      this.state.queue = newQueue.filter((s) => s.id !== song.id);
    }

    this.state.currentSong = song;
    this.state.isLoadingStream = true;
    this.hasScrobbledCurrent = false;
    this.playStartedTimestamp = Date.now();
    this.notify();

    try {
      // 1. Resolve direct audio stream format from Rust backend
      const streamInfo = await api.resolveStreamUrl(song.id);
      this.audio.src = streamInfo.url;

      // 2. Crossfade in if enabled
      if (this.gainNode && this.crossfadeSeconds > 0) {
        const now = this.ctx?.currentTime || 0;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(0, now);
        this.gainNode.gain.linearRampToValueAtTime(
          this.state.isMuted ? 0 : this.state.volume,
          now + this.crossfadeSeconds
        );
      } else if (this.gainNode && this.ctx) {
        this.gainNode.gain.setValueAtTime(
          this.state.isMuted ? 0 : this.state.volume,
          this.ctx.currentTime
        );
      }
      this.audio.volume = this.state.isMuted ? 0 : this.state.volume;

      await this.audio.play();
      this.state.isPlaying = true;
      this.state.isLoadingStream = false;
      this.updateMediaSessionMetadata(song);
      this.notify();

      // Upsert song to DB library / recent history
      api.upsertSong(song).catch(console.warn);

      // Pre-fetch next stream / radio if queue is low
      if (this.state.queue.length <= 1) {
        api.getNextQueue(song.id).then((nextRes) => {
          if (nextRes.items && nextRes.items.length > 0) {
            this.state.queue.push(...nextRes.items.filter((s) => s.id !== song.id));
            this.notify();
          }
        }).catch(console.warn);
      }
    } catch (err) {
      console.error('Failed to stream song:', err);
      this.state.isLoadingStream = false;
      this.state.isPlaying = false;
      this.notify();
      // Auto-skip to next track if enabled (slight delay to prevent loop)
      if (this.state.queue.length > 0) {
        setTimeout(() => this.skipNext(), 1500);
      }
    }
  }

  public togglePlay() {
    if (!this.state.currentSong) {
      if (this.state.queue.length > 0) {
        this.playSong(this.state.queue[0]);
      }
      return;
    }

    if (this.audio.paused) {
      this.audio.play();
      this.state.isPlaying = true;
    } else {
      this.audio.pause();
      this.state.isPlaying = false;
    }
    this.notify();
  }

  public seek(seconds: number) {
    if (Number.isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 0));
      this.state.currentTime = this.audio.currentTime;
      this.notify();
    }
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    this.state.isMuted = clamped === 0;

    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.state.isMuted ? 0 : clamped, this.ctx.currentTime);
    }
    this.audio.volume = this.state.isMuted ? 0 : clamped;

    this.notify();
  }

  public toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(
        this.state.isMuted ? 0 : this.state.volume,
        this.ctx.currentTime
      );
    }
    this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
    this.notify();
  }

  public toggleRepeat() {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(this.state.repeatMode) + 1) % modes.length;
    this.state.repeatMode = modes[nextIdx];
    this.notify();
  }

  public toggleShuffle() {
    this.state.isShuffled = !this.state.isShuffled;
    if (this.state.isShuffled && this.state.queue.length > 1) {
      this.state.queue = [...this.state.queue].sort(() => Math.random() - 0.5);
    }
    this.notify();
  }

  public skipNext() {
    if (this.state.queue.length > 0) {
      const nextSong = this.state.queue.shift()!;
      this.playSong(nextSong);
    } else if (this.state.repeatMode === 'all' && this.state.history.length > 0) {
      const first = this.state.history.shift()!;
      this.playSong(first);
    } else {
      this.audio.pause();
      this.state.isPlaying = false;
      this.notify();
    }
  }

  public skipPrev() {
    if (this.audio.currentTime > 3) {
      this.seek(0);
      return;
    }

    if (this.state.history.length > 0) {
      const prevSong = this.state.history.pop()!;
      if (this.state.currentSong) {
        this.state.queue.unshift(this.state.currentSong);
      }
      this.playSong(prevSong);
    } else {
      this.seek(0);
    }
  }

  public addToQueue(songs: SongItem | SongItem[]) {
    const items = Array.isArray(songs) ? songs : [songs];
    this.state.queue.push(...items);
    this.notify();
  }

  public playNext(song: SongItem) {
    this.state.queue.unshift(song);
    this.notify();
  }

  public removeFromQueue(index: number) {
    if (index >= 0 && index < this.state.queue.length) {
      this.state.queue.splice(index, 1);
      this.notify();
    }
  }

  public clearQueue() {
    this.state.queue = [];
    this.notify();
  }

  // Equalizer adjustments
  public setEqBand(index: number, gainDb: number) {
    if (this.eqFilters[index] && this.ctx) {
      this.eqFilters[index].gain.setValueAtTime(gainDb, this.ctx.currentTime);
    }
  }

  public setBassBoost(gainDb: number) {
    if (this.bassFilter && this.ctx) {
      this.bassFilter.gain.setValueAtTime(gainDb, this.ctx.currentTime);
    }
  }

  private eqGains: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  private bassBoostDb: number = 0;
  private isEqActive: boolean = true;

  public isEqEnabled(): boolean {
    return this.isEqActive;
  }

  public setEqEnabled(enabled: boolean) {
    this.isEqActive = enabled;
    this.eqFilters.forEach((f, idx) => {
      if (this.ctx) {
        f.gain.setValueAtTime(enabled ? this.eqGains[idx] : 0, this.ctx.currentTime);
      }
    });
  }

  public getEqGains(): number[] {
    return [...this.eqGains];
  }

  public setEqGain(index: number, val: number) {
    this.eqGains[index] = val;
    this.setEqBand(index, this.isEqActive ? val : 0);
  }

  public setEqPreset(presetName: string) {
    const preset = EQ_PRESETS[presetName];
    if (preset) {
      this.eqGains = [...preset];
      this.eqGains.forEach((g, idx) => {
        this.setEqBand(idx, this.isEqActive ? g : 0);
      });
    }
  }

  public getBassBoost(): number {
    return this.bassBoostDb;
  }

  public setBassBoostGain(gainDb: number) {
    this.bassBoostDb = gainDb;
    this.setBassBoost(gainDb);
  }

  public getCrossfade(): number {
    return this.crossfadeSeconds;
  }

  public isLoudnessNormalizationEnabled(): boolean {
    return this.normalizationEnabled;
  }

  public setLoudnessNormalization(enabled: boolean) {
    this.normalizationEnabled = enabled;
    if (this.compressor && this.ctx) {
      this.compressor.threshold.setValueAtTime(enabled ? -24 : 0, this.ctx.currentTime);
    }
  }

  public setCrossfade(seconds: number) {
    this.crossfadeSeconds = Math.max(0, Math.min(15, seconds));
  }

  private handleTrackEnded() {
    if (this.state.repeatMode === 'one' && this.state.currentSong) {
      this.seek(0);
      this.audio.play();
    } else {
      this.skipNext();
    }
  }

  private checkScrobbleThreshold() {
    if (!this.state.currentSong || this.hasScrobbledCurrent) return;

    const playTimeSec = Math.floor(this.audio.currentTime);
    const totalDuration = this.state.duration || 180;

    // Scrobble at 50% or 30s
    if (playTimeSec >= 30 || playTimeSec >= totalDuration * 0.5) {
      this.hasScrobbledCurrent = true;
      const songId = this.state.currentSong.id;
      api.recordPlayEvent(songId, playTimeSec).catch(console.warn);

      // LastFM scrobble
      api.getSetting('lastfmSession').then((sessionKey) => {
        if (sessionKey && this.state.currentSong) {
          const artist = this.state.currentSong.artists.map((a) => a.name).join(', ');
          api.lastfmScrobble(
            artist,
            this.state.currentSong.title,
            Math.floor(this.playStartedTimestamp / 1000),
            this.state.currentSong.album?.title,
            sessionKey
          ).catch(console.warn);
        }
      });
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.skipPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.skipNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      this.seek(this.audio.currentTime - (details.seekOffset || 5));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      this.seek(this.audio.currentTime + (details.seekOffset || 5));
    });
  }

  private updateMediaSessionMetadata(song: SongItem) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artists.map((a) => a.name).join(', '),
      album: song.album?.title || '',
      artwork: [
        { src: song.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
  }
}

export const audio = new AudioEngine();
export const audioService = audio;
