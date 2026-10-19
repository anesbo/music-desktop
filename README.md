# Velune Desktop 🎵
A complete, lightweight, standalone 1:1 PC desktop port of the **Velune Android Music Application**, engineered with **Tauri v2 (Rust backend)** and **React 19 + TypeScript + Tailwind CSS** frontend in a modern Spotify-style interface.

---

## ✨ Features & Functional Parity

| Feature Category | Implementation Details | Status |
| :--- | :--- | :---: |
| **YouTube Music Extractor** | Ported `InnerTube` scraper: VisitorData, SAPISID auth, cipher extraction, search suggestions, search summary, filter chips, homepage feed, explore, charts, albums, artists, playlists, next queue radio, and stream format resolution (Opus 160kbps / AAC 128kbps). | ✅ 100% |
| **Player Integrity Cipher** | Ported `PoTokenGenerator.kt` byte-level cipher generating PoToken for reliable YouTube stream URL decryption. | ✅ 100% |
| **SQLite Database** | Full Room Schema v28 parity (18 tables, 3 views, indexes, triggers): songs, albums, artists, playlists, playlist-song mapping, play events, playback history, listening statistics, and persistent key-value settings. | ✅ 100% |
| **Multi-Provider Lyrics** | 4-way fallback provider: **SimpMusic API**, **LRCLIB**, **BetterLyrics** (rich TTML word-by-word parser), and **KuGou** (base64 LRC format). | ✅ 100% |
| **Spotify Canvas Video** | Real-time Canvas video/animated artwork fetcher for active playback with desktop drawer display. | ✅ 100% |
| **Audio Engine & DSP** | Web Audio API engine featuring **10-band graphic equalizer** (31Hz to 16kHz), **bass boost** (+15dB), **loudness normalizer**, and smooth **crossfade** (0–12s). | ✅ 100% |
| **Last.fm Scrobbler** | Native MD5 authentication and signing for `nowPlaying` and scrobble event recording. | ✅ 100% |
| **Desktop Spotify UI** | 3-column layout: Navigation Sidebar with custom playlist creation, TopBar with search suggestions & recent history, responsive grids (Quick Picks, Albums, Artists, Charts), dock PlayerBar, and sliding RightDrawer for synchronized lyrics and queue. | ✅ 100% |

---

## 🚀 How to Run

### Option 1: Double-click Launcher
Simply double-click `run.bat` inside the `desktop-app` directory.

### Option 2: Terminal
In PowerShell or CMD:
```powershell
cd "c:\Users\anes\Desktop\velune desk ver\desktop-app"
npm run tauri dev
```

### Production Build
To create a standalone production release `.exe`:
```powershell
npm run build
cargo build --release --manifest-path src-tauri\Cargo.toml
```
The compiled release executable will be located in:
`desktop-app/src-tauri/target/x86_64-pc-windows-gnu/release/desktop-app.exe`
