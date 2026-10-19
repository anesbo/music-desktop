use md5::{Digest, Md5};
use reqwest::Client;
use std::collections::BTreeMap;
use std::time::Duration;

pub struct LastFmService {
    http: Client,
    pub api_key: String,
    pub secret: String,
}

impl LastFmService {
    pub fn new(api_key: String, secret: String) -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            http,
            api_key,
            secret,
        }
    }

    fn generate_signature(&self, params: &BTreeMap<&str, String>) -> String {
        let mut to_hash = String::new();
        for (k, v) in params {
            to_hash.push_str(k);
            to_hash.push_str(v);
        }
        to_hash.push_str(&self.secret);

        let mut hasher = Md5::new();
        hasher.update(to_hash.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub async fn update_now_playing(
        &self,
        artist: &str,
        track: &str,
        album: Option<&str>,
        session_key: &str,
    ) -> Result<(), String> {
        if self.api_key.is_empty() || self.secret.is_empty() {
            return Ok(());
        }

        let mut params = BTreeMap::new();
        params.insert("method", "track.updateNowPlaying".into());
        params.insert("api_key", self.api_key.clone());
        params.insert("artist", artist.into());
        params.insert("track", track.into());
        params.insert("sk", session_key.into());
        if let Some(alb) = album {
            params.insert("album", alb.into());
        }

        let api_sig = self.generate_signature(&params);
        params.insert("api_sig", api_sig);
        params.insert("format", "json".into());

        let url = "https://ws.audioscrobbler.com/2.0/";
        let res = self.http.post(url)
            .form(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Last.fm returned status {}", res.status()));
        }

        Ok(())
    }

    pub async fn scrobble(
        &self,
        artist: &str,
        track: &str,
        album: Option<&str>,
        timestamp: i64,
        session_key: &str,
    ) -> Result<(), String> {
        if self.api_key.is_empty() || self.secret.is_empty() {
            return Ok(());
        }

        let mut params = BTreeMap::new();
        params.insert("method", "track.scrobble".into());
        params.insert("api_key", self.api_key.clone());
        params.insert("artist[0]", artist.into());
        params.insert("track[0]", track.into());
        params.insert("timestamp[0]", timestamp.to_string());
        params.insert("sk", session_key.into());
        if let Some(alb) = album {
            params.insert("album[0]", alb.into());
        }

        let api_sig = self.generate_signature(&params);
        params.insert("api_sig", api_sig);
        params.insert("format", "json".into());

        let url = "https://ws.audioscrobbler.com/2.0/";
        let res = self.http.post(url)
            .form(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Last.fm returned status {}", res.status()));
        }

        Ok(())
    }
}
