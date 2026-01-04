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
 * Extract ICO3C file_code from animedisk watch page
 * @param {string} html - Watch page HTML
 * @returns {string|null} - file_code or null
 */
function extractIco3cFileCode(html) {
  try {
    // Look for ico3c.com embed with file_code parameter
    const ico3cMatch = html.match(/ico3c\.com\/[^"']*file_code=([a-zA-Z0-9]+)/);
    if (ico3cMatch) {
      console.log(`Found ico3c file_code: ${ico3cMatch[1]}`);
      return ico3cMatch[1];
    }
    
    // Alternative: Look for iframe src
    const $ = cheerio.load(html);
    const iframeSrc = $('iframe[src*="ico3c"]').attr('src');
    if (iframeSrc) {
      const match = iframeSrc.match(/file_code=([a-zA-Z0-9]+)/);
      if (match) {
        console.log(`Found ico3c file_code in iframe: ${match[1]}`);
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting ico3c file_code:', error.message);
    return null;
  }
}

/**
 * Extract m3u8 URL from ICO3C player
 * @param {string} fileCode - ICO3C file code
 * @param {string} referer - Referer URL
 * @returns {Promise<string|null>}
 */
async function extractIco3cVideo(fileCode, referer) {
  try {
    console.log(`Extracting video from ICO3C: ${fileCode}`);
    
    // Build ICO3C API URL
    const apiUrl = `https://ico3c.com/d/?b=view&file_code=${fileCode}&referer=${encodeURIComponent(referer)}`;
    
    console.log(`Fetching ICO3C API: ${apiUrl}`);
    
    const html = await cloudscraper.get({
      uri: apiUrl,
      headers: {
        'Referer': referer,
        'User-Agent': config.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    // Look for m3u8 URL in response
    const m3u8Match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
    if (m3u8Match) {
      console.log(`Found m3u8 URL: ${m3u8Match[1]}`);
      return m3u8Match[1];
    }
    
    // Look for master.m3u8 specifically
    const masterMatch = html.match(/(https?:\/\/[^"'\s]+\/master\.m3u8[^"'\s]*)/);
    if (masterMatch) {
      console.log(`Found master.m3u8 URL: ${masterMatch[1]}`);
      return masterMatch[1];
    }
    
    // Look in script tags
    const $ = cheerio.load(html);
    const scripts = $('script').map((i, el) => $(el).html()).get();
    
    for (const script of scripts) {
      const scriptM3u8 = script.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
      if (scriptM3u8) {
        console.log(`Found m3u8 in script: ${scriptM3u8[1]}`);
        return scriptM3u8[1];
      }
    }
    
    console.log('No m3u8 URL found in ICO3C response');
    return null;
    
  } catch (error) {
    console.error('Error extracting ICO3C video:', error.message);
    return null;
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
    
    return null;
  } catch (error) {
    console.error('Error extracting from Filemoon page:', error.message);
    return null;
  }
}

/**
 * Generic video extractor for various player types
 * Now supports ICO3C as primary method
 * @param {string} watchUrl - AnimeDisk watch page URL
 * @returns {Promise<string|null>}
 */
async function extractVideoFromPlayer(watchUrl) {
  try {
    console.log(`Extracting video from watch page: ${watchUrl}`);
    
    // Fetch the watch page with Cloudflare bypass
    const html = await cloudscraper.get({
      uri: watchUrl,
      headers: {
        'Referer': config.BASE_URL,
        'User-Agent': config.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    // Method 1: Try ICO3C extraction (primary method for animedisk)
    const fileCode = extractIco3cFileCode(html);
    if (fileCode) {
      const m3u8Url = await extractIco3cVideo(fileCode, watchUrl);
      if (m3u8Url) {
        return m3u8Url;
      }
    }
    
    // Method 2: Try Filemoon extraction (fallback)
    const $ = cheerio.load(html);
    const filemoonIframe = $('iframe[src*="filemoon"]').attr('src');
    if (filemoonIframe) {
      const fullUrl = filemoonIframe.startsWith('http') ? filemoonIframe : `https:${filemoonIframe}`;
      const result = await extractFilemoonVideo(fullUrl);
      if (result) {
        return result.url;
      }
    }
    
    // Method 3: Look for any m3u8 URLs in the page
    const m3u8Match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
    if (m3u8Match) {
      console.log(`Found direct m3u8 in watch page: ${m3u8Match[1]}`);
      return m3u8Match[1];
    }
    
    console.log('No video URL found');
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
  extractIco3cFileCode,
  extractIco3cVideo,
  extractDataId
};
