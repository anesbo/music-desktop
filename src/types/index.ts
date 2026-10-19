export interface Artist {
  id?: string;
  name: string;
}

export interface AlbumReference {
  id?: string;
  title: string;
}

export interface SongItem {
  id: string;
  title: string;
  artists: Artist[];
  album?: AlbumReference;
  duration?: number;
  thumbnail: string;
  explicit: boolean;
  in_library?: number;
  liked: boolean;
  total_play_time: number;
  is_local: boolean;
}

export interface AlbumItem {
  browse_id: string;
  playlist_id?: string;
  title: string;
  artists: Artist[];
  year?: number;
  thumbnail: string;
  explicit: boolean;
  song_count?: number;
  duration?: number;
  in_library?: number;
  liked_date?: number;
  bookmarked_at?: number;
}

export interface ArtistItem {
  id: string;
  title: string;
  thumbnail?: string;
  channel_id?: string;
  description?: string;
  bookmarked_at?: number;
  subscribers?: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  author?: Artist;
  song_count_text?: string;
  thumbnail?: string;
  is_editable: boolean;
  created_at?: number;
  bookmarked_at?: number;
  remote_song_count?: number;
  custom_order?: number;
}

export type YTItem =
  | { type: 'Song'; data: SongItem }
  | { type: 'Album'; data: AlbumItem }
  | { type: 'Artist'; data: ArtistItem }
  | { type: 'Playlist'; data: PlaylistItem };

export interface SearchSummary {
  title: string;
  items: YTItem[];
}

export interface SearchSummaryPage {
  summaries: SearchSummary[];
}

export interface SearchResult {
  items: YTItem[];
  continuation?: string;
}

export interface AlbumPage {
  album: AlbumItem;
  songs: SongItem[];
  other_versions: AlbumItem[];
}

export interface ArtistSection {
  title: string;
  items: YTItem[];
}

export interface ArtistPage {
  artist: ArtistItem;
  sections: ArtistSection[];
  description?: string;
}

export interface PlaylistPage {
  playlist: PlaylistItem;
  songs: SongItem[];
  continuation?: string;
}

export interface NextResult {
  title?: string;
  items: SongItem[];
  current_index?: number;
  lyrics_endpoint?: string;
  continuation?: string;
}

export interface ChartSection {
  title: string;
  items: YTItem[];
  chart_type: string;
}

export interface ChartsPage {
  sections: ChartSection[];
  continuation?: string;
}

export interface HomeChip {
  title: string;
  params?: string;
  selected: boolean;
}

export interface HomeSection {
  title: string;
  items: YTItem[];
}

export interface HomePage {
  chips: HomeChip[];
  sections: HomeSection[];
  continuation?: string;
}

export interface LyricsLine {
  time: number; // in milliseconds
  text: string;
}

export interface LyricsResult {
  provider: string;
  plain?: string;
  synced: LyricsLine[];
}

export interface CanvasArtwork {
  static_url?: string;
  animated_url?: string;
  video_url?: string;
}

export interface MediaStreamInfo {
  video_id: string;
  url: string;
  itag: number;
  mime_type: string;
  bitrate: number;
  loudness_db?: number;
  perceptual_loudness_db?: number;
}

export interface TagItem {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

export interface SearchHistoryItem {
  id: number;
  query: string;
}

export interface PlayCountStat {
  song_id: string;
  title: string;
  artist_name: string;
  thumbnail_url?: string;
  play_count: number;
  total_play_time: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type ScreenType =
  | 'home'
  | 'explore'
  | 'charts'
  | 'search'
  | 'library'
  | 'album'
  | 'artist'
  | 'playlist'
  | 'stats'
  | 'settings';
