use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artist {
    pub id: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SongItem {
    pub id: String,
    pub title: String,
    pub artists: Vec<Artist>,
    pub album: Option<AlbumReference>,
    pub duration: Option<i64>,
    pub thumbnail: String,
    #[serde(default)]
    pub explicit: bool,
    pub in_library: Option<i64>,
    pub liked: bool,
    pub total_play_time: i64,
    pub is_local: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumReference {
    pub id: Option<String>,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumItem {
    pub browse_id: String,
    pub playlist_id: Option<String>,
    pub title: String,
    pub artists: Vec<Artist>,
    pub year: Option<i32>,
    pub thumbnail: String,
    #[serde(default)]
    pub explicit: bool,
    pub song_count: Option<i32>,
    pub duration: Option<i64>,
    pub in_library: Option<i64>,
    pub liked_date: Option<i64>,
    pub bookmarked_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistItem {
    pub id: String,
    pub title: String,
    pub thumbnail: Option<String>,
    pub channel_id: Option<String>,
    pub description: Option<String>,
    pub bookmarked_at: Option<i64>,
    pub subscribers: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistItem {
    pub id: String,
    pub title: String,
    pub author: Option<Artist>,
    pub song_count_text: Option<String>,
    pub thumbnail: Option<String>,
    pub is_editable: bool,
    pub created_at: Option<i64>,
    pub bookmarked_at: Option<i64>,
    pub remote_song_count: Option<i32>,
    pub custom_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum YTItem {
    Song(SongItem),
    Album(AlbumItem),
    Artist(ArtistItem),
    Playlist(PlaylistItem),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchSummary {
    pub title: String,
    pub items: Vec<YTItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchSummaryPage {
    pub summaries: Vec<SearchSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub items: Vec<YTItem>,
    pub continuation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumPage {
    pub album: AlbumItem,
    pub songs: Vec<SongItem>,
    pub other_versions: Vec<AlbumItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistSection {
    pub title: String,
    pub items: Vec<YTItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistPage {
    pub artist: ArtistItem,
    pub sections: Vec<ArtistSection>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistPage {
    pub playlist: PlaylistItem,
    pub songs: Vec<SongItem>,
    pub continuation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NextResult {
    pub title: Option<String>,
    pub items: Vec<SongItem>,
    pub current_index: Option<usize>,
    pub lyrics_endpoint: Option<String>,
    pub continuation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartSection {
    pub title: String,
    pub items: Vec<YTItem>,
    pub chart_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartsPage {
    pub sections: Vec<ChartSection>,
    pub continuation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeChip {
    pub title: String,
    pub params: Option<String>,
    pub selected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeSection {
    pub title: String,
    pub items: Vec<YTItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomePage {
    pub chips: Vec<HomeChip>,
    pub sections: Vec<HomeSection>,
    pub continuation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsLine {
    pub time: i64, // milliseconds
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsResult {
    pub provider: String,
    pub plain: Option<String>,
    pub synced: Vec<LyricsLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasArtwork {
    pub static_url: Option<String>,
    pub animated_url: Option<String>,
    pub video_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaStreamInfo {
    pub video_id: String,
    pub url: String,
    pub itag: i32,
    pub mime_type: String,
    pub bitrate: i32,
    pub loudness_db: Option<f64>,
    pub perceptual_loudness_db: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagItem {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHistoryItem {
    pub id: i64,
    pub query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayCountStat {
    pub song_id: String,
    pub title: String,
    pub artist_name: String,
    pub thumbnail_url: Option<String>,
    pub play_count: i64,
    pub total_play_time: i64,
}
