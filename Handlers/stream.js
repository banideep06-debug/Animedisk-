const NodeCache = require('node-cache');
const { fetchPage, extractVideoFromPlayer } = require('../utils/scraper');
const config = require('../config');

const cache = new NodeCache({ stdTTL: config.STREAM_CACHE_TTL });

async function getStream(type, id) {
  const cacheKey = `stream_${type}_${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`Stream cache hit: ${cacheKey}`);
    return cached;
  }

  try {
    const parts = id.split(':');
    const slug = parts[1];
    const episodeNum = parts[2] ? parseInt(parts[2]) : null;

    console.log(`Getting stream for: slug=${slug}, episode=${episodeNum}`);

    // For series, we need to find the episode watch URL
    // For movies, we can go directly
    let watchUrl;
    
    if (episodeNum) {
      // Get the anime page to find the episode link
      const animeUrl = `${config.BASE_URL}/${slug}`;
      const $ = await fetchPage(animeUrl);
      
      // Find the episode link
      let foundEpisode = null;
      
      // Method 1: Look in season blocks
      $('#seasons-block .ss-list a, .detail-infor-content .ss-list a').each((i, element) => {
        const $ep = $(element);
        const epTitle = $ep.attr('title') || $ep.text().trim();
        const epHref = $ep.attr('href');
        
        // Check if this is our episode
        const match = epTitle.match(/(\d+)/);
        if (match && parseInt(match[1]) === episodeNum) {
          foundEpisode = epHref;
          return false; // break
        }
      });
      
      // Method 2: Try direct URL patterns
      if (!foundEpisode) {
        // AnimeDisk might use patterns like /watch/slug-episodeId
        // We need to find the episode's unique ID
        const $episodes = $('.ss-list a, .ep-item a');
        $episodes.each((i, element) => {
          const $ep = $(element);
          const href = $ep.attr('href');
          const dataNumber = $ep.attr('data-number');
          
          if (dataNumber && parseInt(dataNumber) === episodeNum) {
            foundEpisode = href;
            return false;
          }
          
          // Check by position if numbered sequentially
          if (i + 1 === episodeNum) {
            foundEpisode = href;
          }
        });
      }
      
      if (!foundEpisode) {
        console.log(`Episode ${episodeNum} not found for ${slug}`);
        return { streams: [] };
      }
      
      watchUrl = foundEpisode.startsWith('http') ? foundEpisode : `${config.BASE_URL}${foundEpisode}`;
    } else {
      // For movies, the anime page might be the watch page
      watchUrl = `${config.BASE_URL}/${slug}`;
    }

    console.log(`Watch URL: ${watchUrl}`);
    
    // Fetch the watch/episode page
    const $ = await fetchPage(watchUrl);
    const streams = [];
    
    // Extract video players
    const iframes = [];
    
    // Method 1: Find iframes
    $('iframe').each((i, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src && !src.includes('google') && !src.includes('facebook')) {
        const fullSrc = src.startsWith('http') ? src : `https:${src}`;
        iframes.push({
          url: fullSrc,
          name: `Server ${i + 1}`
        });
      }
    });
    
    console.log(`Found ${iframes.length} iframes`);
    
    // Method 2: Look for server links that load players
    $('.server-item, .link-item, .anime_muti_link li').each((i, element) => {
      const $server = $(element);
      const serverId = $server.attr('data-id') || $server.attr('data-video');
      const serverName = $server.text().trim() || `Server ${i + 1}`;
      
      if (serverId) {
        // Store for potential AJAX call
        console.log(`Found server: ${serverName} with ID: ${serverId}`);
      }
    });
    
    // Method 3: Check for direct video sources in page
    $('script').each((i, element) => {
      const scriptContent = $(element).html();
      if (scriptContent) {
        // Look for m3u8 URLs
        const m3u8Match = scriptContent.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
        if (m3u8Match) {
          streams.push({
            title: 'Animedisk | HLS',
            url: m3u8Match[1],
            behaviorHints: {
              notWebReady: false
            }
          });
        }
        
        // Look for mp4 URLs
        const mp4Match = scriptContent.match(/(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/);
        if (mp4Match && !streams.find(s => s.url === mp4Match[1])) {
          streams.push({
            title: 'Animedisk | MP4',
            url: mp4Match[1],
            behaviorHints: {
              notWebReady: false
            }
          });
        }
      }
    });
    
    // Extract video from iframes (limit to first 2 to avoid timeout)
    for (let i = 0; i < Math.min(iframes.length, 2); i++) {
      try {
        const videoUrl = await extractVideoFromPlayer(iframes[i].url);
        if (videoUrl) {
          const quality = videoUrl.includes('1080') ? '1080p' : 
                         videoUrl.includes('720') ? '720p' : 
                         videoUrl.includes('480') ? '480p' : 'HD';
          
          streams.push({
            title: `${iframes[i].name} | ${quality}`,
            url: videoUrl,
            behaviorHints: {
              notWebReady: videoUrl.includes('.m3u8')
            }
          });
          
          console.log(`Extracted video: ${videoUrl.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error(`Error extracting from iframe ${i}:`, error.message);
      }
    }
    
    // Remove duplicates
    const uniqueStreams = streams.filter((stream, index, self) =>
      index === self.findIndex((s) => s.url === stream.url)
    );

    const result = { streams: uniqueStreams };
    
    if (result.streams.length > 0) {
      cache.set(cacheKey, result);
      console.log(`Found ${result.streams.length} streams`);
    } else {
      console.log('No streams found');
    }
    
    return result;
  } catch (error) {
    console.error('Stream error:', error);
    return { streams: [] };
  }
}

module.exports = { getStream };
