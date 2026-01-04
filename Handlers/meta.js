const NodeCache = require('node-cache');
const { fetchPage, extractDataId } = require('../utils/scraper');
const { searchAnime, getAnimeDetails } = require('../utils/tmdb');
const config = require('../config');

const cache = new NodeCache({ stdTTL: config.DETAILS_CACHE_TTL });

async function getMeta(type, id) {
  const cacheKey = `meta_${type}_${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`Cache hit: ${cacheKey}`);
    return cached;
  }

  try {
    const slug = id.replace('animedisk:', '');
    console.log(`Fetching meta for slug: ${slug}`);
    
    const url = `${config.BASE_URL}/${slug}`;
    const $ = await fetchPage(url);
    
    // Extract basic info
    const title = $('.anisc-detail .film-name, h1.heading-name, .anime-title').first().text().trim() ||
                  $('.film-name').first().text().trim() ||
                  $('h1').first().text().trim();
    
    const description = $('.description, .film-description, .anisc-detail .text').first().text().trim() ||
                       $('.anisc-info .text').first().text().trim() ||
                       'No description available';
    
    // Extract poster - prioritize TMDB images if available
    let poster = $('.film-poster img, .anisc-poster img').attr('data-src') || 
                 $('.film-poster img, .anisc-poster img').attr('src') ||
                 $('meta[property="og:image"]').attr('content');
    
    if (poster && !poster.startsWith('http')) {
      poster = `${config.BASE_URL}${poster}`;
    }
    
    // Try to get TMDB data for better metadata
    let tmdbData = null;
    if (title) {
      tmdbData = await searchAnime(title);
    }
    
    const meta = {
      id: id,
      type: type,
      name: title || 'Unknown Title',
      poster: tmdbData && tmdbData.poster_path 
        ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
        : (poster || 'https://via.placeholder.com/300x450?text=No+Poster'),
      posterShape: 'poster',
      background: tmdbData && tmdbData.backdrop_path
        ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`
        : undefined,
      description: tmdbData ? tmdbData.overview : description,
      releaseInfo: tmdbData ? tmdbData.first_air_date : $('.film-stats .tick-item').first().text().trim() || undefined,
      imdbRating: tmdbData ? tmdbData.vote_average : undefined,
      genres: $('.item.item-list a').map((i, el) => $(el).text().trim()).get()
    };

    // Extract episodes for series
    if (type === 'series') {
      const videos = [];
      
      // Look for episode list containers
      const episodeContainers = $('#seasons-block .ss-list a, .detail-infor-content .ss-list a, .ep-item a, .ss-choice a');
      
      console.log(`Found ${episodeContainers.length} episode elements`);
      
      episodeContainers.each((i, element) => {
        try {
          const $ep = $(element);
          const epTitle = $ep.attr('title') || $ep.text().trim();
          const epHref = $ep.attr('href');
          const dataId = extractDataId($ep) || $ep.attr('data-number');
          
          // Try to extract episode number
          let episodeNum = null;
          
          // Method 1: From data attributes
          if (dataId) {
            episodeNum = parseInt(dataId.match(/\d+/)?.[0]);
          }
          
          // Method 2: From title/text
          if (!episodeNum) {
            const match = epTitle.match(/(?:episode|ep|e)\s*(\d+)/i);
            if (match) {
              episodeNum = parseInt(match[1]);
            }
          }
          
          // Method 3: From URL
          if (!episodeNum && epHref) {
            const urlMatch = epHref.match(/(\d+)$/);
            if (urlMatch) {
              episodeNum = parseInt(urlMatch[1]);
            }
          }
          
          if (episodeNum && epHref) {
            videos.push({
              id: `${id}:${episodeNum}`,
              title: `Episode ${episodeNum}`,
              episode: episodeNum,
              season: 1,
              released: new Date().toISOString(),
              overview: epTitle,
              // Store the full watch URL or data-id for stream handler
              _watchUrl: epHref.startsWith('http') ? epHref : `${config.BASE_URL}${epHref}`,
              _dataId: dataId
            });
          }
        } catch (err) {
          console.error('Error parsing episode:', err);
        }
      });
      
      // If no episodes found, try alternative selectors
      if (videos.length === 0) {
        $('.list-ep a, .eps-list a').each((i, element) => {
          try {
            const $ep = $(element);
            const epNum = $ep.attr('data-number') || (i + 1);
            const epHref = $ep.attr('href');
            
            if (epHref) {
              videos.push({
                id: `${id}:${epNum}`,
                title: `Episode ${epNum}`,
                episode: parseInt(epNum),
                season: 1,
                released: new Date().toISOString(),
                _watchUrl: epHref.startsWith('http') ? epHref : `${config.BASE_URL}${epHref}`
              });
            }
          } catch (err) {
            console.error('Error parsing episode (alt):', err);
          }
        });
      }

      meta.videos = videos.sort((a, b) => a.episode - b.episode);
      console.log(`Found ${meta.videos.length} episodes`);
    }

    const result = { meta };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Meta error:', error);
    return { meta: null };
  }
}

module.exports = { getMeta };
