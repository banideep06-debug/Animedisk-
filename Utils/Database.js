const NodeCache = require('node-cache');

// In-memory database using node-cache
// For production, consider using Redis or a real database
const mappingCache = new NodeCache({ stdTTL: 0 }); // No expiration for mappings
const failedMappings = new NodeCache({ stdTTL: 3600 }); // 1 hour for failed attempts

class Database {
  // Store slug -> IMDB mapping
  setMapping(slug, tmdbId, imdbId) {
    const key = `map_slug_${slug}`;
    mappingCache.set(key, { slug, tmdbId, imdbId });
    
    // Also store reverse mapping (IMDB -> slug)
    const reverseKey = `map_imdb_${imdbId}`;
    mappingCache.set(reverseKey, { slug, tmdbId, imdbId });
    
    console.log(`Stored mapping: ${slug} <-> ${imdbId}`);
  }
  
  // Get mapping by slug
  getMapping(slug) {
    const key = `map_slug_${slug}`;
    const data = mappingCache.get(key);
    if (data) {
      return [data.slug, data.imdbId, data.tmdbId];
    }
    return null;
  }
  
  // Get slug by IMDB ID
  getSlugByImdb(imdbId) {
    const key = `map_imdb_${imdbId}`;
    const data = mappingCache.get(key);
    return data ? data.slug : null;
  }
  
  // Check if IMDB ID mapping failed before
  isFailedMapping(imdbId) {
    return failedMappings.has(`failed_${imdbId}`);
  }
  
  // Mark IMDB ID as failed
  addFailedMapping(imdbId) {
    failedMappings.set(`failed_${imdbId}`, true);
    console.log(`Marked as failed mapping: ${imdbId}`);
  }
  
  // Get all mappings (for debugging)
  getAllMappings() {
    const keys = mappingCache.keys();
    const mappings = {};
    keys.forEach(key => {
      if (key.startsWith('map_slug_')) {
        mappings[key] = mappingCache.get(key);
      }
    });
    return mappings;
  }
}

module.exports = new Database();
