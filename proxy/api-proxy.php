<?php
/**
 * YT Widget — Server-Side API Proxy
 * ─────────────────────────────────────────────────────────────────
 * This script acts as a middleman between the widget (client JS)
 * and the YouTube Data API v3. The API key is stored only here,
 * server-side, and is never sent to the browser.
 *
 * Usage (widget data attribute):
 *   data-proxy-url="https://yoursite.com/proxy/api-proxy.php"
 *
 * The widget will call:
 *   api-proxy.php?endpoint=channels&id=UCxxx&part=snippet,statistics,...
 */

// ── Load Config ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/config.php';

// ── Bootstrap ────────────────────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
// Disable PHP errors leaking into JSON output
if (!YTW_DEBUG) {
    error_reporting(0);
    ini_set('display_errors', '0');
}

// ── CORS ─────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = YTW_ALLOWED_ORIGINS;

if (empty($origin)) {
    // Same-origin or server-side request — no Origin header is sent.
    // These are inherently safe (the request comes from the same server).
    header('Access-Control-Allow-Origin: *');
} elseif ($allowed === '*' || in_array('*', $allowed)) {
    header('Access-Control-Allow-Origin: *');
} elseif (in_array($origin, $allowed)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    proxy_error(403, 'Origin not allowed. Add your domain to YTW_ALLOWED_ORIGINS in proxy/config.php. Got: ' . htmlspecialchars($origin));
}

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Only allow GET ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    proxy_error(405, 'Method not allowed.');
}

// ── Rate Limiting (file-based, per IP) ───────────────────────────────────────
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ip = trim(explode(',', $ip)[0]); // Take first IP if behind proxy
rate_limit_check($ip);

// ── Validate Endpoint ─────────────────────────────────────────────────────────
$endpoint = trim($_GET['endpoint'] ?? '');
if (empty($endpoint)) {
    proxy_error(400, 'Missing required parameter: endpoint');
}
if (!in_array($endpoint, YTW_ALLOWED_ENDPOINTS, true)) {
    proxy_error(400, 'Endpoint not allowed: ' . htmlspecialchars($endpoint));
}

// ── Build YouTube API URL ──────────────────────────────────────────────────────
$yt_base = 'https://www.googleapis.com/youtube/v3/';
$yt_url = $yt_base . urlencode($endpoint);

// Carry through safe query params (everything except 'endpoint')
$safe_params = [];
$allowed_params = ['part', 'id', 'channelId', 'playlistId', 'maxResults', 'pageToken', 'chart', 'regionCode', 'hl', 'myRating', 'order', 'q'];
foreach ($allowed_params as $param) {
    if (isset($_GET[$param]) && $_GET[$param] !== '') {
        $safe_params[$param] = $_GET[$param];
    }
}

// Inject the secret API key
$safe_params['key'] = YTW_API_KEY;

$yt_url .= '?' . http_build_query($safe_params);

// ── Cache ─────────────────────────────────────────────────────────────────────
$cache_key = md5($yt_url);
if (YTW_CACHE_ENABLED) {
    $cached = cache_get($cache_key);
    if ($cached !== null) {
        header('X-YTW-Cache: HIT');
        echo $cached;
        exit;
    }
}

// ── Forward Request to YouTube ────────────────────────────────────────────────
$ctx = stream_context_create([
    'http' => [
        'method'          => 'GET',
        'timeout'         => 10,
        'ignore_errors'   => true,
        'header'          => [
            'Accept: application/json',
            'User-Agent: YTWidget-Proxy/1.0',
        ],
    ],
    'ssl' => [
        'verify_peer'     => true,
        'verify_peer_name'=> true,
    ],
]);

$response_body = @file_get_contents($yt_url, false, $ctx);
$http_status = 200;

// Parse HTTP response code from headers
if (isset($http_response_header)) {
    foreach ($http_response_header as $header_line) {
        if (preg_match('#HTTP/\d+\.\d+\s+(\d+)#', $header_line, $m)) {
            $http_status = (int)$m[1];
        }
    }
}

if ($response_body === false) {
    proxy_error(502, 'Failed to reach YouTube API. Check server connectivity.');
}

// ── Handle YouTube API Errors ─────────────────────────────────────────────────
if ($http_status !== 200) {
    $yt_error = json_decode($response_body, true);
    $msg = $yt_error['error']['message'] ?? 'YouTube API error.';
    $code = $yt_error['error']['code'] ?? $http_status;
    proxy_error($http_status, $msg, $code);
}

// ── Cache the successful response ─────────────────────────────────────────────
if (YTW_CACHE_ENABLED) {
    cache_set($cache_key, $response_body);
    header('X-YTW-Cache: MISS');
}

// ── Return response to widget ─────────────────────────────────────────────────
http_response_code(200);
echo $response_body;


// ══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send a JSON error response and exit.
 */
function proxy_error(int $httpCode, string $message, $ytCode = null): void {
    http_response_code($httpCode);
    $err = ['error' => ['message' => $message, 'code' => $ytCode ?? $httpCode]];
    echo json_encode($err);
    exit;
}

/**
 * Simple IP-based rate limiter using flat files.
 */
function rate_limit_check(string $ip): void {
    $rate_dir = sys_get_temp_dir() . '/ytw_ratelimit/';
    if (!is_dir($rate_dir)) {
        @mkdir($rate_dir, 0700, true);
    }

    $file = $rate_dir . md5($ip) . '.json';
    $now = time();
    $window = YTW_RATE_WINDOW;
    $limit = YTW_RATE_LIMIT;

    $data = ['requests' => [], 'count' => 0];
    if (file_exists($file)) {
        $raw = @file_get_contents($file);
        if ($raw) {
            $data = json_decode($raw, true) ?? $data;
        }
    }

    // Prune old entries outside the window
    $data['requests'] = array_filter($data['requests'], fn($t) => ($now - $t) < $window);
    $data['count'] = count($data['requests']);

    if ($limit > 0 && $data['count'] >= $limit) {
        header('Retry-After: ' . ($window - ($now - min($data['requests']))));
        proxy_error(429, "Rate limit exceeded. Max {$limit} requests per " . ($window / 60) . " minutes.");
    }

    $data['requests'][] = $now;
    $data['count']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);
}

/**
 * Read from cache. Returns null if missing or expired.
 */
function cache_get(string $key): ?string {
    $file = YTW_CACHE_DIR . $key . '.json';
    if (!file_exists($file)) return null;
    if ((time() - filemtime($file)) > YTW_CACHE_TTL) {
        @unlink($file);
        return null;
    }
    return @file_get_contents($file) ?: null;
}

/**
 * Write a response to the file cache.
 */
function cache_set(string $key, string $data): void {
    $dir = YTW_CACHE_DIR;
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    @file_put_contents($dir . $key . '.json', $data, LOCK_EX);
}
