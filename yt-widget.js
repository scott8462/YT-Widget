/**
 * YT Widget — HTML Injectable YouTube Widget
 * Drop a <div data-yt-widget ...> + this <script> into any webpage.
 * No dependencies. No iframes. All styling is injected automatically.
 *
 * Data Attributes:
 *   data-yt-widget          — Required. Marks the container div.
 *   data-proxy-url          — Recommended. URL to your server-side PHP proxy (hides the API key).
 *                             e.g. data-proxy-url="https://yoursite.com/proxy/api-proxy.php"
 *                             When set, data-api-key is NOT needed on the client.
 *   data-api-key            — Your YouTube API key (only needed WITHOUT a proxy).
 *   data-channel-id         — Required for type=feed|stats|playlist|live.
 *   data-video-id           — Required for type=single.
 *   data-playlist-id        — Required for type=playlist.
 *   data-type               — "feed" | "stats" | "single" | "playlist" | "live" (default: "feed")
 *   data-layout             — "grid" | "list" (default: "grid")
 *   data-theme              — "dark" | "light" (default: "dark")
 *   data-max-results        — Number 1–50 (default: 9)
 *   data-show-channel-info  — "true" | "false" (default: "true")
 *   data-accent-color       — CSS color string (default: "#ff0033")
 *   data-offline-message    — Custom text shown when not live (default: "We're not live right now")
 *   data-offline-image-width — Width of offline banner image, e.g. "70%" (default: "100%")
 *   data-show-last-video    — "true"|"false" show last upload in offline card (default: "true")
 *
 * Proxy Mode Example (API key stays on server — RECOMMENDED):
 *   <div data-yt-widget
 *        data-channel-id="UCxxxxxx"
 *        data-proxy-url="https://yoursite.com/proxy/api-proxy.php"
 *        data-layout="grid"
 *        data-theme="dark">
 *   </div>
 *   <script src="yt-widget.js"></script>
 *
 * Direct Mode Example (API key visible in source — use domain restriction):
 *   <div data-yt-widget
 *        data-channel-id="UCxxxxxx"
 *        data-api-key="AIzaXXXXXX"
 *        data-layout="grid">
 *   </div>
 *   <script src="yt-widget.js"></script>
 */

(function () {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────────────────
  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
  const WIDGET_ATTR = 'data-yt-widget';
  const WIDGET_VERSION = '1.0.1';

  // ─── Stylesheet (injected once into <head>) ─────────────────────────────────
  const CSS = `
    .ytw-root *, .ytw-root *::before, .ytw-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .ytw-root a { color: inherit; text-decoration: none; }
    .ytw-root {
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      --ytw-accent: #ff0033;
      --ytw-btn-bg: var(--ytw-accent);
      --ytw-btn-text: #ffffff;
      --ytw-bg: #0f0f13;
      --ytw-surface: #1a1a24;
      --ytw-surface2: #242432;
      --ytw-border: rgba(255,255,255,0.08);
      --ytw-text: #f0f0f0;
      --ytw-text-muted: #a0a0b8;
      --ytw-radius: 12px;
      --ytw-shadow: 0 4px 24px rgba(0,0,0,0.4);
      --ytw-thumb-ratio: 56.25%;
    }
    .ytw-root.ytw-light {
      --ytw-bg: #f5f5fa;
      --ytw-surface: #ffffff;
      --ytw-surface2: #eeeef7;
      --ytw-border: rgba(0,0,0,0.08);
      --ytw-text: #111118;
      --ytw-text-muted: #606078;
      --ytw-shadow: 0 4px 24px rgba(0,0,0,0.10);
    }

    /* ── Wrapper ── */
    .ytw-root { background: var(--ytw-bg); border-radius: var(--ytw-radius); padding: 20px; }

    /* ── Loading ── */
    .ytw-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 20px; gap: 16px; color: var(--ytw-text-muted);
    }
    .ytw-spinner {
      width: 40px; height: 40px; border: 3px solid var(--ytw-border);
      border-top-color: var(--ytw-accent); border-radius: 50%;
      animation: ytw-spin 0.8s linear infinite;
    }
    @keyframes ytw-spin { to { transform: rotate(360deg); } }

    /* ── Error ── */
    .ytw-error {
      padding: 24px; border-radius: var(--ytw-radius);
      background: rgba(255,50,50,0.08); border: 1px solid rgba(255,50,50,0.2);
      color: #ff6b6b; font-size: 14px; text-align: center; line-height: 1.6;
    }
    .ytw-error strong { display: block; font-size: 16px; margin-bottom: 6px; color: #ff4d4d; }

    /* ── Channel Header ── */
    .ytw-channel-header {
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 20px; padding-bottom: 18px;
      border-bottom: 1px solid var(--ytw-border);
    }
    .ytw-channel-avatar {
      width: 52px; height: 52px; border-radius: 50%;
      object-fit: cover; border: 2px solid var(--ytw-accent);
      flex-shrink: 0;
    }
    .ytw-channel-avatar-placeholder {
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg, var(--ytw-accent), #ff6b35);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700; color: var(--ytw-btn-text, #fff); flex-shrink: 0;
    }
    .ytw-channel-info { flex: 1; min-width: 0; }
    .ytw-channel-name {
      font-size: 16px; font-weight: 700; color: var(--ytw-text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ytw-channel-subs { font-size: 13px; color: var(--ytw-text-muted); margin-top: 3px; }
    .ytw-channel-link {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 999px;
      background: var(--ytw-btn-bg, var(--ytw-accent));
      color: var(--ytw-btn-text, #ffffff);
      font-size: 12px; font-weight: 600; text-decoration: none;
      transition: opacity 0.2s, transform 0.2s; flex-shrink: 0;
      border: none; cursor: pointer;
    }
    .ytw-channel-link:hover { opacity: 0.85; transform: translateY(-1px); }
    .ytw-channel-link svg { width: 14px; height: 14px; }

    /* ── Grid Layout ── */
    .ytw-grid {
      display: grid;
      grid-template-columns: repeat(var(--ytw-cols, 3), minmax(0, 1fr));
      gap: 16px;
    }
    .ytw-card {
      background: var(--ytw-surface); border-radius: var(--ytw-radius);
      overflow: hidden; border: 1px solid var(--ytw-border);
      transition: transform 0.22s, box-shadow 0.22s;
      cursor: pointer; text-decoration: none; display: block;
      box-shadow: var(--ytw-shadow);
    }
    .ytw-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
    .ytw-thumb-wrap {
      position: relative; padding-top: var(--ytw-thumb-ratio);
      background: var(--ytw-surface2); overflow: hidden;
    }
    .ytw-thumb-wrap img {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      object-fit: cover; transition: transform 0.3s;
    }
    .ytw-card:hover .ytw-thumb-wrap img { transform: scale(1.04); }
    .ytw-duration {
      position: absolute; bottom: 8px; right: 8px;
      background: rgba(0,0,0,0.8); color: #fff;
      font-size: 11px; font-weight: 600; padding: 2px 6px;
      border-radius: 4px; letter-spacing: 0.03em;
    }
    .ytw-play-btn {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0.85);
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(255,0,51,0.85); display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s, transform 0.2s;
    }
    .ytw-card:hover .ytw-play-btn { opacity: 1; transform: translate(-50%,-50%) scale(1); }
    .ytw-play-btn svg { width: 20px; height: 20px; fill: #fff; margin-left: 3px; }
    .ytw-card-body { padding: 12px 14px 14px; }
    .ytw-card-title {
      font-size: 13.5px; font-weight: 600; color: var(--ytw-text);
      line-height: 1.45; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .ytw-card-meta {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: var(--ytw-text-muted); margin-top: 8px;
    }
    .ytw-card-meta span { display: flex; align-items: center; gap: 4px; }
    .ytw-card-meta svg { width: 12px; height: 12px; opacity: 0.7; }
    .ytw-dot { color: var(--ytw-border); }

    /* ── List Layout ── */
    .ytw-list { display: flex; flex-direction: column; gap: 14px; }
    .ytw-list-item {
      display: flex; gap: 14px; background: var(--ytw-surface);
      border-radius: var(--ytw-radius); overflow: hidden;
      border: 1px solid var(--ytw-border); text-decoration: none;
      transition: transform 0.22s, box-shadow 0.22s; cursor: pointer;
    }
    .ytw-list-item:hover { transform: translateX(4px); box-shadow: var(--ytw-shadow); }
    .ytw-list-thumb {
      position: relative; width: 180px; min-width: 180px;
      background: var(--ytw-surface2); overflow: hidden;
    }
    .ytw-list-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ytw-list-thumb .ytw-duration { bottom: 6px; right: 6px; }
    .ytw-list-body { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
    .ytw-list-title {
      font-size: 14px; font-weight: 600; color: var(--ytw-text);
      line-height: 1.45; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .ytw-list-desc {
      font-size: 12.5px; color: var(--ytw-text-muted); margin-top: 6px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      line-height: 1.5;
    }
    .ytw-list-meta {
      display: flex; align-items: center; gap: 10px;
      font-size: 12px; color: var(--ytw-text-muted); margin-top: 10px;
    }
    .ytw-list-meta span { display: flex; align-items: center; gap: 4px; }
    .ytw-list-meta svg { width: 13px; height: 13px; opacity: 0.7; }

    /* ── Stats ── */
    .ytw-stats-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 14px;
    }
    .ytw-stat-card {
      background: var(--ytw-surface); border: 1px solid var(--ytw-border);
      border-radius: var(--ytw-radius); padding: 20px 16px; text-align: center;
      position: relative; overflow: hidden;
    }
    .ytw-stat-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--ytw-accent), #ff6b35);
    }
    .ytw-stat-icon { font-size: 26px; margin-bottom: 8px; display: block; }
    .ytw-stat-value {
      font-size: 26px; font-weight: 800; color: var(--ytw-text);
      letter-spacing: -0.5px;
    }
    .ytw-stat-label { font-size: 12px; color: var(--ytw-text-muted); margin-top: 4px; letter-spacing: 0.06em; text-transform: uppercase; }

    /* ── Single Video ── */
    .ytw-single { display: flex; flex-direction: column; gap: 16px; }
    .ytw-player-wrap {
      position: relative; padding-top: 56.25%; border-radius: var(--ytw-radius);
      overflow: hidden; background: #000;
    }
    .ytw-player-wrap iframe {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      border: none;
    }
    .ytw-single-info { background: var(--ytw-surface); border-radius: var(--ytw-radius); padding: 18px; border: 1px solid var(--ytw-border); }
    .ytw-single-title { font-size: 16px; font-weight: 700; color: var(--ytw-text); line-height: 1.4; }
    .ytw-single-meta { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-size: 13px; color: var(--ytw-text-muted); flex-wrap: wrap; }
    .ytw-single-meta span { display: flex; align-items: center; gap: 5px; }
    .ytw-single-meta svg { width: 14px; height: 14px; }
    .ytw-single-desc {
      font-size: 13px; color: var(--ytw-text-muted); margin-top: 12px;
      line-height: 1.65; display: -webkit-box; -webkit-line-clamp: 4;
      -webkit-box-orient: vertical; overflow: hidden;
    }

    /* ── Live Widget ── */
    .ytw-live-wrap { display: flex; flex-direction: column; gap: 16px; }

    /* Player with LIVE badge overlay */
    .ytw-live-player-wrap {
      position: relative; padding-top: 56.25%; border-radius: var(--ytw-radius);
      overflow: hidden; background: #000;
      box-shadow: 0 0 0 2px #ff0033, 0 8px 40px rgba(255,0,0,0.3);
    }
    .ytw-live-player-wrap iframe {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;
    }
    .ytw-live-badge {
      position: absolute; top: 12px; left: 12px; z-index: 10;
      display: inline-flex; align-items: center; gap: 6px;
      background: #ff0033; color: #fff;
      font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 4px 10px; border-radius: 4px;
      box-shadow: 0 2px 12px rgba(255,0,51,0.6);
    }
    .ytw-live-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #fff;
      animation: ytw-live-pulse 1.4s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes ytw-live-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.75); }
    }
    .ytw-live-viewers {
      position: absolute; top: 12px; right: 12px; z-index: 10;
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(0,0,0,0.7); color: #fff;
      font-size: 11px; font-weight: 600; padding: 4px 10px;
      border-radius: 4px; backdrop-filter: blur(4px);
    }

    /* Live info bar below player */
    .ytw-live-info {
      background: var(--ytw-surface); border-radius: var(--ytw-radius);
      padding: 16px 18px; border: 1px solid rgba(255,0,51,0.2);
      display: flex; align-items: flex-start; gap: 14px;
    }
    .ytw-live-channel-avatar {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      border: 2px solid #ff0033; object-fit: cover;
    }
    .ytw-live-channel-avatar-placeholder {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg,#ff0033,#ff6b35);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; color: #fff;
    }
    .ytw-live-text { flex: 1; min-width: 0; }
    .ytw-live-title {
      font-size: 15px; font-weight: 700; color: var(--ytw-text);
      line-height: 1.4; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .ytw-live-channel-name { font-size: 13px; color: var(--ytw-text-muted); margin-top: 4px; }
    .ytw-live-watch {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 999px; flex-shrink: 0;
      background: var(--ytw-btn-bg, var(--ytw-accent));
      color: var(--ytw-btn-text, #ffffff);
      font-size: 12px; font-weight: 700; text-decoration: none;
      transition: opacity 0.2s, transform 0.2s;
    }
    .ytw-live-watch:hover { opacity: 0.85; transform: scale(1.04); }

    /* ── Offline Card ── */
    .ytw-offline-card {
      border-radius: var(--ytw-radius); overflow: hidden;
      border: 1px solid var(--ytw-border);
      background: var(--ytw-surface);
    }
    .ytw-offline-hero {
      position: relative; padding: 52px 24px 44px; text-align: center;
      background: linear-gradient(135deg,
        rgba(255,0,51,0.06) 0%,
        var(--ytw-surface2) 50%,
        rgba(124,58,237,0.06) 100%);
      border-bottom: 1px solid var(--ytw-border);
      overflow: hidden;
    }
    .ytw-offline-hero.ytw-has-image {
      padding: 0 0 36px 0; overflow: hidden;
    }
    .ytw-offline-banner {
      position: relative; width: min(100%, var(--ytw-offline-banner-width, 100%)); padding-top: 56.25%; /* 16:9 ratio */
      background: #000; overflow: hidden; margin: 0 auto 24px; border-radius: 18px;
    }
    .ytw-offline-banner img {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      object-fit: cover; display: block;
    }
    .ytw-offline-banner-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%);
    }
    .ytw-offline-rings {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      pointer-events: none;
    }
    .ytw-offline-ring {
      position: absolute; border-radius: 50%;
      border: 1px solid rgba(255,0,51,0.12);
      transform: translate(-50%,-50%);
    }
    .ytw-offline-ring:nth-child(1) { width: 120px; height: 120px; }
    .ytw-offline-ring:nth-child(2) { width: 180px; height: 180px; animation: ytw-ring-pulse 3s ease-in-out 0.5s infinite; }
    .ytw-offline-ring:nth-child(3) { width: 250px; height: 250px; animation: ytw-ring-pulse 3s ease-in-out 1s infinite; }
    @keyframes ytw-ring-pulse {
      0%, 100% { opacity: 0.5; } 50% { opacity: 0.15; }
    }
    .ytw-offline-icon {
      position: relative; z-index: 1;
      width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 18px;
      background: linear-gradient(135deg, rgba(255,0,51,0.15), rgba(255,0,51,0.05));
      border: 2px solid rgba(255,0,51,0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 32px;
    }
    .ytw-offline-status {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--ytw-surface3, rgba(255,255,255,0.05));
      border: 1px solid var(--ytw-border);
      border-radius: 999px; padding: 4px 12px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--ytw-text-muted); margin-bottom: 14px; position: relative; z-index: 1;
    }
    .ytw-offline-status-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--ytw-text-faint, #666);
      opacity: 0.5;
    }
    .ytw-offline-title {
      font-size: 22px; font-weight: 800; color: var(--ytw-text);
      letter-spacing: -0.3px; margin-bottom: 8px;
      position: relative; z-index: 1;
    }
    .ytw-offline-sub {
      font-size: 14px; color: var(--ytw-text-muted); line-height: 1.6;
      max-width: 360px; margin: 0 auto;
      position: relative; z-index: 1;
    }
    .ytw-offline-actions {
      display: flex; gap: 10px; justify-content: center; margin-top: 20px;
      position: relative; z-index: 1; flex-wrap: wrap;
    }
    .ytw-offline-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: 999px;
      font-size: 13px; font-weight: 600; text-decoration: none;
      transition: all 0.2s;
    }
    .ytw-offline-btn.primary {
      background: var(--ytw-btn-bg, var(--ytw-accent));
      color: var(--ytw-btn-text, #ffffff);
      box-shadow: 0 4px 16px rgba(255,0,51,0.3);
    }
    .ytw-offline-btn.primary:hover { opacity: 0.9; transform: translateY(-2px); }
    .ytw-offline-btn.secondary {
      background: transparent; border: 1px solid var(--ytw-border);
      color: var(--ytw-text-muted);
    }
    .ytw-offline-btn.secondary:hover { border-color: var(--ytw-accent); color: var(--ytw-text); }
    .ytw-offline-btn svg { width: 15px; height: 15px; }

    /* Last video shown in offline card */
    .ytw-offline-last {
      padding: 16px 20px;
    }
    .ytw-offline-last-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--ytw-text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
    }
    .ytw-offline-last-label::after { content: ''; flex: 1; height: 1px; background: var(--ytw-border); }
    .ytw-offline-last-video {
      display: flex; gap: 14px; text-decoration: none;
      border-radius: var(--ytw-radius); overflow: hidden;
      background: var(--ytw-surface2); border: 1px solid var(--ytw-border);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .ytw-offline-last-video:hover { transform: translateY(-2px); box-shadow: var(--ytw-shadow); }
    .ytw-offline-last-thumb {
      position: relative; width: 160px; min-width: 160px; overflow: hidden;
      background: #000;
    }
    .ytw-offline-last-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ytw-offline-last-thumb .ytw-duration { bottom: 6px; right: 6px; }
    .ytw-offline-last-body { flex: 1; padding: 14px; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
    .ytw-offline-last-title {
      font-size: 14px; font-weight: 600; color: var(--ytw-text); line-height: 1.4;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .ytw-offline-last-meta {
      font-size: 12px; color: var(--ytw-text-muted); margin-top: 8px;
      display: flex; gap: 10px; align-items: center;
    }
    .ytw-offline-last-meta span { display: flex; align-items: center; gap: 4px; }
    .ytw-offline-last-meta svg { width: 12px; height: 12px; opacity: 0.7; }

    /* ── Load More Button ── */
    .ytw-load-more-wrap {
      text-align: center;
      margin-top: 24px;
    }
    .ytw-load-more-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 24px; border-radius: 999px;
      background: var(--ytw-surface2);
      border: 1px solid var(--ytw-border);
      color: var(--ytw-text);
      font-size: 13px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: all 0.2s;
      box-shadow: var(--ytw-shadow);
    }
    .ytw-load-more-btn:hover {
      background: var(--ytw-btn-bg, var(--ytw-accent));
      color: var(--ytw-btn-text, #ffffff);
      border-color: transparent;
      transform: translateY(-2px);
    }
    .ytw-load-more-btn:disabled {
      opacity: 0.6; cursor: not-allowed; transform: none;
    }

    /* ── Branding Footer ── */
    .ytw-footer {
      margin-top: 16px; text-align: center; font-size: 11px;
      color: var(--ytw-text-muted); opacity: 0.6; letter-spacing: 0.04em;
    }
    .ytw-footer a { color: inherit; text-decoration: none; }
    .ytw-footer a:hover { opacity: 1; text-decoration: underline; }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .ytw-grid { grid-template-columns: 1fr 1fr; }
      .ytw-list-thumb { width: 120px; min-width: 120px; }
      .ytw-list-desc { display: none; }
      .ytw-stats-grid { grid-template-columns: 1fr 1fr; }
      .ytw-offline-last-thumb { width: 110px; min-width: 110px; }
    }
    @media (max-width: 400px) {
      .ytw-grid { grid-template-columns: 1fr; }
      .ytw-offline-last-thumb { display: none; }
    }

    /* ── Floating Video Modal ── */
    .ytw-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
      z-index: 999999; display: flex; align-items: center; justify-content: center;
      padding: 20px; animation: ytw-fadeIn 0.2s ease-out;
    }
    .ytw-modal-card {
      position: relative; width: 100%; max-width: 900px;
      background: #12121c; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      display: flex; flex-direction: column;
      animation: ytw-scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ytw-modal-close {
      position: absolute; top: 12px; right: 12px; z-index: 10;
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2);
      color: #fff; font-size: 20px; font-weight: 300; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
    }
    .ytw-modal-close:hover {
      background: rgba(255,0,51,0.9); border-color: transparent; transform: scale(1.1);
    }
    .ytw-modal-player {
      position: relative; width: 100%; padding-top: 56.25%; background: #000;
    }
    .ytw-modal-player iframe {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;
    }
    .ytw-modal-footer {
      padding: 16px 22px; display: flex; align-items: center; justify-content: space-between;
      gap: 16px; background: #181826; border-top: 1px solid rgba(255,255,255,0.08);
      flex-wrap: wrap;
    }
    .ytw-modal-info { flex: 1; min-width: 200px; }
    .ytw-modal-title { font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.4; }
    .ytw-modal-yt-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 18px; background: #ff0033; color: #ffffff !important;
      font-size: 13px; font-weight: 700; border-radius: 8px;
      text-decoration: none !important; transition: all 0.2s; white-space: nowrap;
    }
    .ytw-modal-yt-btn:hover {
      background: #cc0029; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(255,0,51,0.4);
    }
    .ytw-modal-yt-btn svg { width: 16px; height: 16px; fill: currentColor; }
    @keyframes ytw-fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ytw-scaleUp { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
  `;

  // ─── Utilities ──────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ytw-styles')) return;
    const style = document.createElement('style');
    style.id = 'ytw-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function getContrastColor(hexColor) {
    if (!hexColor || typeof hexColor !== 'string') return '#ffffff';
    let hex = hexColor.trim().replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? '#111118' : '#ffffff';
  }

  function formatCount(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return '—';
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString();
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDuration(iso) {
    if (!iso) return '';
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const h = parseInt(match[1] || 0);
    const m = parseInt(match[2] || 0);
    const s = parseInt(match[3] || 0);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function bestThumb(thumbnails) {
    const t = thumbnails || {};
    return (t.maxres || t.standard || t.high || t.medium || t.default || {}).url || '';
  }

  // ─── SVG Icons ──────────────────────────────────────────────────────────────
  const ICONS = {
    youtube: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.8 8.001s-.195-1.377-.795-1.984c-.76-.797-1.613-.8-2.004-.847C16.203 5 12 5 12 5s-4.203 0-7.001.17c-.391.047-1.243.05-2.004.847-.6.607-.795 1.984-.795 1.984S2 9.62 2 11.237v1.517c0 1.618.2 3.236.2 3.236s.195 1.378.795 1.985c.761.797 1.76.771 2.205.855C6.8 19.03 12 19 12 19s4.203-.005 7.001-.175c.391-.047 1.243-.05 2.004-.847.6-.607.795-1.985.795-1.985S22 14.372 22 12.754v-1.517c0-1.618-.2-3.236-.2-3.236zM10 14.5v-5l5.5 2.5L10 14.5z"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    thumbup: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    film: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/></svg>`,
    play: `<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  };

  // ─── API Fetch Helper ────────────────────────────────────────────────────────
  // Supports two modes:
  //   Proxy mode  — routes through your PHP server (API key hidden from browser)
  //   Direct mode — calls YouTube API directly (API key visible in source)
  async function ytFetch(endpoint, params, apiKey, proxyUrl) {
    let url;

    if (proxyUrl) {
      // ── Proxy Mode: call your PHP script, which injects the API key ──────────
      url = new URL(proxyUrl, window.location.href);
      url.searchParams.set('endpoint', endpoint);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
      // Note: no API key sent here — the proxy adds it server-side
    } else {
      // ── Direct Mode: call YouTube API with key in URL (key visible in source) ─
      url = new URL(`${YT_API_BASE}/${endpoint}`);
      Object.entries({ ...params, key: apiKey }).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ─── Channel Info Fetch ──────────────────────────────────────────────────────
  async function fetchChannelInfo(channelId, apiKey, proxyUrl) {
    const data = await ytFetch('channels', {
      part: 'snippet,statistics,contentDetails',
      id: channelId,
    }, apiKey, proxyUrl);
    const ch = data.items?.[0];
    if (!ch) throw new Error(`Channel "${channelId}" not found.`);
    return {
      id: ch.id,
      title: ch.snippet.title,
      description: ch.snippet.description,
      thumbnail: bestThumb(ch.snippet.thumbnails),
      customUrl: ch.snippet.customUrl,
      subscriberCount: ch.statistics.subscriberCount,
      viewCount: ch.statistics.viewCount,
      videoCount: ch.statistics.videoCount,
      uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
    };
  }

  // ─── Videos Fetch ────────────────────────────────────────────────────────────
  async function fetchVideos(playlistId, apiKey, maxResults, proxyUrl, pageToken) {
    const params = {
      part: 'snippet',
      playlistId,
      maxResults,
    };
    if (pageToken) params.pageToken = pageToken;

    // Step 1: get video IDs from playlist
    const playlistData = await ytFetch('playlistItems', params, apiKey, proxyUrl);

    const items = playlistData.items || [];
    const nextPageToken = playlistData.nextPageToken || null;
    if (!items.length) return { videos: [], nextPageToken: null };

    const videoIds = items.map(i => i.snippet.resourceId.videoId).join(',');

    // Step 2: get full video details (for duration, stats)
    const videoData = await ytFetch('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
    }, apiKey, proxyUrl);

    const videos = (videoData.items || []).map(v => ({
      id: v.id,
      title: v.snippet.title,
      description: v.snippet.description,
      thumbnail: bestThumb(v.snippet.thumbnails),
      publishedAt: v.snippet.publishedAt,
      duration: formatDuration(v.contentDetails?.duration),
      viewCount: v.statistics?.viewCount,
      likeCount: v.statistics?.likeCount,
      url: `https://www.youtube.com/watch?v=${v.id}`,
    }));

    return { videos, nextPageToken };
  }

  // ─── Live Status Fetch ───────────────────────────────────────────────────────
  // Uses the search endpoint (costs 100 API units) to find an active live stream.
  // Returns { isLive, videoId, title, concurrentViewers, thumbnail } or { isLive: false }.
  async function fetchLiveStatus(channelId, apiKey, proxyUrl) {
    const data = await ytFetch('search', {
      part: 'snippet',
      channelId,
      eventType: 'live',
      type: 'video',
      maxResults: 1,
    }, apiKey, proxyUrl);

    const item = data.items?.[0];
    if (!item) return { isLive: false };

    const videoId = item.id?.videoId;
    if (!videoId) return { isLive: false };

    // Fetch live viewer count from videos.liveStreamingDetails
    let concurrentViewers = null;
    try {
      const vData = await ytFetch('videos', {
        part: 'liveStreamingDetails,snippet',
        id: videoId,
      }, apiKey, proxyUrl);
      const v = vData.items?.[0];
      concurrentViewers = v?.liveStreamingDetails?.concurrentViewers ?? null;
    } catch (_) { /* non-fatal — viewer count is optional */ }

    return {
      isLive: true,
      videoId,
      title: item.snippet?.title || '',
      thumbnail: bestThumb(item.snippet?.thumbnails),
      concurrentViewers,
    };
  }

  // ─── Single Video Fetch ──────────────────────────────────────────────────────
  async function fetchSingleVideo(videoId, apiKey, proxyUrl) {
    const data = await ytFetch('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoId,
    }, apiKey, proxyUrl);
    const v = data.items?.[0];
    if (!v) throw new Error(`Video "${videoId}" not found.`);
    return {
      id: v.id,
      title: v.snippet.title,
      description: v.snippet.description,
      publishedAt: v.snippet.publishedAt,
      duration: formatDuration(v.contentDetails?.duration),
      viewCount: v.statistics?.viewCount,
      likeCount: v.statistics?.likeCount,
    };
  }

  // ─── Render: Channel Header ──────────────────────────────────────────────────
  function renderChannelHeader(channel) {
    const avatarHtml = channel.thumbnail
      ? `<img class="ytw-channel-avatar" src="${channel.thumbnail}" alt="${channel.title}" loading="lazy">`
      : `<div class="ytw-channel-avatar-placeholder">${(channel.title || 'Y').charAt(0).toUpperCase()}</div>`;

    const channelUrl = channel.customUrl
      ? `https://www.youtube.com/${channel.customUrl}`
      : `https://www.youtube.com/channel/${channel.id}`;

    return `
      <div class="ytw-channel-header">
        ${avatarHtml}
        <div class="ytw-channel-info">
          <div class="ytw-channel-name">${channel.title}</div>
          <div class="ytw-channel-subs">${formatCount(channel.subscriberCount)} subscribers</div>
        </div>
        <a class="ytw-channel-link" href="${channelUrl}" target="_blank" rel="noopener">
          ${ICONS.youtube} Subscribe
        </a>
      </div>
    `;
  }

  // ─── Render: Grid Card ───────────────────────────────────────────────────────
  function renderGridCard(video) {
    const titleEsc = encodeURIComponent(video.title || '');
    return `
      <a class="ytw-card" href="${video.url}" data-video-id="${video.id}" data-video-title="${titleEsc}" target="_blank" rel="noopener" aria-label="${video.title}">
        <div class="ytw-thumb-wrap">
          <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
          <div class="ytw-play-btn">${ICONS.play}</div>
          ${video.duration ? `<span class="ytw-duration">${video.duration}</span>` : ''}
        </div>
        <div class="ytw-card-body">
          <div class="ytw-card-title">${video.title}</div>
          <div class="ytw-card-meta">
            ${video.viewCount ? `<span>${ICONS.eye} ${formatCount(video.viewCount)}</span><span class="ytw-dot">·</span>` : ''}
            <span>${ICONS.calendar} ${formatDate(video.publishedAt)}</span>
          </div>
        </div>
      </a>
    `;
  }

  // ─── Render: List Item ───────────────────────────────────────────────────────
  function renderListItem(video) {
    const titleEsc = encodeURIComponent(video.title || '');
    return `
      <a class="ytw-list-item" href="${video.url}" data-video-id="${video.id}" data-video-title="${titleEsc}" target="_blank" rel="noopener" aria-label="${video.title}">
        <div class="ytw-list-thumb">
          <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
          ${video.duration ? `<span class="ytw-duration">${video.duration}</span>` : ''}
        </div>
        <div class="ytw-list-body">
          <div class="ytw-list-title">${video.title}</div>
          <div class="ytw-list-desc">${video.description || ''}</div>
          <div class="ytw-list-meta">
            ${video.viewCount ? `<span>${ICONS.eye} ${formatCount(video.viewCount)} views</span>` : ''}
            ${video.likeCount ? `<span>${ICONS.thumbup} ${formatCount(video.likeCount)}</span>` : ''}
            <span>${ICONS.calendar} ${formatDate(video.publishedAt)}</span>
          </div>
        </div>
      </a>
    `;
  }

  // ─── Render: Stats ───────────────────────────────────────────────────────────
  function renderStats(channel) {
    const stats = [
      { icon: '👥', label: 'Subscribers', value: formatCount(channel.subscriberCount) },
      { icon: '▶️', label: 'Total Views', value: formatCount(channel.viewCount) },
      { icon: '🎬', label: 'Videos', value: formatCount(channel.videoCount) },
    ];
    const cards = stats.map(s => `
      <div class="ytw-stat-card">
        <span class="ytw-stat-icon">${s.icon}</span>
        <div class="ytw-stat-value">${s.value}</div>
        <div class="ytw-stat-label">${s.label}</div>
      </div>
    `).join('');
    return `<div class="ytw-stats-grid">${cards}</div>`;
  }

  // ─── Render: Single Video ────────────────────────────────────────────────────
  function renderSingleVideo(videoId, video) {
    return `
      <div class="ytw-single">
        <div class="ytw-player-wrap">
          <iframe
            src="https://www.youtube.com/embed/${videoId}?rel=0"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="${video.title}">
          </iframe>
        </div>
        <div class="ytw-single-info">
          <div class="ytw-single-title">${video.title}</div>
          <div class="ytw-single-meta">
            ${video.viewCount ? `<span>${ICONS.eye} ${formatCount(video.viewCount)} views</span>` : ''}
            ${video.likeCount ? `<span>${ICONS.thumbup} ${formatCount(video.likeCount)}</span>` : ''}
            <span>${ICONS.calendar} ${formatDate(video.publishedAt)}</span>
            ${video.duration ? `<span>⏱ ${video.duration}</span>` : ''}
          </div>
          ${video.description ? `<div class="ytw-single-desc">${video.description}</div>` : ''}
        </div>
      </div>
    `;
  }

  // ─── Render: Live Player ─────────────────────────────────────────────────────
  function renderLive(live, channel) {
    const channelUrl = channel?.customUrl
      ? `https://www.youtube.com/${channel.customUrl}`
      : `https://www.youtube.com/channel/${channel?.id || ''}`;
    const avatarHtml = channel?.thumbnail
      ? `<img class="ytw-live-channel-avatar" src="${channel.thumbnail}" alt="${channel.title}" loading="lazy">`
      : `<div class="ytw-live-channel-avatar-placeholder">${(channel?.title || 'L').charAt(0).toUpperCase()}</div>`;

    const viewersHtml = live.concurrentViewers
      ? `<div class="ytw-live-viewers">👁 ${formatCount(live.concurrentViewers)} watching</div>`
      : '';

    return `
      <div class="ytw-live-wrap">
        <div class="ytw-live-player-wrap">
          <div class="ytw-live-badge"><span class="ytw-live-dot"></span> Live</div>
          ${viewersHtml}
          <iframe
            src="https://www.youtube.com/embed/${live.videoId}?autoplay=1&mute=1&rel=0"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="${live.title}">
          </iframe>
        </div>
        <div class="ytw-live-info">
          ${avatarHtml}
          <div class="ytw-live-text">
            <div class="ytw-live-title">${live.title}</div>
            ${channel ? `<div class="ytw-live-channel-name">${channel.title}</div>` : ''}
          </div>
          <a class="ytw-live-watch"
             href="https://www.youtube.com/watch?v=${live.videoId}"
             target="_blank" rel="noopener">
            ${ICONS.youtube} Watch Live
          </a>
        </div>
      </div>
    `;
  }

  // ─── Render: Offline Card ────────────────────────────────────────────────────
  function renderOffline(channel, lastVideo, offlineMessage, showLastVideo, offlineImage, offlineImageWidth) {
    const channelUrl = channel?.customUrl
      ? `https://www.youtube.com/${channel.customUrl}`
      : `https://www.youtube.com/channel/${channel?.id || ''}`;

    const offlineBannerStyle = offlineImage && offlineImageWidth
      ? ` style="--ytw-offline-banner-width:${escapeHtml(offlineImageWidth)};"`
      : '';

    const lastVideoHtml = (showLastVideo && lastVideo) ? `
      <div class="ytw-offline-last">
        <div class="ytw-offline-last-label">Last Video</div>
        <a class="ytw-offline-last-video" href="${lastVideo.url}" data-video-id="${lastVideo.id}" data-video-title="${encodeURIComponent(lastVideo.title || '')}" target="_blank" rel="noopener">
          <div class="ytw-offline-last-thumb">
            <img src="${lastVideo.thumbnail}" alt="${lastVideo.title}" loading="lazy">
            ${lastVideo.duration ? `<span class="ytw-duration">${lastVideo.duration}</span>` : ''}
          </div>
          <div class="ytw-offline-last-body">
            <div class="ytw-offline-last-title">${lastVideo.title}</div>
            <div class="ytw-offline-last-meta">
              ${lastVideo.viewCount ? `<span>${ICONS.eye} ${formatCount(lastVideo.viewCount)} views</span>` : ''}
              <span>${ICONS.calendar} ${formatDate(lastVideo.publishedAt)}</span>
            </div>
          </div>
        </a>
      </div>
    ` : '';

    return `
      <div class="ytw-offline-card">
        <div class="ytw-offline-hero ${offlineImage ? 'ytw-has-image' : ''}">
          ${offlineImage ? `
            <div class="ytw-offline-banner"${offlineBannerStyle}>
              <img src="${offlineImage}" alt="Offline Banner" loading="lazy">
              <div class="ytw-offline-banner-overlay"></div>
            </div>
          ` : `
            <div class="ytw-offline-rings">
              <div class="ytw-offline-ring"></div>
              <div class="ytw-offline-ring"></div>
              <div class="ytw-offline-ring"></div>
            </div>
            <div class="ytw-offline-icon">📡</div>
          `}
          <div class="ytw-offline-status">
            <span class="ytw-offline-status-dot"></span> Offline
          </div>
          <div class="ytw-offline-title">${offlineMessage}</div>
          <div class="ytw-offline-sub">
            Subscribe below and turn on notifications so you never miss a stream.
          </div>
          <div class="ytw-offline-actions">
            <a class="ytw-offline-btn primary" href="${channelUrl}" target="_blank" rel="noopener">
              ${ICONS.youtube} Subscribe
            </a>
            <a class="ytw-offline-btn secondary" href="${channelUrl}/videos" target="_blank" rel="noopener">
              ${ICONS.film} All Videos
            </a>
          </div>
        </div>
        ${lastVideoHtml}
      </div>
    `;
  }

  // ─── Loading / Error Helpers ─────────────────────────────────────────────────
  function showLoading(el) {
    el.innerHTML = `<div class="ytw-loading"><div class="ytw-spinner"></div><span>Loading...</span></div>`;
  }

  function showError(el, msg) {
    el.innerHTML = `<div class="ytw-error"><strong>⚠ Widget Error</strong>${msg}</div>`;
  }

  // ─── Main Widget Init ────────────────────────────────────────────────────────
  async function initWidget(el) {
    injectStyles();
    const d = el.dataset;
    const proxyUrl = d.proxyUrl || d.proxy_url || null;  // Server-side proxy URL (hides API key)
    const apiKey   = d.apiKey   || d.api_key   || null;  // Direct API key (visible in source)
    const channelId  = d.channelId  || d.channel_id;
    const videoId    = d.videoId    || d.video_id;
    const playlistId = d.playlistId || d.playlist_id;
    const type = d.type || 'feed';
    const layout = d.layout || 'grid';
    const theme = d.theme || 'dark';
    const maxResults = Math.min(50, Math.max(1, parseInt(d.maxResults || d.max_results || 9)));
    const showChannelInfo = d.showChannelInfo !== 'false' && d.show_channel_info !== 'false';
    const accentColor     = d.accentColor     || d.accent_color     || '';
    const buttonBgColor   = d.buttonBgColor   || d.button_bg_color   || accentColor;
    let buttonTextColor = d.buttonTextColor || d.button_text_color || '';
    const bgColor         = d.bgColor         || d.bg_color         || '';
    const cardBgColor     = d.cardBgColor     || d.card_bg_color     || '';
    const textColor       = d.textColor       || d.text_color       || '';
    const textMutedColor  = d.textMutedColor  || d.text_muted_color  || '';

    const desktopCols = d.columns || d.cols || d.desktopCols || '';
    const maxWidth    = d.maxWidth || d.max_width || d.width || '';

    // Apply theme class
    el.classList.add('ytw-root');
    if (theme === 'light') el.classList.add('ytw-light');
    if (accentColor) el.style.setProperty('--ytw-accent', accentColor);
    if (buttonBgColor) el.style.setProperty('--ytw-btn-bg', buttonBgColor);

    if (desktopCols) {
      el.style.setProperty('--ytw-cols', desktopCols);
    } else {
      el.style.removeProperty('--ytw-cols');
    }

    if (maxWidth) {
      el.style.maxWidth = maxWidth;
      el.style.marginLeft = 'auto';
      el.style.marginRight = 'auto';
    } else {
      el.style.maxWidth = '';
      el.style.marginLeft = '';
      el.style.marginRight = '';
    }

    if (!buttonTextColor && (buttonBgColor || accentColor)) {
      buttonTextColor = getContrastColor(buttonBgColor || accentColor);
    }
    if (buttonTextColor) el.style.setProperty('--ytw-btn-text', buttonTextColor);

    if (bgColor) el.style.setProperty('--ytw-bg', bgColor);
    if (cardBgColor) {
      el.style.setProperty('--ytw-surface', cardBgColor);
      el.style.setProperty('--ytw-surface2', cardBgColor);
    }
    if (textColor) el.style.setProperty('--ytw-text', textColor);
    if (textMutedColor) el.style.setProperty('--ytw-text-muted', textMutedColor);

    // Require either a proxy URL or a direct API key
    if (!proxyUrl && !apiKey) {
      showError(el, 'Missing <code>data-proxy-url</code> (recommended) or <code>data-api-key</code> attribute.');
      return;
    }

    showLoading(el);

    const offlineMessage = d.offlineMessage || d.offline_message || "We're not live right now";
    const offlineImage   = d.offlineImage   || d.offline_image   || null;
    const offlineImageWidth = d.offlineImageWidth || d.offline_image_width || null;
    const showLastVideo  = d.showLastVideo !== 'false' && d.show_last_video !== 'false';

    try {
      let html = '';

      if (type === 'live') {
        // ── Live stream detector ─────────────────────────────────────────────
        if (!channelId) { showError(el, 'Missing <code>data-channel-id</code> for type="live".'); return; }

        // Fetch channel info + live status in parallel
        const [channel, live] = await Promise.all([
          fetchChannelInfo(channelId, apiKey, proxyUrl),
          fetchLiveStatus(channelId, apiKey, proxyUrl),
        ]);

        if (live.isLive) {
          // 🔴 Channel is LIVE — embed the stream
          html = renderLive(live, channel);
        } else {
          // ⚫ Not live — show offline card, optionally with last video
          let lastVideo = null;
          if (showLastVideo && channel.uploadsPlaylistId) {
            try {
              const { videos: lastVids } = await fetchVideos(channel.uploadsPlaylistId, apiKey, 1, proxyUrl);
              lastVideo = lastVids?.[0] || null;
            } catch (_) { /* non-fatal */ }
          }
          html = renderOffline(channel, lastVideo, offlineMessage, showLastVideo, offlineImage, offlineImageWidth);
        }

      } else if (type === 'single') {
        // Single video embed
        if (!videoId) { showError(el, 'Missing <code>data-video-id</code> for type="single".'); return; }
        const video = await fetchSingleVideo(videoId, apiKey, proxyUrl);
        html = renderSingleVideo(videoId, video);

      } else if (type === 'stats') {
        // Channel stats cards
        if (!channelId) { showError(el, 'Missing <code>data-channel-id</code> for type="stats".'); return; }
        const channel = await fetchChannelInfo(channelId, apiKey, proxyUrl);
        if (showChannelInfo) html += renderChannelHeader(channel);
        html += renderStats(channel);

      } else {
        // Feed or Playlist
        if (!channelId && !playlistId) {
          showError(el, 'Missing <code>data-channel-id</code> or <code>data-playlist-id</code>.');
          return;
        }

        let resolvedPlaylistId = playlistId;
        let channel = null;

        if (channelId) {
          channel = await fetchChannelInfo(channelId, apiKey, proxyUrl);
          if (!resolvedPlaylistId) resolvedPlaylistId = channel.uploadsPlaylistId;
        }

        if (!resolvedPlaylistId) {
          showError(el, 'Could not resolve uploads playlist for this channel.');
          return;
        }

        const enableLoadMore = d.loadMore !== 'false' && d.load_more !== 'false';
        const loadMoreText   = d.loadMoreText || d.load_more_text || 'Load More Videos';

        const { videos, nextPageToken } = await fetchVideos(resolvedPlaylistId, apiKey, maxResults, proxyUrl);

        if (channel && showChannelInfo) html += renderChannelHeader(channel);

        if (!videos.length) {
          html += `<div class="ytw-error">No videos found.</div>`;
        } else if (layout === 'list') {
          html += `<div class="ytw-list">${videos.map(renderListItem).join('')}</div>`;
        } else {
          html += `<div class="ytw-grid">${videos.map(renderGridCard).join('')}</div>`;
        }

        if (videos.length && enableLoadMore && nextPageToken) {
          html += `
            <div class="ytw-load-more-wrap">
              <button class="ytw-load-more-btn" data-next-token="${nextPageToken}">${loadMoreText}</button>
            </div>
          `;
        }

        // Store playlist ID on el for event handling
        el.dataset.resolvedPlaylistId = resolvedPlaylistId;
      }

      html += `<div class="ytw-footer">Powered by <a href="https://www.randsdevelopment.com" target="_blank" rel="noopener">R&amp;S Development YT Widget</a></div>`;
      el.innerHTML = html;

      // Attach Load More click handler if present
      const loadMoreBtn = el.querySelector('.ytw-load-more-btn');
      const activePlaylistId = el.dataset.resolvedPlaylistId;
      if (loadMoreBtn && activePlaylistId) {
        loadMoreBtn.addEventListener('click', async () => {
          const currentToken = loadMoreBtn.dataset.nextToken;
          if (!currentToken) return;

          loadMoreBtn.disabled = true;
          const origText = loadMoreBtn.innerHTML;
          loadMoreBtn.innerHTML = `<span class="ytw-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></span> Loading...`;

          try {
            const { videos: newVideos, nextPageToken: nextToken } = await fetchVideos(
              activePlaylistId,
              apiKey,
              maxResults,
              proxyUrl,
              currentToken
            );

            const container = el.querySelector('.ytw-grid, .ytw-list');
            if (container && newVideos.length) {
              const renderFn = layout === 'list' ? renderListItem : renderGridCard;
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = newVideos.map(renderFn).join('');
              while (tempDiv.firstChild) {
                container.appendChild(tempDiv.firstChild);
              }
            }

            if (nextToken) {
              loadMoreBtn.dataset.nextToken = nextToken;
              loadMoreBtn.disabled = false;
              loadMoreBtn.innerHTML = origText;
            } else {
              loadMoreBtn.parentElement.remove();
            }
          } catch (err) {
            console.error('[YT Widget Load More]', err);
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = `⚠ ${err.message || 'Error loading'}`;
            setTimeout(() => { loadMoreBtn.innerHTML = origText; }, 4000);
          }
        });
      }

      // Attach click event listener for Floating Modal Player
      if (!el.dataset.modalListenerAttached) {
        el.dataset.modalListenerAttached = 'true';
        el.addEventListener('click', (e) => {
          const card = e.target.closest('a[data-video-id]');
          if (card) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
            const videoId = card.dataset.videoId;
            const videoTitle = card.dataset.videoTitle ? decodeURIComponent(card.dataset.videoTitle) : card.getAttribute('aria-label');
            const videoUrl = card.href;
            openVideoModal(videoId, videoTitle, videoUrl);
          }
        });
      }

    } catch (err) {
      console.error('[YT Widget]', err);
      showError(el, err.message || 'An unexpected error occurred.');
    }
  }

  // ─── Floating Video Modal ────────────────────────────────────────────────────
  function openVideoModal(videoId, title, url) {
    closeVideoModal();

    const overlay = document.createElement('div');
    overlay.className = 'ytw-modal-overlay';
    overlay.id = 'ytw-active-modal';

    const cleanTitle = title || 'Watch Video';
    const ytUrl = url || `https://www.youtube.com/watch?v=${videoId}`;

    overlay.innerHTML = `
      <div class="ytw-modal-card" onclick="event.stopPropagation()">
        <button class="ytw-modal-close" aria-label="Close modal" onclick="window.YTWidget.closeModal()">&times;</button>
        <div class="ytw-modal-player">
          <iframe
            src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="${cleanTitle}">
          </iframe>
        </div>
        <div class="ytw-modal-footer">
          <div class="ytw-modal-info">
            <div class="ytw-modal-title">${cleanTitle}</div>
          </div>
          <a class="ytw-modal-yt-btn" href="${ytUrl}" target="_blank" rel="noopener">
            ${ICONS.youtube} Open on YouTube ↗
          </a>
        </div>
      </div>
    `;

    overlay.addEventListener('click', () => closeVideoModal());
    document.body.appendChild(overlay);
    window.addEventListener('keydown', handleModalEscKey);
  }

  function handleModalEscKey(e) {
    if (e.key === 'Escape') closeVideoModal();
  }

  function closeVideoModal() {
    const modal = document.getElementById('ytw-active-modal');
    if (modal) {
      modal.remove();
      window.removeEventListener('keydown', handleModalEscKey);
    }
  }

  // ─── Bootstrap ──────────────────────────────────────────────────────────────
  function bootstrap() {
    injectStyles();
    const widgets = document.querySelectorAll('[data-yt-widget]');
    widgets.forEach(el => initWidget(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  // Expose public API
  window.YTWidget = {
    version: WIDGET_VERSION,
    reinit: bootstrap,
    init: initWidget,
    openModal: openVideoModal,
    closeModal: closeVideoModal
  };

})();
