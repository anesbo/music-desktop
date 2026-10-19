use rusqlite::{Connection, Result};

pub const SCHEMA_QUERIES: &[&str] = &[
    // 1. song
    "CREATE TABLE IF NOT EXISTS song (
        id TEXT NOT NULL,
        title TEXT NOT NULL,
        duration INTEGER NOT NULL,
        thumbnailUrl TEXT,
        albumId TEXT,
        albumName TEXT,
        explicit INTEGER NOT NULL DEFAULT 0,
        year INTEGER,
        date INTEGER,
        dateModified INTEGER,
        liked INTEGER NOT NULL DEFAULT 0,
        likedDate INTEGER,
        totalPlayTime INTEGER NOT NULL DEFAULT 0,
        inLibrary INTEGER,
        dateDownload INTEGER,
        isLocal INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(id)
    );",
    "CREATE INDEX IF NOT EXISTS index_song_albumId ON song (albumId);",

    // 2. artist
    "CREATE TABLE IF NOT EXISTS artist (
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        thumbnailUrl TEXT,
        channelId TEXT,
        lastUpdateTime INTEGER NOT NULL DEFAULT 0,
        bookmarkedAt INTEGER,
        isLocal INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(id)
    );",

    // 3. album
    "CREATE TABLE IF NOT EXISTS album (
        id TEXT NOT NULL,
        playlistId TEXT,
        title TEXT NOT NULL,
        year INTEGER,
        thumbnailUrl TEXT,
        themeColor INTEGER,
        songCount INTEGER NOT NULL DEFAULT 0,
        duration INTEGER NOT NULL DEFAULT 0,
        explicit INTEGER NOT NULL DEFAULT 0,
        lastUpdateTime INTEGER NOT NULL DEFAULT 0,
        bookmarkedAt INTEGER,
        likedDate INTEGER,
        inLibrary INTEGER,
        isLocal INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(id)
    );",

    // 4. playlist
    "CREATE TABLE IF NOT EXISTS playlist (
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        browseId TEXT,
        createdAt INTEGER,
        lastUpdateTime INTEGER,
        isEditable INTEGER NOT NULL DEFAULT 1,
        bookmarkedAt INTEGER,
        remoteSongCount INTEGER,
        playEndpointParams TEXT,
        thumbnailUrl TEXT,
        shuffleEndpointParams TEXT,
        radioEndpointParams TEXT,
        customOrder INTEGER,
        isLocal INTEGER NOT NULL DEFAULT 0,
        isAutoSync INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(id)
    );",

    // 5. song_artist_map
    "CREATE TABLE IF NOT EXISTS song_artist_map (
        songId TEXT NOT NULL,
        artistId TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY(songId, artistId),
        FOREIGN KEY(songId) REFERENCES song(id) ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY(artistId) REFERENCES artist(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );",
    "CREATE INDEX IF NOT EXISTS index_song_artist_map_songId ON song_artist_map (songId);",
    "CREATE INDEX IF NOT EXISTS index_song_artist_map_artistId ON song_artist_map (artistId);",

    // 6. song_album_map
    "CREATE TABLE IF NOT EXISTS song_album_map (
        songId TEXT NOT NULL,
        albumId TEXT NOT NULL,
        `index` INTEGER NOT NULL,
        PRIMARY KEY(songId, albumId),
        FOREIGN KEY(songId) REFERENCES song(id) ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY(albumId) REFERENCES album(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );",
    "CREATE INDEX IF NOT EXISTS index_song_album_map_songId ON song_album_map (songId);",
    "CREATE INDEX IF NOT EXISTS index_song_album_map_albumId ON song_album_map (albumId);",

    // 7. album_artist_map
    "CREATE TABLE IF NOT EXISTS album_artist_map (
        albumId TEXT NOT NULL,
        artistId TEXT NOT NULL,
        `order` INTEGER NOT NULL,
        PRIMARY KEY(albumId, artistId),
        FOREIGN KEY(albumId) REFERENCES album(id) ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY(artistId) REFERENCES artist(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );",
    "CREATE INDEX IF NOT EXISTS index_album_artist_map_albumId ON album_artist_map (albumId);",
    "CREATE INDEX IF NOT EXISTS index_album_artist_map_artistId ON album_artist_map (artistId);",

    // 8. playlist_song_map
    "CREATE TABLE IF NOT EXISTS playlist_song_map (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        playlistId TEXT NOT NULL,
        songId TEXT NOT NULL,
        position INTEGER NOT NULL,
        setVideoId TEXT,
        FOREIGN KEY(playlistId) REFERENCES playlist(id) ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY(songId) REFERENCES song(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );",
    "CREATE INDEX IF NOT EXISTS index_playlist_song_map_playlistId ON playlist_song_map (playlistId);",
    "CREATE INDEX IF NOT EXISTS index_playlist_song_map_songId ON playlist_song_map (songId);",

    // 9. search_history
    "CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        query TEXT NOT NULL
    );",
    "CREATE UNIQUE INDEX IF NOT EXISTS index_search_history_query ON search_history (query);",

    // 10. format
    "CREATE TABLE IF NOT EXISTS format (
        id TEXT NOT NULL,
        itag INTEGER NOT NULL,
        mimeType TEXT NOT NULL,
        codecs TEXT NOT NULL,
        bitrate INTEGER NOT NULL,
        sampleRate INTEGER,
        contentLength INTEGER NOT NULL,
        loudnessDb REAL,
        perceptualLoudnessDb REAL,
        playbackUrl TEXT,
        PRIMARY KEY(id)
    );",

    // 11. lyrics
    "CREATE TABLE IF NOT EXISTS lyrics (
        id TEXT NOT NULL,
        lyrics TEXT NOT NULL,
        PRIMARY KEY(id)
    );",

    // 12. event
    "CREATE TABLE IF NOT EXISTS event (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        songId TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        playTime INTEGER NOT NULL,
        FOREIGN KEY(songId) REFERENCES song(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );",
    "CREATE INDEX IF NOT EXISTS index_event_songId ON event (songId);",

    // 13. related_song_map
    "CREATE TABLE IF NOT EXISTS related_song_map (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        songId TEXT NOT NULL,
        relatedSongId TEXT NOT NULL,
        FOREIGN KEY(songId) REFERENCES song(id) ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY(relatedSongId) REFERENCES song(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );",
    "CREATE INDEX IF NOT EXISTS index_related_song_map_songId ON related_song_map (songId);",
    "CREATE INDEX IF NOT EXISTS index_related_song_map_relatedSongId ON related_song_map (relatedSongId);",

    // 14. set_video_id
    "CREATE TABLE IF NOT EXISTS set_video_id (
        videoId TEXT NOT NULL,
        setVideoId TEXT,
        PRIMARY KEY(videoId)
    );",

    // 15. playCount
    "CREATE TABLE IF NOT EXISTS playCount (
        song TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY(song, year, month)
    );",

    // 16. tag
    "CREATE TABLE IF NOT EXISTS tag (
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#FF6B6B',
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY(id)
    );",

    // 17. playlist_tag_map
    "CREATE TABLE IF NOT EXISTS playlist_tag_map (
        playlistId TEXT NOT NULL,
        tagId TEXT NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY(playlistId, tagId)
    );",

    // 18. song_skip
    "CREATE TABLE IF NOT EXISTS song_skip (
        songId TEXT NOT NULL,
        skipCount INTEGER NOT NULL,
        lastSkippedAt INTEGER NOT NULL,
        PRIMARY KEY(songId)
    );",

    // 19. app_settings (key-value store for preferences)
    "CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
    );",

    // Views
    "CREATE VIEW IF NOT EXISTS sorted_song_artist_map AS SELECT * FROM song_artist_map ORDER BY position;",
    "CREATE VIEW IF NOT EXISTS sorted_song_album_map AS SELECT * FROM song_album_map ORDER BY `index`;",
    "CREATE VIEW IF NOT EXISTS playlist_song_map_preview AS SELECT * FROM playlist_song_map WHERE position <= 3 ORDER BY position;",
];

pub fn init_database(conn: &Connection) -> Result<()> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    for query in SCHEMA_QUERIES {
        conn.execute_batch(query)?;
    }
    Ok(())
}
