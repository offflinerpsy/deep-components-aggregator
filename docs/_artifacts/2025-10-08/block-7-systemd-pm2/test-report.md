# Block 7: PM2 Systemd Integration — Test Report

**Date**: 2025-10-08  
**Goal**: Configure PM2 to auto-start via systemd after server reboot

---

## Summary

✅ **PM2 systemd service configured and tested**

| Component | Status | Details |
|-----------|--------|---------|
| Systemd unit | ✅ Created | `/etc/systemd/system/pm2-root.service` |
| EnvironmentFile | ✅ Added | `/etc/default/deep-agg` loaded on startup |
| PM2 dump | ✅ Saved | `/root/.pm2/dump.pm2` contains `deep-agg` config |
| Auto-start | ✅ Enabled | `systemctl enable pm2-root` |
| Service status | ✅ Active | `active (running)` |
| Application status | ✅ Online | `deep-agg` process healthy |

---

## Configuration

### Systemd Unit: `/etc/systemd/system/pm2-root.service`

```ini
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=root
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
EnvironmentFile=/etc/default/deep-agg
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=PM2_HOME=/root/.pm2
PIDFile=/root/.pm2/pm2.pid
Restart=on-failure

ExecStart=/usr/local/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/usr/local/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/usr/local/lib/node_modules/pm2/bin/pm2 kill

[Install]
WantedBy=multi-user.target
```

**Key Features**:
- `EnvironmentFile=/etc/default/deep-agg` — loads env vars (HTTP_PROXY, HTTPS_PROXY, PORT, NODE_ENV)
- `ExecStart=pm2 resurrect` — restores last saved PM2 state from `/root/.pm2/dump.pm2`
- `Restart=on-failure` — auto-restart PM2 daemon if it crashes
- `WantedBy=multi-user.target` — starts after network on boot

---

## Environment Variables Loaded

From `/etc/default/deep-agg`:

```bash
PORT=9201
NODE_ENV=production
LOG_LEVEL=info
HTTP_PROXY=http://127.0.0.1:18080
HTTPS_PROXY=http://127.0.0.1:18080
NO_PROXY=localhost,127.0.0.1
```

**Verification**:
```bash
$ pm2 env 0 | grep -E '(HTTP_PROXY|HTTPS_PROXY|PORT|NODE_ENV)'
PORT: 9201
NODE_ENV: production
HTTP_PROXY: http://127.0.0.1:18080
HTTPS_PROXY: http://127.0.0.1:18080
```

✅ All variables present in running process.

---

## Test Procedure

### 1. Generate systemd unit
```bash
$ pm2 startup systemd -u root --hp /root
[PM2] Writing init configuration in /etc/systemd/system/pm2-root.service
[PM2] [v] Command successfully executed.
```

### 2. Add EnvironmentFile
Modified `/etc/systemd/system/pm2-root.service` to include:
```ini
EnvironmentFile=/etc/default/deep-agg
```

### 3. Save PM2 configuration
```bash
$ pm2 save
[PM2] Successfully saved in /root/.pm2/dump.pm2
```

### 4. Reload systemd and enable service
```bash
$ systemctl daemon-reload
$ systemctl enable pm2-root
Created symlink /etc/systemd/system/multi-user.target.wants/pm2-root.service → /etc/systemd/system/pm2-root.service.
```

### 5. Test: Stop PM2, start via systemd
```bash
$ pm2 kill
[PM2] [v] PM2 Daemon Stopped

$ systemctl start pm2-root
$ systemctl status pm2-root
● pm2-root.service - PM2 process manager
     Loaded: loaded (/etc/systemd/system/pm2-root.service; enabled)
     Active: active (running) since Wed 2025-10-08 13:11:55 MSK
   Main PID: 328523 (PM2 v6.0.13: Go)
```

### 6. Verify application is running
```bash
$ pm2 list
┌────┬──────────┬──────┬──────┬──────────┬──────────┬──────────┐
│ id │ name     │ mode │ ↺    │ status   │ cpu      │ memory   │
├────┼──────────┼──────┼──────┼──────────┼──────────┼──────────┤
│ 0  │ deep-agg │ fork │ 5    │ online   │ 0%       │ 68.7mb   │
└────┴──────────┴──────┴──────┴──────────┴──────────┴──────────┘

$ curl -s http://127.0.0.1:9201/api/health | jq '.status'
"ok"
```

✅ **Application healthy and responding**

---

## Reboot Behavior (Expected)

After server reboot:
1. Systemd starts `pm2-root.service` automatically
2. PM2 daemon starts and loads `/etc/default/deep-agg` env vars
3. PM2 executes `pm2 resurrect` which reads `/root/.pm2/dump.pm2`
4. `deep-agg` process starts with correct configuration
5. Server listens on port 9201 with proxy settings

**No manual intervention required** ✅

---

## Troubleshooting Notes

### Issue 1: EADDRINUSE on resurrect

**Problem**: PM2 resurrect tried to start `deep-agg` multiple times, causing port conflicts.

**Root Cause**: Stale processes from previous manual PM2 sessions.

**Solution**:
1. Stop systemd service: `systemctl stop pm2-root`
2. Kill all PM2 processes: `pm2 kill`
3. Start fresh from ecosystem config: `pm2 start ecosystem.config.cjs`
4. Save state: `pm2 save`
5. Start via systemd: `systemctl start pm2-root`

**Restart count stabilized at 5** (initial startup attempts), then remained online.

---

## Files Created/Modified

### Created:
- `/etc/systemd/system/pm2-root.service` — PM2 systemd unit
- `/root/.pm2/dump.pm2` — PM2 process state dump
- `docs/_artifacts/2025-10-08/block-7-systemd-pm2/pm2-root.service` — backup
- `docs/_artifacts/2025-10-08/block-7-systemd-pm2/systemctl-status.txt` — status output
- `docs/_artifacts/2025-10-08/block-7-systemd-pm2/pm2-env.txt` — env verification
- `docs/_artifacts/2025-10-08/block-7-systemd-pm2/test-report.md` — this file

### Modified:
- `/etc/systemd/system/pm2-root.service` — added `EnvironmentFile=/etc/default/deep-agg`

---

## Next Steps

- ✅ Block 7 complete
- 🔜 Block 8: CI GitHub Actions (lint + smoke tests)
- 🔜 Block 9: Smoke tests + PR creation
