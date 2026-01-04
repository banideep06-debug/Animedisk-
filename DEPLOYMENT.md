# 🚀 Deployment Guide

Complete guide to deploy your Animedisk Stremio Addon.

## Option 1: Replit (Recommended - Free & Easy)

### Steps:

1. **Go to Replit**
   - Visit [replit.com](https://replit.com)
   - Sign up or login

2. **Import from GitHub**
   - Click "Create Repl"
   - Select "Import from GitHub"
   - Paste: `https://github.com/veera590/anime-streaming-addon`
   - Click "Import from GitHub"

3. **Configure (Optional)**
   - Edit `config.js` if needed
   - TMDB API key is already embedded

4. **Run the Addon**
   - Click the big "Run" button
   - Wait for dependencies to install
   - Server will start on port 7000

5. **Get Your URL**
   - Copy the URL from the webview (looks like: `https://anime-streaming-addon.username.repl.co`)
   - This is your addon URL!

6. **Install in Stremio**
   - Open Stremio
   - Go to Addons → Community Addons
   - Paste: `https://your-replit-url.repl.co/manifest.json`
   - Click Install

### Keeping it Alive

Replit free tier sleeps after inactivity. To keep it alive:

1. **Use UptimeRobot** (Free):
   - Sign up at [uptimerobot.com](https://uptimerobot.com)
   - Add new monitor
   - Type: HTTP(s)
   - URL: Your Replit URL
   - Interval: 5 minutes
   - Done! Your addon stays awake

2. **Use Cron-Job.org** (Free):
   - Sign up at [cron-job.org](https://cron-job.org)
   - Create new cron job
   - URL: Your Replit URL
   - Schedule: Every 5 minutes
   - Save

---

## Option 2: Railway (Easy & Reliable)

### Steps:

1. **Sign Up**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `veera590/anime-streaming-addon`
   - Railway auto-detects Node.js
   - Deployment starts automatically

3. **Get Domain**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - Copy the domain (e.g., `addon.up.railway.app`)

4. **Install in Stremio**
   - Paste: `https://your-railway-domain.app/manifest.json`

### Free Tier
- $5 free credits per month
- More than enough for personal use

---

## Option 3: Render (Free Tier Available)

### Steps:

1. **Fork Repository** (if you haven't)
   - Go to the [GitHub repo](https://github.com/veera590/anime-streaming-addon)
   - Click "Fork"

2. **Sign Up for Render**
   - Visit [render.com](https://render.com)
   - Sign up with GitHub

3. **Create Web Service**
   - Click "New +"
   - Select "Web Service"
   - Connect your forked repository
   - Choose the repo

4. **Configure**
   - Name: `animedisk-addon`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Copy the URL (e.g., `https://animedisk-addon.onrender.com`)

6. **Install in Stremio**
   - Paste: `https://your-render-url.onrender.com/manifest.json`

### Note
- Free tier spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Use UptimeRobot to keep it alive

---

## Option 4: Heroku (Paid After Nov 2022)

### Steps:

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   heroku create your-addon-name
   ```

4. **Deploy**
   ```bash
   git clone https://github.com/veera590/anime-streaming-addon.git
   cd anime-streaming-addon
   git push heroku main
   ```

5. **Get URL**
   ```bash
   heroku open
   ```
   Copy the URL

6. **Install in Stremio**
   - Paste: `https://your-app-name.herokuapp.com/manifest.json`

---

## Option 5: Docker (Self-Hosted)

### Prerequisites
- Docker installed
- A server or VPS

### Steps:

1. **Create Dockerfile** (already included)
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 7000
   CMD ["npm", "start"]
   ```

2. **Build Image**
   ```bash
   docker build -t animedisk-addon .
   ```

3. **Run Container**
   ```bash
   docker run -d -p 7000:7000 --name animedisk-addon animedisk-addon
   ```

4. **Access**
   - Local: `http://localhost:7000/manifest.json`
   - Remote: `http://your-server-ip:7000/manifest.json`

### Docker Compose
```yaml
version: '3.8'
services:
  addon:
    build: .
    ports:
      - "7000:7000"
    restart: unless-stopped
```

Run: `docker-compose up -d`

---

## Option 6: VPS (DigitalOcean, AWS, etc.)

### Prerequisites
- Ubuntu/Debian VPS
- SSH access
- Domain (optional)

### Steps:

1. **SSH into Server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone Repository**
   ```bash
   git clone https://github.com/veera590/anime-streaming-addon.git
   cd anime-streaming-addon
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

6. **Start Addon**
   ```bash
   pm2 start index.js --name animedisk-addon
   pm2 save
   pm2 startup
   ```

7. **Setup Nginx (Optional)**
   ```bash
   sudo apt install nginx
   ```

   Create config: `/etc/nginx/sites-available/addon`
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:7000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/addon /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Setup SSL (Optional)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## Testing Your Deployment

### 1. Check Manifest
```bash
curl https://your-url.com/manifest.json
```

Should return JSON with addon info.

### 2. Check Catalog
```bash
curl https://your-url.com/catalog/series/animedisk-anime.json
```

Should return list of anime.

### 3. Run Test Script
```bash
npm test
```

Should show catalog, meta, and stream results.

---

## Troubleshooting

### Addon Not Loading
- Check if server is running
- Verify URL is correct
- Check firewall/port settings

### No Catalogs Showing
- Test with `curl` command
- Check server logs
- Verify animedisk.me is accessible

### Streams Not Playing
- Check if video URLs are extracted
- Test video URLs in browser
- Some streams may be geo-restricted

### 502 Bad Gateway
- Server might be down
- Check if process is running
- Restart the service

### Out of Memory
- Increase server resources
- Reduce cache sizes in `config.js`
- Use smaller cache TTL values

---

## Monitoring

### Check Logs

**Replit**: Click "Console" tab

**Railway**: Click "Deployments" → "View Logs"

**Render**: Click "Logs" tab

**PM2** (VPS):
```bash
pm2 logs animedisk-addon
pm2 status
```

**Docker**:
```bash
docker logs animedisk-addon
```

---

## Updating

### Replit
- Go to your Repl
- Click "Version Control"
- Click "Pull" to get latest changes

### Railway/Render
- Push changes to GitHub
- Auto-deploys on push

### Docker
```bash
git pull
docker build -t animedisk-addon .
docker stop animedisk-addon
docker rm animedisk-addon
docker run -d -p 7000:7000 --name animedisk-addon animedisk-addon
```

### VPS (PM2)
```bash
cd anime-streaming-addon
git pull
npm install
pm2 restart animedisk-addon
```

---

## Performance Tips

1. **Use a CDN** (Cloudflare) for faster access
2. **Increase cache TTL** in config.js
3. **Use Redis** instead of node-cache for production
4. **Enable compression** in Express
5. **Use HTTP/2** if possible

---

## Security Tips

1. **Use HTTPS** always
2. **Rate limit** your endpoints
3. **Hide server info** in headers
4. **Keep dependencies updated**
5. **Monitor for abuse**

---

## Cost Comparison

| Platform | Free Tier | Paid | Best For |
|----------|-----------|------|----------|
| Replit | ✅ Yes (sleeps) | $7/mo | Quick testing |
| Railway | $5 credit/mo | $5+/mo | Reliable hobby |
| Render | ✅ Yes (sleeps) | $7+/mo | Simple deploy |
| Heroku | ❌ No | $7+/mo | Enterprise |
| VPS | ❌ No | $5+/mo | Full control |

---

## Support

- **Issues**: [GitHub Issues](https://github.com/veera590/anime-streaming-addon/issues)
- **Updates**: Watch the repository for updates

---

**Happy Streaming! 🎬**
