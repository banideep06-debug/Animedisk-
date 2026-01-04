/**
 * Test script for Animedisk stream extraction
 * Run with: node test-stream.js
 */

const { getStream } = require('./Handlers/stream');

// Test cases
const testCases = [
  {
    name: 'Movie Test',
    type: 'movie',
    id: 'animedisk:your-name',
    description: 'Testing movie stream extraction'
  },
  {
    name: 'Series Episode Test',
    type: 'series',
    id: 'animedisk:demon-slayer:1',
    description: 'Testing TV series episode 1 stream extraction'
  },
  {
    name: 'Series Episode 5 Test',
    type: 'series',
    id: 'animedisk:naruto-shippuden:5',
    description: 'Testing TV series episode 5 stream extraction'
  }
];

async function runTests() {
  console.log('🚀 Starting Animedisk Stream Extraction Tests\n');
  console.log('='.repeat(60));
  
  for (const testCase of testCases) {
    console.log(`\n📺 ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Type: ${testCase.type}`);
    console.log(`   ID: ${testCase.id}`);
    console.log('-'.repeat(60));
    
    try {
      const startTime = Date.now();
      const result = await getStream(testCase.type, testCase.id);
      const duration = Date.now() - startTime;
      
      if (result.streams && result.streams.length > 0) {
        console.log(`✅ SUCCESS - Found ${result.streams.length} stream(s) in ${duration}ms`);
        result.streams.forEach((stream, index) => {
          console.log(`\n   Stream ${index + 1}:`);
          console.log(`   - Title: ${stream.title}`);
          console.log(`   - URL: ${stream.url.substring(0, 80)}...`);
          console.log(`   - Type: ${stream.url.includes('.m3u8') ? 'HLS (m3u8)' : 'Direct'}`);
          console.log(`   - Web Ready: ${!stream.behaviorHints?.notWebReady}`);
        });
      } else {
        console.log(`❌ FAILED - No streams found (${duration}ms)`);
      }
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      console.error(error.stack);
    }
    
    console.log('='.repeat(60));
  }
  
  console.log('\n✨ Tests completed!\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
