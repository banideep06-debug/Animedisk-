const axios = require('axios');
const config = require('../config');
const db = require('./database');

// Cache for TMDB API calls
const searchCache = {};

async function getImdbIdFromTmdb(tmdbId, contentType) {
  try {
    const mediaType = contentType === 'series' ? 'tv' : 'movie';
    const url = `${config.TMDB_BASE_URL}/${mediaType}/${tmdbId}/external_ids`;
    
    const response = await axios.get(url, {
      params: { api_key: config.TMDB_API_KEY },
      timeout: 10000
    });
    
    return response.data.imdb_id || null;
  } catch (error) {
    console.error('Error getting IMDB ID from TMDB:', error.message);
    return null;
  }
}

async function getTmdbDetailsFromImdb(imdbId) {
  try {
    const url = `${config.TMDB_BASE_URL}/find/${imdbId}`;
    
    const response = await axios.get(url, {
      params: {
        api_key: config.TMDB_API_KEY,
        external_source: 'imdb_id'
      },
      timeout: 10000
    });
    
    const data = response.data;
    
    if (data.movie_results && data.movie_results.length > 0) {
      return { ...data.movie_results[0], media_type: 'movie' };
    } else if (data.tv_results && data.tv_results.length > 0) {
      return { ...data.tv_results[0], media_type: 'series' };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting TMDB details from IMDB:', error.message);
    return null;
  }
}

async function searchAnimedisk(title) {
  try {
    const searchUrl = `${config.BASE_URL}/search?keyword=${encodeURIComponent(title)}`;
    const { fetchPage } = require('./scraper');
    const $ = await fetchPage(searchUrl);
    
    const results = [];
    
    $('.flw-item, .film_list-wrap .flw-item').each((i, element) => {
      const $el = $(element);
      const $link = $el.find('.film-poster a, .film-name a').first();
      const href = $link.attr('href');
      const itemTitle = $link.attr('title') || $el.find('.film-name').text().trim();
      const $poster = $el.find('.film-poster img');
      const poster = $poster.attr('data-src') || $poster.attr('src');
      
      if (href && itemTitle) {
        const slug = href.replace(/^\//, '').split('/').pop().split('?')[0];
        results.push({
          title: itemTitle,
          slug: slug,
          poster: poster,
          type: href.includes('/movie/') ? 'movie' : 'series'
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error searching animedisk:', error.message);
    return [];
  }
}

function matchByPoster(tmdbPosterPath, searchResults) {
  if (!tmdbPosterPath) return null;
  
  for (const result of searchResults) {
    if (result.poster && result.poster.includes(tmdbPosterPath)) {
      return result;
    }
  }
  
  return null;
}

async function getOrCreateImdbMapping(slug, title, contentType, posterUrl) {
  // Check if mapping exists
  const existing = db.getMapping(slug);
  if (existing) {
    console.log(`Found existing mapping for ${slug}: ${existing[1]}`);
    return existing[1]; // Return IMDB ID
  }
  
  // Search TMDB for the title
  const { searchAnime } = require('./tmdb');
  const tmdbResult = await searchAnime(title);
  
  if (!tmdbResult) {
    console.log(`No TMDB result for: ${title}`);
    return null;
  }
  
  const tmdbId = tmdbResult.id.toString();
  const imdbId = await getImdbIdFromTmdb(tmdbId, contentType);
  
  if (imdbId) {
    db.setMapping(slug, tmdbId, imdbId);
    console.log(`Created new mapping: ${slug} -> ${imdbId}`);
    return imdbId;
  }
  
  console.log(`No IMDB ID found for TMDB ${tmdbId}`);
  return null;
}

async function getOrCreateSlugMapping(imdbId) {
  // Check if we already tried and failed
  if (db.isFailedMapping(imdbId)) {
    console.log(`Previously failed mapping for: ${imdbId}`);
    return null;
  }
  
  // Check if mapping exists
  const existingSlug = db.getSlugByImdb(imdbId);
  if (existingSlug) {
    console.log(`Found existing slug for ${imdbId}: ${existingSlug}`);
    return existingSlug;
  }
  
  // Get TMDB details from IMDB ID
  const tmdbDetails = await getTmdbDetailsFromImdb(imdbId);
  if (!tmdbDetails) {
    db.addFailedMapping(imdbId);
    return null;
  }
  
  const title = tmdbDetails.title || tmdbDetails.name;
  const posterPath = tmdbDetails.poster_path;
  const tmdbId = tmdbDetails.id.toString();
  
  if (!title) {
    db.addFailedMapping(imdbId);
    return null;
  }
  
  console.log(`Searching animedisk for: ${title}`);
  
  // Search on Animedisk
  const searchResults = await searchAnimedisk(title);
  if (searchResults.length === 0) {
    console.log(`No results on animedisk for: ${title}`);
    db.addFailedMapping(imdbId);
    return null;
  }
  
  // Try to match by poster
  let matched = matchByPoster(posterPath, searchResults);
  
  // If no poster match, take first result
  if (!matched && searchResults.length > 0) {
    matched = searchResults[0];
  }
  
  if (matched) {
    const slug = matched.slug;
    db.setMapping(slug, tmdbId, imdbId);
    console.log(`Created slug mapping: ${imdbId} -> ${slug}`);
    return slug;
  }
  
  db.addFailedMapping(imdbId);
  return null;
}

module.exports = {
  getOrCreateImdbMapping,
  getOrCreateSlugMapping,
  getImdbIdFromTmdb,
  getTmdbDetailsFromImdb
};
