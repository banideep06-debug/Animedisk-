const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config');

const axiosInstance = axios.create({
  headers: {
    'User-Agent': config.USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': config.BASE_URL,
    'Connection': 'keep-alive'
  },
  timeout: 15000
});

async function fetchPage(url) {
  try {
    console.log(`Fetching: ${url}`);
    const response = await axiosInstance.get(url);
    return cheerio.load(response.data);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

async function extractVideoFromPlayer(playerUrl) {
  try {
    console.log(`Extracting video from player: ${playerUrl}`);
    
    // Fetch the player page
    const response = await axiosInstance.get(playerUrl, {
      headers: {
        'Referer': config.BASE_URL,
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    const html = response.data;
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
  extractDataId,
  axiosInstance
};
