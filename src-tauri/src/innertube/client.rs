use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE, USER_AGENT};
use serde_json::{json, Value};
use sha1::{Digest, Sha1};
use std::sync::RwLock;

const USER_AGENT_WEB: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const ORIGIN_YT_MUSIC: &str = "https://music.youtube.com";
const BASE_URL: &str = "https://music.youtube.com/youtubei/v1";

pub struct InnerTubeClient {
    pub http: reqwest::Client,
    pub visitor_data: RwLock<Option<String>>,
    pub cookie: RwLock<Option<String>>,
    pub gl: RwLock<String>,
    pub hl: RwLock<String>,
}

impl InnerTubeClient {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .gzip(true)
            .brotli(true)
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            http,
            visitor_data: RwLock::new(None),
            cookie: RwLock::new(None),
            gl: RwLock::new("US".into()),
            hl: RwLock::new("en".into()),
        }
    }

    pub fn set_cookie(&self, cookie: Option<String>) {
        let mut c = self.cookie.write().unwrap();
        *c = cookie;
    }

    pub fn set_visitor_data(&self, visitor_data: Option<String>) {
        let mut v = self.visitor_data.write().unwrap();
        *v = visitor_data;
    }

    pub fn set_locale(&self, gl: String, hl: String) {
        *self.gl.write().unwrap() = gl;
        *self.hl.write().unwrap() = hl;
    }

    pub fn build_context(&self) -> Value {
        let visitor_data = self.visitor_data.read().unwrap().clone();
        let gl = self.gl.read().unwrap().clone();
        let hl = self.hl.read().unwrap().clone();

        let mut client_obj = json!({
            "clientName": "WEB_REMIX",
            "clientVersion": "1.20260114.01.00",
            "gl": gl,
            "hl": hl,
        });

        if let Some(vd) = visitor_data {
            client_obj["visitorData"] = Value::String(vd);
        }

        json!({
            "client": client_obj,
            "user": {}
        })
    }

    pub fn build_headers(&self, client_name: &str, client_version: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(USER_AGENT, HeaderValue::from_static(USER_AGENT_WEB));
        headers.insert("X-Origin", HeaderValue::from_static(ORIGIN_YT_MUSIC));
        headers.insert("Referer", HeaderValue::from_static("https://music.youtube.com/"));
        headers.insert("X-Goog-Api-Format-Version", HeaderValue::from_static("1"));
        headers.insert("X-YouTube-Client-Name", HeaderValue::from_str(if client_name == "WEB_REMIX" { "67" } else { "1" }).unwrap());
        headers.insert("X-YouTube-Client-Version", HeaderValue::from_str(client_version).unwrap());

        if let Some(vd) = self.visitor_data.read().unwrap().as_ref() {
            if let Ok(val) = HeaderValue::from_str(vd) {
                headers.insert("X-Goog-Visitor-Id", val);
            }
        }

        if let Some(cookie_str) = self.cookie.read().unwrap().as_ref() {
            if let Ok(cookie_val) = HeaderValue::from_str(cookie_str) {
                headers.insert("cookie", cookie_val);
            }

            // Generate SAPISIDHASH if SAPISID exists
            if let Some(sapisid) = extract_cookie_val(cookie_str, "SAPISID") {
                let timestamp = chrono::Utc::now().timestamp();
                let hash_input = format!("{} {} {}", timestamp, sapisid, ORIGIN_YT_MUSIC);
                let mut hasher = Sha1::new();
                hasher.update(hash_input.as_bytes());
                let hash = format!("{:x}", hasher.finalize());
                let auth_header = format!("SAPISIDHASH {}_{}", timestamp, hash);
                if let Ok(auth_val) = HeaderValue::from_str(&auth_header) {
                    headers.insert("Authorization", auth_val);
                }
            }
        }

        headers
    }

    pub async fn post_endpoint(&self, endpoint: &str, payload: Value) -> Result<Value, String> {
        let url = format!("{}/{}?prettyPrint=false", BASE_URL, endpoint);
        let headers = self.build_headers("WEB_REMIX", "1.20260114.01.00");

        let res = self.http.post(&url)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let json = res.json::<Value>().await.map_err(|e| e.to_string())?;
        Ok(json)
    }

    pub async fn fetch_visitor_data(&self) -> Result<String, String> {
        let res = self.http.get("https://music.youtube.com/sw.js_data")
            .header(USER_AGENT, USER_AGENT_WEB)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;

        // Response starts with )]}'
        let clean = if res.starts_with(")]}'") {
            &res[4..]
        } else {
            &res
        };

        let val: Value = serde_json::from_str(clean).map_err(|e| e.to_string())?;
        let visitor = val.get(0)
            .and_then(|v| v.get(2))
            .and_then(|v| v.as_array())
            .and_then(|arr| {
                arr.iter().find_map(|item| {
                    if let Some(s) = item.as_str() {
                        if s.starts_with("Cgt") || s.starts_with("Cgs") {
                            return Some(s.to_string());
                        }
                    }
                    None
                })
            });

        if let Some(v) = visitor {
            self.set_visitor_data(Some(v.clone()));
            Ok(v)
        } else {
            Err("Could not parse visitorData from sw.js_data".into())
        }
    }
}

fn extract_cookie_val(cookies: &str, name: &str) -> Option<String> {
    for part in cookies.split(';') {
        let trimmed = part.trim();
        if let Some((k, v)) = trimmed.split_once('=') {
            if k.trim() == name {
                return Some(v.trim().to_string());
            }
        }
    }
    None
}
