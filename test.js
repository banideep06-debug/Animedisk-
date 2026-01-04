// Test script to verify addon functionality
const { getCatalog } = require('./handlers/catalog');
const { getMeta } = require('./handlers/meta');
const { getStream } = require('./handlers/stream');

async function testAddon() {
  console.log('🧪 Testing Animedisk Addon\n');
  
  // Test 1: Catalog
  console.log('📚 Test 1: Fetching TV Series Catalog...');
  try {
    const catalogResult = await getCatalog('series', 'animedisk-anime', {});
    console.log(`✅ Found ${catalogResult.metas.length} anime series`);
    
    if (catalogResult.metas.length > 0) {
      console.log('\nSample anime:');
      catalogResult.metas.slice(0, 3).forEach((meta, i) => {
        console.log(`  ${i + 1}. ${meta.name} (ID: ${meta.id})`);
      });
      
      // Use first anime for further tests
      const testAnime = catalogResult.metas[0];
      console.log(`\n🎯 Using "${testAnime.name}" for detailed tests...\n`);
      
      // Test 2: Meta
      console.log('📝 Test 2: Fetching Anime Metadata...');
      try {
        const metaResult = await getMeta('series', testAnime.id);
        
        if (metaResult.meta) {
          console.log(`✅ Got metadata for: ${metaResult.meta.name}`);
          console.log(`   Description: ${metaResult.meta.description.substring(0, 100)}...`);
          console.log(`   Poster: ${metaResult.meta.poster.substring(0, 50)}...`);
          console.log(`   Episodes: ${metaResult.meta.videos ? metaResult.meta.videos.length : 0}`);
          
          // Test 3: Stream
          if (metaResult.meta.videos && metaResult.meta.videos.length > 0) {
            const testEpisode = metaResult.meta.videos[0];
            console.log(`\n🎬 Test 3: Fetching Stream for Episode ${testEpisode.episode}...`);
            
            try {
              const streamResult = await getStream('series', testEpisode.id);
              console.log(`✅ Found ${streamResult.streams.length} stream(s)`);
              
              if (streamResult.streams.length > 0) {
                console.log('\nStream details:');
                streamResult.streams.forEach((stream, i) => {
                  console.log(`  ${i + 1}. ${stream.title}`);
                  console.log(`     URL: ${stream.url.substring(0, 60)}...`);
                });
              } else {
                console.log('⚠️  No streams found for this episode');
              }
            } catch (error) {
              console.error('❌ Stream test failed:', error.message);
            }
          } else {
            console.log('\n⚠️  No episodes found, skipping stream test');
          }
        } else {
          console.log('❌ No metadata found');
        }
      } catch (error) {
        console.error('❌ Meta test failed:', error.message);
      }
    } else {
      console.log('⚠️  No anime found in catalog');
    }
  } catch (error) {
    console.error('❌ Catalog test failed:', error.message);
  }
  
  // Test 4: Movies
  console.log('\n🎥 Test 4: Fetching Movies Catalog...');
  try {
    const movieCatalog = await getCatalog('movie', 'animedisk-movies', {});
    console.log(`✅ Found ${movieCatalog.metas.length} anime movies`);
    
    if (movieCatalog.metas.length > 0) {
      console.log('\nSample movies:');
      movieCatalog.metas.slice(0, 3).forEach((meta, i) => {
        console.log(`  ${i + 1}. ${meta.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Movie catalog test failed:', error.message);
  }
  
  console.log('\n✨ Tests completed!\n');
  console.log('💡 Tips:');
  console.log('   - If catalog is empty, animedisk.me structure may have changed');
  console.log('   - If no streams found, check video player extraction logic');
  console.log('   - Check server logs for detailed error messages');
}

// Run tests
testAddon().catch(console.error);
