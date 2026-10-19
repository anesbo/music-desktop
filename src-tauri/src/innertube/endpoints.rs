use super::client::InnerTubeClient;
use crate::models::{
    AlbumItem, AlbumPage, AlbumReference, Artist, ArtistItem, ArtistPage, ArtistSection,
    ChartSection, ChartsPage, HomeChip, HomePage, HomeSection, LyricsLine, MediaStreamInfo,
    NextResult, PlaylistItem, PlaylistPage, SearchResult, SearchSummary, SearchSummaryPage,
    SongItem, YTItem,
};
use base64::Engine;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct InnerTubeService {
    pub client: InnerTubeClient,
    pub proxy: Option<Arc<super::proxy::StreamProxy>>,
}

impl InnerTubeService {
    pub fn new() -> Self {
        let client = InnerTubeClient::new();
        let proxy = super::proxy::StreamProxy::new();

        let client_http = client.http.clone();
        proxy.clone().start(move |video_id| {
            let http = client_http.clone();
            async move {
                fetch_direct_stream_url(&http, &video_id).await
            }
        });

        Self {
            client,
            proxy: Some(proxy),
        }
    }

    // ==========================================
    // SEARCH SUGGESTIONS & SEARCH
    // ==========================================

    pub async fn search_suggestions(&self, query: &str) -> Result<Vec<String>, String> {
        let payload = json!({
            "context": self.client.build_context(),
            "input": query
        });

        let res = self.client.post_endpoint("music/get_search_suggestions", payload).await?;
        let mut suggestions = Vec::new();

        if let Some(contents) = res.pointer("/contents/0/searchSuggestionsSectionRenderer/contents").and_then(|v| v.as_array()) {
            for item in contents {
                if let Some(runs) = item.pointer("/searchSuggestionRenderer/suggestion/runs").and_then(|v| v.as_array()) {
                    let text = runs.iter()
                        .filter_map(|r| r.get("text").and_then(|t| t.as_str()))
                        .collect::<Vec<_>>()
                        .join("");
                    if !text.is_empty() {
                        suggestions.push(text);
                    }
                }
            }
        }

        Ok(suggestions)
    }

    pub async fn search_summary(&self, query: &str) -> Result<SearchSummaryPage, String> {
        let payload = json!({
            "context": self.client.build_context(),
            "query": query
        });

        let res = self.client.post_endpoint("search", payload).await?;
        let mut summaries = Vec::new();

        if let Some(sections) = res.pointer("/contents/tabbedSearchResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents").and_then(|v| v.as_array()) {
            for section in sections {
                // MusicCardShelfRenderer (Top result)
                if let Some(card) = section.get("musicCardShelfRenderer") {
                    let title = card.pointer("/header/musicCardShelfHeaderBasicRenderer/title/runs/0/text")
                        .and_then(|t| t.as_str())
                        .unwrap_or("Top result")
                        .to_string();

                    let mut items = Vec::new();
                    if let Some(item) = parse_music_card_shelf(card) {
                        items.push(item);
                    }
                    if let Some(contents) = card.get("contents").and_then(|c| c.as_array()) {
                        for c in contents {
                            if let Some(mrlir) = c.get("musicResponsiveListItemRenderer") {
                                if let Some(parsed) = parse_responsive_item(mrlir) {
                                    items.push(parsed);
                                }
                            }
                        }
                    }
                    if !items.is_empty() {
                        summaries.push(SearchSummary { title, items });
                    }
                }

                // MusicShelfRenderer
                if let Some(shelf) = section.get("musicShelfRenderer") {
                    let title = shelf.pointer("/title/runs/0/text")
                        .and_then(|t| t.as_str())
                        .unwrap_or("Results")
                        .to_string();

                    let mut items = Vec::new();
                    if let Some(contents) = shelf.get("contents").and_then(|c| c.as_array()) {
                        for c in contents {
                            if let Some(mrlir) = c.get("musicResponsiveListItemRenderer") {
                                if let Some(parsed) = parse_responsive_item(mrlir) {
                                    items.push(parsed);
                                }
                            }
                        }
                    }
                    if !items.is_empty() {
                        summaries.push(SearchSummary { title, items });
                    }
                }
            }
        }

        Ok(SearchSummaryPage { summaries })
    }

    pub async fn search(&self, query: &str, filter: Option<&str>) -> Result<SearchResult, String> {
        let mut payload = json!({
            "context": self.client.build_context(),
            "query": query
        });

        if let Some(f) = filter {
            let filter_param = match f {
                "songs" => "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D",
                "albums" => "EgWKAQIYAWoKEAkQChAFEAMQBA%3D%3D",
                "artists" => "EgWKAQIgAWoKEAkQChAFEAMQBA%3D%3D",
                "playlists" => "EgeKAQQoADgBagwQDhAKEAMQBRAJEAQ%3D",
                _ => "",
            };
            if !filter_param.is_empty() {
                payload["params"] = Value::String(filter_param.to_string());
            }
        }

        let res = self.client.post_endpoint("search", payload).await?;
        let mut items = Vec::new();

        if let Some(contents) = res.pointer("/contents/tabbedSearchResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicShelfRenderer/contents").and_then(|v| v.as_array()) {
            for c in contents {
                if let Some(mrlir) = c.get("musicResponsiveListItemRenderer") {
                    if let Some(parsed) = parse_responsive_item(mrlir) {
                        items.push(parsed);
                    }
                }
            }
        }

        Ok(SearchResult {
            items,
            continuation: None,
        })
    }

    // ==========================================
    // HOME & EXPLORE & CHARTS
    // ==========================================

    pub async fn home(&self, params: Option<&str>) -> Result<HomePage, String> {
        let mut payload = json!({
            "context": self.client.build_context(),
            "browseId": "FEmusic_home"
        });
        if let Some(p) = params {
            payload["params"] = Value::String(p.to_string());
        }

        let res = self.client.post_endpoint("browse", payload).await?;
        let mut chips = Vec::new();
        let mut sections = Vec::new();

        let section_list = res.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer");
        if let Some(chip_arr) = section_list.and_then(|sl| sl.pointer("/header/chipCloudRenderer/chips")).and_then(|c| c.as_array()) {
            for chip in chip_arr {
                if let Some(r) = chip.get("chipCloudChipRenderer") {
                    let title = r.pointer("/text/runs/0/text").and_then(|t| t.as_str()).unwrap_or_default().to_string();
                    let params = r.pointer("/navigationEndpoint/browseEndpoint/params").and_then(|p| p.as_str()).map(|s| s.to_string());
                    let selected = r.get("isSelected").and_then(|b| b.as_bool()).unwrap_or(false);
                    chips.push(HomeChip { title, params, selected });
                }
            }
        }

        if let Some(contents) = section_list.and_then(|sl| sl.get("contents")).and_then(|c| c.as_array()) {
            for c in contents {
                if let Some(shelf) = c.get("musicCarouselShelfRenderer") {
                    let title = shelf.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/text")
                        .and_then(|t| t.as_str())
                        .unwrap_or("Featured")
                        .to_string();

                    let mut items = Vec::new();
                    if let Some(shelf_items) = shelf.get("contents").and_then(|ci| ci.as_array()) {
                        for item in shelf_items {
                            if let Some(two_row) = item.get("musicTwoRowItemRenderer") {
                                if let Some(parsed) = parse_two_row_item(two_row) {
                                    items.push(parsed);
                                }
                            } else if let Some(mrlir) = item.get("musicResponsiveListItemRenderer") {
                                if let Some(parsed) = parse_responsive_item(mrlir) {
                                    items.push(parsed);
                                }
                            }
                        }
                    }
                    if !items.is_empty() {
                        sections.push(HomeSection { title, items });
                    }
                }
            }
        }

        Ok(HomePage { chips, sections, continuation: None })
    }

    pub async fn explore(&self) -> Result<HomePage, String> {
        let payload = json!({
            "context": self.client.build_context(),
            "browseId": "FEmusic_explore"
        });

        let res = self.client.post_endpoint("browse", payload).await?;
        let mut sections = Vec::new();

        if let Some(contents) = res.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents").and_then(|c| c.as_array()) {
            for c in contents {
                if let Some(shelf) = c.get("musicCarouselShelfRenderer") {
                    let title = shelf.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/text")
                        .and_then(|t| t.as_str())
                        .unwrap_or("Explore")
                        .to_string();

                    let mut items = Vec::new();
                    if let Some(shelf_items) = shelf.get("contents").and_then(|ci| ci.as_array()) {
                        for item in shelf_items {
                            if let Some(two_row) = item.get("musicTwoRowItemRenderer") {
                                if let Some(parsed) = parse_two_row_item(two_row) {
                                    items.push(parsed);
                                }
                            }
                        }
                    }
                    if !items.is_empty() {
                        sections.push(HomeSection { title, items });
                    }
                }
            }
        }

        Ok(HomePage { chips: Vec::new(), sections, continuation: None })
    }

    pub async fn charts(&self) -> Result<ChartsPage, String> {
        let payload = json!({
            "context": self.client.build_context(),
            "browseId": "FEmusic_charts"
        });

        let res = self.client.post_endpoint("browse", payload).await?;
        let mut sections = Vec::new();

        if let Some(contents) = res.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents").and_then(|c| c.as_array()) {
            for c in contents {
                if let Some(shelf) = c.get("musicCarouselShelfRenderer") {
                    let title = shelf.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/text")
                        .and_then(|t| t.as_str())
                        .unwrap_or("Top Charts")
                        .to_string();

                    let mut items = Vec::new();
                    if let Some(shelf_items) = shelf.get("contents").and_then(|ci| ci.as_array()) {
                        for item in shelf_items {
                            if let Some(two_row) = item.get("musicTwoRowItemRenderer") {
                                if let Some(parsed) = parse_two_row_item(two_row) {
                                    items.push(parsed);
                                }
                            } else if let Some(mrlir) = item.get("musicResponsiveListItemRenderer") {
                                if let Some(parsed) = parse_responsive_item(mrlir) {
                                    items.push(parsed);
                                }
                            }
                        }
                    }
                    if !items.is_empty() {
                        sections.push(ChartSection {
                            title,
                            items,
                            chart_type: "TOP".into(),
                        });
                    }
                }
            }
        }

        Ok(ChartsPage { sections, continuation: None })
    }

    // ==========================================
    // ALBUM & ARTIST & PLAYLIST
    // ==========================================

    pub async fn album(&self, browse_id: &str) -> Result<AlbumPage, String> {
        let payload = json!({
            "context": self.client.build_context(),
            "browseId": browse_id
        });

        let res = self.client.post_endpoint("browse", payload).await?;
        let header = res.pointer("/contents/twoColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicResponsiveHeaderRenderer")
            .ok_or("Album header not found")?;

        let title = header.pointer("/title/runs/0/text").and_then(|t| t.as_str()).unwrap_or("Unknown Album").to_string();
        let thumbnail = header.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
            .and_then(|t| t.as_array())
            .and_then(|arr| arr.last())
            .and_then(|t| t.get("url"))
            .and_then(|u| u.as_str())
            .unwrap_or_default()
            .to_string();

        let year = header.pointer("/subtitle/runs")
            .and_then(|r| r.as_array())
            .and_then(|arr| arr.last())
            .and_then(|r| r.get("text"))
            .and_then(|t| t.as_str())
            .and_then(|s| s.parse::<i32>().ok());

        let mut artists = Vec::new();
        if let Some(art_runs) = header.pointer("/straplineTextOne/runs").and_then(|r| r.as_array()) {
            for a in art_runs {
                if let Some(name) = a.get("text").and_then(|t| t.as_str()) {
                    if name != ", " && name != " & " {
                        let id = a.pointer("/navigationEndpoint/browseEndpoint/browseId").and_then(|i| i.as_str()).map(|s| s.to_string());
                        artists.push(Artist { id, name: name.to_string() });
                    }
                }
            }
        }

        let album_item = AlbumItem {
            browse_id: browse_id.to_string(),
            playlist_id: None,
            title: title.clone(),
            artists: artists.clone(),
            year,
            thumbnail: thumbnail.clone(),
            explicit: false,
            song_count: None,
            duration: None,
            in_library: None,
            liked_date: None,
            bookmarked_at: None,
        };

        // Parse songs from secondaryContents or shelf
        let mut songs = Vec::new();
        let contents = res.pointer("/contents/twoColumnBrowseResultsRenderer/secondaryContents/sectionListRenderer/contents/0/musicPlaylistShelfRenderer/contents")
            .and_then(|c| c.as_array());

        if let Some(song_arr) = contents {
            for (_idx, item) in song_arr.iter().enumerate() {
                if let Some(mrlir) = item.get("musicResponsiveListItemRenderer") {
                    if let Some(mut song) = parse_song_from_mrlir(mrlir) {
                        song.album = Some(AlbumReference {
                            id: Some(browse_id.to_string()),
                            title: title.clone(),
                        });
                        if song.artists.is_empty() {
                            song.artists = artists.clone();
                        }
                        songs.push(song);
                    }
                }
            }
        }

        Ok(AlbumPage {
            album: album_item,
            songs,
            other_versions: Vec::new(),
        })
    }

    pub async fn artist(&self, browse_id: &str) -> Result<ArtistPage, String> {
        let payload = json!({
            "context": self.client.build_context(),
            "browseId": browse_id
        });

        let res = self.client.post_endpoint("browse", payload).await?;
        let header = res.pointer("/header/musicImmersiveHeaderRenderer")
            .or_else(|| res.pointer("/header/musicVisualHeaderRenderer"))
            .or_else(|| res.pointer("/header/musicHeaderRenderer"));

        let title = header.and_then(|h| h.pointer("/title/runs/0/text")).and_then(|t| t.as_str()).unwrap_or("Unknown Artist").to_string();
        let thumbnail = header.and_then(|h| h.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails"))
            .and_then(|t| t.as_array())
            .and_then(|arr| arr.last())
            .and_then(|t| t.get("url"))
            .and_then(|u| u.as_str())
            .map(|s| s.to_string());

        let description = header.and_then(|h| h.pointer("/description/runs/0/text")).and_then(|t| t.as_str()).map(|s| s.to_string());

        let mut sections = Vec::new();
        if let Some(sec_contents) = res.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents").and_then(|c| c.as_array()) {
            for c in sec_contents {
                // Shelf with songs
                if let Some(shelf) = c.get("musicShelfRenderer") {
                    let sec_title = shelf.pointer("/title/runs/0/text").and_then(|t| t.as_str()).unwrap_or("Songs").to_string();
                    let mut items = Vec::new();
                    if let Some(c_arr) = shelf.get("contents").and_then(|ca| ca.as_array()) {
                        for item in c_arr {
                            if let Some(mrlir) = item.get("musicResponsiveListItemRenderer") {
                                if let Some(parsed) = parse_responsive_item(mrlir) {
                                    items.push(parsed);
                                }
                            }
                        }
                    }
                    if !items.is_empty() {
                        sections.push(ArtistSection { title: sec_title, items });
                    }
                }
                // Carousel with albums/singles
                if let Some(carousel) = c.get("musicCarouselShelfRenderer") {
                    let sec_title = carousel.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/text")
                        .and_then(|t| t.as_str())
                        .unwrap_or("Releases")
                        .to_string();
                    let mut items = Vec::new();
                    if let Some(c_arr) = carousel.get("contents").and_then(|ca| ca.as_array()) {
                        for item in c_arr {
                            if let Some(two_row) = item.get("musicTwoRowItemRenderer") {
                                if let Some(parsed) = parse_two_row_item(two_row) {
                                    items.push(parsed);
                                }
                            }
                        }
                    }
                    if !items.is_empty() {
                        sections.push(ArtistSection { title: sec_title, items });
                    }
                }
            }
        }

        Ok(ArtistPage {
            artist: ArtistItem {
                id: browse_id.to_string(),
                title,
                thumbnail,
                channel_id: None,
                description: description.clone(),
                bookmarked_at: None,
                subscribers: None,
            },
            sections,
            description,
        })
    }

    pub async fn playlist(&self, playlist_id: &str) -> Result<PlaylistPage, String> {
        let browse_id = if playlist_id.starts_with("VL") {
            playlist_id.to_string()
        } else {
            format!("VL{}", playlist_id)
        };

        let payload = json!({
            "context": self.client.build_context(),
            "browseId": browse_id
        });

        let res = self.client.post_endpoint("browse", payload).await?;
        let header = res.pointer("/contents/twoColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicResponsiveHeaderRenderer")
            .or_else(|| res.pointer("/contents/twoColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicEditablePlaylistDetailHeaderRenderer/header/musicResponsiveHeaderRenderer"))
            .ok_or("Playlist header not found")?;

        let title = header.pointer("/title/runs/0/text").and_then(|t| t.as_str()).unwrap_or("Playlist").to_string();
        let thumbnail = header.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
            .and_then(|t| t.as_array())
            .and_then(|arr| arr.last())
            .and_then(|t| t.get("url"))
            .and_then(|u| u.as_str())
            .map(|s| s.to_string());

        let song_count_text = header.pointer("/secondSubtitle/runs/0/text").and_then(|t| t.as_str()).map(|s| s.to_string());

        let mut songs = Vec::new();
        if let Some(song_arr) = res.pointer("/contents/twoColumnBrowseResultsRenderer/secondaryContents/sectionListRenderer/contents/0/musicPlaylistShelfRenderer/contents").and_then(|c| c.as_array()) {
            for item in song_arr {
                if let Some(mrlir) = item.get("musicResponsiveListItemRenderer") {
                    if let Some(song) = parse_song_from_mrlir(mrlir) {
                        songs.push(song);
                    }
                }
            }
        }

        Ok(PlaylistPage {
            playlist: PlaylistItem {
                id: playlist_id.to_string(),
                title,
                author: None,
                song_count_text,
                thumbnail,
                is_editable: false,
                created_at: None,
                bookmarked_at: None,
                remote_song_count: Some(songs.len() as i32),
                custom_order: None,
            },
            songs,
            continuation: None,
        })
    }

    // ==========================================
    // PLAYER STREAM & NEXT QUEUE
    // ==========================================

    pub async fn next(&self, video_id: Option<&str>, playlist_id: Option<&str>) -> Result<NextResult, String> {
        let mut payload = json!({
            "context": self.client.build_context()
        });
        if let Some(vid) = video_id {
            payload["videoId"] = Value::String(vid.to_string());
        }
        if let Some(pid) = playlist_id {
            payload["playlistId"] = Value::String(pid.to_string());
        }

        let res = self.client.post_endpoint("next", payload).await?;
        let mut items = Vec::new();

        let panel_contents = res.pointer("/contents/singleColumnMusicWatchNextResultsRenderer/tabbedRenderer/watchNextTabbedResultsRenderer/tabs/0/tabRenderer/content/musicQueueRenderer/content/playlistPanelRenderer/contents")
            .or_else(|| res.pointer("/continuationContents/playlistPanelContinuation/contents"))
            .and_then(|c| c.as_array());

        if let Some(contents) = panel_contents {
            for item in contents {
                if let Some(ppvr) = item.get("playlistPanelVideoRenderer") {
                    if let Some(song) = parse_song_from_ppvr(ppvr) {
                        items.push(song);
                    }
                }
            }
        }

        Ok(NextResult {
            title: Some("Up Next".into()),
            items,
            current_index: Some(0),
            lyrics_endpoint: None,
            continuation: None,
        })
    }

    pub async fn resolve_stream_url(&self, video_id: &str) -> Result<MediaStreamInfo, String> {
        let (direct_url, itag, mime_type, bitrate) = fetch_direct_stream_info(&self.client.http, video_id).await?;

        let final_url = if let Some(ref proxy) = self.proxy {
            let port = proxy.port.load(std::sync::atomic::Ordering::SeqCst);
            if port > 0 {
                {
                    let mut write_guard = proxy.cache.write().await;
                    write_guard.insert(
                        video_id.to_string(),
                        (direct_url.clone(), std::time::Instant::now()),
                    );
                }
                format!("http://127.0.0.1:{}/stream?video_id={}", port, video_id)
            } else {
                direct_url
            }
        } else {
            direct_url
        };

        Ok(MediaStreamInfo {
            video_id: video_id.to_string(),
            url: final_url,
            itag,
            mime_type,
            bitrate,
            loudness_db: None,
            perceptual_loudness_db: None,
        })
    }

    pub async fn get_transcript(&self, video_id: &str) -> Result<Vec<LyricsLine>, String> {
        let param_bytes = format!("\n\x0B{}", video_id);
        let param_b64 = base64::engine::general_purpose::STANDARD.encode(param_bytes);

        let payload = json!({
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20260114.00.00",
                    "gl": "US",
                    "hl": "en"
                }
            },
            "params": param_b64
        });

        let url = "https://music.youtube.com/youtubei/v1/get_transcript?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX3";
        let res = self.client.http.post(url)
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<Value>()
            .await
            .map_err(|e| e.to_string())?;

        let mut lines = Vec::new();
        if let Some(cue_groups) = res.pointer("/actions/0/updateEngagementPanelAction/content/transcriptRenderer/body/transcriptBodyRenderer/cueGroups").and_then(|c| c.as_array()) {
            for group in cue_groups {
                if let Some(cue) = group.pointer("/transcriptCueGroupRenderer/cues/0/transcriptCueRenderer") {
                    let offset_ms = cue.get("startOffsetMs")
                        .and_then(|s| s.as_str())
                        .and_then(|s| s.parse::<i64>().ok())
                        .or_else(|| cue.get("startOffsetMs").and_then(|s| s.as_i64()))
                        .unwrap_or(0);
                    let text = cue.pointer("/cue/simpleText")
                        .and_then(|t| t.as_str())
                        .unwrap_or("")
                        .trim_matches(|c| c == '♪' || c == ' ')
                        .to_string();
                    if !text.is_empty() {
                        lines.push(LyricsLine {
                            time: offset_ms,
                            text,
                        });
                    }
                }
            }
        }

        Ok(lines)
    }
}

// Helper parsing functions

fn parse_responsive_item(mrlir: &Value) -> Option<YTItem> {
    let video_id = mrlir.pointer("/playlistItemData/videoId")
        .or_else(|| mrlir.pointer("/overlay/musicItemThumbnailOverlayRenderer/content/musicPlayButtonRenderer/playNavigationEndpoint/watchEndpoint/videoId"))
        .and_then(|v| v.as_str());

    if let Some(_vid) = video_id {
        return parse_song_from_mrlir(mrlir).map(YTItem::Song);
    }

    let browse_id = mrlir.pointer("/navigationEndpoint/browseEndpoint/browseId")
        .and_then(|b| b.as_str());

    if let Some(bid) = browse_id {
        if bid.starts_with("UC") || bid.starts_with("FEmusic_library_privately_owned_artist") {
            let title = mrlir.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
                .and_then(|t| t.as_str())
                .unwrap_or("Artist")
                .to_string();
            let thumbnail = mrlir.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
                .and_then(|t| t.as_array())
                .and_then(|arr| arr.last())
                .and_then(|t| t.get("url"))
                .and_then(|u| u.as_str())
                .map(|s| s.to_string());

            return Some(YTItem::Artist(ArtistItem {
                id: bid.to_string(),
                title,
                thumbnail,
                channel_id: None,
                description: None,
                bookmarked_at: None,
                subscribers: None,
            }));
        } else if bid.starts_with("MPRE") || bid.starts_with("FEmusic_library_privately_owned_release") {
            let title = mrlir.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
                .and_then(|t| t.as_str())
                .unwrap_or("Album")
                .to_string();
            let thumbnail = mrlir.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
                .and_then(|t| t.as_array())
                .and_then(|arr| arr.last())
                .and_then(|t| t.get("url"))
                .and_then(|u| u.as_str())
                .unwrap_or_default()
                .to_string();

            return Some(YTItem::Album(AlbumItem {
                browse_id: bid.to_string(),
                playlist_id: None,
                title,
                artists: Vec::new(),
                year: None,
                thumbnail,
                explicit: false,
                song_count: None,
                duration: None,
                in_library: None,
                liked_date: None,
                bookmarked_at: None,
            }));
        }
    }

    None
}

fn parse_song_from_mrlir(mrlir: &Value) -> Option<SongItem> {
    let id = mrlir.pointer("/playlistItemData/videoId")
        .or_else(|| mrlir.pointer("/overlay/musicItemThumbnailOverlayRenderer/content/musicPlayButtonRenderer/playNavigationEndpoint/watchEndpoint/videoId"))
        .and_then(|v| v.as_str())?
        .to_string();

    let title = mrlir.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .and_then(|t| t.as_str())
        .unwrap_or("Unknown")
        .to_string();

    let thumbnail = mrlir.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|u| u.as_str())
        .unwrap_or_default()
        .to_string();

    let mut artists = Vec::new();
    let mut album = None;

    if let Some(runs) = mrlir.pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs").and_then(|r| r.as_array()) {
        for run in runs {
            if let Some(text) = run.get("text").and_then(|t| t.as_str()) {
                if text == " • " || text == ", " || text == " & " {
                    continue;
                }
                if let Some(browse_endpoint) = run.pointer("/navigationEndpoint/browseEndpoint") {
                    let browse_id = browse_endpoint.get("browseId").and_then(|b| b.as_str()).unwrap_or("");
                    if browse_id.starts_with("UC") {
                        artists.push(Artist {
                            id: Some(browse_id.to_string()),
                            name: text.to_string(),
                        });
                    } else if browse_id.starts_with("MPRE") {
                        album = Some(AlbumReference {
                            id: Some(browse_id.to_string()),
                            title: text.to_string(),
                        });
                    }
                } else if artists.is_empty() {
                    artists.push(Artist {
                        id: None,
                        name: text.to_string(),
                    });
                }
            }
        }
    }

    Some(SongItem {
        id,
        title,
        artists,
        album,
        duration: None,
        thumbnail,
        explicit: false,
        in_library: None,
        liked: false,
        total_play_time: 0,
        is_local: false,
    })
}

fn parse_song_from_ppvr(ppvr: &Value) -> Option<SongItem> {
    let id = ppvr.get("videoId").and_then(|v| v.as_str())?.to_string();
    let title = ppvr.pointer("/title/runs/0/text").and_then(|t| t.as_str()).unwrap_or("Unknown").to_string();
    let thumbnail = ppvr.pointer("/thumbnail/thumbnails")
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|u| u.as_str())
        .unwrap_or_default()
        .to_string();

    let mut artists = Vec::new();
    if let Some(runs) = ppvr.pointer("/shortBylineText/runs").and_then(|r| r.as_array()) {
        for run in runs {
            if let Some(text) = run.get("text").and_then(|t| t.as_str()) {
                if text != " • " && text != ", " {
                    let id = run.pointer("/navigationEndpoint/browseEndpoint/browseId").and_then(|b| b.as_str()).map(|s| s.to_string());
                    artists.push(Artist { id, name: text.to_string() });
                }
            }
        }
    }

    Some(SongItem {
        id,
        title,
        artists,
        album: None,
        duration: None,
        thumbnail,
        explicit: false,
        in_library: None,
        liked: false,
        total_play_time: 0,
        is_local: false,
    })
}

fn parse_two_row_item(two_row: &Value) -> Option<YTItem> {
    let title = two_row.pointer("/title/runs/0/text").and_then(|t| t.as_str()).unwrap_or("").to_string();
    let thumbnail = two_row.pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|u| u.as_str())
        .unwrap_or_default()
        .to_string();

    let nav = two_row.get("navigationEndpoint")?;
    if let Some(watch) = nav.get("watchEndpoint") {
        let id = watch.get("videoId").and_then(|v| v.as_str())?.to_string();
        return Some(YTItem::Song(SongItem {
            id,
            title,
            artists: Vec::new(),
            album: None,
            duration: None,
            thumbnail,
            explicit: false,
            in_library: None,
            liked: false,
            total_play_time: 0,
            is_local: false,
        }));
    }

    if let Some(browse) = nav.get("browseEndpoint") {
        let browse_id = browse.get("browseId").and_then(|b| b.as_str()).unwrap_or("");
        if browse_id.starts_with("UC") {
            return Some(YTItem::Artist(ArtistItem {
                id: browse_id.to_string(),
                title,
                thumbnail: Some(thumbnail),
                channel_id: None,
                description: None,
                bookmarked_at: None,
                subscribers: None,
            }));
        } else if browse_id.starts_with("MPRE") || browse_id.starts_with("FEmusic_library") {
            return Some(YTItem::Album(AlbumItem {
                browse_id: browse_id.to_string(),
                playlist_id: None,
                title,
                artists: Vec::new(),
                year: None,
                thumbnail,
                explicit: false,
                song_count: None,
                duration: None,
                in_library: None,
                liked_date: None,
                bookmarked_at: None,
            }));
        } else if browse_id.starts_with("VL") || browse_id.starts_with("PL") {
            return Some(YTItem::Playlist(PlaylistItem {
                id: browse_id.to_string(),
                title,
                author: None,
                song_count_text: None,
                thumbnail: Some(thumbnail),
                is_editable: false,
                created_at: None,
                bookmarked_at: None,
                remote_song_count: None,
                custom_order: None,
            }));
        }
    }

    None
}

fn parse_music_card_shelf(card: &Value) -> Option<YTItem> {
    let title = card.pointer("/title/runs/0/text").and_then(|t| t.as_str()).unwrap_or("").to_string();
    let thumbnail = card.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|u| u.as_str())
        .unwrap_or_default()
        .to_string();

    let nav = card.pointer("/title/runs/0/navigationEndpoint")
        .or_else(|| card.pointer("/onTap/watchEndpoint"))?;

    if let Some(watch) = nav.get("watchEndpoint") {
        let id = watch.get("videoId").and_then(|v| v.as_str())?.to_string();
        return Some(YTItem::Song(SongItem {
            id,
            title,
            artists: Vec::new(),
            album: None,
            duration: None,
            thumbnail,
            explicit: false,
            in_library: None,
            liked: false,
            total_play_time: 0,
            is_local: false,
        }));
    }

    if let Some(browse) = nav.get("browseEndpoint") {
        let browse_id = browse.get("browseId").and_then(|b| b.as_str()).unwrap_or("");
        if browse_id.starts_with("UC") {
            return Some(YTItem::Artist(ArtistItem {
                id: browse_id.to_string(),
                title,
                thumbnail: Some(thumbnail),
                channel_id: None,
                description: None,
                bookmarked_at: None,
                subscribers: None,
            }));
        } else {
            return Some(YTItem::Album(AlbumItem {
                browse_id: browse_id.to_string(),
                playlist_id: None,
                title,
                artists: Vec::new(),
                year: None,
                thumbnail,
                explicit: false,
                song_count: None,
                duration: None,
                in_library: None,
                liked_date: None,
                bookmarked_at: None,
            }));
        }
    }

    None
}

pub async fn fetch_direct_stream_url(http: &reqwest::Client, video_id: &str) -> Result<String, String> {
    let (url, _, _, _) = fetch_direct_stream_info(http, video_id).await?;
    Ok(url)
}

pub async fn fetch_direct_stream_info(
    http: &reqwest::Client,
    video_id: &str,
) -> Result<(String, i32, String, i32), String> {
    // 1. Try iOS 20.10.4 client (unthrottled direct AAC/Opus streams without poToken/ciphers)
    let ios_payload = json!({
        "context": {
            "client": {
                "clientName": "IOS",
                "clientVersion": "20.10.4",
                "deviceMake": "Apple",
                "deviceModel": "iPhone16,2",
                "gl": "US",
                "hl": "en"
            }
        },
        "videoId": video_id
    });

    let ios_url = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
    let ios_res = http
        .post(ios_url)
        .header(
            "User-Agent",
            "com.google.ios.youtube/20.10 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
        )
        .header("X-YouTube-Client-Name", "5")
        .header("X-YouTube-Client-Version", "20.10.4")
        .header("Content-Type", "application/json")
        .json(&ios_payload)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<Value>()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(ios_formats) = ios_res
        .pointer("/streamingData/adaptiveFormats")
        .and_then(|f| f.as_array())
    {
        let mut best_fmt: Option<(String, i32, String, i32)> = None;
        for fmt in ios_formats {
            let mime = fmt.get("mimeType").and_then(|m| m.as_str()).unwrap_or("");
            if mime.starts_with("audio/") {
                if let Some(stream_url) = fmt.get("url").and_then(|u| u.as_str()) {
                    let itag = fmt.get("itag").and_then(|i| i.as_i64()).unwrap_or(140) as i32;
                    let bitrate = fmt.get("bitrate").and_then(|b| b.as_i64()).unwrap_or(128000) as i32;

                    let is_better = match &best_fmt {
                        None => true,
                        Some((_, prev_itag, _, prev_bitrate)) => {
                            if itag == 140 && *prev_itag != 140 {
                                true
                            } else if *prev_itag == 140 && itag != 140 {
                                false
                            } else {
                                bitrate > *prev_bitrate
                            }
                        }
                    };
                    if is_better {
                        best_fmt = Some((stream_url.to_string(), itag, mime.to_string(), bitrate));
                    }
                }
            }
        }
        if let Some(best) = best_fmt {
            return Ok(best);
        }
    }

    Err(format!(
        "No playable audio stream format found for video {}",
        video_id
    ))
}
