# Investigation Guide - How to Analyze Animedisk & Filemoon

## 🎯 Purpose

Before we can build a working stream extractor, we need to **understand exactly how animedisk.me and Filemoon work**. This investigation script will help us discover:

1. How episodes are structured on anime pages
2. What the watch page looks like
3. How Filemoon embeds videos
4. Whether JavaScript is packed/obfuscated
5. Where the actual video URLs are hidden

## 🚀 How to Run

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Investigation

**For a TV Series Episode:**
```bash
node investigate.js demon-slayer 1
```

**For a Movie:**
```bash
node investigate.js your-name
```

**For Another Anime:**
```bash
node investigate.js naruto-shippuden 5
```

## 📊 What It Does

The script performs **3 investigation steps**:

### Step 1: Anime Page Analysis
- Fetches the anime page (e.g., `https://animedisk.me/demon-slayer`)
- Finds all episode links
- Saves episode data to JSON
- Shows how episodes are structured

**Output:**
- `1_anime_page_<slug>.html` - Full HTML of anime page
- `1_episodes_<slug>.json` - All episode data

### Step 2: Watch Page Analysis
- Fetches the episode watch page
- Finds all iframes (video players)
- Detects server selection elements
- Identifies Filemoon iframes

**Output:**
- `2_watch_page_ep<num>.html` - Full HTML of watch page
- `2_iframes_ep<num>.json` - All iframe data
- `2_servers_ep<num>.json` - Server selection data

### Step 3: Filemoon Player Analysis
- Fetches the Filemoon player page
- Checks for nested iframes
- Detects packed JavaScript
- Extracts all scripts
- Searches for video URLs

**Output:**
- `3_filemoon_player.html` - Full HTML of Filemoon player
- `3_scripts_analysis.json` - Analysis of all scripts
- `3_script_0.js`, `3_script_1.js`, etc. - Individual script contents
- `3_m3u8_urls.txt` - Any m3u8 URLs found

## 📁 Output Location

All files are saved to: `investigation_output/`

## 🔍 What to Look For

### 1. In the Anime Page HTML (`1_anime_page_*.html`)

Open in browser and look for:
- How are episodes listed?
- What HTML structure contains episodes?
- Are there `data-*` attributes?

### 2. In the Watch Page HTML (`2_watch_page_*.html`)

Look for:
- Where is the video player iframe?
- Is it directly embedded or loaded via JavaScript?
- Are there server selection buttons?

### 3. In the Filemoon Player HTML (`3_filemoon_player.html`)

**This is the most important!** Look for:

#### A) Packed JavaScript
```javascript
eval(function(p,a,c,k,e,d){...})
```
If you see this, the video URL is obfuscated.

#### B) Direct m3u8 URLs
```javascript
file: "https://cdn.filemoon.sx/playlist.m3u8"
```
If you see this, extraction is easy!

#### C) API Calls
```javascript
$.ajax({
  url: "/api/getVideo",
  data: {id: "abc123"}
})
```
If you see this, we need to replicate the API call.

### 4. In Individual Scripts (`3_script_*.js`)

Open each script file and search for:
- `.m3u8` - HLS playlist URLs
- `.mp4` - Direct video URLs
- `file:` or `"file"` - Video source property
- `sources` - Video sources array
- `eval(function` - Packed code

## 🎓 Example Investigation

Let's say you run:
```bash
node investigate.js demon-slayer 1
```

**Console Output Will Show:**
```
🔍 ANIMEDISK & FILEMOON INVESTIGATION TOOL
================================================================================
   Anime: demon-slayer
   Episode: 1
================================================================================

📺 STEP 1: INVESTIGATING ANIME PAGE
================================================================================
🔗 URL: https://animedisk.me/demon-slayer
   💾 Saved to: investigation_output/1_anime_page_demon-slayer.html

📋 ANIME PAGE ANALYSIS:
   Title: Demon Slayer: Kimetsu no Yaiba
   
   🎬 EPISODE CONTAINERS FOUND:
   ✅ Found 26 episodes with selector: .ss-list a
   
   📊 Total episodes found: 26
   📝 First 3 episodes:
      1. href: /watch/demon-slayer-123
         title: Episode 1
         data-number: 1

🎥 STEP 2: INVESTIGATING WATCH PAGE
================================================================================
🔗 URL: https://animedisk.me/watch/demon-slayer-123

📋 WATCH PAGE ANALYSIS:
   🖼️  IFRAMES FOUND:
   1. https://filemoon.sx/e/abc123xyz
      
   🌙 FILEMOON DETECTION:
   ✅ Found 1 Filemoon iframe(s)

🌙 STEP 3: INVESTIGATING FILEMOON PLAYER
================================================================================
🔗 URL: https://filemoon.sx/e/abc123xyz

📋 FILEMOON PLAYER ANALYSIS:
   📦 PACKED JAVASCRIPT DETECTION:
   Total scripts: 5
   ✅ Found 1 PACKED script(s)!
      Script 2: 4523 chars
   
   🎬 DIRECT VIDEO URL DETECTION:
   ⚠️  No m3u8 URLs found in HTML
   
   📊 SUMMARY:
      Packed scripts: 1
      Scripts with m3u8: 0
      Direct m3u8 URLs: 0
```

**This tells us:**
- Episodes are in `.ss-list a` elements ✅
- Filemoon iframe is directly embedded ✅
- Video URL is in PACKED JavaScript ⚠️
- We need to unpack script #2 to get the URL 🎯

## 🛠️ Next Steps After Investigation

### If Packed JavaScript Found:

1. Open `3_script_2.js` (or whichever script is packed)
2. Copy the packed code
3. Use an online unpacker: https://matthewfl.com/unPacker.html
4. See what the unpacked code looks like
5. Find the video URL pattern
6. Update `scraper.js` unpacking logic

### If Direct URLs Found:

1. Check `3_m3u8_urls.txt`
2. Copy one of the URLs
3. Test it in VLC or a browser
4. If it works, update `scraper.js` to extract these URLs directly

### If API Calls Found:

1. Look at the script that makes the API call
2. Note the endpoint and parameters
3. Replicate the call in `scraper.js`
4. Parse the API response for video URLs

## 💡 Pro Tips

1. **Run multiple investigations** - Try different anime to see if the structure is consistent
2. **Compare results** - Check if movies vs series have different structures
3. **Test URLs** - Copy any m3u8 URLs you find and test them in VLC
4. **Check Network tab** - Open browser DevTools and watch network requests when playing a video
5. **Look for patterns** - If you see the same structure across multiple anime, it's reliable

## 🐛 Troubleshooting

**"No episodes found"**
- The anime slug might be wrong
- Try visiting animedisk.me and finding the correct slug from the URL

**"No player URL found"**
- The watch page structure might be different
- Check the saved HTML files manually

**"Request timeout"**
- animedisk.me might be slow or down
- Try again later or increase timeout in the script

## 📝 Real Example Workflow

```bash
# 1. Investigate an anime
node investigate.js solo-leveling 1

# 2. Check the output
cd investigation_output
ls -la

# 3. Open the Filemoon player HTML in browser
open 3_filemoon_player.html

# 4. Look at the packed script
cat 3_script_2.js

# 5. If you find the pattern, update scraper.js
# 6. Test with the real stream.js
node test-stream.js
```

## ✅ Success Criteria

You've successfully investigated when you can answer:

- ✅ How are episodes structured?
- ✅ Where is the Filemoon iframe?
- ✅ Is JavaScript packed or plain?
- ✅ Where is the video URL hidden?
- ✅ What's the URL pattern for m3u8 files?

Once you have these answers, we can build a **working stream extractor**! 🎉

---

**Ready to investigate?** Run the script and let's see what we find! 🔍
