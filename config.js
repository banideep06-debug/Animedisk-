module.exports = {
  BASE_URL: 'https://animedisk.me',
  TMDB_API_KEY: '23328eee9302ada286e05251e51ca3a0',
  TMDB_BASE_URL: 'https://api.themoviedb.org/3',
  CACHE_TTL: 900, // 15 minutes for catalogs
  STREAM_CACHE_TTL: 600, // 10 minutes for streams
  DETAILS_CACHE_TTL: 1800, // 30 minutes for details
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // URL patterns
  PATTERNS: {
    HOME: '/home',
    TV_LIST: '/list/tv',
    MOVIE_LIST: '/list/movie',
    MOST_POPULAR: '/list/most-popular',
    SEARCH: '/?keyword=',
    ANIME_PAGE: '/{slug}',
    WATCH_PAGE: '/watch/{slug}-{episodeId}'
  }
};
