# Server Projects Registry

**Last Updated**: 2025-10-09  
**Server**: 5.129.228.88

---

## Active Projects on This Server

This server hosts **multiple projects**. All projects must coordinate ports, resources, and configurations.

### 1. Deep-Agg (Component Aggregator)

**Location**: `/opt/deep-agg`  
**Port**: 9201  
**PM2 Process**: `deep-agg` (id: 0)  
**Type**: Express.js + SQLite  
**Repository**: Local/Private  
**Public URL**: http://5.129.228.88:9201

**Reserved Resources**:
- Port: 9201 (primary)
- Database: `/opt/deep-agg/data/db/deep-agg.db`
- Sessions: `/opt/deep-agg/data/db/sessions.db`
- Logs: `/opt/deep-agg/logs/`

**Environment Variables**:
- `PORT=9201`
- API keys: MOUSER_API_KEY, FARNELL_API_KEY, TME_TOKEN, etc.

---

### 2. Investment (Next.js Landing)

**Location**: `/var/www/investment`  
**Port**: 3000  
**PM2 Process**: `investment` (id: 1)  
**Type**: Next.js 15.2.4  
**Repository**: https://github.com/offflinerpsy/Investment.git  
**Public URL**: http://5.129.228.88:3000

**Reserved Resources**:
- Port: 3000 (primary)
- Build output: `/var/www/investment/.next/`
- Static files: `/var/www/investment/public/`

**Environment Variables**:
- `PORT=3000` (Next.js default)

---

### 3. Deep-Agg-Next (Next.js Frontend)

**Location**: `/opt/deep-agg-next`  
**Port**: 3001  
**PM2 Process**: `deep-agg-next` (id: 3)  
**Type**: Next.js 15.5.4 + React 19 + Tailwind CSS  
**Repository**: Local (будущий frontend для Deep-Agg)  
**Public URL**: http://5.129.228.88:3001

**Reserved Resources**:
- Port: 3001 (primary)
- Build output: `/opt/deep-agg-next/.next/`
- Static files: `/opt/deep-agg-next/public/`

**Environment Variables**:
- `PORT=3001`

**Purpose**: Современный Next.js frontend для Deep-Agg. Будет использовать Deep-Agg Express API (9201) как backend.

---

## Port Allocation Table

| Port | Project       | Protocol | Status | Purpose              |
|------|---------------|----------|--------|----------------------|
| 80   | NGINX/Reverse | HTTP     | Reserved | HTTP traffic        |
| 443  | NGINX/Reverse | HTTPS    | Reserved | HTTPS traffic       |
| 3000 | Investment    | HTTP     | ✅ Active | Next.js app         |
| 9201 | Deep-Agg      | HTTP     | ✅ Active | Aggregator API/UI   |

### Available Ports
- 3001-3099 (for future Next.js apps)
- 9202-9299 (for future Express apps)
- 8000-8099 (for Python/Django apps)

---

## Adding New Projects

When deploying a **new project** on this server:

1. **Check this registry** for port conflicts
2. **Choose an available port** from the ranges above
3. **Update this file** with new project details
4. **Add to PM2** with unique process name
5. **Test isolation**: verify no conflicts with existing projects
6. **Document in artifacts**: create deployment report in `/opt/deep-agg/docs/_artifacts/`

---

## PM2 Process Management

### View All Processes
```bash
export PATH="/usr/local/bin:$PATH"
pm2 status
```

### Restart Specific Project
```bash
pm2 restart deep-agg      # Restart aggregator only
pm2 restart investment    # Restart investment only
pm2 restart all           # Restart everything
```

### View Logs
```bash
pm2 logs                  # All projects
pm2 logs deep-agg         # Aggregator only
pm2 logs investment       # Investment only
```

### Stop Project
```bash
pm2 stop deep-agg
pm2 stop investment
```

---

## Firewall Rules

Current open ports:
```bash
ufw status
```

To allow new port:
```bash
ufw allow <PORT>/tcp
ufw reload
```

---

## Resource Monitoring

### Current Usage
```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk usage
df -h

# Memory
free -h
```

---

## Conflict Prevention Checklist

Before deploying new project:

- [ ] Port is unique (not in allocation table)
- [ ] Directory doesn't conflict with existing projects
- [ ] PM2 process name is unique
- [ ] No shared database files (unless intentional)
- [ ] Environment variables don't overlap
- [ ] Updated this registry file
- [ ] Tested with `curl http://localhost:<PORT>`
- [ ] Created deployment artifact in `/opt/deep-agg/docs/_artifacts/`

---

## Emergency Contacts

**Server Admin**: root@5.129.228.88  
**Documentation**: `/opt/deep-agg/docs/`  
**Artifacts**: `/opt/deep-agg/docs/_artifacts/`

---

## Change Log

| Date       | Project    | Action   | Port | Notes                  |
|------------|------------|----------|------|------------------------|
| 2025-10-09 | Investment | Deployed | 3000 | Initial deployment     |
| 2025-XX-XX | Deep-Agg   | Deployed | 9201 | Main aggregator        |

---

**Location**: `/opt/deep-agg/SERVER-PROJECTS.md`  
**Keep this file updated when deploying/removing projects!**
