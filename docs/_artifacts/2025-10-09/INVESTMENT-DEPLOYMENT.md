# Investment Project Deployment

**Date**: 2025-10-09  
**Status**: ✅ DEPLOYED & RUNNING  
**Location**: `/var/www/investment`  
**Repository**: https://github.com/offflinerpsy/Investment.git

---

## Summary

Investment Next.js project successfully deployed to production server at `/var/www/investment`.

- **Framework**: Next.js 15.2.4
- **Process Manager**: PM2
- **Port**: 3000
- **Status**: Online (552ms startup)
- **Public URL**: http://5.129.228.88:3000

---

## Deployment Steps

### 1. Clone Repository
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/offflinerpsy/Investment.git investment
```

### 2. Install Dependencies
```bash
cd /var/www/investment
npm install
```

### 3. Build Production Version
```bash
npm run build
```
✅ Build completed successfully

### 4. Start with PM2
```bash
export PATH="/usr/local/bin:$PATH"
pm2 start npm --name "investment" -- start
pm2 save
```

### 5. Verification
```bash
curl -I http://localhost:3000
# HTTP/1.1 200 OK ✅
```

---

## Management Commands

```bash
# View logs
pm2 logs investment

# Restart
pm2 restart investment

# Stop
pm2 stop investment

# Status
pm2 status

# Delete from PM2
pm2 delete investment
```

---

## Network Configuration

- **Local**: http://localhost:3000
- **Public**: http://5.129.228.88:3000

⚠️ **Note**: Port 3000 should be open in firewall if external access is required.

---

## PM2 Process Details

```
┌────┬────────────┬──────┬─────────┬─────────┬──────────┐
│ id │ name       │ mode │ status  │ cpu     │ memory   │
├────┼────────────┼──────┼─────────┼─────────┼──────────┤
│ 1  │ investment │ fork │ online  │ 0%      │ 21.3mb   │
└────┴────────────┴──────┴─────────┴─────────┴──────────┘
```

---

## Files & Structure

```
/var/www/investment/
├── app/              # Next.js app directory
├── components/       # React components
├── public/           # Static assets
├── styles/           # CSS/styling
├── .next/            # Build output
├── node_modules/     # Dependencies
├── package.json      # Project config
└── next.config.mjs   # Next.js config
```

---

## Troubleshooting

### Check if running
```bash
pm2 status investment
curl http://localhost:3000
```

### View logs
```bash
pm2 logs investment --lines 50
```

### Rebuild & restart
```bash
cd /var/www/investment
npm run build
pm2 restart investment
```

### Port conflicts
```bash
# Check what's on port 3000
netstat -tulpn | grep 3000
lsof -i :3000
```

---

## Artifact Location

- **JSON**: `/opt/deep-agg/docs/_artifacts/2025-10-09/investment-deployment.json`
- **README**: `/opt/deep-agg/docs/_artifacts/2025-10-09/INVESTMENT-DEPLOYMENT.md`

---

**Deployed by**: GitHub Copilot (Tech Lead Mode)  
**Verification**: ✅ HTTP 200 OK, Next.js cache HIT, prerender enabled
