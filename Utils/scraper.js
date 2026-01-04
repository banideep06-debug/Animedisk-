const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const config = require('../config');

/**
 * Fetch page with Cloudflare bypass
 * Uses cloudscraper to handle Cloudflare protection
 */
async function fetchPage(url) {
  try {
    console.log(`Fetching (with CF bypass): ${url}`);
    const html = await cloudscraper.get({
      uri: url,
      headers: {
        'User-Agent': config.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    return cheerio.load(html);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

/**
 * JavaScript unpacker for packed/obfuscated code
 * Handles p,a,c,k,e,d format commonly used by video players
 */
function unpackJs(packedCode) {
  try {
    // Find packed code pattern
    const packedMatch = packedCode.match(/eval\(function\(p,a,c,k,e,d\).*?\}\((.*?)\)\)/s);
    if (!packedMatch) return null;

    // Extract parameters
    const params = packedMatch[1].split(',');
    if (params.length < 6) return null;

    // Parse the packed data
    const payload = params[0].replace(/^['"]|['"]$/g, '');
    const radix = parseInt(params[1]);
    const count = parseInt(params[2]);
    const symtab = params[3].replace(/^['"]|['"]$/g, '').split('|');
    
    // Unpack function
    const unpack = (p, a, c, k) => {
      while (c--) {
        if (k[c]) {
          const regex = new RegExp('\\b' + c.toString(a) + '\\b', 'g');
          p = p.replace(regex, k[c]);
        }
      }
      return p;
    };

    return unpack(payload, radix, count, symtab);
  } catch (error) {
    console.error('Error unpacking JS:', error.message);
    return null;
  }
}

/**
 * Extract video URL from Filemoon player
 * Filemoon uses packed JavaScript that contains the m3u8 playlist URL
 * 
 * @param {string} playerUrl - Filemoon player URL
 * @returns {Promise<{url: string, quality: string}|null>}
 */
async function extractFilemoonVideo(playerUrl) {
  try {
    console.log(`Extracting video from Filemoon: ${playerUrl}`);
    
    // Fetch the player page with Cloudflare bypass
    const html = await cloudscraper.get({
      uri: playerUrl,
      headers: {
        'Referer': config.BASE_URL,
        'User-Agent': config.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const $ = cheerio.load(html);
    
    // Method 1: Look for iframe redirect (Filemoon often uses nested iframes)
    const iframe = $('iframe').attr('src');
    if (iframe && iframe.includes('filemoon')) {
      const iframeSrc = iframe.startsWith('http') ? iframe : (iframe.startsWith('//') ? `https:${iframe}` : `https://filemoon.sx${iframe}`);
      console.log(`Found nested Filemoon iframe: ${iframeSrc}`);
      
      // Fetch the nested iframe
      const iframeHtml = await cloudscraper.get({
        uri: iframeSrc,
        headers: {
          'Referer': playerUrl,
          'User-Agent': config.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      return await extractFromFilemoonPage(iframeHtml, iframeSrc);
    }
    
    // Method 2: Extract directly from current page
    return await extractFromFilemoonPage(html, playerUrl);
    
  } catch (error) {
    console.error('Error extracting Filemoon video:', error.message);
    return null;
  }
}

/**
 * Extract video URL from Filemoon page HTML
 * @param {string} html - Page HTML content
 * @param {string} referer - Referer URL
 * @returns {Promise<{url: string, quality: string}|null>}
 */
async function extractFromFilemoonPage(html, referer) {
  try {
    // Method 1: Find and unpack JavaScript
    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
    
    if (scriptMatches) {
      for (const scriptTag of scriptMatches) {
        const scriptContent = scriptTag.replace(/<script[^>]*>|<\/script>/g, '');
        
        // Look for packed JavaScript (eval(function(p,a,c,k,e,d)))
        if (scriptContent.includes('eval(function(p,a,c,k,e,d)')) {
          console.log('Found packed JavaScript, unpacking...');
          const unpacked = unpackJs(scriptContent);
          
          if (unpacked) {
            // Look for m3u8 URL in unpacked code
            const m3u8Match = unpacked.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
            if (m3u8Match) {
              console.log(`Found m3u8 URL: ${m3u8Match[1]}`);
              return {
                url: m3u8Match[1],
                quality: 'Auto'
              };
            }
            
            // Look for file property
            const fileMatch = unpacked.match(/file:"([^"]+)"/);
            if (fileMatch) {
              console.log(`Found file URL: ${fileMatch[1]}`);
              return {
                url: fileMatch[1],
                quality: 'Auto'
              };
            }
          }
        }
        
        // Method 2: Look for direct m3u8 URLs in non-packed scripts
        const m3u8Match = scriptContent.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
        if (m3u8Match) {
          console.log(`Found direct m3u8 URL: ${m3u8Match[1]}`);
          return {
            url: m3u8Match[1],
            quality: 'Auto'
          };
        }
        
        // Method 3: Look for sources array
        const sourcesMatch = scriptContent.match(/sources?\s*:\s*\[?\s*{\s*file\s*:\s*["']([^"']+)["']/);
        if (sourcesMatch) {
          console.log(`Found sources URL: ${sourcesMatch[1]}`);
          return {
            url: sourcesMatch[1],
            quality: 'Auto'
          };
        }
      }
    }
    
    // Method 4: Look for video/source tags
    const $ = cheerio.load(html);
    const videoSrc = $('video source').attr('src') || $('video').attr('src');
    if (videoSrc) {
      const fullSrc = videoSrc.startsWith('http') ? videoSrc : `https://filemoon.sx${videoSrc}`;
      console.log(`Found video source tag: ${fullSrc}`);
      return {
        url: fullSrc,
        quality: 'Auto'
      };
    }
    
    // Method 5: Look for API calls in scripts
    const apiMatch = html.match(/\$\.ajax\s*\(\s*{\s*url\s*:\s*["']([^"']+)["']/);
    if (apiMatch) {
      console.log(`Found AJAX API call: ${apiMatch[1]}`);
      try {
        const apiUrl = apiMatch[1].startsWith('http') ? apiMatch[1] : `https://filemoon.sx${apiMatch[1]}`;
        const apiResponse = await cloudscraper.get({
          uri: apiUrl,
          headers: {
            'Referer': referer,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': config.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          json: true
        });
        
        if (apiResponse && apiResponse.file) {
          return {
            url: apiResponse.file,
            quality: 'Auto'
          };
        }
      } catch (error) {
        console.error('Error fetching API:', error.message);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting from Filemoon page:', error.message);
    return null;
  }
}

/**
 * Generic video extractor for various player types
 * @param {string} playerUrl - Player URL
 * @returns {Promise<string|null>}
 */
async function extractVideoFromPlayer(playerUrl) {
  try {
    console.log(`Extracting video from player: ${playerUrl}`);
    
    // Check if it's a Filemoon player
    if (playerUrl.includes('filemoon') || playerUrl.includes('moonplayer') || playerUrl.includes('fmoonembed')) {
      const result = await extractFilemoonVideo(playerUrl);
      return result ? result.url : null;
    }
    
    // Fetch the player page with Cloudflare bypass
    const html = await cloudscraper.get({
      uri: playerUrl,
      headers: {
        'Referer': config.BASE_URL,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': config.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(html);
    
    // Method 1: Check for API endpoints (common in anime sites)
    const scriptTags = $('script').map((i, el) => $(el).html()).get();
    
    for (const script of scriptTags) {
      // Look for video sources in JavaScript
      const sourceMatch = script.match(/sources?\s*:\s*\[?\s*{[^}]*file\s*:\s*["']([^"']+)["']/i);
      if (sourceMatch) {
        return sourceMatch[1];
      }
      
      // Look for direct m3u8 URLs
      const m3u8Match = script.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
      if (m3u8Match) {
        return m3u8Match[1];
      }
      
      // Look for mp4 URLs
      const mp4Match = script.match(/(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/);
      if (mp4Match) {
        return mp4Match[1];
      }
    }
    
    // Method 2: Look in HTML
    const m3u8MatchHtml = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
    if (m3u8MatchHtml) {
      return m3u8MatchHtml[1];
    }
    
    const mp4MatchHtml = html.match(/(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/);
    if (mp4MatchHtml) {
      return mp4MatchHtml[1];
    }
    
    // Method 3: Check for video/source tags
    const videoSrc = $('video source').attr('src') || $('video').attr('src');
    if (videoSrc) {
      return videoSrc.startsWith('http') ? videoSrc : `${config.BASE_URL}${videoSrc}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting video URL:', error.message);
    return null;
  }
}

// AnimeDisk specific: Extract data-id from episodes
function extractDataId(element) {
  return element.attr('data-id') || 
         element.attr('data-episode-id') || 
         element.attr('data-linkid');
}

module.exports = {
  fetchPage,
  extractVideoFromPlayer,
  extractFilemoonVideo,
  extractDataId
};
