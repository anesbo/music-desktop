use crate::models::{LyricsLine, LyricsResult};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use base64::Engine;

pub struct LyricsEngine {
    http: Client,
}

impl LyricsEngine {
    pub fn new() -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(12))
            .gzip(true)
            .brotli(true)
            .build()
            .unwrap_or_else(|_| Client::new());

        Self { http }
    }

    pub async fn get_lyrics(&self, title: &str, artist: &str, video_id: Option<&str>, duration: Option<i64>) -> Option<LyricsResult> {
        // 1. Try SimpMusic if video_id available
        if let Some(vid) = video_id {
            if let Ok(Some(res)) = self.fetch_simpmusic(vid).await {
                return Some(res);
            }
        }

        // 2. Try LRCLIB
        if let Ok(Some(res)) = self.fetch_lrclib(title, artist, duration).await {
            return Some(res);
        }

        // 3. Try BetterLyrics
        if let Ok(Some(res)) = self.fetch_betterlyrics(title, artist).await {
            return Some(res);
        }

        // 4. Try KuGou
        if let Ok(Some(res)) = self.fetch_kugou(title, artist).await {
            return Some(res);
        }

        None
    }

    async fn fetch_simpmusic(&self, video_id: &str) -> Result<Option<LyricsResult>, String> {
        let url = format!("https://api-lyrics.simpmusic.org/v1/{}", video_id);
        let res = self.http.get(&url)
            .header("User-Agent", "SimpMusicLyrics/1.0")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Ok(None);
        }

        let json = res.json::<Value>().await.map_err(|e| e.to_string())?;
        if json.get("success").and_then(|s| s.as_bool()).unwrap_or(false) {
            if let Some(data) = json.get("data").and_then(|d| d.as_array()).and_then(|arr| arr.first()) {
                let synced = data.get("syncedLyrics").and_then(|s| s.as_str());
                let plain = data.get("plainLyrics").and_then(|s| s.as_str());

                if let Some(s) = synced {
                    return Ok(Some(LyricsResult {
                        provider: "SimpMusic".into(),
                        plain: plain.map(|p| p.to_string()),
                        synced: parse_lrc(s),
                    }));
                } else if let Some(p) = plain {
                    return Ok(Some(LyricsResult {
                        provider: "SimpMusic".into(),
                        plain: Some(p.to_string()),
                        synced: Vec::new(),
                    }));
                }
            }
        }

        Ok(None)
    }

    async fn fetch_lrclib(&self, title: &str, artist: &str, duration: Option<i64>) -> Result<Option<LyricsResult>, String> {
        let req = self.http.get("https://lrclib.net/api/search")
            .query(&[("track_name", title), ("artist_name", artist)]);

        let res = req.send().await.map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            return Ok(None);
        }

        let list = res.json::<Vec<Value>>().await.map_err(|e| e.to_string())?;
        if list.is_empty() {
            return Ok(None);
        }

        // Pick best matching by duration or first with syncedLyrics
        let best = if let Some(dur) = duration {
            list.iter().min_by_key(|item| {
                let item_dur = item.get("duration").and_then(|d| d.as_f64()).unwrap_or(0.0) as i64;
                (item_dur - dur).abs()
            })
        } else {
            list.iter().find(|item| item.get("syncedLyrics").and_then(|s| s.as_str()).is_some()).or_else(|| list.first())
        };

        if let Some(item) = best {
            let synced = item.get("syncedLyrics").and_then(|s| s.as_str());
            let plain = item.get("plainLyrics").and_then(|s| s.as_str());

            if let Some(s) = synced {
                return Ok(Some(LyricsResult {
                    provider: "LRCLIB".into(),
                    plain: plain.map(|p| p.to_string()),
                    synced: parse_lrc(s),
                }));
            } else if let Some(p) = plain {
                return Ok(Some(LyricsResult {
                    provider: "LRCLIB".into(),
                    plain: Some(p.to_string()),
                    synced: Vec::new(),
                }));
            }
        }

        Ok(None)
    }

    async fn fetch_betterlyrics(&self, title: &str, artist: &str) -> Result<Option<LyricsResult>, String> {
        let url = "https://lyrics-api.boidu.dev/getLyrics";
        let res = self.http.get(url)
            .query(&[("s", title), ("a", artist)])
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Ok(None);
        }

        let json = res.json::<Value>().await.map_err(|e| e.to_string())?;
        if let Some(ttml) = json.get("ttml").and_then(|t| t.as_str()) {
            if !ttml.is_empty() {
                let lines = parse_ttml(ttml);
                return Ok(Some(LyricsResult {
                    provider: "BetterLyrics".into(),
                    plain: None,
                    synced: lines,
                }));
            }
        }

        Ok(None)
    }

    async fn fetch_kugou(&self, title: &str, artist: &str) -> Result<Option<LyricsResult>, String> {
        let clean_title = title.split('(').next().unwrap_or(title).trim();
        let keyword = format!("{} - {}", clean_title, artist);

        let search_url = "https://lyrics.kugou.com/search";
        let res = self.http.get(search_url)
            .query(&[("ver", "1"), ("man", "yes"), ("client", "pc"), ("keyword", &keyword)])
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let json = res.json::<Value>().await.map_err(|e| e.to_string())?;
        if let Some(candidate) = json.pointer("/candidates/0") {
            let id = candidate.get("id").and_then(|i| i.as_i64()).unwrap_or(0);
            let access_key = candidate.get("accesskey").and_then(|a| a.as_str()).unwrap_or("");

            if id > 0 && !access_key.is_empty() {
                let download_url = "https://lyrics.kugou.com/download";
                let dl_res = self.http.get(download_url)
                    .query(&[
                        ("ver", "1"),
                        ("client", "pc"),
                        ("fmt", "lrc"),
                        ("charset", "utf8"),
                        ("id", &id.to_string()),
                        ("accesskey", access_key),
                    ])
                    .send()
                    .await
                    .map_err(|e| e.to_string())?;

                let dl_json = dl_res.json::<Value>().await.map_err(|e| e.to_string())?;
                if let Some(content_b64) = dl_json.get("content").and_then(|c| c.as_str()) {
                    if let Ok(decoded_bytes) = base64::engine::general_purpose::STANDARD.decode(content_b64) {
                        if let Ok(lrc_text) = String::from_utf8(decoded_bytes) {
                            return Ok(Some(LyricsResult {
                                provider: "KuGou".into(),
                                plain: None,
                                synced: parse_lrc(&lrc_text),
                            }));
                        }
                    }
                }
            }
        }

        Ok(None)
    }
}

// Simple LRC Parser
pub fn parse_lrc(lrc: &str) -> Vec<LyricsLine> {
    let mut lines = Vec::new();
    let re = regex::Regex::new(r"\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)").unwrap();

    for line in lrc.lines() {
        if let Some(caps) = re.captures(line) {
            let min: i64 = caps[1].parse().unwrap_or(0);
            let sec: i64 = caps[2].parse().unwrap_or(0);
            let ms_part = &caps[3];
            let ms: i64 = if ms_part.len() == 2 {
                ms_part.parse::<i64>().unwrap_or(0) * 10
            } else {
                ms_part.parse().unwrap_or(0)
            };

            let time = (min * 60 + sec) * 1000 + ms;
            let text = caps[4].trim().to_string();
            if !text.is_empty() {
                lines.push(LyricsLine { time, text });
            }
        }
    }

    lines.sort_by_key(|l| l.time);
    lines
}

// Simple TTML Parser for BetterLyrics
pub fn parse_ttml(ttml: &str) -> Vec<LyricsLine> {
    let mut lines = Vec::new();
    let re = regex::Regex::new(r#"<p[^>]*begin="([^"]+)"[^>]*>(.*?)</p>"#).unwrap();
    let tag_cleaner = regex::Regex::new(r#"<[^>]+>"#).unwrap();

    for cap in re.captures_iter(ttml) {
        let begin_str = &cap[1];
        let raw_text = &cap[2];
        let clean_text = tag_cleaner.replace_all(raw_text, "").trim().to_string();

        let time_ms = parse_ttml_time(begin_str);
        if !clean_text.is_empty() {
            lines.push(LyricsLine {
                time: time_ms,
                text: clean_text,
            });
        }
    }

    lines.sort_by_key(|l| l.time);
    lines
}

fn parse_ttml_time(time_str: &str) -> i64 {
    // Format can be "00:01:23.456" or "01:23.456" or "12.34s"
    if time_str.ends_with('s') {
        let sec: f64 = time_str.trim_end_matches('s').parse().unwrap_or(0.0);
        return (sec * 1000.0) as i64;
    }

    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() == 3 {
        let h: i64 = parts[0].parse().unwrap_or(0);
        let m: i64 = parts[1].parse().unwrap_or(0);
        let s: f64 = parts[2].parse().unwrap_or(0.0);
        ((h * 3600 + m * 60) as f64 * 1000.0 + s * 1000.0) as i64
    } else if parts.len() == 2 {
        let m: i64 = parts[0].parse().unwrap_or(0);
        let s: f64 = parts[1].parse().unwrap_or(0.0);
        ((m * 60) as f64 * 1000.0 + s * 1000.0) as i64
    } else {
        0
    }
}
