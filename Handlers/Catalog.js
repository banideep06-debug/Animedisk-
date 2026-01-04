const NodeCache = require('node-cache');
const { fetchPage } = require('../utils/scraper');
const config = require('../config');

const cache = new NodeCache({ stdTTL: config.CACHE_TTL });

async function getCatalog(type, id, extra) {
  const cacheKey = `catalog_${type}_${id}_${extra.skip || 0}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`Cache hit: ${cacheKey}`);
    return cached;
  }

  try {
    console.log(`Fetching catalog: type=${type}, id=${id}`);
    let metas = [];
    
    if (type === 'series' && id === 'animedisk-anime') {
      metas = await getAnimeList();
    } else if (type === 'movie' && id === 'animedisk-movies') {
      metas = await getMovieList();
    } else if (id === 'animedisk-popular') {
      metas = await getMostPopular();
    }

    const result = { metas };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Catalog error:', error);
    return { metas: [] };
  }
}

async function getAnimeList() {
  try {
    const url = `${config.BASE_URL}/list/tv`;
    const $ = await fetchPage(url);
    const metas = [];

    // AnimeDisk uses a card-based layout
    $('.flw-item, .film_list-wrap .flw-item, .block_area-content .flw-item').each((i, element) => {
      try {
        const $el = $(element);
        
        // Extract link and title
        const $link = $el.find('.film-poster a, .film-name a').first();
        const href = $link.attr('href');
        const title = $link.attr('title') || $el.find('.film-name').text().trim();
        
        // Extract poster
        const $poster = $el.find('.film-poster img');
        const poster = $poster.attr('data-src') || $poster.attr('src');
        
        if (href && title) {
          // Extract slug from URL
          const slug = href.replace(/^\//, '').split('/').pop().split('?')[0];
          
          // Get episode count if available
          const episodeText = $el.find('.tick-item.tick-eps, .fdi-item').text();
          
          metas.push({
            id: `animedisk:${slug}`,
            type: 'series',
            name: title,
            poster: poster ? (poster.startsWith('http') ? poster : `${config.BASE_URL}${poster}`) : 'https://via.placeholder.com/300x450?text=No+Poster',
            posterShape: 'poster',
            description: episodeText || undefined
          });
        }
      } catch (err) {
        console.error('Error parsing anime item:', err);
      }
    });

    console.log(`Found ${metas.length} anime series`);
    return metas.slice(0, 50); // Limit to 50 items
  } catch (error) {
    console.error('Error fetching anime list:', error);
    return [];
  }
}

async function getMovieList() {
  try {
    const url = `${config.BASE_URL}/list/movie`;
    const $ = await fetchPage(url);
    const metas = [];

    $('.flw-item, .film_list-wrap .flw-item, .block_area-content .flw-item').each((i, element) => {
      try {
        const $el = $(element);
        
        const $link = $el.find('.film-poster a, .film-name a').first();
        const href = $link.attr('href');
        const title = $link.attr('title') || $el.find('.film-name').text().trim();
        
        const $poster = $el.find('.film-poster img');
        const poster = $poster.attr('data-src') || $poster.attr('src');
        
        if (href && title) {
          const slug = href.replace(/^\//, '').split('/').pop().split('?')[0];
          
          metas.push({
            id: `animedisk:${slug}`,
            type: 'movie',
            name: title,
            poster: poster ? (poster.startsWith('http') ? poster : `${config.BASE_URL}${poster}`) : 'https://via.placeholder.com/300x450?text=No+Poster',
            posterShape: 'poster'
          });
        }
      } catch (err) {
        console.error('Error parsing movie item:', err);
      }
    });

    console.log(`Found ${metas.length} movies`);
    return metas.slice(0, 50);
  } catch (error) {
    console.error('Error fetching movie list:', error);
    return [];
  }
}

async function getMostPopular() {
  try {
    const url = `${config.BASE_URL}/list/most-popular`;
    const $ = await fetchPage(url);
    const metas = [];

    $('.flw-item, .film_list-wrap .flw-item, .block_area-content .flw-item').each((i, element) => {
      try {
        const $el = $(element);
        
        const $link = $el.find('.film-poster a, .film-name a').first();
        const href = $link.attr('href');
        const title = $link.attr('title') || $el.find('.film-name').text().trim();
        
        const $poster = $el.find('.film-poster img');
        const poster = $poster.attr('data-src') || $poster.attr('src');
        
        if (href && title) {
          const slug = href.replace(/^\//, '').split('/').pop().split('?')[0];
          const type = href.includes('/movie/') ? 'movie' : 'series';
          
          metas.push({
            id: `animedisk:${slug}`,
            type: type,
            name: title,
            poster: poster ? (poster.startsWith('http') ? poster : `${config.BASE_URL}${poster}`) : 'https://via.placeholder.com/300x450?text=No+Poster',
            posterShape: 'poster'
          });
        }
      } catch (err) {
        console.error('Error parsing popular item:', err);
      }
    });

    console.log(`Found ${metas.length} popular items`);
    return metas.slice(0, 50);
  } catch (error) {
    console.error('Error fetching popular list:', error);
    return [];
  }
}

module.exports = { getCatalog };
