<?php
/**
 * YT Widget — Proxy Configuration
 * ─────────────────────────────────────────────────────────────────
 * SECURITY: This file should NEVER be directly accessible from the web.
 * The .htaccess in this directory blocks direct requests to it.
 *
 * For maximum security, move this file OUTSIDE your web root and
 * update the require path in api-proxy.php accordingly.
 * e.g., require_once '/home/youruser/private/yt-widget-config.php';
 */

// ── Your YouTube Data API v3 Key ────────────────────────────────────────────
// Get one free at: https://console.cloud.google.com/
// Restrict it to your SERVER IP (not HTTP referrer) for server-side calls.
define('YTW_API_KEY', 'CHANGE_THIS_TO_YOUR_YOUTUBE_API_KEY');

// ── Allowed Origins (CORS) ──────────────────────────────────────────────────
// List the domains that are allowed to use this proxy.
//
// QUICK START: '*' allows any domain — fine for initial setup.
// PRODUCTION:  Replace '*' with your actual domain(s) to prevent other
//              websites from using your proxy and burning your API quota.
//
// Examples:
//   'https://yoursite.com'
//   'https://www.yoursite.com'
//   'http://localhost'            ← for local dev
define('YTW_ALLOWED_ORIGINS', [
    '*',
    // 'https://yoursite.com',
    // 'https://www.yoursite.com',
    // 'http://localhost',
]);

// ── Rate Limiting ───────────────────────────────────────────────────────────
// Max requests per IP per time window.
define('YTW_RATE_LIMIT',         500);       // Max requests (500/hr allows testing & Load More)
define('YTW_RATE_WINDOW',        3600);      // Time window in seconds (3600 = 1 hour)

// ── Cache ───────────────────────────────────────────────────────────────────
// Cache YouTube API responses to save quota. Requires a writable cache dir.
define('YTW_CACHE_ENABLED',      true);
define('YTW_CACHE_DIR',          __DIR__ . '/cache/');
define('YTW_CACHE_TTL',          300);       // Seconds to cache responses (300 = 5 min)

// ── Allowed YouTube API Endpoints ───────────────────────────────────────────
// Whitelist of YouTube API resources this proxy will forward to.
// Do NOT add 'search' here without understanding quota costs (100 units each).
define('YTW_ALLOWED_ENDPOINTS', [
    'channels',
    'playlistItems',
    'videos',
    'playlists',
    'search',       // Used by type=live to detect active broadcasts (costs 100 units/call)
]);

// ── Debug Mode ──────────────────────────────────────────────────────────────
// Set to false in production! When true, detailed errors are shown.
define('YTW_DEBUG', false);
