const axios = require('axios');
const config = require('../config');

async function searchAnime(title) {
  try {
    const response = await axios.get(`${config.TMDB_BASE_URL}/search/tv`, {
      params: {
        api_key: config.TMDB_API_KEY,
        query: title,
        language: 'en-US'
      }
    });
    
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    return null;
  } catch (error) {
    console.error('TMDB search error:', error.message);
    return null;
  }
}

async function getAnimeDetails(tmdbId) {
  try {
    const response = await axios.get(`${config.TMDB_BASE_URL}/tv/${tmdbId}`, {
      params: {
        api_key: config.TMDB_API_KEY,
        language: 'en-US'
      }
    });
    return response.data;
  } catch (error) {
    console.error('TMDB details error:', error.message);
    return null;
  }
}

async function getMovieDetails(title) {
  try {
    const searchResponse = await axios.get(`${config.TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: config.TMDB_API_KEY,
        query: title,
        language: 'en-US'
      }
    });
    
    if (searchResponse.data.results && searchResponse.data.results.length > 0) {
      const movieId = searchResponse.data.results[0].id;
      const detailsResponse = await axios.get(`${config.TMDB_BASE_URL}/movie/${movieId}`, {
        params: {
          api_key: config.TMDB_API_KEY,
          language: 'en-US'
        }
      });
      return detailsResponse.data;
    }
    return null;
  } catch (error) {
    console.error('TMDB movie error:', error.message);
    return null;
  }
}

module.exports = {
  searchAnime,
  getAnimeDetails,
  getMovieDetails
};
