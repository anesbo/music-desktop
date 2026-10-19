import { invoke } from '@tauri-apps/api/core';
import {
  AlbumItem,
  AlbumPage,
  ArtistItem,
  ArtistPage,
  CanvasArtwork,
  ChartsPage,
  HomePage,
  LyricsResult,
  MediaStreamInfo,
  NextResult,
  PlayCountStat,
  PlaylistItem,
  PlaylistPage,
  SearchHistoryItem,
  SearchResult,
  SearchSummaryPage,
  SongItem,
} from '../types';

const safeInvoke = async <T>(cmd: string, args?: Record<string, any>): Promise<T> => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke<T>(cmd, args);
  }
  throw new Error(`Desktop backend required for '${cmd}'. Launch via desktop-app.exe or 'npm run tauri dev'.`);
};

export const api = {
  // YouTube Endpoints
  getSearchSuggestions: (query: string): Promise<string[]> =>
    safeInvoke('yt_search_suggestions', { query }),

  getSearchSummary: (query: string): Promise<SearchSummaryPage> =>
    safeInvoke('yt_search_summary', { query }),

  search: (query: string, filter?: string): Promise<SearchResult> =>
    safeInvoke('yt_search', { query, filter: filter || null }),

  getHome: (params?: string): Promise<HomePage> =>
    safeInvoke('yt_home', { params: params || null }),

  getExplore: (): Promise<HomePage> =>
    safeInvoke('yt_explore'),

  getCharts: (): Promise<ChartsPage> =>
    safeInvoke('yt_charts'),

  getAlbum: (browseId: string): Promise<AlbumPage> =>
    safeInvoke('yt_album', { browseId }),

  getArtist: (browseId: string): Promise<ArtistPage> =>
    safeInvoke('yt_artist', { browseId }),

  getPlaylist: (playlistId: string): Promise<PlaylistPage> =>
    safeInvoke('yt_playlist', { playlistId }),

  getNextQueue: (videoId?: string, playlistId?: string): Promise<NextResult> =>
    safeInvoke('yt_next', { videoId: videoId || null, playlistId: playlistId || null }),

  resolveStreamUrl: (videoId: string): Promise<MediaStreamInfo> =>
    safeInvoke('yt_resolve_stream', { videoId }),

  setAuthCookie: (cookie: string): Promise<void> =>
    safeInvoke('set_auth_cookie', { cookie }),

  // Database / Library Endpoints
  upsertSong: (song: SongItem): Promise<void> =>
    safeInvoke('db_upsert_song', { song }),

  getSong: (id: string): Promise<SongItem | null> =>
    safeInvoke('db_get_song', { id }),

  getLibrarySongs: (): Promise<SongItem[]> =>
    safeInvoke('db_get_library_songs'),

  getLikedSongs: (): Promise<SongItem[]> =>
    safeInvoke('db_get_liked_songs'),

  toggleLike: (songId: string): Promise<boolean> =>
    safeInvoke('db_toggle_like', { songId }),

  toggleLibrary: (songId: string): Promise<boolean> =>
    safeInvoke('db_toggle_library', { songId }),

  recordPlayEvent: (songId: string, playTimeSeconds: number): Promise<void> =>
    safeInvoke('db_record_play_event', { songId, playTimeSeconds }),

  getLibraryAlbums: (): Promise<AlbumItem[]> =>
    safeInvoke('db_get_library_albums'),

  upsertAlbum: (album: AlbumItem): Promise<void> =>
    safeInvoke('db_upsert_album', { album }),

  getLibraryArtists: (): Promise<ArtistItem[]> =>
    safeInvoke('db_get_library_artists'),

  upsertArtist: (artist: ArtistItem): Promise<void> =>
    safeInvoke('db_upsert_artist', { artist }),

  createPlaylist: (name: string): Promise<string> =>
    safeInvoke('db_create_playlist', { name }),

  getAllPlaylists: (): Promise<PlaylistItem[]> =>
    safeInvoke('db_get_all_playlists'),

  getPlaylistSongs: (playlistId: string): Promise<SongItem[]> =>
    safeInvoke('db_get_playlist_songs', { playlistId }),

  addSongToPlaylist: (playlistId: string, songId: string): Promise<void> =>
    safeInvoke('db_add_song_to_playlist', { playlistId, songId }),

  removeSongFromPlaylist: (playlistId: string, songId: string): Promise<void> =>
    safeInvoke('db_remove_song_from_playlist', { playlistId, songId }),

  deletePlaylist: (playlistId: string): Promise<void> =>
    safeInvoke('db_delete_playlist', { playlistId }),

  renamePlaylist: (playlistId: string, newName: string): Promise<void> =>
    safeInvoke('db_rename_playlist', { playlistId, newName }),

  localSearch: (query: string): Promise<SongItem[]> =>
    safeInvoke('db_local_search', { query }),

  getSearchHistory: (): Promise<SearchHistoryItem[]> =>
    safeInvoke('db_get_search_history'),

  addSearchHistory: (query: string): Promise<void> =>
    safeInvoke('db_add_search_history', { query }),

  clearSearchHistory: (): Promise<void> =>
    safeInvoke('db_clear_search_history'),

  getSetting: (key: string): Promise<string | null> =>
    safeInvoke('db_get_setting', { key }),

  setSetting: (key: string, value: string): Promise<void> =>
    safeInvoke('db_set_setting', { key, value }),

  getAllSettings: (): Promise<Record<string, string>> =>
    safeInvoke('db_get_all_settings'),

  getTopPlayedSongs: (limit: number = 50): Promise<PlayCountStat[]> =>
    safeInvoke('db_get_top_played_songs', { limit }),

  // Lyrics & Canvas & Scrobbler
  getLyrics: (title: string, artist: string, videoId?: string, duration?: number): Promise<LyricsResult | null> =>
    safeInvoke('lyrics_get', { title, artist, videoId: videoId || null, duration: duration || null }),

  getCanvas: (song: string, artist: string): Promise<CanvasArtwork | null> =>
    safeInvoke('canvas_get', { song, artist }),

  lastfmUpdateNowPlaying: (artist: string, track: string, album?: string, sessionKey?: string): Promise<void> =>
    safeInvoke('lastfm_update_now_playing', { artist, track, album: album || null, sessionKey: sessionKey || '' }),

  lastfmScrobble: (artist: string, track: string, timestamp: number, album?: string, sessionKey?: string): Promise<void> =>
    safeInvoke('lastfm_scrobble', { artist, track, album: album || null, timestamp, sessionKey: sessionKey || '' }),
};
