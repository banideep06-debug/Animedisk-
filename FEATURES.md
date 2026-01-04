# ✨ Features & Technical Details

## What Makes This Addon Special

### 🎯 Core Features

1. **Real Streaming Links**
   - Extracts actual video URLs (not torrent magnets)
   - Supports .m3u8 (HLS) and .mp4 formats
   - Multiple quality options when available
   - Direct playback in Stremio

2. **TMDB Integration**
   - Enhanced posters and backgrounds
   - Professional descriptions
   - Ratings and release dates
   - Accurate metadata

3. **IMDB Mapping**
   - Links Stremio's IMDB IDs to Animedisk slugs
   - Smart search and matching algorithm
   - Poster-based verification
   - Failed mapping cache to avoid retries

4. **Multi-Language Support**
   - Hindi Dubbed anime
   - Hindi Subbed anime
   - Regional languages (Tamil, Telugu, Malayalam, Bengali, Marathi)

5. **Multiple Catalogs**
   - TV Series (ongoing and completed)
   - Movies (anime films)
   - Most Popular (trending content)

---

## Technical Architecture

### Design Patterns

**1. Scraping Strategy**
- Cheerio for fast HTML parsing
- Multiple selector fallbacks
- Graceful error handling
- Respects website structure

**2. Caching System**
```javascript
Catalog Cache:  15 minutes (frequent updates)
Meta Cache:     30 minutes (stable data)
Stream Cache:   10 minutes (fresh links)
```

**3. Video Extraction**
```
Watch Page → Find iframes → Extract player URLs → 
Parse JavaScript → Find video sources → Return streams
```

**4. IMDB Mapping Flow**
```
Stremio IMDB ID → TMDB Details → Animedisk Search → 
Poster Matching → Slug Mapping → Cache Result
```

---

## How It Works

### 1. Catalog Handler
```javascript
User opens catalog → Fetch animedisk.me/list/tv → 
Parse anime cards → Extract titles, slugs, posters → 
Return to Stremio
```

**Selectors Used:**
- `.flw-item` - Anime card container
- `.film-poster a` - Anime link
- `.film-poster img` - Poster image
- `.film-name` - Anime title

### 2. Meta Handler
```javascript
User clicks anime → Fetch animedisk.me/{slug} → 
Extract details → Search TMDB → Enrich metadata → 
Parse episode list → Return full details
```

**Episode Extraction:**
- `#seasons-block .ss-list a` - Season blocks
- `.ep-item a` - Episode links
- Data attributes for episode numbers
- URL pattern analysis

### 3. Stream Handler
```javascript
User clicks episode → Find watch URL → 
Fetch episode page → Extract iframes → 
Parse each player → Extract video URL → 
Return stream list
```

**Video Extraction Methods:**
1. JavaScript source parsing
2. Iframe content analysis
3. Video tag extraction
4. Script variable matching

---

## Supported Websites & Players

### Primary Source
- **animedisk.me** - Main content source

### Potential Player Support
The scraper looks for common anime streaming players:
- Generic HLS players (.m3u8)
- MP4 direct streams
- Embedded video players
- Custom JavaScript players

---

## Performance Optimizations

### 1. Smart Caching
- **node-cache** for in-memory storage
- Different TTL for different data types
- Prevents redundant scraping
- Reduces server load

### 2. Concurrent Processing
- Promise.all for parallel operations
- Limited iframe processing (first 2 only)
- Timeout protection
- Early returns on success

### 3. Resource Management
- Connection pooling
- Keep-alive headers
- Minimal memory footprint
- Automatic cleanup

---

## Error Handling

### Graceful Degradation
```javascript
Catalog fails → Return empty array
Meta fails → Return null meta
Stream fails → Return empty streams
```

### Retry Logic
- Network errors: Timeout and retry
- Parser errors: Try alternative selectors
- Player errors: Try next iframe
- Mapping errors: Cache failed attempts

### Logging
- Console logs for debugging
- Request/response tracking
- Error stack traces
- Cache hit/miss reporting

---

## Data Flow Diagram

```
┌─────────────┐
│   Stremio   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Addon Server   │
│   (Node.js)     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────┐
│  TMDB   │ │Animedisk │
│   API   │ │   .me    │
└─────────┘ └──────────┘
```

---

## API Response Examples

### Manifest
```json
{
  "id": "org.animedisk.addon",
  "version": "1.0.0",
  "name": "Animedisk Anime",
  "types": ["series", "movie"],
  "catalogs": [...]
}
```

### Catalog
```json
{
  "metas": [
    {
      "id": "animedisk:naruto-shipp-den-59",
      "type": "series",
      "name": "Naruto Shippuden",
      "poster": "https://image.tmdb.org/t/p/w500/...",
      "posterShape": "poster"
    }
  ]
}
```

### Meta
```json
{
  "meta": {
    "id": "animedisk:naruto-shipp-den-59",
    "type": "series",
    "name": "Naruto Shippuden",
    "description": "...",
    "poster": "...",
    "background": "...",
    "videos": [
      {
        "id": "animedisk:naruto-shipp-den-59:1",
        "title": "Episode 1",
        "episode": 1,
        "season": 1
      }
    ]
  }
}
```

### Stream
```json
{
  "streams": [
    {
      "title": "Server 1 | 720p",
      "url": "https://example.com/video.m3u8",
      "behaviorHints": {
        "notWebReady": false
      }
    }
  ]
}
```

---

## Limitations & Known Issues

### Current Limitations
1. **No torrent support** - Direct streams only
2. **Single server** - One best stream per episode
3. **Basic search** - No advanced filtering
4. **Session-based** - No user accounts/history

### Known Issues
1. **Geo-restrictions** - Some streams may be region-locked
2. **Player changes** - Website updates may break extraction
3. **Rate limiting** - Heavy usage may trigger blocks
4. **Cache staleness** - Old data if site updates frequently

### Future Improvements
1. **Redis caching** - For distributed deployments
2. **Multi-server** - Multiple stream options
3. **Quality selection** - User-preferred quality
4. **Subtitle support** - If available from source
5. **Resume tracking** - Last watched position
6. **Watchlist sync** - User preferences

---

## Comparison with Similar Addons

### vs AnimeWorld Addon
- ✅ Similar architecture (inspired by)
- ✅ IMDB mapping system
- ✅ TMDB integration
- ➖ Different source (animedisk vs watchanimeworld)
- ➖ Node.js vs Python

### vs Torrent Addons
- ✅ Direct streaming (no downloading)
- ✅ Instant playback
- ✅ No seeding required
- ➖ Depends on website availability
- ➖ May have geo-restrictions

### vs Official Services
- ✅ Free (no subscription)
- ✅ Hindi dubbed content
- ✅ No ads (in Stremio)
- ➖ Limited library
- ➖ Quality varies

---

## Security & Privacy

### What We Collect
- **Nothing** - No user data stored
- **No tracking** - No analytics
- **No logs** - Minimal server logs only

### What We Share
- **Nothing** - Requests go directly to animedisk.me
- **No third parties** - Except TMDB for metadata

### Best Practices
- Use HTTPS for deployment
- Don't log user IPs
- Respect website's robots.txt
- Rate limit requests

---

## Contributing Guidelines

### How to Contribute

1. **Report Issues**
   - Website structure changes
   - Broken streams
   - Missing features

2. **Submit PRs**
   - Bug fixes
   - New features
   - Performance improvements

3. **Improve Docs**
   - Fix typos
   - Add examples
   - Translate to other languages

### Development Setup
```bash
git clone https://github.com/veera590/anime-streaming-addon.git
cd anime-streaming-addon
npm install
npm run dev  # Uses nodemon for auto-reload
npm test     # Run test suite
```

---

## Changelog

### v1.0.0 (Initial Release)
- ✅ Catalog support (TV, Movies, Popular)
- ✅ Meta with TMDB enrichment
- ✅ Stream extraction
- ✅ IMDB mapping
- ✅ Caching system
- ✅ Docker support
- ✅ Deployment guides

---

## Credits & Acknowledgments

### Inspiration
- **anime-world-stremio-addon** by skoruppa
  - Architecture patterns
  - IMDB mapping concept
  - Player extraction approach

### Technologies
- **Stremio Addon SDK** - Core framework
- **TMDB API** - Metadata provider
- **Cheerio** - HTML parsing
- **Axios** - HTTP client
- **node-cache** - Caching layer

### Community
- Stremio developers for the SDK
- Animedisk.me for content hosting
- TMDB for free metadata API

---

## License

MIT License - See LICENSE file for details

Free to use, modify, and distribute. Attribution appreciated but not required.

---

**Built with ❤️ for anime fans worldwide** 🌏
