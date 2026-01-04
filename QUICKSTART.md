# ⚡ Quick Start Guide

Get your Animedisk addon running in **5 minutes**!

## 🎯 Goal
Stream anime from animedisk.me in Stremio with just a few clicks.

---

## 📱 Option 1: Use Replit (Easiest - No Coding!)

### Step-by-Step:

**1. Open Replit** 
   - Go to: https://replit.com
   - Click "Sign up" (use GitHub for easier setup)

**2. Import the Addon**
   - Click the blue **"+ Create"** button
   - Select **"Import from GitHub"**
   - Paste this URL:
     ```
     https://github.com/veera590/anime-streaming-addon
     ```
   - Click **"Import from GitHub"**

**3. Run It!**
   - Wait for the page to load (30 seconds)
   - Click the big green **"Run"** button at the top
   - Wait for installation (1-2 minutes first time)
   - You'll see: `🚀 Animedisk Stremio Addon running on...`

**4. Get Your URL**
   - Look at the browser window on the right
   - Copy the URL at the top (looks like: `https://anime-streaming-addon.username.repl.co`)
   - **This is your addon URL!** ✨

**5. Install in Stremio**
   - Open **Stremio** app on your device
   - Click the **Puzzle icon** (Addons) in the top right
   - Click **"Community Addons"** at the very top
   - In the search box at the top, paste:
     ```
     https://your-replit-url.repl.co/manifest.json
     ```
     (Replace with YOUR actual Replit URL)
   - Click **"Install"**
   - Done! 🎉

**6. Start Watching**
   - Go to **Discover** in Stremio
   - Scroll down to find **"Animedisk Anime"** sections
   - Browse and click any anime
   - Choose an episode
   - Click **Play** and select the Animedisk stream

---

## 💻 Option 2: Run Locally (For Developers)

### Prerequisites:
- Node.js 16+ installed
- Git installed

### Steps:

```bash
# 1. Clone the repository
git clone https://github.com/veera590/anime-streaming-addon.git
cd anime-streaming-addon

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# You should see:
# 🚀 Animedisk Stremio Addon running on http://localhost:7000
```

### Install in Stremio:
- Open Stremio
- Go to Addons → Community Addons  
- Paste: `http://localhost:7000/manifest.json`
- Click Install

---

## 🧪 Test It Works

### Quick Test:

**1. Check Manifest**
   - Open in browser: `https://your-url/manifest.json`
   - Should see JSON with addon info

**2. Check Catalog**
   - Open: `https://your-url/catalog/series/animedisk-anime.json`
   - Should see list of anime

**3. Run Test Script** (Local only)
   ```bash
   npm test
   ```
   - Should show catalog, meta, and stream results

---

## 🔥 Keep Replit Alive (Important!)

Replit free tier **sleeps after 1 hour** of no activity. Keep it awake:

### Method 1: UptimeRobot (Recommended)

1. Go to: https://uptimerobot.com
2. Sign up (free)
3. Click **"+ Add New Monitor"**
4. Fill in:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Animedisk Addon
   - **URL**: Your Replit URL (without /manifest.json)
   - **Monitoring Interval**: 5 minutes
5. Click **"Create Monitor"**

✅ Done! Your addon stays awake 24/7

### Method 2: Cron-Job.org

1. Go to: https://cron-job.org
2. Sign up (free)
3. Create new cron job:
   - **URL**: Your Replit URL
   - **Schedule**: Every 5 minutes
4. Save

---

## 📺 Using in Stremio

### Finding Content:

**In Discover Tab:**
- Scroll down
- Look for **"Animedisk TV Series"**
- Look for **"Animedisk Movies"**
- Look for **"Most Popular"**

**Search:**
- Use Stremio's search
- Addon provides streams for matching anime

### Playing Videos:

1. Click any anime
2. Click an episode
3. Streams will appear with **"Animedisk"** prefix
4. Click to play!

---

## 🆘 Troubleshooting

### "Can't install addon"
- ✅ Make sure URL ends with `/manifest.json`
- ✅ Check if Replit is running (green dot)
- ✅ Try opening manifest URL in browser first

### "No streams found"
- ✅ Try a different anime/episode
- ✅ Check Replit console for errors
- ✅ Website might be down temporarily

### "Addon not showing in Discover"
- ✅ Restart Stremio
- ✅ Check if addon is installed (Addons → My Addons)
- ✅ Try scrolling down in Discover

### "Video won't play"
- ✅ Some streams may be geo-restricted
- ✅ Try a VPN if needed
- ✅ Check your internet connection

---

## 📊 What to Expect

### Performance:
- **Catalog loads**: 2-5 seconds
- **Episode list**: 3-7 seconds  
- **Stream starts**: 5-10 seconds
- **First play after sleep**: 30-60 seconds (Replit waking up)

### Content:
- **~50 anime** in each catalog
- **Hindi dubbed** and subbed
- **Multiple qualities** when available
- **Updated** as animedisk.me updates

---

## 🎓 Next Steps

### Learn More:
- Read [README.md](README.md) for full documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for other hosting options
- See [FEATURES.md](FEATURES.md) for technical details

### Customize:
- Edit `config.js` to change settings
- Modify `manifest.js` to rename addon
- Adjust cache times for your needs

### Share:
- Share your Replit URL with friends
- They can use the same addon
- No limits on users!

---

## 🎉 You're Done!

Enjoy streaming anime in Hindi with Stremio! 

**Questions?** Open an issue on GitHub.

**Happy Watching!** 🍿

---

## Quick Reference Card

```
📦 Repository: github.com/veera590/anime-streaming-addon
🌐 Deploy on: replit.com (easiest)
⏰ Keep alive: uptimerobot.com (free)
🔗 Install URL: https://your-url.repl.co/manifest.json
📝 Test URL: https://your-url.repl.co/catalog/series/animedisk-anime.json
```

---

**Need help?** Create an issue: https://github.com/veera590/anime-streaming-addon/issues
