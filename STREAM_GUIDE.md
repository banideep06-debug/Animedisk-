# Animedisk Stremio Addon - Stream Extraction Guide

## Overview

This addon now supports **Filemoon server** extraction for streaming content from animedisk.me. The implementation handles both movies and TV series with full episode support.

## How It Works

### 1. **Stream Flow for TV Series**

```
User Request → stream.js → Find Episode URL → Extract Filemoon Player → Unpack JS → Get m3u8 URL
```

**Steps:**
1. Parse the content ID (e.g., `animedisk:demon-slayer:5` for episode 5)
2. Fetch the anime page (`https://animedisk.me/demon-slayer`)
3. Find the specific episode link from the episode list
4. Navigate to the episode watch page
5. Extract Filemoon iframe URL
6. Fetch Filemoon player page
7. Unpack JavaScript to find m3u8 playlist URL
8. Return stream to Stremio

### 2. **Stream Flow for Movies**

```
User Request → stream.js → Movie Page → Extract Filemoon Player → Unpack JS → Get m3u8 URL
```

**Steps:**
1. Parse the content ID (e.g., `animedisk:your-name`)
2. Fetch the movie page (`https://animedisk.me/your-name`)
3. Extract Filemoon iframe URL
4. Fetch Filemoon player page
5. Unpack JavaScript to find m3u8 playlist URL
6. Return stream to Stremio

## Key Features

### ✅ Filemoon Server Support
- Primary server for animedisk.me
- Handles packed/obfuscated JavaScript
- Extracts HLS (m3u8) streams
- Supports nested iframes

### ✅ Episode Detection
Multiple methods to find episodes:
- `data-number` attribute
- `data-id` attribute
- Episode title parsing
- URL pattern matching

### ✅ JavaScript Unpacking
Handles `eval(function(p,a,c,k,e,d))` packed code:
```javascript
// Packed code example:
eval(function(p,a,c,k,e,d){...}('payload',62,100,'split|string|...'.split('|')))

// Unpacks to reveal:
file:"https://example.com/playlist.m3u8"
```

### ✅ Fallback Mechanisms
If Filemoon fails, tries:
1. Other embedded iframes
2. Direct video sources
3. Alternative servers

## File Structure

```
Handlers/
  └── stream.js          # Main stream handler
Utils/
  └── scraper.js         # Video extraction utilities
config.js                # Configuration
```

## Code Highlights

### stream.js - Main Handler

```javascript
async function getStream(type, id) {
  // 1. Parse content ID
  const parts = id.split(':');
  const slug = parts[1];
  const episodeNum = parts[2] ? parseInt(parts[2]) : null;

  // 2. Find watch URL (different for series vs movies)
  let watchUrl;
  if (type === 'series' && episodeNum) {
    // Find specific episode URL
    watchUrl = await findEpisodeUrl(slug, episodeNum);
  } else {
    // Direct movie URL
    watchUrl = `${config.BASE_URL}/${slug}`;
  }

  // 3. Extract Filemoon servers
  const filemoonServers = extractFilemoonServers(watchUrl);

  // 4. Extract video URLs
  const streams = await extractStreams(filemoonServers);

  return { streams };
}
```

### scraper.js - Filemoon Extraction

```javascript
async function extractFilemoonVideo(playerUrl) {
  // 1. Fetch player page
  const response = await axios.get(playerUrl);
  
  // 2. Handle nested iframes
  if (hasNestedIframe) {
    return extractFromFilemoonPage(nestedIframeContent);
  }
  
  // 3. Extract from current page
  return extractFromFilemoonPage(response.data);
}

async function extractFromFilemoonPage(html) {
  // 1. Find packed JavaScript
  const packedJs = findPackedJs(html);
  
  // 2. Unpack it
  const unpacked = unpackJs(packedJs);
  
  // 3. Extract m3u8 URL
  const m3u8Url = extractM3u8Url(unpacked);
  
  return { url: m3u8Url, quality: 'Auto' };
}
```

## Testing

### Test a Movie
```bash
curl "http://localhost:7000/stream/movie/animedisk:your-name.json"
```

### Test a TV Series Episode
```bash
curl "http://localhost:7000/stream/series/animedisk:demon-slayer:5.json"
```

### Expected Response
```json
{
  "streams": [
    {
      "title": "Filemoon | Auto",
      "url": "https://example.com/playlist.m3u8",
      "behaviorHints": {
        "notWebReady": true
      }
    }
  ]
}
```

## Debugging

### Enable Detailed Logs
The code includes extensive logging:

```javascript
console.log(`Getting stream for: type=${type}, slug=${slug}, episode=${episodeNum}`);
console.log(`Watch URL: ${watchUrl}`);
console.log(`Found ${filemoonServers.length} Filemoon servers`);
console.log(`Extracting from Filemoon server: ${server.url}`);
console.log(`Found packed JavaScript, unpacking...`);
console.log(`Found m3u8 URL: ${m3u8Match[1]}`);
```

### Common Issues

**1. No streams found**
- Check if Filemoon iframe exists on the page
- Verify JavaScript unpacking is working
- Check network connectivity

**2. Episode not found**
- Verify episode number is correct
- Check episode list selectors
- Ensure anime page loads properly

**3. Unpacking fails**
- Filemoon may have changed their packing method
- Check for new JavaScript patterns
- Update unpacking logic

## Comparison with AnimeWorld India Addon

| Feature | AnimeWorld India | Animedisk |
|---------|-----------------|-----------|
| Server | Zephyrflick (Multicloud) | Filemoon |
| Extraction | API-based | JavaScript unpacking |
| Language | Python | Node.js |
| Complexity | Medium | Medium-High |
| Reliability | High | High |

## Advanced Configuration

### Adjust Cache TTL
```javascript
// config.js
STREAM_CACHE_TTL: 600, // 10 minutes (increase for better performance)
```

### Add More Servers
```javascript
// stream.js - Add support for additional servers
const otherServers = iframes.filter(iframe => 
  iframe.url.includes('yourserver') // Add your server domain
);
```

### Custom Episode Selectors
```javascript
// stream.js - Add custom selectors for episode detection
const episodeSelectors = [
  '#seasons-block .ss-list a',
  '.your-custom-selector', // Add your selector
];
```

## Performance Optimization

1. **Caching**: Streams are cached for 10 minutes
2. **Parallel Processing**: Multiple servers can be tried simultaneously
3. **Early Exit**: Stops after finding first working stream
4. **Timeout**: 15-second timeout prevents hanging

## Security Considerations

1. **User-Agent Spoofing**: Mimics real browser
2. **Referer Headers**: Proper referer to avoid blocking
3. **Rate Limiting**: Built-in delays to avoid detection
4. **Error Handling**: Graceful failures without exposing internals

## Future Improvements

- [ ] Add support for multiple quality options (1080p, 720p, 480p)
- [ ] Implement subtitle extraction
- [ ] Add support for additional servers (not just Filemoon)
- [ ] Improve episode detection accuracy
- [ ] Add retry logic for failed extractions
- [ ] Implement proxy support for geo-restricted content

## Credits

- **Base Addon**: Inspired by [AnimeWorld India Stremio Addon](https://github.com/skoruppa/anime-world-stremio-addon)
- **Filemoon Extraction**: Based on [MoonGetter](https://github.com/darkryh/MoonGetter) patterns
- **Website**: [animedisk.me](https://animedisk.me)

## License

MIT License - Feel free to use and modify!

---

**Need Help?** Check the logs, they're very detailed! 🚀
