# YT Widget — Free Open-Source YouTube Website Embed
[![GitHub Downloads](https://shields.io)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com)
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](yt-widget.js)
[![Free & Open Source](https://img.shields.io/badge/Price-100%25%20Free-orange.svg)](https://www.randsdevelopment.com)

A free, self-hostable, dependency-free JavaScript library for embedding YouTube feeds, playlists, channel stats, single videos, and live stream status on any website — just like SociableKIT, but 100% free and open-source.

Created and provided free to the developer community by **[R&S Development](https://www.randsdevelopment.com)**.

---

## ✨ Features

- 📺 **5 Widget Types**:
  - **`feed`**: Latest channel uploads grid or list
  - **`live`**: Auto-detects live broadcasts and embeds the live player — shows a custom **Offline Card** with recent uploads when offline
  - **`playlist`**: Show videos from any YouTube playlist
  - **`stats`**: Channel metrics cards (Subscribers, Views, Videos count)
  - **`single`**: Responsive single video player with metadata
- 🔒 **Secure PHP Server Proxy (`proxy/`)**: Keep your YouTube API key hidden server-side with built-in CORS, rate limiting, and 5-minute response caching.
- 🎨 **Full Color Customization**:
  - Light & Dark themes
  - Custom Accent / Button colors (`data-accent-color`)
  - Custom Button Text color with smart **Auto-Contrast Engine** (`data-button-text-color`)
  - Custom Container Background (`data-bg-color`) & Card Surface (`data-card-bg-color`)
  - Primary Text Color (`data-text-color`)
- 🔄 **Pagination & "Load More"**: Load initial videos and let visitors click "Load More" to append additional videos dynamically.
- 🖼️ **Offline Stream Customization**: Custom widescreen 16:9 banner image support (`data-offline-image`) + included generic `offline-banner.jpg` starter template.
- 🎛️ **Visual Builder Dashboard (`index.html`)**: GUI tool to configure options live and copy ready-to-use HTML embed code.
- ⚡ **Zero Dependencies**: Pure Vanilla JS & Vanilla CSS. No jQuery, React, or heavy libraries required.

---

## 🚀 Quick Start (2-Minute Setup)

### Option A: Secure Mode with PHP Proxy (Recommended) 🔒

1. Upload the `proxy/` directory to your web server.
2. Edit `proxy/config.php` and set your YouTube Data API Key:
   ```php
   define('YTW_API_KEY', 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX');
   ```
3. Paste this embed code onto your web page:
   ```html
   <!-- YouTube Widget Container -->
   <div
     data-yt-widget
     data-proxy-url="https://yoursite.com/proxy/api-proxy.php"
     data-channel-id="UCxxxxxxxxxxxxxxxxxxxxxx"
     data-type="feed"
     data-layout="grid"
     data-max-results="9"
     data-load-more="true">
   </div>

   <!-- Include script before </body> -->
   <script src="yt-widget.js"></script>
   ```

---

### Option B: Direct API Key Mode ⚡

If you don't use PHP, you can provide your restricted API key directly:

```html
<div
  data-yt-widget
  data-api-key="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX"
  data-channel-id="UCxxxxxxxxxxxxxxxxxxxxxx"
  data-type="feed"
  data-layout="grid"
  data-max-results="9">
</div>

<script src="yt-widget.js"></script>
```
*Note: Restrict direct API keys to your website HTTP referrer domain inside [Google Cloud Console](https://console.cloud.google.com).*

---

## 🎛️ Configuration & Data Attributes

All widget settings are set via HTML `data-` attributes:

| Attribute | Accepted Values | Default | Description |
|-----------|-----------------|---------|-------------|
| `data-proxy-url` | URL string | `null` | **Recommended.** Path to `proxy/api-proxy.php` to hide API key |
| `data-api-key` | string | `null` | YouTube Data API v3 key (Direct mode) |
| `data-channel-id` | `UCxxxxxx...` | *Required* | YouTube Channel ID |
| `data-playlist-id` | `PLxxxxxx...` | *Playlist mode* | YouTube Playlist ID |
| `data-video-id` | `xxxxxxxxx` | *Single mode* | YouTube Video ID |
| `data-type` | `feed` \| `live` \| `playlist` \| `stats` \| `single` | `feed` | Display mode |
| `data-layout` | `grid` \| `list` | `grid` | Video layout format |
| `data-columns` | `2` \| `3` \| `4` \| `5` | `3` | Desktop grid column count (Phones stay responsive) |
| `data-max-width` | CSS width (`100%`, `1200px`, `1000px`, `800px`) | `100%` | Desktop container max-width |
| `data-theme` | `dark` \| `light` | `dark` | Base color theme |
| `data-accent-color` | CSS Hex/RGB | `#ff0033` | Button background & accent highlight color |
| `data-button-text-color` | CSS Hex/RGB | *Auto-Contrast* | Text color for buttons |
| `data-bg-color` | CSS Hex/RGB | `#0f0f13` | Main widget container background color |
| `data-card-bg-color` | CSS Hex/RGB | `#1a1a24` | Video card / surface background color |
| `data-text-color` | CSS Hex/RGB | `#f0f0f0` | Title & primary text color |
| `data-max-results` | `1` to `50` | `9` | Initial videos per page |
| `data-load-more` | `true` \| `false` | `true` | Enable/disable "Load More" pagination button |
| `data-load-more-text` | string | `"Load More Videos"` | Text displayed on pagination button |
| `data-offline-message` | string | `"We're not live right now"` | Headline shown when stream is offline |
| `data-offline-image` | Image URL | `null` | Custom 16:9 banner image for offline card |
| `data-show-last-video` | `true` \| `false` | `true` | Show most recent video inside offline card |
| `data-show-channel-info` | `true` \| `false` | `true` | Show header with avatar, channel name & subscribe button |

---

## 🔴 Live Stream Detector & Offline Card

When `data-type="live"` is configured:
- **When Live**: Embeds active live stream in 16:9 player with pulsing **● LIVE** badge and live viewer count.
- **When Offline**: Displays a high-converting **Offline Hero Card** with:
  - Custom offline banner image (`data-offline-image`) or default animated graphic
  - Custom offline headline (`data-offline-message`)
  - Direct Subscribe button & All Videos link
  - Recent upload preview card with view count & duration (`data-show-last-video`)

### Recommended Offline Banner Image Size
- **Aspect Ratio:** 16:9 (Widescreen)
- **Resolution:** **1920×1080 px** or **1280×720 px**
- *A starter banner template `offline-banner.jpg` is included in this repository.*

---

## 🔒 PHP Proxy Configuration (`proxy/config.php`)

```php
// Define secret YouTube API Key
define('YTW_API_KEY', 'CHANGE_THIS_TO_YOUR_YOUTUBE_API_KEY');

// Allowed Origins (CORS) - Set to '*' for all, or restrict to your domain
define('YTW_ALLOWED_ORIGINS', ['*']);

// Rate Limiting (500 requests per IP per hour)
define('YTW_RATE_LIMIT', 500);
define('YTW_RATE_WINDOW', 3600);

// Response Cache (5 minutes TTL)
define('YTW_CACHE_ENABLED', true);
define('YTW_CACHE_TTL', 300);
```

---

## 📁 Repository Structure

```
yt-widget/
├── yt-widget.js          ← Core widget library (injectable on any page)
├── index.html            ← Visual Builder & Live Preview Dashboard
├── offline-banner.jpg    ← Starter 16:9 offline banner template
├── styles.css            ← Builder Dashboard styles
├── proxy/
│   ├── api-proxy.php     ← PHP API Key Proxy script
│   ├── config.php        ← Proxy configuration (API key, cache, rate limits)
│   ├── .htaccess         ← Security rules to protect config file
│   └── cache/            ← Response cache directory
├── LICENSE               ← MIT License
└── README.md             ← Documentation & Setup Guide
```

---

## 🤝 Developed By

**YT Widget** is developed and provided free for open-source use by:

**[R&S Development](https://www.randsdevelopment.com)**  
*Professional Web Development & Software Engineering Services*  
🌐 **Website:** [https://www.randsdevelopment.com](https://www.randsdevelopment.com)

If you find this widget helpful, consider adding a credit link back to [https://www.randsdevelopment.com](https://www.randsdevelopment.com) on your site!

---

## 📄 License

This project is licensed under the **MIT License** — free for personal and commercial use.
