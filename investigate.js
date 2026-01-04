/**
 * Animedisk & Filemoon Investigation Script
 * This script helps us understand the actual structure before building the extractor
 * 
 * Usage: node investigate.js <anime-slug> [episode-number]
 * Example: node investigate.js demon-slayer 1
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://animedisk.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const axiosInstance = axios.create({
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
  timeout: 30000
});

// Create investigation output directory
const outputDir = path.join(__dirname, 'investigation_output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function saveToFile(filename, content) {
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`   💾 Saved to: ${filepath}`);
}

async function investigateAnimePage(slug) {
  console.log('\n' + '='.repeat(80));
  console.log('📺 STEP 1: INVESTIGATING ANIME PAGE');
  console.log('='.repeat(80));
  
  const url = `${BASE_URL}/${slug}`;
  console.log(`\n🔗 URL: ${url}`);
  
  try {
    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);
    
    // Save full HTML
    saveToFile(`1_anime_page_${slug}.html`, response.data);
    
    console.log('\n📋 ANIME PAGE ANALYSIS:');
    console.log('-'.repeat(80));
    
    // Title
    const title = $('.anisc-detail .film-name, h1.heading-name, .anime-title').first().text().trim();
    console.log(`   Title: ${title || 'NOT FOUND'}`);
    
    // Episode containers
    console.log('\n   🎬 EPISODE CONTAINERS FOUND:');
    const episodeSelectors = [
      '#seasons-block .ss-list a',
      '.detail-infor-content .ss-list a',
      '.ss-list a',
      '.ep-item a',
      '.ss-choice a',
      '.list-ep a',
      '.eps-list a'
    ];
    
    let episodeLinks = [];
    episodeSelectors.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`   ✅ Found ${elements.length} episodes with selector: ${selector}`);
        
        elements.each((i, el) => {
          const $el = $(el);
          episodeLinks.push({
            href: $el.attr('href'),
            title: $el.attr('title') || $el.text().trim(),
            dataNumber: $el.attr('data-number'),
            dataId: $el.attr('data-id'),
            dataLinkId: $el.attr('data-linkid')
          });
        });
      }
    });
    
    // Save episode data
    saveToFile(`1_episodes_${slug}.json`, JSON.stringify(episodeLinks, null, 2));
    
    console.log(`\n   📊 Total episodes found: ${episodeLinks.length}`);
    if (episodeLinks.length > 0) {
      console.log(`   📝 First 3 episodes:`);
      episodeLinks.slice(0, 3).forEach((ep, i) => {
        console.log(`      ${i + 1}. href: ${ep.href}`);
        console.log(`         title: ${ep.title}`);
        console.log(`         data-number: ${ep.dataNumber || 'N/A'}`);
        console.log(`         data-id: ${ep.dataId || 'N/A'}`);
      });
    }
    
    return episodeLinks;
    
  } catch (error) {
    console.error(`   ❌ ERROR: ${error.message}`);
    return [];
  }
}

async function investigateWatchPage(watchUrl, episodeNum) {
  console.log('\n' + '='.repeat(80));
  console.log('🎥 STEP 2: INVESTIGATING WATCH PAGE');
  console.log('='.repeat(80));
  
  const fullUrl = watchUrl.startsWith('http') ? watchUrl : `${BASE_URL}${watchUrl}`;
  console.log(`\n🔗 URL: ${fullUrl}`);
  
  try {
    const response = await axiosInstance.get(fullUrl);
    const $ = cheerio.load(response.data);
    
    // Save full HTML
    saveToFile(`2_watch_page_ep${episodeNum}.html`, response.data);
    
    console.log('\n📋 WATCH PAGE ANALYSIS:');
    console.log('-'.repeat(80));
    
    // Find all iframes
    console.log('\n   🖼️  IFRAMES FOUND:');
    const iframes = [];
    $('iframe').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        iframes.push({
          index: i,
          src: src,
          id: $(el).attr('id'),
          class: $(el).attr('class')
        });
        console.log(`   ${i + 1}. ${src}`);
        console.log(`      id: ${$(el).attr('id') || 'N/A'}`);
        console.log(`      class: ${$(el).attr('class') || 'N/A'}`);
      }
    });
    
    saveToFile(`2_iframes_ep${episodeNum}.json`, JSON.stringify(iframes, null, 2));
    
    // Find server selection elements
    console.log('\n   🖥️  SERVER SELECTION ELEMENTS:');
    const serverSelectors = [
      '.server-item',
      '.link-item',
      '.anime_muti_link li',
      '.ps_-block .ps__-list .item',
      '[data-id]',
      '[data-video]',
      '[data-linkid]'
    ];
    
    const servers = [];
    serverSelectors.forEach(selector => {
      $(selector).each((i, el) => {
        const $el = $(el);
        servers.push({
          selector: selector,
          text: $el.text().trim(),
          dataId: $el.attr('data-id'),
          dataVideo: $el.attr('data-video'),
          dataLinkId: $el.attr('data-linkid'),
          dataLink: $el.attr('data-link')
        });
      });
    });
    
    if (servers.length > 0) {
      console.log(`   Found ${servers.length} server elements`);
      servers.slice(0, 3).forEach((srv, i) => {
        console.log(`   ${i + 1}. ${srv.text} (${srv.selector})`);
        console.log(`      data-id: ${srv.dataId || 'N/A'}`);
      });
      saveToFile(`2_servers_ep${episodeNum}.json`, JSON.stringify(servers, null, 2));
    } else {
      console.log(`   ⚠️  No server selection elements found`);
    }
    
    // Find Filemoon-related content
    console.log('\n   🌙 FILEMOON DETECTION:');
    const filemoonIframes = iframes.filter(iframe => 
      iframe.src.toLowerCase().includes('filemoon') ||
      iframe.src.toLowerCase().includes('moonplayer') ||
      iframe.src.toLowerCase().includes('fmoonembed')
    );
    
    if (filemoonIframes.length > 0) {
      console.log(`   ✅ Found ${filemoonIframes.length} Filemoon iframe(s)`);
      filemoonIframes.forEach((iframe, i) => {
        console.log(`   ${i + 1}. ${iframe.src}`);
      });
      return filemoonIframes[0].src;
    } else {
      console.log(`   ⚠️  No Filemoon iframes found`);
      console.log(`   📝 All iframes: ${iframes.length}`);
      return iframes.length > 0 ? iframes[0].src : null;
    }
    
  } catch (error) {
    console.error(`   ❌ ERROR: ${error.message}`);
    return null;
  }
}

async function investigateFilemoonPlayer(playerUrl) {
  console.log('\n' + '='.repeat(80));
  console.log('🌙 STEP 3: INVESTIGATING FILEMOON PLAYER');
  console.log('='.repeat(80));
  
  const fullUrl = playerUrl.startsWith('http') ? playerUrl : 
                  (playerUrl.startsWith('//') ? `https:${playerUrl}` : 
                  `https://filemoon.sx${playerUrl}`);
  
  console.log(`\n🔗 URL: ${fullUrl}`);
  
  try {
    const response = await axiosInstance.get(fullUrl, {
      headers: {
        'Referer': BASE_URL,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Save full HTML
    saveToFile(`3_filemoon_player.html`, html);
    
    console.log('\n📋 FILEMOON PLAYER ANALYSIS:');
    console.log('-'.repeat(80));
    
    // Check for nested iframes
    console.log('\n   🖼️  NESTED IFRAMES:');
    const nestedIframes = [];
    $('iframe').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        nestedIframes.push(src);
        console.log(`   ${i + 1}. ${src}`);
      }
    });
    
    if (nestedIframes.length > 0) {
      console.log(`\n   ⚠️  Found ${nestedIframes.length} nested iframe(s) - might need to follow!`);
    }
    
    // Look for packed JavaScript
    console.log('\n   📦 PACKED JAVASCRIPT DETECTION:');
    const scripts = [];
    $('script').each((i, el) => {
      const content = $(el).html();
      if (content) {
        scripts.push({
          index: i,
          length: content.length,
          isPacked: content.includes('eval(function(p,a,c,k,e,d)'),
          hasM3u8: content.includes('.m3u8'),
          hasMp4: content.includes('.mp4'),
          hasFile: content.includes('file:') || content.includes('"file"'),
          hasSources: content.includes('sources')
        });
      }
    });
    
    console.log(`   Total scripts: ${scripts.length}`);
    
    const packedScripts = scripts.filter(s => s.isPacked);
    if (packedScripts.length > 0) {
      console.log(`   ✅ Found ${packedScripts.length} PACKED script(s)!`);
      packedScripts.forEach((script, i) => {
        console.log(`      Script ${script.index}: ${script.length} chars`);
      });
    } else {
      console.log(`   ⚠️  No packed scripts found`);
    }
    
    const m3u8Scripts = scripts.filter(s => s.hasM3u8);
    if (m3u8Scripts.length > 0) {
      console.log(`   ✅ Found ${m3u8Scripts.length} script(s) with .m3u8!`);
    }
    
    saveToFile(`3_scripts_analysis.json`, JSON.stringify(scripts, null, 2));
    
    // Extract and save all script contents
    console.log('\n   💾 SAVING ALL SCRIPTS:');
    $('script').each((i, el) => {
      const content = $(el).html();
      if (content && content.trim().length > 0) {
        saveToFile(`3_script_${i}.js`, content);
        console.log(`   Saved script ${i} (${content.length} chars)`);
      }
    });
    
    // Look for direct video URLs
    console.log('\n   🎬 DIRECT VIDEO URL DETECTION:');
    const m3u8Matches = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g);
    const mp4Matches = html.match(/(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/g);
    
    if (m3u8Matches) {
      console.log(`   ✅ Found ${m3u8Matches.length} m3u8 URL(s) in HTML:`);
      m3u8Matches.forEach((url, i) => {
        console.log(`      ${i + 1}. ${url.substring(0, 80)}...`);
      });
      saveToFile(`3_m3u8_urls.txt`, m3u8Matches.join('\n'));
    } else {
      console.log(`   ⚠️  No m3u8 URLs found in HTML`);
    }
    
    if (mp4Matches) {
      console.log(`   ✅ Found ${mp4Matches.length} mp4 URL(s) in HTML:`);
      mp4Matches.forEach((url, i) => {
        console.log(`      ${i + 1}. ${url.substring(0, 80)}...`);
      });
    }
    
    // Summary
    console.log('\n   📊 SUMMARY:');
    console.log(`      Nested iframes: ${nestedIframes.length}`);
    console.log(`      Total scripts: ${scripts.length}`);
    console.log(`      Packed scripts: ${packedScripts.length}`);
    console.log(`      Scripts with m3u8: ${m3u8Scripts.length}`);
    console.log(`      Direct m3u8 URLs: ${m3u8Matches ? m3u8Matches.length : 0}`);
    
  } catch (error) {
    console.error(`   ❌ ERROR: ${error.message}`);
  }
}

async function investigate(slug, episodeNum) {
  console.log('\n');
  console.log('🔍 ANIMEDISK & FILEMOON INVESTIGATION TOOL');
  console.log('='.repeat(80));
  console.log(`   Anime: ${slug}`);
  console.log(`   Episode: ${episodeNum || 'N/A (movie)'}`);
  console.log('='.repeat(80));
  
  // Step 1: Investigate anime page
  const episodes = await investigateAnimePage(slug);
  
  if (episodes.length === 0) {
    console.log('\n❌ No episodes found. Cannot continue investigation.');
    return;
  }
  
  // Step 2: Find and investigate watch page
  let watchUrl = null;
  if (episodeNum) {
    const episode = episodes.find(ep => 
      parseInt(ep.dataNumber) === episodeNum ||
      ep.title.includes(`Episode ${episodeNum}`) ||
      ep.title.includes(`Ep ${episodeNum}`)
    );
    
    if (episode) {
      watchUrl = episode.href;
    } else {
      console.log(`\n⚠️  Episode ${episodeNum} not found, using first episode`);
      watchUrl = episodes[0].href;
    }
  } else {
    // For movies, use the first link or the anime page itself
    watchUrl = episodes.length > 0 ? episodes[0].href : `/${slug}`;
  }
  
  const playerUrl = await investigateWatchPage(watchUrl, episodeNum || 1);
  
  if (!playerUrl) {
    console.log('\n❌ No player URL found. Cannot continue investigation.');
    return;
  }
  
  // Step 3: Investigate Filemoon player
  await investigateFilemoonPlayer(playerUrl);
  
  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ INVESTIGATION COMPLETE!');
  console.log('='.repeat(80));
  console.log(`\n📁 All data saved to: ${outputDir}`);
  console.log('\n📝 NEXT STEPS:');
  console.log('   1. Check the saved HTML files to understand the structure');
  console.log('   2. Look at the script files to see how video URLs are embedded');
  console.log('   3. If packed scripts exist, examine the packing format');
  console.log('   4. Use the findings to update stream.js extraction logic');
  console.log('\n💡 TIP: Open the HTML files in a browser to see the actual page structure');
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node investigate.js <anime-slug> [episode-number]');
  console.log('Example: node investigate.js demon-slayer 1');
  console.log('Example: node investigate.js your-name');
  process.exit(1);
}

const slug = args[0];
const episodeNum = args[1] ? parseInt(args[1]) : null;

investigate(slug, episodeNum).catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
