import React, { useEffect, useState } from 'react';
import {
  Settings,
  Volume2,
  Palette,
  Globe,
  Radio,
  Database,
  Info,
  Check,
  ExternalLink,
  ShieldCheck,
  Disc,
} from 'lucide-react';
import { api } from '../../services/api';
import { audioService } from '../../services/audio';

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [cookieInput, setCookieInput] = useState('');
  const [lastfmKey, setLastfmKey] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Audio settings
  const [quality, setQuality] = useState('high');
  const [loudness, setLoudness] = useState(audioService.isLoudnessNormalizationEnabled());
  const [crossfade, setCrossfade] = useState(audioService.getCrossfade());
  const [skipSilence, setSkipSilence] = useState(false);

  // Appearance
  const [amoled, setAmoled] = useState(false);
  const [accentColor, setAccentColor] = useState('#ED5564');

  // Integrations
  const [discordRpc, setDiscordRpc] = useState(true);
  const [lastfmEnabled, setLastfmEnabled] = useState(false);
  const [canvasEnabled, setCanvasEnabled] = useState(true);

  useEffect(() => {
    api.getAllSettings().then((all) => {
      setSettings(all);
      if (all['auth_cookie']) setCookieInput(all['auth_cookie']);
      if (all['lastfm_session_key']) setLastfmKey(all['lastfm_session_key']);
      if (all['audio_quality']) setQuality(all['audio_quality']);
      if (all['skip_silence']) setSkipSilence(all['skip_silence'] === 'true');
      if (all['pure_black']) setAmoled(all['pure_black'] === 'true');
      if (all['accent_color']) setAccentColor(all['accent_color']);
      if (all['discord_rpc']) setDiscordRpc(all['discord_rpc'] !== 'false');
      if (all['lastfm_enabled']) setLastfmEnabled(all['lastfm_enabled'] === 'true');
      if (all['canvas_enabled']) setCanvasEnabled(all['canvas_enabled'] !== 'false');
    }).catch(console.warn);
  }, []);

  const triggerNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await api.setSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
      triggerNotice('Setting saved');
    } catch (err) {
      console.error(`Failed to save ${key}:`, err);
    }
  };

  const handleSaveCookie = async () => {
    try {
      await api.setAuthCookie(cookieInput.trim());
      await api.setSetting('auth_cookie', cookieInput.trim());
      triggerNotice('YouTube credentials updated successfully');
    } catch (err) {
      console.error('Failed to set cookie:', err);
    }
  };

  const handleSaveLastFm = async () => {
    await saveSetting('lastfm_session_key', lastfmKey.trim());
    await saveSetting('lastfm_enabled', lastfmEnabled ? 'true' : 'false');
    triggerNotice('Last.fm credentials saved');
  };

  const ACCENT_COLORS = [
    { name: 'Velune Coral', hex: '#ED5564' },
    { name: 'Emerald Green', hex: '#10B981' },
    { name: 'Vibrant Purple', hex: '#8B5CF6' },
    { name: 'Sunset Amber', hex: '#F59E0B' },
    { name: 'Electric Sky', hex: '#0EA5E9' },
  ];

  return (
    <div className="p-8 max-w-4xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-accent-red/10 text-accent-red">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-xs text-neutral-400">Configure audio, theme, account, and integrations</p>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      {/* Audio Playback Settings */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-accent-red" /> Audio Playback
        </h2>

        <div className="space-y-2">
          {/* Quality */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Streaming Audio Quality</p>
              <p className="text-xs text-neutral-400">
                Opus 160kbps (High) or AAC 128kbps (Standard)
              </p>
            </div>
            <select
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value);
                saveSetting('audio_quality', e.target.value);
              }}
              className="bg-neutral-800 text-white text-xs font-semibold rounded-xl px-3 py-2 border border-white/10 focus:outline-none"
            >
              <option value="high">High (Opus ~160kbps)</option>
              <option value="low">Standard (AAC ~128kbps)</option>
            </select>
          </div>

          {/* Loudness Normalization */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Loudness Normalization</p>
              <p className="text-xs text-neutral-400">
                Maintains consistent volume levels across different tracks
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={loudness}
                onChange={(e) => {
                  setLoudness(e.target.checked);
                  audioService.setLoudnessNormalization(e.target.checked);
                  saveSetting('loudness_normalization', e.target.checked ? 'true' : 'false');
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-red"></div>
            </label>
          </div>

          {/* Crossfade */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-white">Crossfade Songs</p>
                <p className="text-xs text-neutral-400">Smooth transition fade between ending and starting tracks</p>
              </div>
              <span className="text-xs font-mono font-bold text-accent-red">{crossfade}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={crossfade}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setCrossfade(val);
                audioService.setCrossfade(val);
                saveSetting('crossfade_seconds', `${val}`);
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-accent-red"
            />
          </div>

          {/* Skip silence */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Skip Silence</p>
              <p className="text-xs text-neutral-400">Skip blank audio segments at intro/outro</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={skipSilence}
                onChange={(e) => {
                  setSkipSilence(e.target.checked);
                  saveSetting('skip_silence', e.target.checked ? 'true' : 'false');
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-red"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-accent-red" /> Appearance & Theme
        </h2>

        <div className="space-y-2">
          {/* AMOLED mode */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Pure Black (AMOLED) Mode</p>
              <p className="text-xs text-neutral-400">Deep blacks for OLED displays</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={amoled}
                onChange={(e) => {
                  setAmoled(e.target.checked);
                  saveSetting('pure_black', e.target.checked ? 'true' : 'false');
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-red"></div>
            </label>
          </div>

          {/* Accent Color */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <p className="text-sm font-semibold text-white">Accent Theme Color</p>
            <div className="flex items-center gap-3">
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => {
                    setAccentColor(col.hex);
                    saveSetting('accent_color', col.hex);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    accentColor === col.hex
                      ? 'border-white text-white bg-white/10 shadow-lg'
                      : 'border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span
                    style={{ backgroundColor: col.hex }}
                    className="w-3 h-3 rounded-full"
                  />
                  <span>{col.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* YouTube Music Account */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent-red" /> YouTube Music Account
        </h2>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">Account Cookie / SAPISID</p>
            <p className="text-xs text-neutral-400">
              Paste your YouTube Music browser cookie to access your personal playlists, liked songs, and subscriptions
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              placeholder="Paste cookie string or SAPISID..."
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-accent-red"
            />
            <button
              onClick={handleSaveCookie}
              className="px-4 py-2 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold transition-all"
            >
              Save Cookie
            </button>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-accent-red" /> Integrations
        </h2>

        <div className="space-y-2">
          {/* Canvas */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Spotify Canvas Video</p>
              <p className="text-xs text-neutral-400">
                Display looping video artwork in the side drawer when available
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={canvasEnabled}
                onChange={(e) => {
                  setCanvasEnabled(e.target.checked);
                  saveSetting('canvas_enabled', e.target.checked ? 'true' : 'false');
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-red"></div>
            </label>
          </div>

          {/* Last.fm */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Last.fm Scrobbler</p>
                <p className="text-xs text-neutral-400">Automatically scrobble played songs to Last.fm</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lastfmEnabled}
                  onChange={(e) => {
                    setLastfmEnabled(e.target.checked);
                    saveSetting('lastfm_enabled', e.target.checked ? 'true' : 'false');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-red"></div>
              </label>
            </div>
            {lastfmEnabled && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={lastfmKey}
                  onChange={(e) => setLastfmKey(e.target.value)}
                  placeholder="Last.fm Session Key (from auth.getSession)..."
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-accent-red"
                />
                <button
                  onClick={handleSaveLastFm}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Velune Desktop */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-accent-red" /> About
        </h2>

        <div className="p-6 rounded-2xl bg-gradient-to-r from-accent-red/10 via-purple-600/5 to-transparent border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">Velune Desktop</h3>
              <p className="text-xs text-neutral-400">Version 2.0.0 (Rust + Tauri Edition)</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-accent-red/20 text-accent-red text-xs font-bold">
              Standalone Desktop
            </div>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            100% faithful desktop port of Velune Music for Android. Powered by Rust, Tauri v2, SQLite v28, InnerTube, Web Audio API 10-band graphic equalizer, and multi-provider synced lyrics.
          </p>
        </div>
      </section>
    </div>
  );
};
