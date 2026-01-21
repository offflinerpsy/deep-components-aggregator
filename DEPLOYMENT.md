# Deployment Guide

**Environment**: Production Linux Server  
**Domain**: https://prosnab.tech  
**Updated**: 2025-10-13

---

## Architecture Overview

```
Internet → nginx:443 (SSL) → Next.js:3000 → Express:9201 → SQLite + External APIs
```

---

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+
- **Node.js**: v18+ (LTS)
- **npm**: v9+
- **PM2**: v5+
- **nginx**: v1.18+
- **SQLite**: v3+
- **Cloudflare WARP**: для proxy

### Install Dependencies

```bash
# Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# PM2
npm install -g pm2

# nginx
sudo apt update
sudo apt install nginx

# SQLite
sudo apt install sqlite3

# Cloudflare WARP
curl https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
sudo apt update
sudo apt install cloudflare-warp
```

---

## Step 1: Clone Repository

```bash
cd /opt
sudo mkdir -p deep-agg
sudo chown $USER:$USER deep-agg
cd deep-agg

# Clone main repo (backend)
git clone https://github.com/YOUR_ORG/deep-components-aggregator.git .
git checkout ops/ui-ux-r3-backend

# Clone frontend submodule
cd v0-components-aggregator-page
git clone git@github.com:offflinerpsy/v0-components-aggregator-page.git .
git checkout ops/ui-ux-r3
```

---

## Step 2: Install Dependencies

```bash
# Backend
cd /opt/deep-agg
npm install

# Frontend
cd v0-components-aggregator-page
npm install
```

---

## Step 3: Configure Environment

```bash
cd /opt/deep-agg
cp .env.example .env
nano .env
```

Fill in:
- `DIGIKEY_CLIENT_ID`
- `DIGIKEY_CLIENT_SECRET`
- `MOUSER_API_KEY`
- `OEMSTRADE_API_KEY`

See [ENV-SECRETS.md](./ENV-SECRETS.md) for details.

---

## Step 4: Setup WARP Proxy

```bash
# Register WARP
warp-cli register

# Connect
warp-cli connect

# Set proxy mode
warp-cli set-mode proxy

# Verify
warp-cli status
# Should show: Status update: Connected

# Test proxy
curl --proxy socks5://127.0.0.1:40000 https://ifconfig.me
```

---

## Step 5: Build Frontend

```bash
cd /opt/deep-agg/v0-components-aggregator-page
rm -rf .next
npm run build
```

**Expected**: `.next/` directory created with production build.

---

## Step 6: Setup PM2

```bash
cd /opt/deep-agg

# Start all services
pm2 start ecosystem.config.cjs

# Save PM2 config
pm2 save

# Enable auto-start on boot
pm2 startup
# Follow instructions from output
```

### PM2 Processes

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'deep-agg',
      script: 'server.js',
      cwd: '/opt/deep-agg',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 9201
      }
    },
    {
      name: 'deep-v0',
      script: 'npm',
      args: 'start -- -p 3000',
      cwd: '/opt/deep-agg/v0-components-aggregator-page',
      instances: 1
    }
  ]
}
```

### PM2 Commands

```bash
pm2 list                    # List processes
pm2 logs deep-agg           # View backend logs
pm2 logs deep-v0            # View frontend logs
pm2 restart deep-agg        # Restart backend
pm2 restart deep-v0         # Restart frontend
pm2 stop all                # Stop all
pm2 start all               # Start all
pm2 monit                   # Monitor CPU/RAM
```

---

## Step 7: Configure nginx

### Create Site Config

```bash
sudo nano /etc/nginx/sites-available/prosnab.tech
```

```nginx
server {
    listen 80;
    server_name prosnab.tech www.prosnab.tech;
    
    # Redirect HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name prosnab.tech www.prosnab.tech;
    
    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/prosnab.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prosnab.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Logging
    access_log /var/log/nginx/prosnab.tech.access.log;
    error_log /var/log/nginx/prosnab.tech.error.log;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SSE Support (CRITICAL!)
        proxy_buffering off;
        proxy_set_header X-Accel-Buffering no;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }
    
    # Static files (Next.js _next/)
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/prosnab.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 8: SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d prosnab.tech -d www.prosnab.tech

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## Step 9: Verify Deployment

### Check PM2
```bash
pm2 list
# Both deep-agg and deep-v0 should be "online"
```

### Check nginx
```bash
sudo systemctl status nginx
curl -I https://prosnab.tech
# Should return 200 OK
```

### Test SSE
```bash
curl -N https://prosnab.tech/api/live?q=resistor
# Should stream events (: ping, data: {...})
```

### Browser Test
1. https://prosnab.tech → Homepage loads
2. Search "resistor" → Results appear
3. Click product → Details load

---

## Troubleshooting

### PM2 Process Crashed
```bash
pm2 logs deep-agg --lines 100
pm2 logs deep-v0 --lines 100
pm2 restart all
```

### nginx 502 Bad Gateway
```bash
# Check PM2 processes running
pm2 list

# Check nginx error log
sudo tail -f /var/log/nginx/prosnab.tech.error.log

# Restart nginx
sudo systemctl restart nginx
```

### SSE Stream Not Working
- Check `X-Accel-Buffering: no` in nginx config
- Verify `proxy_buffering off`
- Test direct: `curl -N http://localhost:9201/api/live?q=test`

### WARP Proxy Not Working
```bash
warp-cli status
warp-cli disconnect && warp-cli connect
curl --proxy socks5://127.0.0.1:40000 https://ifconfig.me
```

---

## Maintenance

### Update Code
```bash
cd /opt/deep-agg
git pull origin ops/ui-ux-r3-backend

cd v0-components-aggregator-page
git pull origin ops/ui-ux-r3
npm run build

pm2 restart all
```

### View Logs
```bash
pm2 logs                     # All logs
pm2 logs deep-agg            # Backend only
pm2 logs deep-v0 --lines 50  # Frontend last 50 lines
```

### Database Backup
```bash
cp /opt/deep-agg/var/db/deepagg.sqlite /opt/deep-agg/backups/deepagg-$(date +%Y%m%d).sqlite
```

---

## Security Checklist

- [ ] `.env` file has 600 permissions (`chmod 600 .env`)
- [ ] Firewall allows only 80/443 (nginx) + SSH
- [ ] PM2 logs rotated (pm2 install pm2-logrotate)
- [ ] SSL certificate auto-renews (certbot timer enabled)
- [ ] WARP proxy running and connected
- [ ] nginx security headers enabled (CSP, HSTS)

---

**Next**: See [ONBOARDING.md](./ONBOARDING.md) for developer setup
