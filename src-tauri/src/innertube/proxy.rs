use std::collections::HashMap;
use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::RwLock;

pub type StreamCache = Arc<RwLock<HashMap<String, (String, std::time::Instant)>>>;

pub struct StreamProxy {
    pub port: AtomicU16,
    pub cache: StreamCache,
}

impl StreamProxy {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            port: AtomicU16::new(0),
            cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    pub fn start<F, Fut>(
        self: Arc<Self>,
        resolve_fn: F,
    ) where
        F: Fn(String) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<String, String>> + Send + 'static,
    {
        let this = self.clone();
        let resolve_fn = Arc::new(resolve_fn);
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        tauri::async_runtime::spawn(async move {
            let listener = match TcpListener::bind("127.0.0.1:0").await {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("[PROXY] Failed to bind TcpListener: {}", e);
                    return;
                }
            };

            let port = match listener.local_addr() {
                Ok(addr) => addr.port(),
                Err(_) => return,
            };

            this.port.store(port, Ordering::SeqCst);

            loop {
                match listener.accept().await {
                    Ok((socket, _)) => {
                        let cache_clone = this.cache.clone();
                        let resolve_clone = resolve_fn.clone();
                        let client_clone = http_client.clone();
                        tauri::async_runtime::spawn(async move {
                            handle_connection(socket, cache_clone, resolve_clone, client_clone).await;
                        });
                    }
                    Err(_) => break,
                }
            }
        });
    }
}

async fn handle_connection<F, Fut>(
    mut socket: tokio::net::TcpStream,
    cache: StreamCache,
    resolve_fn: Arc<F>,
    http_client: reqwest::Client,
) where
    F: Fn(String) -> Fut + Send + Sync + 'static,
    Fut: std::future::Future<Output = Result<String, String>> + Send + 'static,
{
    let mut buf = [0u8; 4096];
    let n = match socket.read(&mut buf).await {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let req_str = String::from_utf8_lossy(&buf[..n]);
    let mut lines = req_str.lines();
    let first_line = match lines.next() {
        Some(l) => l,
        None => return,
    };

    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }

    let method = parts[0];
    let path = parts[1];

    if method == "OPTIONS" {
        let resp = "HTTP/1.1 200 OK\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
                    Access-Control-Allow-Headers: *\r\n\
                    Content-Length: 0\r\n\r\n";
        let _ = socket.write_all(resp.as_bytes()).await;
        return;
    }

    if method != "GET" && method != "HEAD" {
        let resp = "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n";
        let _ = socket.write_all(resp.as_bytes()).await;
        return;
    }

    // Extract video_id from query: /stream?video_id=...
    let video_id = path
        .split("video_id=")
        .nth(1)
        .and_then(|s| s.split('&').next())
        .map(|s| s.to_string());

    let video_id = match video_id {
        Some(id) if !id.is_empty() => id,
        _ => {
            let resp = "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n";
            let _ = socket.write_all(resp.as_bytes()).await;
            return;
        }
    };

    // Extract Range header
    let mut range_header: Option<String> = None;
    for line in lines {
        if line.to_ascii_lowercase().starts_with("range:") {
            if let Some(val) = line.splitn(2, ':').nth(1) {
                range_header = Some(val.trim().to_string());
            }
        }
    }

    // Check cache or resolve direct URL
    let mut stream_url: Option<String> = None;
    {
        let read_guard = cache.read().await;
        if let Some((url, timestamp)) = read_guard.get(&video_id) {
            // Expire after 4 hours
            if timestamp.elapsed().as_secs() < 14400 {
                stream_url = Some(url.clone());
            }
        }
    }

    if stream_url.is_none() {
        match resolve_fn(video_id.clone()).await {
            Ok(url) => {
                let mut write_guard = cache.write().await;
                write_guard.insert(video_id.clone(), (url.clone(), std::time::Instant::now()));
                stream_url = Some(url);
            }
            Err(e) => {
                let body = format!("Failed to resolve stream for video {}: {}", video_id, e);
                let resp = format!(
                    "HTTP/1.1 502 Bad Gateway\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Content-Type: text/plain\r\n\
                    Content-Length: {}\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = socket.write_all(resp.as_bytes()).await;
                return;
            }
        }
    }

    let stream_url = match stream_url {
        Some(u) => u,
        None => return,
    };

    let mut upstream_req = http_client
        .get(&stream_url)
        .header(
            "User-Agent",
            "com.google.ios.youtube/20.10 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
        );

    if let Some(ref r) = range_header {
        upstream_req = upstream_req.header("Range", r);
    }

    let upstream_res = match upstream_req.send().await {
        Ok(r) => r,
        Err(e) => {
            let body = format!("Upstream stream error: {}", e);
            let resp = format!(
                "HTTP/1.1 502 Bad Gateway\r\n\
                Access-Control-Allow-Origin: *\r\n\
                Content-Type: text/plain\r\n\
                Content-Length: {}\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = socket.write_all(resp.as_bytes()).await;
            return;
        }
    };

    let status = upstream_res.status();
    let mut header_lines = Vec::new();
    header_lines.push(format!(
        "HTTP/1.1 {} {}",
        status.as_u16(),
        status.canonical_reason().unwrap_or("")
    ));
    header_lines.push("Access-Control-Allow-Origin: *".to_string());
    header_lines.push("Access-Control-Allow-Methods: GET, HEAD, OPTIONS".to_string());
    header_lines.push("Access-Control-Allow-Headers: *".to_string());
    header_lines.push("Accept-Ranges: bytes".to_string());

    for (name, val) in upstream_res.headers() {
        let name_str = name.as_str().to_ascii_lowercase();
        if name_str == "content-type" || name_str == "content-range" || name_str == "content-length" {
            if let Ok(v) = val.to_str() {
                header_lines.push(format!("{}: {}", name.as_str(), v));
            }
        }
    }

    header_lines.push("\r\n".to_string());
    let header_block = header_lines.join("\r\n");

    if socket.write_all(header_block.as_bytes()).await.is_err() {
        return;
    }

    if method == "HEAD" {
        return;
    }

    // Stream audio payload
    let mut response = upstream_res;
    while let Ok(Some(chunk)) = response.chunk().await {
        if socket.write_all(&chunk).await.is_err() {
            break;
        }
    }
    let _ = socket.flush().await;
}
