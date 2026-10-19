pub mod canvas;
pub mod commands;
pub mod db;
pub mod innertube;
pub mod lyrics;
pub mod models;
pub mod scrobbler;

use commands::AppState;
use std::sync::Arc;
use tauri::Manager;

fn append_log(msg: &str) {
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open("C:\\Users\\anes\\Desktop\\velune desk ver\\crash.log") {
        let _ = writeln!(f, "[LIB] {}", msg);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    append_log("run() entered");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            append_log("setup() callback entered");
            let app_handle = app.handle();
            let app_dir = app_handle
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap());

            append_log(&format!("app_dir: {:?}", app_dir));
            std::fs::create_dir_all(&app_dir).ok();
            let db_path = app_dir.join("velune.db");

            append_log("initializing SQLite DB");
            let db = Arc::new(db::DatabaseManager::new(db_path).expect("Failed to initialize SQLite database"));
            append_log("SQLite DB initialized");
            let yt = Arc::new(innertube::InnerTubeService::new());
            append_log("InnerTubeService created");
            let lyrics = Arc::new(lyrics::LyricsEngine::new());
            append_log("LyricsEngine created");
            let canvas = Arc::new(canvas::CanvasService::new());
            append_log("CanvasService created");
            let lastfm = Arc::new(scrobbler::LastFmService::new(String::new(), String::new()));
            append_log("LastFmService created");

            // Restore cookie if saved
            if let Ok(Some(saved_cookie)) = db.get_setting("innerTubeCookie") {
                yt.client.set_cookie(Some(saved_cookie));
            }
            append_log("cookie restored");

            // Restore visitorData if saved
            if let Ok(Some(saved_vd)) = db.get_setting("visitorData") {
                yt.client.set_visitor_data(Some(saved_vd));
            }
            append_log("visitorData restored");

            // Fetch fresh visitorData asynchronously if missing
            let yt_clone = yt.clone();
            let db_clone = db.clone();
            tauri::async_runtime::spawn(async move {
                if yt_clone.client.visitor_data.read().unwrap().is_none() {
                    if let Ok(vd) = yt_clone.client.fetch_visitor_data().await {
                        let _ = db_clone.set_setting("visitorData", &vd);
                    }
                }
            });
            append_log("spawned visitorData fetcher");

            app.manage(AppState {
                db,
                yt,
                lyrics,
                canvas,
                lastfm,
            });
            append_log("app.manage completed");

            append_log("setup() callback returning Ok(())");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::yt_search_suggestions,
            commands::yt_search_summary,
            commands::yt_search,
            commands::yt_home,
            commands::yt_explore,
            commands::yt_charts,
            commands::yt_album,
            commands::yt_artist,
            commands::yt_playlist,
            commands::yt_next,
            commands::yt_resolve_stream,
            commands::yt_get_transcript,
            commands::set_auth_cookie,
            commands::db_upsert_song,
            commands::db_get_song,
            commands::db_get_library_songs,
            commands::db_get_liked_songs,
            commands::db_toggle_like,
            commands::db_toggle_library,
            commands::db_record_play_event,
            commands::db_get_library_albums,
            commands::db_upsert_album,
            commands::db_get_library_artists,
            commands::db_upsert_artist,
            commands::db_create_playlist,
            commands::db_get_all_playlists,
            commands::db_get_playlist_songs,
            commands::db_add_song_to_playlist,
            commands::db_remove_song_from_playlist,
            commands::db_delete_playlist,
            commands::db_rename_playlist,
            commands::db_local_search,
            commands::db_get_search_history,
            commands::db_add_search_history,
            commands::db_clear_search_history,
            commands::db_get_setting,
            commands::db_set_setting,
            commands::db_get_all_settings,
            commands::db_get_top_played_songs,
            commands::lyrics_get,
            commands::canvas_get,
            commands::lastfm_update_now_playing,
            commands::lastfm_scrobble,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
