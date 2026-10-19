use crate::canvas::CanvasService;
use crate::db::DatabaseManager;
use crate::innertube::InnerTubeService;
use crate::lyrics::LyricsEngine;
use crate::models::*;
use crate::scrobbler::LastFmService;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

pub struct AppState {
    pub db: Arc<DatabaseManager>,
    pub yt: Arc<InnerTubeService>,
    pub lyrics: Arc<LyricsEngine>,
    pub canvas: Arc<CanvasService>,
    pub lastfm: Arc<LastFmService>,
}

// ==========================================
// YOUTUBE INNERTUBE COMMANDS
// ==========================================

#[tauri::command]
pub async fn yt_search_suggestions(query: String, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    state.yt.search_suggestions(&query).await
}

#[tauri::command]
pub async fn yt_search_summary(query: String, state: State<'_, AppState>) -> Result<SearchSummaryPage, String> {
    state.yt.search_summary(&query).await
}

#[tauri::command]
pub async fn yt_search(query: String, filter: Option<String>, state: State<'_, AppState>) -> Result<SearchResult, String> {
    state.yt.search(&query, filter.as_deref()).await
}

#[tauri::command]
pub async fn yt_home(params: Option<String>, state: State<'_, AppState>) -> Result<HomePage, String> {
    state.yt.home(params.as_deref()).await
}

#[tauri::command]
pub async fn yt_explore(state: State<'_, AppState>) -> Result<HomePage, String> {
    state.yt.explore().await
}

#[tauri::command]
pub async fn yt_charts(state: State<'_, AppState>) -> Result<ChartsPage, String> {
    state.yt.charts().await
}

#[tauri::command]
pub async fn yt_album(browse_id: String, state: State<'_, AppState>) -> Result<AlbumPage, String> {
    state.yt.album(&browse_id).await
}

#[tauri::command]
pub async fn yt_artist(browse_id: String, state: State<'_, AppState>) -> Result<ArtistPage, String> {
    state.yt.artist(&browse_id).await
}

#[tauri::command]
pub async fn yt_playlist(playlist_id: String, state: State<'_, AppState>) -> Result<PlaylistPage, String> {
    state.yt.playlist(&playlist_id).await
}

#[tauri::command]
pub async fn yt_next(video_id: Option<String>, playlist_id: Option<String>, state: State<'_, AppState>) -> Result<NextResult, String> {
    state.yt.next(video_id.as_deref(), playlist_id.as_deref()).await
}

#[tauri::command]
pub async fn yt_resolve_stream(video_id: String, state: State<'_, AppState>) -> Result<MediaStreamInfo, String> {
    state.yt.resolve_stream_url(&video_id).await
}

#[tauri::command]
pub async fn yt_get_transcript(video_id: String, state: State<'_, AppState>) -> Result<Vec<LyricsLine>, String> {
    state.yt.get_transcript(&video_id).await
}

#[tauri::command]
pub async fn set_auth_cookie(cookie: String, state: State<'_, AppState>) -> Result<(), String> {
    state.yt.client.set_cookie(Some(cookie.clone()));
    let _ = state.db.set_setting("innerTubeCookie", &cookie);
    Ok(())
}

// ==========================================
// DATABASE / LOCAL STORAGE COMMANDS
// ==========================================

#[tauri::command]
pub async fn db_upsert_song(song: SongItem, state: State<'_, AppState>) -> Result<(), String> {
    state.db.upsert_song(&song).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_song(id: String, state: State<'_, AppState>) -> Result<Option<SongItem>, String> {
    state.db.get_song(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_library_songs(state: State<'_, AppState>) -> Result<Vec<SongItem>, String> {
    state.db.get_library_songs().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_liked_songs(state: State<'_, AppState>) -> Result<Vec<SongItem>, String> {
    state.db.get_liked_songs().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_toggle_like(song_id: String, state: State<'_, AppState>) -> Result<bool, String> {
    state.db.toggle_like(&song_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_toggle_library(song_id: String, state: State<'_, AppState>) -> Result<bool, String> {
    state.db.toggle_library(&song_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_record_play_event(song_id: String, play_time_seconds: i64, state: State<'_, AppState>) -> Result<(), String> {
    state.db.record_play_event(&song_id, play_time_seconds).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_library_albums(state: State<'_, AppState>) -> Result<Vec<AlbumItem>, String> {
    state.db.get_library_albums().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_upsert_album(album: AlbumItem, state: State<'_, AppState>) -> Result<(), String> {
    state.db.upsert_album(&album).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_library_artists(state: State<'_, AppState>) -> Result<Vec<ArtistItem>, String> {
    state.db.get_library_artists().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_upsert_artist(artist: ArtistItem, state: State<'_, AppState>) -> Result<(), String> {
    state.db.upsert_artist(&artist).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_create_playlist(name: String, state: State<'_, AppState>) -> Result<String, String> {
    state.db.create_playlist(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_all_playlists(state: State<'_, AppState>) -> Result<Vec<PlaylistItem>, String> {
    state.db.get_all_playlists().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_playlist_songs(playlist_id: String, state: State<'_, AppState>) -> Result<Vec<SongItem>, String> {
    state.db.get_playlist_songs(&playlist_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_add_song_to_playlist(playlist_id: String, song_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.add_song_to_playlist(&playlist_id, &song_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_remove_song_from_playlist(playlist_id: String, song_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.remove_song_from_playlist(&playlist_id, &song_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_delete_playlist(playlist_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.delete_playlist(&playlist_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_rename_playlist(playlist_id: String, new_name: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.rename_playlist(&playlist_id, &new_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_local_search(query: String, state: State<'_, AppState>) -> Result<Vec<SongItem>, String> {
    state.db.local_search(&query).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_search_history(state: State<'_, AppState>) -> Result<Vec<SearchHistoryItem>, String> {
    state.db.get_search_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_add_search_history(query: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.add_search_history(&query).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_clear_search_history(state: State<'_, AppState>) -> Result<(), String> {
    state.db.clear_search_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_setting(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    state.db.get_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_set_setting(key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.set_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_all_settings(state: State<'_, AppState>) -> Result<HashMap<String, String>, String> {
    state.db.get_all_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_top_played_songs(limit: i32, state: State<'_, AppState>) -> Result<Vec<PlayCountStat>, String> {
    state.db.get_top_played_songs(limit).map_err(|e| e.to_string())
}

// ==========================================
// LYRICS & CANVAS & SCROBBLER
// ==========================================

#[tauri::command]
pub async fn lyrics_get(
    title: String,
    artist: String,
    video_id: Option<String>,
    duration: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Option<LyricsResult>, String> {
    if let Some(vid) = &video_id {
        if let Ok(Some(cached)) = state.db.get_cached_lyrics(vid) {
            let lines = crate::lyrics::parse_lrc(&cached);
            return Ok(Some(LyricsResult {
                provider: "Cached".into(),
                plain: None,
                synced: lines,
            }));
        }
    }

    let lyrics = state.lyrics.get_lyrics(&title, &artist, video_id.as_deref(), duration).await;
    if let Some(ref l) = lyrics {
        if let Some(vid) = &video_id {
            if !l.synced.is_empty() {
                let serialized = l.synced.iter()
                    .map(|line| {
                        let total_sec = line.time / 1000;
                        let m = total_sec / 60;
                        let s = total_sec % 60;
                        let ms = line.time % 1000;
                        format!("[{:02}:{:02}.{:03}]{}", m, s, ms, line.text)
                    })
                    .collect::<Vec<_>>()
                    .join("\n");
                let _ = state.db.save_cached_lyrics(vid, &serialized);
            }
        }
    }
    Ok(lyrics)
}

#[tauri::command]
pub async fn canvas_get(song: String, artist: String, state: State<'_, AppState>) -> Result<Option<CanvasArtwork>, String> {
    Ok(state.canvas.get_canvas(&song, &artist).await)
}

#[tauri::command]
pub async fn lastfm_update_now_playing(
    artist: String,
    track: String,
    album: Option<String>,
    session_key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.lastfm.update_now_playing(&artist, &track, album.as_deref(), &session_key).await
}

#[tauri::command]
pub async fn lastfm_scrobble(
    artist: String,
    track: String,
    album: Option<String>,
    timestamp: i64,
    session_key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.lastfm.scrobble(&artist, &track, album.as_deref(), timestamp, &session_key).await
}
