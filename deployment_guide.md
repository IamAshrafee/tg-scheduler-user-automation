# 🚀 VPS Deployment Guide — Telegram Automation Platform

> **VPS**: `62.72.42.124` | **User**: `ashrafee` | **Subdomain**: `tg-auto-schedular.giize.com`
>
> This VPS already hosts a client's app (`fortunate-business` on port 3000 via PM2 + Nginx). Our platform runs alongside it without interference.

---

## Quick Reference

| Component | Location |
|-----------|----------|
| Project root | `/var/www/tg-scheduler-user-automation/` |
| Backend (FastAPI) | `/var/www/tg-scheduler-user-automation/backend/` |
| Frontend (React) | `/var/www/tg-scheduler-user-automation/frontend/dist/` |
| Python venv | `/var/www/tg-scheduler-user-automation/venv/` |
| Sessions (encrypted) | `/var/www/tg-scheduler-user-automation/sessions/` |
| Uploads | `/var/www/tg-scheduler-user-automation/uploads/` |
| Logs | `/var/www/tg-scheduler-user-automation/logs/` |
| PM2 config | `/var/www/tg-scheduler-user-automation/ecosystem.config.js` |
| Nginx config | `/etc/nginx/sites-available/tg-auto-schedular.giize.com` |
| Backend `.env` | `/var/www/tg-scheduler-user-automation/backend/.env` |

---

## Step 1 — Domain Setup (DuckDNS)

DuckDNS provides a free subdomain with no expiry — supports Let's Encrypt SSL.

1. Go to [https://www.duckdns.org](https://www.duckdns.org) → Sign in with Google/GitHub
2. Create subdomain: `tg-auto` → point to VPS IP: `62.72.42.124`
3. Done — `tg-auto-schedular.giize.com` now resolves to the VPS

> **Alternative**: Skip DuckDNS and access via `http://62.72.42.124:8080` (no SSL).

---

## Step 2 — SSH to VPS & Create Directory Structure

```bash
ssh ashrafee@62.72.42.124
```

```bash
# Install Python venv if not already installed
sudo apt install python3-venv -y

# Create project directories
sudo mkdir -p /var/www/tg-scheduler-user-automation/{backend,frontend,sessions,uploads,logs}
sudo chown -R ashrafee:ashrafee /var/www/tg-scheduler-user-automation
```

---

## Step 3 — Upload Project Files

Run these from your **local machine** (Windows cmd/PowerShell):

```bash
# Upload backend
scp -r backend/ ashrafee@62.72.42.124:/var/www/tg-scheduler-user-automation/backend/

# Upload deploy configs
scp deploy/ecosystem.config.js ashrafee@62.72.42.124:/var/www/tg-scheduler-user-automation/
scp deploy/.env.production ashrafee@62.72.42.124:/var/www/tg-scheduler-user-automation/backend/.env
```

> ⚠️ **Don't upload** `venv/`, `__pycache__/`, `sessions/`, or your local `.env`.

---

## Step 4 — Setup Python Environment (on VPS)

```bash
ssh ashrafee@62.72.42.124

cd /var/www/tg-scheduler-user-automation
python3 -m venv venv
source venv/bin/activate

cd backend
pip install -r requirements.txt
```

---

## Step 5 — Configure Production Environment

Edit the `.env` file with your real values:

```bash
nano /var/www/tg-scheduler-user-automation/backend/.env
```

Critical values to set:

```env
DEBUG=False
MONGO_URI=mongodb+srv://real_user:real_pass@your-cluster.mongodb.net
JWT_SECRET=generate_a_long_random_string_here
ENCRYPTION_KEY=run_python_command_below_to_generate
TELEGRAM_API_ID=your_real_api_id
TELEGRAM_API_HASH=your_real_api_hash
CORS_ORIGINS=["https://tg-auto-schedular.giize.com"]
```

Generate the `ENCRYPTION_KEY`:

```bash
/var/www/tg-scheduler-user-automation/venv/bin/python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Generate the `JWT_SECRET`:

```bash
openssl rand -hex 32
```

---

## Step 6 — Start Backend with PM2

```bash
cd /var/www/tg-scheduler-user-automation

# Start the backend
pm2 start ecosystem.config.js

# Verify it's running
pm2 list
pm2 logs tg-backend --lines 20

# Save PM2 state (auto-restart on reboot)
pm2 save
```

Test the backend is responding:

```bash
curl http://127.0.0.1:8000/api/v1/health
# Expected: {"status":"ok","version":"1.0.0","mode":"production"}
```

---

## Step 7 — Build & Deploy Frontend

On your **local machine**, build the production bundle:

```bash
cd frontend

# Create .env.production for build
echo VITE_API_URL=/api/v1 > .env.production

npm run build
```

Upload the build to VPS:

```bash
scp -r dist/ ashrafee@62.72.42.124:/var/www/tg-scheduler-user-automation/frontend/dist/
```

---

## Step 8 — Configure Nginx

On the **VPS**:

```bash
# Copy the Nginx config
sudo cp /var/www/tg-scheduler-user-automation/nginx-tg-auto.conf /etc/nginx/sites-available/tg-auto-schedular.giize.com

# Or create it manually:
sudo nano /etc/nginx/sites-available/tg-auto-schedular.giize.com
```

Paste the config (also available in `deploy/nginx-tg-auto.conf`):

```nginx
server {
    listen 80;
    server_name tg-auto-schedular.giize.com;

    # Frontend
    root /var/www/tg-scheduler-user-automation/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location /robots.txt {
        return 200 "User-agent: *\nDisallow: /\n";
    }

    access_log /var/www/tg-scheduler-user-automation/logs/nginx-access.log;
    error_log /var/www/tg-scheduler-user-automation/logs/nginx-error.log;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/tg-auto-schedular.giize.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

✅ Easiest Fix (logs folder missing)

Just recreate the missing folder.

Run this:

sudo mkdir -p /var/www/tg-scheduler-user-automation/logs


Now create empty log files:

sudo touch /var/www/tg-scheduler-user-automation/logs/nginx-access.log
sudo touch /var/www/tg-scheduler-user-automation/logs/nginx-error.log


Now give permission:

sudo chown -R www-data:www-data /var/www/tg-scheduler-user-automation/logs


## Step 9 — SSL Certificate (HTTPS)

```bash
sudo certbot --nginx -d tg-auto-schedular.giize.com
```

Certbot automatically:
- Obtains a free Let's Encrypt certificate
- Modifies the Nginx config for SSL (redirects HTTP → HTTPS)
- Sets up auto-renewal via systemd timer

Verify: visit `https://tg-auto-schedular.giize.com` — should show a valid padlock 🔒

---

## Step 10 — Verify Everything

| Check | Command / URL |
|-------|---------------|
| Backend running? | `pm2 list` — `tg-backend` status = `online` |
| Backend healthy? | `curl https://tg-auto-schedular.giize.com/api/v1/health` |
| Frontend loading? | Open `https://tg-auto-schedular.giize.com` in browser |
| Login works? | Try registering and logging in |
| No conflicts? | `pm2 list` — `fortunate-business` still running ✅ |

---

## Day-to-Day Operations

### Deploying Updates

After code changes, upload and restart:

```bash
# Upload updated backend
scp -r backend/ ashrafee@62.72.42.124:/var/www/tg-scheduler-user-automation/backend/

# On VPS:
ssh ashrafee@62.72.42.124
cd /var/www/tg-scheduler-user-automation
source venv/bin/activate
cd backend && pip install -r requirements.txt
pm2 restart tg-backend
```

For frontend changes:

```bash
# Local: build
cd frontend && npm run build

# Upload
scp -r dist/ ashrafee@62.72.42.124:/var/www/tg-scheduler-user-automation/frontend/dist/

# On VPS:
sudo systemctl reload nginx
```

Or use the deploy script (must be on VPS):

```bash
chmod +x /var/www/tg-scheduler-user-automation/deploy.sh
/var/www/tg-scheduler-user-automation/deploy.sh
```

### PM2 Commands

| Command | Purpose |
|---------|---------|
| `pm2 list` | See all running processes |
| `pm2 logs tg-backend` | Tail backend logs |
| `pm2 logs tg-backend --lines 100` | View last 100 log lines |
| `pm2 restart tg-backend` | Restart after code changes |
| `pm2 stop tg-backend` | Stop the backend |
| `pm2 delete tg-backend` | Remove from PM2 |
| `pm2 monit` | Real-time resource monitor |
| `pm2 save` | Save current process list |

### Monitoring

- **UptimeRobot** (free) — ping `https://tg-auto-schedular.giize.com/api/v1/health` every 5 minutes
- **PM2** — auto-restarts on crash + `pm2-logrotate` handles log sizes
- **MongoDB Atlas** — cloud-managed, no VPS MongoDB needed

### Checking Logs

```bash
# Application logs
pm2 logs tg-backend

# Nginx logs
tail -f /var/www/tg-scheduler-user-automation/logs/nginx-access.log
tail -f /var/www/tg-scheduler-user-automation/logs/nginx-error.log
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `502 Bad Gateway` | Backend not running → `pm2 start ecosystem.config.js` |
| `CORS error` in browser | Check `CORS_ORIGINS` in `.env` matches your domain (with `https://`) |
| Backend import error | `source venv/bin/activate && pip install -r requirements.txt` |
| SSL certificate expired | `sudo certbot renew` (usually auto-renews) |
| Port 8000 occupied | `lsof -i :8000` → kill conflicting process |
| Frontend shows blank | Check `dist/` was uploaded and Nginx root path is correct |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    VPS (62.72.42.124)                │
│                                                     │
│   ┌─────────── Nginx (port 80/443) ──────────┐     │
│   │                                           │     │
│   │  tg-auto-schedular.giize.com                      │     │
│   │  ├── /          → frontend/dist/ (static) │     │
│   │  └── /api/*     → proxy 127.0.0.1:8000    │     │
│   │                                           │     │
│   │  businessupdate.org (client's existing)    │     │
│   │  └── /          → proxy 127.0.0.1:3000    │     │
│   └───────────────────────────────────────────┘     │
│                                                     │
│   ┌─── PM2 ───────────────────────────────────┐     │
│   │  tg-backend      → uvicorn :8000          │     │
│   │  fortunate-business × 4  → node :3000     │     │
│   └───────────────────────────────────────────┘     │
│                                                     │
│   Backend → MongoDB Atlas (cloud)                   │
└─────────────────────────────────────────────────────┘
```
