use crate::models::CanvasArtwork;
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub struct CanvasService {
    http: Client,
}

impl CanvasService {
    pub fn new() -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self { http }
    }

    pub async fn get_canvas(&self, song: &str, artist: &str) -> Option<CanvasArtwork> {
        let url = "https://artwork-archivetune.koiiverse.cloud/";
        let res = self.http.get(url)
            .query(&[("s", song), ("a", artist), ("storefront", "us")])
            .send()
            .await
            .ok()?;

        if !res.status().is_success() {
            return None;
        }

        let json = res.json::<Value>().await.ok()?;
        let static_url = json.get("static").and_then(|s| s.as_str()).map(|s| s.to_string());
        let animated_url = json.get("animated").and_then(|s| s.as_str()).map(|s| s.to_string());
        let video_url = json.get("videoUrl").and_then(|s| s.as_str()).map(|s| s.to_string());

        if static_url.is_none() && animated_url.is_none() && video_url.is_none() {
            return None;
        }

        Some(CanvasArtwork {
            static_url,
            animated_url,
            video_url,
        })
    }
}
