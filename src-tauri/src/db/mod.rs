pub mod schema;

use rusqlite::{params, Connection, Result};
use std::sync::Mutex;
use std::path::PathBuf;
use crate::models::{Artist, SongItem, AlbumItem, ArtistItem, PlaylistItem, AlbumReference, SearchHistoryItem, PlayCountStat};

pub struct DatabaseManager {
    conn: Mutex<Connection>,
}

impl DatabaseManager {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        schema::init_database(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        schema::init_database(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    // ==========================================
    // SONGS
    // ==========================================

    pub fn upsert_song(&self, song: &SongItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO song (id, title, duration, thumbnailUrl, albumId, albumName, explicit, liked, totalPlayTime, inLibrary, isLocal)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                duration = excluded.duration,
                thumbnailUrl = COALESCE(excluded.thumbnailUrl, song.thumbnailUrl),
                albumId = COALESCE(excluded.albumId, song.albumId),
                albumName = COALESCE(excluded.albumName, song.albumName),
                explicit = excluded.explicit,
                liked = CASE WHEN excluded.liked != 0 THEN excluded.liked ELSE song.liked END,
                inLibrary = COALESCE(excluded.inLibrary, song.inLibrary)",
            params![
                song.id,
                song.title,
                song.duration.unwrap_or(0),
                song.thumbnail,
                song.album.as_ref().and_then(|a| a.id.clone()),
                song.album.as_ref().map(|a| a.title.clone()),
                song.explicit as i32,
                song.liked as i32,
                song.total_play_time,
                song.in_library,
                song.is_local as i32,
            ],
        )?;

        // Map artists
        conn.execute("DELETE FROM song_artist_map WHERE songId = ?1", params![song.id])?;
        for (pos, artist) in song.artists.iter().enumerate() {
            let artist_id = artist.id.clone().unwrap_or_else(|| format!("local_{}", artist.name));
            // Ensure artist exists
            conn.execute(
                "INSERT OR IGNORE INTO artist (id, name, lastUpdateTime) VALUES (?1, ?2, strftime('%s', 'now'))",
                params![artist_id, artist.name],
            )?;
            conn.execute(
                "INSERT OR REPLACE INTO song_artist_map (songId, artistId, position) VALUES (?1, ?2, ?3)",
                params![song.id, artist_id, pos as i32],
            )?;
        }

        // Map album
        if let Some(album) = &song.album {
            if let Some(album_id) = &album.id {
                conn.execute(
                    "INSERT OR IGNORE INTO album (id, title, songCount, duration, lastUpdateTime) VALUES (?1, ?2, 0, 0, strftime('%s', 'now'))",
                    params![album_id, album.title],
                )?;
                conn.execute(
                    "INSERT OR REPLACE INTO song_album_map (songId, albumId, `index`) VALUES (?1, ?2, 0)",
                    params![song.id, album_id],
                )?;
            }
        }

        Ok(())
    }

    pub fn get_song(&self, id: &str) -> Result<Option<SongItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, duration, thumbnailUrl, albumId, albumName, explicit, liked, totalPlayTime, inLibrary, isLocal
             FROM song WHERE id = ?1"
        )?;

        let song_opt = stmt.query_row(params![id], |row| {
            let album_id: Option<String> = row.get(4)?;
            let album_name: Option<String> = row.get(5)?;
            let album = album_name.map(|title| AlbumReference {
                id: album_id,
                title,
            });

            Ok(SongItem {
                id: row.get(0)?,
                title: row.get(1)?,
                duration: Some(row.get(2)?),
                thumbnail: row.get(3).unwrap_or_default(),
                album,
                explicit: row.get::<_, i32>(6)? != 0,
                liked: row.get::<_, i32>(7)? != 0,
                total_play_time: row.get(8)?,
                in_library: row.get(9)?,
                is_local: row.get::<_, i32>(10)? != 0,
                artists: Vec::new(),
            })
        });

        match song_opt {
            Ok(mut song) => {
                let mut art_stmt = conn.prepare(
                    "SELECT a.id, a.name FROM artist a
                     JOIN song_artist_map m ON m.artistId = a.id
                     WHERE m.songId = ?1 ORDER BY m.position"
                )?;
                let artists = art_stmt.query_map(params![id], |r| {
                    Ok(Artist {
                        id: r.get(0)?,
                        name: r.get(1)?,
                    })
                })?.collect::<Result<Vec<_>, _>>()?;
                song.artists = artists;
                Ok(Some(song))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_library_songs(&self) -> Result<Vec<SongItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, duration, thumbnailUrl, albumId, albumName, explicit, liked, totalPlayTime, inLibrary, isLocal
             FROM song WHERE inLibrary IS NOT NULL ORDER BY inLibrary DESC"
        )?;
        let songs_res = stmt.query_map([], |row| {
            let album_id: Option<String> = row.get(4)?;
            let album_name: Option<String> = row.get(5)?;
            let album = album_name.map(|title| AlbumReference {
                id: album_id,
                title,
            });

            Ok(SongItem {
                id: row.get(0)?,
                title: row.get(1)?,
                duration: Some(row.get(2)?),
                thumbnail: row.get(3).unwrap_or_default(),
                album,
                explicit: row.get::<_, i32>(6)? != 0,
                liked: row.get::<_, i32>(7)? != 0,
                total_play_time: row.get(8)?,
                in_library: row.get(9)?,
                is_local: row.get::<_, i32>(10)? != 0,
                artists: Vec::new(),
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        let mut songs = Vec::with_capacity(songs_res.len());
        for mut song in songs_res {
            let mut art_stmt = conn.prepare(
                "SELECT a.id, a.name FROM artist a
                 JOIN song_artist_map m ON m.artistId = a.id
                 WHERE m.songId = ?1 ORDER BY m.position"
            )?;
            let artists = art_stmt.query_map(params![song.id], |r| {
                Ok(Artist {
                    id: r.get(0)?,
                    name: r.get(1)?,
                })
            })?.collect::<Result<Vec<_>, _>>()?;
            song.artists = artists;
            songs.push(song);
        }

        Ok(songs)
    }

    pub fn get_liked_songs(&self) -> Result<Vec<SongItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, duration, thumbnailUrl, albumId, albumName, explicit, liked, totalPlayTime, inLibrary, isLocal
             FROM song WHERE liked = 1 ORDER BY likedDate DESC, rowid DESC"
        )?;
        let songs_res = stmt.query_map([], |row| {
            let album_id: Option<String> = row.get(4)?;
            let album_name: Option<String> = row.get(5)?;
            let album = album_name.map(|title| AlbumReference {
                id: album_id,
                title,
            });

            Ok(SongItem {
                id: row.get(0)?,
                title: row.get(1)?,
                duration: Some(row.get(2)?),
                thumbnail: row.get(3).unwrap_or_default(),
                album,
                explicit: row.get::<_, i32>(6)? != 0,
                liked: row.get::<_, i32>(7)? != 0,
                total_play_time: row.get(8)?,
                in_library: row.get(9)?,
                is_local: row.get::<_, i32>(10)? != 0,
                artists: Vec::new(),
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        let mut songs = Vec::with_capacity(songs_res.len());
        for mut song in songs_res {
            let mut art_stmt = conn.prepare(
                "SELECT a.id, a.name FROM artist a
                 JOIN song_artist_map m ON m.artistId = a.id
                 WHERE m.songId = ?1 ORDER BY m.position"
            )?;
            let artists = art_stmt.query_map(params![song.id], |r| {
                Ok(Artist {
                    id: r.get(0)?,
                    name: r.get(1)?,
                })
            })?.collect::<Result<Vec<_>, _>>()?;
            song.artists = artists;
            songs.push(song);
        }

        Ok(songs)
    }

    pub fn toggle_like(&self, song_id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let current_liked: i32 = conn.query_row(
            "SELECT liked FROM song WHERE id = ?1",
            params![song_id],
            |r| r.get(0),
        ).unwrap_or(0);

        let new_liked = if current_liked == 0 { 1 } else { 0 };
        let liked_date = if new_liked == 1 {
            Some(chrono::Utc::now().timestamp_millis())
        } else {
            None
        };

        conn.execute(
            "UPDATE song SET liked = ?1, likedDate = ?2 WHERE id = ?3",
            params![new_liked, liked_date, song_id],
        )?;

        Ok(new_liked == 1)
    }

    pub fn toggle_library(&self, song_id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let current_in_lib: Option<i64> = conn.query_row(
            "SELECT inLibrary FROM song WHERE id = ?1",
            params![song_id],
            |r| r.get(0),
        ).unwrap_or(None);

        let new_in_lib = if current_in_lib.is_none() {
            Some(chrono::Utc::now().timestamp_millis())
        } else {
            None
        };

        conn.execute(
            "UPDATE song SET inLibrary = ?1 WHERE id = ?2",
            params![new_in_lib, song_id],
        )?;

        Ok(new_in_lib.is_some())
    }

    pub fn record_play_event(&self, song_id: &str, play_time_seconds: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now();
        let timestamp = now.timestamp_millis();
        let year = now.format("%Y").to_string().parse::<i32>().unwrap_or(2026);
        let month = now.format("%m").to_string().parse::<i32>().unwrap_or(1);

        // Record event
        conn.execute(
            "INSERT INTO event (songId, timestamp, playTime) VALUES (?1, ?2, ?3)",
            params![song_id, timestamp, play_time_seconds],
        )?;

        // Update song total play time
        conn.execute(
            "UPDATE song SET totalPlayTime = totalPlayTime + ?1 WHERE id = ?2",
            params![play_time_seconds, song_id],
        )?;

        // Update monthly playCount
        conn.execute(
            "INSERT INTO playCount (song, year, month, count) VALUES (?1, ?2, ?3, 1)
             ON CONFLICT(song, year, month) DO UPDATE SET count = count + 1",
            params![song_id, year, month],
        )?;

        Ok(())
    }

    // ==========================================
    // ALBUMS & ARTISTS
    // ==========================================

    pub fn upsert_album(&self, album: &AlbumItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO album (id, playlistId, title, year, thumbnailUrl, songCount, duration, explicit, lastUpdateTime, inLibrary, bookmarkedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, strftime('%s', 'now'), ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                playlistId = COALESCE(excluded.playlistId, album.playlistId),
                year = COALESCE(excluded.year, album.year),
                thumbnailUrl = COALESCE(excluded.thumbnailUrl, album.thumbnailUrl),
                songCount = CASE WHEN excluded.songCount > 0 THEN excluded.songCount ELSE album.songCount END,
                inLibrary = COALESCE(excluded.inLibrary, album.inLibrary),
                bookmarkedAt = COALESCE(excluded.bookmarkedAt, album.bookmarkedAt)",
            params![
                album.browse_id,
                album.playlist_id,
                album.title,
                album.year,
                album.thumbnail,
                album.song_count.unwrap_or(0),
                album.duration.unwrap_or(0),
                album.explicit as i32,
                album.in_library,
                album.bookmarked_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_library_albums(&self) -> Result<Vec<AlbumItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, playlistId, title, year, thumbnailUrl, explicit, songCount, duration, inLibrary, likedDate, bookmarkedAt
             FROM album WHERE inLibrary IS NOT NULL OR bookmarkedAt IS NOT NULL ORDER BY bookmarkedAt DESC, title ASC"
        )?;
        let albums = stmt.query_map([], |row| {
            Ok(AlbumItem {
                browse_id: row.get(0)?,
                playlist_id: row.get(1)?,
                title: row.get(2)?,
                year: row.get(3)?,
                thumbnail: row.get(4).unwrap_or_default(),
                explicit: row.get::<_, i32>(5)? != 0,
                song_count: row.get(6)?,
                duration: row.get(7)?,
                in_library: row.get(8)?,
                liked_date: row.get(9)?,
                bookmarked_at: row.get(10)?,
                artists: Vec::new(),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(albums)
    }

    pub fn upsert_artist(&self, artist: &ArtistItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO artist (id, name, thumbnailUrl, channelId, lastUpdateTime, bookmarkedAt)
             VALUES (?1, ?2, ?3, ?4, strftime('%s', 'now'), ?5)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                thumbnailUrl = COALESCE(excluded.thumbnailUrl, artist.thumbnailUrl),
                channelId = COALESCE(excluded.channelId, artist.channelId),
                bookmarkedAt = COALESCE(excluded.bookmarkedAt, artist.bookmarkedAt)",
            params![
                artist.id,
                artist.title,
                artist.thumbnail,
                artist.channel_id,
                artist.bookmarked_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_library_artists(&self) -> Result<Vec<ArtistItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, thumbnailUrl, channelId, bookmarkedAt
             FROM artist WHERE bookmarkedAt IS NOT NULL ORDER BY bookmarkedAt DESC, name ASC"
        )?;
        let artists = stmt.query_map([], |row| {
            Ok(ArtistItem {
                id: row.get(0)?,
                title: row.get(1)?,
                thumbnail: row.get(2)?,
                channel_id: row.get(3)?,
                bookmarked_at: row.get(4)?,
                description: None,
                subscribers: None,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(artists)
    }

    // ==========================================
    // PLAYLISTS
    // ==========================================

    pub fn create_playlist(&self, name: &str) -> Result<String> {
        let id = format!("local_pl_{}", chrono::Utc::now().timestamp_millis());
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO playlist (id, name, createdAt, lastUpdateTime, isEditable, isLocal)
             VALUES (?1, ?2, strftime('%s', 'now'), strftime('%s', 'now'), 1, 1)",
            params![id, name],
        )?;
        Ok(id)
    }

    pub fn get_all_playlists(&self) -> Result<Vec<PlaylistItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT p.id, p.name, p.thumbnailUrl, p.isEditable, p.createdAt, p.bookmarkedAt,
                    (SELECT COUNT(*) FROM playlist_song_map WHERE playlistId = p.id) as songCount
             FROM playlist p ORDER BY p.createdAt DESC"
        )?;
        let playlists = stmt.query_map([], |row| {
            let count: i32 = row.get(6)?;
            Ok(PlaylistItem {
                id: row.get(0)?,
                title: row.get(1)?,
                thumbnail: row.get(2)?,
                is_editable: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                bookmarked_at: row.get(5)?,
                song_count_text: Some(format!("{} songs", count)),
                author: Some(Artist { id: None, name: "You".into() }),
                remote_song_count: Some(count),
                custom_order: None,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(playlists)
    }

    pub fn add_song_to_playlist(&self, playlist_id: &str, song_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let next_pos: i32 = conn.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_song_map WHERE playlistId = ?1",
            params![playlist_id],
            |r| r.get(0),
        )?;
        conn.execute(
            "INSERT INTO playlist_song_map (playlistId, songId, position) VALUES (?1, ?2, ?3)",
            params![playlist_id, song_id, next_pos],
        )?;
        conn.execute(
            "UPDATE playlist SET lastUpdateTime = strftime('%s', 'now') WHERE id = ?1",
            params![playlist_id],
        )?;
        Ok(())
    }

    pub fn remove_song_from_playlist(&self, playlist_id: &str, song_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM playlist_song_map WHERE playlistId = ?1 AND songId = ?2",
            params![playlist_id, song_id],
        )?;
        Ok(())
    }

    pub fn get_playlist_songs(&self, playlist_id: &str) -> Result<Vec<SongItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT s.id, s.title, s.duration, s.thumbnailUrl, s.albumId, s.albumName, s.explicit, s.liked, s.totalPlayTime, s.inLibrary, s.isLocal
             FROM song s
             JOIN playlist_song_map m ON m.songId = s.id
             WHERE m.playlistId = ?1 ORDER BY m.position ASC"
        )?;
        let songs_res = stmt.query_map(params![playlist_id], |row| {
            let album_id: Option<String> = row.get(4)?;
            let album_name: Option<String> = row.get(5)?;
            let album = album_name.map(|title| AlbumReference {
                id: album_id,
                title,
            });

            Ok(SongItem {
                id: row.get(0)?,
                title: row.get(1)?,
                duration: Some(row.get(2)?),
                thumbnail: row.get(3).unwrap_or_default(),
                album,
                explicit: row.get::<_, i32>(6)? != 0,
                liked: row.get::<_, i32>(7)? != 0,
                total_play_time: row.get(8)?,
                in_library: row.get(9)?,
                is_local: row.get::<_, i32>(10)? != 0,
                artists: Vec::new(),
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        let mut songs = Vec::with_capacity(songs_res.len());
        for mut song in songs_res {
            let mut art_stmt = conn.prepare(
                "SELECT a.id, a.name FROM artist a
                 JOIN song_artist_map m ON m.artistId = a.id
                 WHERE m.songId = ?1 ORDER BY m.position"
            )?;
            let artists = art_stmt.query_map(params![song.id], |r| {
                Ok(Artist {
                    id: r.get(0)?,
                    name: r.get(1)?,
                })
            })?.collect::<Result<Vec<_>, _>>()?;
            song.artists = artists;
            songs.push(song);
        }

        Ok(songs)
    }

    pub fn delete_playlist(&self, playlist_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM playlist WHERE id = ?1", params![playlist_id])?;
        Ok(())
    }

    pub fn rename_playlist(&self, playlist_id: &str, new_name: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE playlist SET name = ?1, lastUpdateTime = strftime('%s', 'now') WHERE id = ?2",
            params![new_name, playlist_id],
        )?;
        Ok(())
    }

    // ==========================================
    // SEARCH & HISTORY
    // ==========================================

    pub fn add_search_history(&self, query: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO search_history (query) VALUES (?1)",
            params![query.trim()],
        )?;
        Ok(())
    }

    pub fn get_search_history(&self) -> Result<Vec<SearchHistoryItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, query FROM search_history ORDER BY id DESC LIMIT 20")?;
        let history = stmt.query_map([], |r| {
            Ok(SearchHistoryItem {
                id: r.get(0)?,
                query: r.get(1)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(history)
    }

    pub fn clear_search_history(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM search_history", [])?;
        Ok(())
    }

    pub fn local_search(&self, query: &str) -> Result<Vec<SongItem>> {
        let conn = self.conn.lock().unwrap();
        let pattern = format!("%{}%", query.trim());
        let mut stmt = conn.prepare(
            "SELECT id, title, duration, thumbnailUrl, albumId, albumName, explicit, liked, totalPlayTime, inLibrary, isLocal
             FROM song WHERE title LIKE ?1 OR albumName LIKE ?1 LIMIT 50"
        )?;
        let songs = stmt.query_map(params![pattern], |row| {
            let album_id: Option<String> = row.get(4)?;
            let album_name: Option<String> = row.get(5)?;
            let album = album_name.map(|title| AlbumReference {
                id: album_id,
                title,
            });

            Ok(SongItem {
                id: row.get(0)?,
                title: row.get(1)?,
                duration: Some(row.get(2)?),
                thumbnail: row.get(3).unwrap_or_default(),
                album,
                explicit: row.get::<_, i32>(6)? != 0,
                liked: row.get::<_, i32>(7)? != 0,
                total_play_time: row.get(8)?,
                in_library: row.get(9)?,
                is_local: row.get::<_, i32>(10)? != 0,
                artists: Vec::new(),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(songs)
    }

    // ==========================================
    // LYRICS & FORMAT CACHING
    // ==========================================

    pub fn get_cached_lyrics(&self, song_id: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT lyrics FROM lyrics WHERE id = ?1")?;
        let res = stmt.query_row(params![song_id], |r| r.get(0));
        match res {
            Ok(lyrics) => Ok(Some(lyrics)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn save_cached_lyrics(&self, song_id: &str, lyrics: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO lyrics (id, lyrics) VALUES (?1, ?2)",
            params![song_id, lyrics],
        )?;
        Ok(())
    }

    // ==========================================
    // SETTINGS (KEY-VALUE STORE)
    // ==========================================

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM app_settings WHERE key = ?1")?;
        let res = stmt.query_row(params![key], |r| r.get(0));
        match res {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_all_settings(&self) -> Result<std::collections::HashMap<String, String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT key, value FROM app_settings")?;
        let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?;
        let mut map = std::collections::HashMap::new();
        for row in rows {
            let (k, v) = row?;
            map.insert(k, v);
        }
        Ok(map)
    }

    // ==========================================
    // STATS
    // ==========================================

    pub fn get_top_played_songs(&self, limit: i32) -> Result<Vec<PlayCountStat>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT s.id, s.title, COALESCE((SELECT name FROM artist a JOIN song_artist_map m ON m.artistId = a.id WHERE m.songId = s.id LIMIT 1), 'Unknown') as artistName,
                    s.thumbnailUrl, SUM(p.count) as playCount, s.totalPlayTime
             FROM song s
             JOIN playCount p ON p.song = s.id
             GROUP BY s.id
             ORDER BY playCount DESC, s.totalPlayTime DESC
             LIMIT ?1"
        )?;
        let stats = stmt.query_map(params![limit], |r| {
            Ok(PlayCountStat {
                song_id: r.get(0)?,
                title: r.get(1)?,
                artist_name: r.get(2)?,
                thumbnail_url: r.get(3)?,
                play_count: r.get(4)?,
                total_play_time: r.get(5)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(stats)
    }
}
