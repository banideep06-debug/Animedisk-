const NodeCache = require('node-cache');
const { fetchPage, extractVideoFromPlayer } = require('../Utils/scraper');
const config = require('../config');

const cache = new NodeCache({ stdTTL: config.STREAM_CACHE_TTL });

/**
 * Get stream URLs for movies and TV series from AnimeDisk
 * Supports ICO3C and Filemoon server extraction
 * 
 * Watch URL format: https://animedisk.me/watch/{anime-id}?ep={episode-id}
 * 
 * @param {string} type - 'movie' or 'series'
 * @param {string} id - Format: 'animedisk:slug:episodeNumber' or 'animedisk:slug'
 * @returns {Promise<{streams: Array}>}
 */
async function getStream(type, id) {
  try {
    // Check cache first
    const cacheKey = `stream_${type}_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

    console.log(`Getting stream for: type=${type}, id=${id}`);

    // Parse the ID
    // Format: animedisk:slug or animedisk:slug:episodeNumber
    // But we need anime-id and episode-id from the actual watch URL
    const parts = id.split(':');
    if (parts[0] !== 'animedisk') {
      console.log('Invalid ID format');
      return { streams: [] };
    }

    const slug = parts[1];
    const episodeNum = parts[2] ? parseInt(parts[2]) : null;

    console.log(`Parsed: slug=${slug}, episodeNum=${episodeNum}`);

    // For animedisk, we need to:
    // 1. First get the anime page to find the anime-id
    // 2. Then construct the watch URL with anime-id and episode-id
    
    // Fetch the anime page
    const animePageUrl = `${config.BASE_URL}/${slug}`;
    console.log(`Fetching anime page: ${animePageUrl}`);
    
    const $ = await fetchPage(animePageUrl);
    
    // Find the watch URL
    // AnimeDisk uses format: /watch/{anime-id}?ep={episode-id}
    let watchUrl = null;
    
    if (type === 'series' && episodeNum) {
      // Find the specific episode
      // Look for episode links with data-number or episode number in text
      const episodeSelectors = [
        `.ss-list a[data-number="${episodeNum}"]`,
        `.ss-list a:contains("Episode ${episodeNum}")`,
        `.ss-list a:contains("Ep ${episodeNum}")`,
        `.ss-list a:contains("${episodeNum}")`,
        `.episode-list a[data-number="${episodeNum}"]`,
        `.ep-item a[data-number="${episodeNum}"]`
      ];
      
      for (const selector of episodeSelectors) {
        const episodeLink = $(selector).first();
        if (episodeLink.length > 0) {
          const href = episodeLink.attr('href');
          if (href) {
            watchUrl = href.startsWith('http') ? href : `${config.BASE_URL}${href}`;
            console.log(`Found episode ${episodeNum} watch URL: ${watchUrl}`);
            break;
          }
        }
      }
      
      // If not found by selector, try finding by index
      if (!watchUrl) {
        const allEpisodes = $('.ss-list a, .episode-list a, .ep-item a');
        if (allEpisodes.length >= episodeNum) {
          const episodeLink = allEpisodes.eq(episodeNum - 1);
          const href = episodeLink.attr('href');
          if (href) {
            watchUrl = href.startsWith('http') ? href : `${config.BASE_URL}${href}`;
            console.log(`Found episode ${episodeNum} by index: ${watchUrl}`);
          }
        }
      }
      
      if (!watchUrl) {
        console.log(`Episode ${episodeNum} not found for ${slug}`);
        return { streams: [] };
      }
    } else {
      // For movies or first episode, get the first watch link
      const firstWatchLink = $('a[href*="/watch/"]').first();
      if (firstWatchLink.length > 0) {
        const href = firstWatchLink.attr('href');
        watchUrl = href.startsWith('http') ? href : `${config.BASE_URL}${href}`;
        console.log(`Found watch URL: ${watchUrl}`);
      } else {
        console.log('No watch URL found');
        return { streams: [] };
      }
    }

    if (!watchUrl) {
      console.log('Could not determine watch URL');
      return { streams: [] };
    }

    // Extract video URL from the watch page
    console.log(`Extracting video from: ${watchUrl}`);
    const videoUrl = await extractVideoFromPlayer(watchUrl);

    if (!videoUrl) {
      console.log('No video URL extracted');
      return { streams: [] };
    }

    // Build stream response
    const streams = [{
      title: 'AnimeDisk | Auto',
      url: videoUrl,
      behaviorHints: {
        notWebReady: true,
        bingeGroup: `animedisk-${slug}`
      }
    }];

    const result = { streams };
    
    // Cache the result
    cache.set(cacheKey, result);
    
    console.log(`Successfully extracted stream for ${id}`);
    return result;

  } catch (error) {
    console.error('Error in getStream:', error);
    return { streams: [] };
  }
}

module.exports = { getStream };
