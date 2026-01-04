const NodeCache = require('node-cache');
const { fetchPage, extractFilemoonVideo } = require('../Utils/scraper');
const config = require('../config');

const cache = new NodeCache({ stdTTL: config.STREAM_CACHE_TTL });

/**
 * Get stream URLs for movies and TV series from AnimeDisk
 * Supports Filemoon server extraction
 * 
 * @param {string} type - Content type ('movie' or 'series')
 * @param {string} id - Content ID in format 'animedisk:slug' or 'animedisk:slug:episodeNum'
 * @returns {Promise<{streams: Array}>} Stream objects for Stremio
 */
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

    console.log(`Getting stream for: type=${type}, slug=${slug}, episode=${episodeNum}`);

    let watchUrl;
    
    if (type === 'series' && episodeNum) {
      // For TV series episodes, we need to find the specific episode watch URL
      const animeUrl = `${config.BASE_URL}/${slug}`;
      console.log(`Fetching anime page: ${animeUrl}`);
      
      const $ = await fetchPage(animeUrl);
      
      // Extract episode links from the page
      let foundEpisode = null;
      
      // Method 1: Look for episode links in various containers
      const episodeSelectors = [
        '#seasons-block .ss-list a',
        '.detail-infor-content .ss-list a',
        '.ss-list a',
        '.ep-item a',
        '.ss-choice a',
        '.list-ep a',
        '.eps-list a',
        '.episode-list a'
      ];
      
      for (const selector of episodeSelectors) {
        if (foundEpisode) break;
        
        $(selector).each((i, element) => {
          const $ep = $(element);
          const epTitle = $ep.attr('title') || $ep.text().trim();
          const epHref = $ep.attr('href');
          const dataNumber = $ep.attr('data-number');
          const dataId = $ep.attr('data-id');
          
          // Try to match episode number
          let epNum = null;
          
          // From data-number attribute
          if (dataNumber) {
            epNum = parseInt(dataNumber);
          }
          // From data-id attribute
          else if (dataId) {
            const match = dataId.match(/\d+/);
            if (match) epNum = parseInt(match[0]);
          }
          // From title/text
          else {
            const match = epTitle.match(/(?:episode|ep|e)\s*(\d+)/i);
            if (match) epNum = parseInt(match[1]);
          }
          // From href URL
          else if (epHref) {
            const urlMatch = epHref.match(/(\d+)$/);
            if (urlMatch) epNum = parseInt(urlMatch[1]);
          }
          
          if (epNum === episodeNum && epHref) {
            foundEpisode = epHref;
            console.log(`Found episode ${episodeNum}: ${epHref}`);
            return false; // break
          }
        });
      }
      
      if (!foundEpisode) {
        console.log(`Episode ${episodeNum} not found for ${slug}`);
        return { streams: [] };
      }
      
      watchUrl = foundEpisode.startsWith('http') ? foundEpisode : `${config.BASE_URL}${foundEpisode}`;
    } else {
      // For movies, the anime page is typically the watch page
      watchUrl = `${config.BASE_URL}/${slug}`;
    }

    console.log(`Watch URL: ${watchUrl}`);
    
    // Fetch the watch/episode page
    const $ = await fetchPage(watchUrl);
    const streams = [];
    
    // Extract server links and iframes
    const serverData = [];
    
    // Method 1: Find server selection buttons/links
    $('.server-item, .link-item, .anime_muti_link li, .ps_-block .ps__-list .item').each((i, element) => {
      const $server = $(element);
      const serverId = $server.attr('data-id') || $server.attr('data-video') || $server.attr('data-linkid');
      const serverName = $server.text().trim() || $server.attr('title') || `Server ${i + 1}`;
      const dataLink = $server.attr('data-link');
      
      if (serverId || dataLink) {
        serverData.push({
          id: serverId,
          name: serverName,
          link: dataLink
        });
        console.log(`Found server: ${serverName} (ID: ${serverId || dataLink})`);
      }
    });
    
    // Method 2: Find iframes directly embedded
    const iframes = [];
    $('iframe').each((i, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src && !src.includes('google') && !src.includes('facebook') && !src.includes('disqus')) {
        const fullSrc = src.startsWith('http') ? src : (src.startsWith('//') ? `https:${src}` : `${config.BASE_URL}${src}`);
        iframes.push({
          url: fullSrc,
          name: `Embedded ${i + 1}`
        });
        console.log(`Found iframe: ${fullSrc}`);
      }
    });
    
    // Method 3: Look for Filemoon links in scripts
    $('script').each((i, element) => {
      const scriptContent = $(element).html();
      if (scriptContent) {
        // Look for Filemoon URLs
        const filemoonMatch = scriptContent.match(/(https?:\/\/[^"'\s]*filemoon[^"'\s]*)/gi);
        if (filemoonMatch) {
          filemoonMatch.forEach(url => {
            if (!iframes.find(f => f.url === url)) {
              iframes.push({
                url: url,
                name: 'Filemoon'
              });
              console.log(`Found Filemoon URL in script: ${url}`);
            }
          });
        }
      }
    });
    
    // Process Filemoon servers
    const filemoonServers = iframes.filter(iframe => 
      iframe.url.includes('filemoon') || 
      iframe.url.includes('moonplayer') ||
      iframe.url.includes('fmoonembed')
    );
    
    console.log(`Found ${filemoonServers.length} Filemoon servers`);
    
    // Extract video from Filemoon servers (prioritize Filemoon)
    for (let i = 0; i < filemoonServers.length; i++) {
      try {
        const server = filemoonServers[i];
        console.log(`Extracting from Filemoon server: ${server.url}`);
        
        const videoData = await extractFilemoonVideo(server.url);
        
        if (videoData && videoData.url) {
          streams.push({
            title: `Filemoon | ${videoData.quality || 'HD'}`,
            url: videoData.url,
            behaviorHints: {
              notWebReady: videoData.url.includes('.m3u8')
            }
          });
          
          console.log(`Successfully extracted Filemoon stream: ${videoData.quality || 'HD'}`);
        }
      } catch (error) {
        console.error(`Error extracting from Filemoon server ${i}:`, error.message);
      }
    }
    
    // If no Filemoon streams found, try other iframes
    if (streams.length === 0) {
      console.log('No Filemoon streams found, trying other servers...');
      
      const otherServers = iframes.filter(iframe => 
        !iframe.url.includes('filemoon') && 
        !iframe.url.includes('moonplayer') &&
        !iframe.url.includes('fmoonembed')
      );
      
      for (let i = 0; i < Math.min(otherServers.length, 2); i++) {
        try {
          const server = otherServers[i];
          console.log(`Trying alternative server: ${server.url}`);
          
          const videoData = await extractFilemoonVideo(server.url);
          
          if (videoData && videoData.url) {
            streams.push({
              title: `${server.name} | ${videoData.quality || 'HD'}`,
              url: videoData.url,
              behaviorHints: {
                notWebReady: videoData.url.includes('.m3u8')
              }
            });
            
            console.log(`Successfully extracted stream from ${server.name}`);
          }
        } catch (error) {
          console.error(`Error extracting from server ${i}:`, error.message);
        }
      }
    }
    
    // Remove duplicates
    const uniqueStreams = streams.filter((stream, index, self) =>
      index === self.findIndex((s) => s.url === stream.url)
    );

    const result = { streams: uniqueStreams };
    
    if (result.streams.length > 0) {
      cache.set(cacheKey, result);
      console.log(`Found ${result.streams.length} unique streams`);
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
