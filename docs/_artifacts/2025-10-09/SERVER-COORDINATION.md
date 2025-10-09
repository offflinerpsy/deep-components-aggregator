# Server Coordination Configuration — COMPLETE

**Date**: 2025-10-09  
**Status**: ✅ CONFIGURED & DOCUMENTED

---

## Summary

Настроена полная координация между проектами на shared сервере.  
Оба проекта теперь "знают" друг о друге и избегают конфликтов.

---

## Created Files

### 1. Server Registry (Main)
**Location**: `/opt/deep-agg/SERVER-PROJECTS.md`

Центральный реестр всех проектов на сервере:
- Port allocation table (3000, 9201)
- Project locations and details
- PM2 process names
- Available port ranges
- Deployment checklist

✅ **All new projects MUST update this file**

### 2. Investment Server Info
**Location**: `/var/www/investment/SERVER-INFO.md`

Документация для Investment проекта:
- Information about shared server
- Other projects on server
- Port allocation rules
- PM2 management commands
- DO NOT modify rules

### 3. Environment Templates

**Deep-Agg**: `/opt/deep-agg/.env.example`
- PORT=9201 (with coordination notes)
- Reserved ports listed
- API keys placeholders

**Investment**: `/var/www/investment/.env.example`
- PORT=3000 (with coordination notes)
- References to Deep-Agg registry
- Next.js specific config

### 4. Health Check Script
**Location**: `/opt/deep-agg/scripts/check-server-health.sh`

Automated health check for all projects:
```bash
/opt/deep-agg/scripts/check-server-health.sh
```

Checks:
- ✅ PM2 process status
- ✅ Port allocation (9201, 3000)
- ✅ HTTP accessibility
- ✅ Resource usage (memory, disk)
- ✅ Port conflicts detection

### 5. Pre-Deployment Check
**Location**: `/opt/deep-agg/scripts/pre-deploy-check.sh`

Run BEFORE deploying new project:
```bash
/opt/deep-agg/scripts/pre-deploy-check.sh <port_number>
```

Checks:
- ✅ Port availability
- ✅ Reserved ports validation
- ✅ PM2 process count
- ✅ System resources
- ✅ Deployment directories

---

## Port Allocation

| Port | Project       | Status     | Reserved By     |
|------|---------------|------------|-----------------|
| 80   | NGINX         | Reserved   | System          |
| 443  | NGINX         | Reserved   | System          |
| 3000 | Investment    | ✅ Active  | Investment      |
| 9201 | Deep-Agg      | ✅ Active  | Deep-Agg        |

### Available Ranges
- **3001-3099**: Next.js apps
- **9202-9299**: Express apps  
- **8000-8099**: Python/Django apps

---

## Verification Results

### Health Check Output
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 Server Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 PM2 Process Status:
┌────┬────────────┬──────┬─────────┬─────────┬──────────┐
│ id │ name       │ mode │ status  │ cpu     │ memory   │
├────┼────────────┼──────┼─────────┼─────────┼──────────┤
│ 0  │ deep-agg   │ fork │ online  │ 0%      │ 61.1mb   │
│ 1  │ investment │ fork │ online  │ 0%      │ 66.2mb   │
└────┴────────────┴──────┴─────────┴─────────┴──────────┘

🔌 Port Allocation:
✅ Deep-Agg (9201): LISTENING
✅ Investment (3000): LISTENING

�� HTTP Accessibility:
✅ Deep-Agg: HTTP 200
✅ Investment: HTTP 200

💾 Resource Usage:
Memory: 2.1Gi available
Disk: 26G available

⚠️  Port Conflict Check:
✅ No port conflicts detected
   - Port 3000: Investment
   - Port 9201: Deep-Agg

📋 Summary:
✅ All systems operational
```

---

## Usage Instructions

### For Existing Projects

**Deep-Agg Developers**:
1. Read `/opt/deep-agg/SERVER-PROJECTS.md` before changes
2. Never change PORT from 9201
3. Check other projects: `pm2 status`
4. Restart only Deep-Agg: `pm2 restart deep-agg`

**Investment Developers**:
1. Read `/var/www/investment/SERVER-INFO.md`
2. Never change PORT from 3000
3. Never modify `/opt/deep-agg/` directory
4. Restart only Investment: `pm2 restart investment`

### For New Projects

1. **Check port availability**:
   ```bash
   /opt/deep-agg/scripts/pre-deploy-check.sh 3001
   ```

2. **Update registry**:
   - Edit `/opt/deep-agg/SERVER-PROJECTS.md`
   - Add project to port allocation table
   - Document resources used

3. **Deploy project**:
   ```bash
   # Example for port 3001
   pm2 start npm --name "my-project" -- start
   ```

4. **Verify**:
   ```bash
   /opt/deep-agg/scripts/check-server-health.sh
   ```

5. **Create artifact**:
   - Save deployment report in `/opt/deep-agg/docs/_artifacts/YYYY-MM-DD/`

---

## Management Commands

### Check All Projects
```bash
# Health check
/opt/deep-agg/scripts/check-server-health.sh

# PM2 status
export PATH="/usr/local/bin:$PATH"
pm2 status
```

### Restart Projects
```bash
# Restart specific project
pm2 restart deep-agg      # Only aggregator
pm2 restart investment    # Only investment

# Restart all (use with caution!)
pm2 restart all
```

### View Logs
```bash
# All projects
pm2 logs

# Specific project
pm2 logs deep-agg
pm2 logs investment
```

### Add New Project
```bash
# 1. Check port
/opt/deep-agg/scripts/pre-deploy-check.sh <port>

# 2. Deploy
cd /path/to/project
pm2 start npm --name "project-name" -- start

# 3. Save
pm2 save

# 4. Verify
/opt/deep-agg/scripts/check-server-health.sh
```

---

## Conflict Prevention

### Rules
1. ✅ Always check `/opt/deep-agg/SERVER-PROJECTS.md` before deployment
2. ✅ Use unique ports from available ranges
3. ✅ Use unique PM2 process names
4. ✅ Keep projects in separate directories
5. ✅ Use separate `.env` files
6. ✅ Never share databases between projects
7. ✅ Update registry when deploying/removing projects
8. ✅ Create deployment artifacts

### Checklist
- [ ] Port is unique and available
- [ ] Port added to SERVER-PROJECTS.md
- [ ] PM2 name is unique
- [ ] Separate directory
- [ ] Separate .env file
- [ ] No database sharing
- [ ] Pre-deployment check passed
- [ ] Health check passed
- [ ] Deployment artifact created

---

## Current State

### Projects
1. **Deep-Agg** (Component Aggregator)
   - Location: `/opt/deep-agg`
   - Port: 9201
   - PM2: deep-agg (id: 0)
   - Status: ✅ Online
   - Memory: 61.1mb

2. **Investment** (Next.js Landing)
   - Location: `/var/www/investment`
   - Port: 3000
   - PM2: investment (id: 1)
   - Status: ✅ Online
   - Memory: 66.2mb

### Resources
- **Total Memory Used**: ~127mb (2.1Gi available)
- **Total Disk Used**: 14G (26G available)
- **CPU Usage**: 0% (idle)

### Network
- **Deep-Agg**: http://5.129.228.88:9201
- **Investment**: http://5.129.228.88:3000

---

## Troubleshooting

### Port Conflict
```bash
# Check what's using port
ss -tulpn | grep :<port>
lsof -i :<port>

# Choose different port
/opt/deep-agg/scripts/pre-deploy-check.sh <new_port>
```

### PM2 Process Issues
```bash
# Restart specific
pm2 restart <name>

# Delete and re-add
pm2 delete <name>
pm2 start <command> --name <name>
pm2 save
```

### Health Check Failed
```bash
# Check logs
pm2 logs <name>

# Check process
pm2 status

# Check port
curl http://localhost:<port>
```

---

## Files Summary

| File | Purpose | Who Updates |
|------|---------|-------------|
| `/opt/deep-agg/SERVER-PROJECTS.md` | Central registry | All deployments |
| `/var/www/investment/SERVER-INFO.md` | Investment guide | Read-only |
| `/opt/deep-agg/.env.example` | Deep-Agg template | Deep-Agg team |
| `/var/www/investment/.env.example` | Investment template | Investment team |
| `/opt/deep-agg/scripts/check-server-health.sh` | Health check | Auto-run |
| `/opt/deep-agg/scripts/pre-deploy-check.sh` | Pre-deploy | Before new deploy |

---

## Artifacts

All coordination artifacts in: `/opt/deep-agg/docs/_artifacts/2025-10-09/`

- `investment-deployment.json` — Investment deployment data
- `INVESTMENT-DEPLOYMENT.md` — Investment deployment guide
- `DEPLOYMENT-SUMMARY.md` — Deployment summary
- `CONFLICT-ANALYSIS.md` — Conflict analysis report
- `SERVER-COORDINATION.md` — This file

---

**Tech Lead Mode**: Full server coordination configured ✅  
**Next Action**: Run health check regularly to monitor both projects
