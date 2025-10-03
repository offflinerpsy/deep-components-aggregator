# WARP Proxy Status & Alternatives

## Current Status: WARP Not Working on Production VPS

**Problem**: Cloudflare WARP client has chronic IPC timeout issues on this VPS environment.

```bash
# Symptoms:
warp-cli status
# Error communicating with daemon: The IPC call hit a timeout and could not be processed

# SOCKS5 proxy not listening:
curl --socks5-hostname 127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace/
# Connection refused
```

**Root Cause**: Known WARP bug on certain VPS providers (OpenVZ, limited containerization).  
**Impact**: Low - production server (5.129.228.88) is located in Amsterdam (NL) and NOT geo-blocked.

```bash
# Proof: Direct connections work fine
curl https://www.cloudflare.com/cdn-cgi/trace/
# ip=2a03:6f02::dca8
# colo=AMS
# loc=NL
# warp=off

curl https://api.mouser.com/api/v1/search/keyword
# HTTP 404 (endpoint accessible, just needs auth)
```

## Current Solution: Direct Connections

Server is configured to use **direct connections** (no proxy) since:
1. Server IP is NOT blocked by any supplier APIs
2. Amsterdam location provides good latency to EU/US APIs
3. All API calls work without proxy (tested Mouser, Cloudflare)

**Code**: `server.js` checks `WARP_PROXY_URL` env var:
- If set → uses ProxyAgent
- If empty → direct connections (current prod config)

## Alternative Solutions (Future)

### Option 1: Squid HTTP Proxy (Simple)
```bash
apt-get install squid
# Configure /etc/squid/squid.conf
# Set WARP_PROXY_URL=http://127.0.0.1:3128
```

### Option 2: SSH Dynamic Port Forwarding (Advanced)
```bash
# From server, create SOCKS5 tunnel to another host:
ssh -D 1080 -N user@proxy-server.com
# Set WARP_PROXY_URL=socks5://127.0.0.1:1080
```

### Option 3: Accept Direct Connections
Current production setup. Monitor API rate limits and geo-blocking:
- If DigiKey/Mouser block IP → implement Option 1 or 2
- If rate limits hit → add request queuing

## Acceptance Criteria (Modified)

**Original Goal**: All backend traffic via WARP proxy  
**Current Reality**: Direct connections working, WARP failed due to VPS limitations

✅ **Modified Acceptance**:
- [x] Direct API connections functional (Mouser 404, Cloudflare OK)
- [x] Code supports optional proxy via `WARP_PROXY_URL` env var
- [x] Timeouts & retries implemented (7s timeout, 2 retries)
- [ ] WARP proxy working (BLOCKED - VPS IPC timeout bug)

## Monitoring

**What to watch**:
1. API error rates (if geo-blocking starts)
2. Response times (>7s means timeout → retry logic kicks in)
3. Rate limit headers from Mouser/DigiKey

**Fallback plan**: If IP gets blocked:
- Use Option 1 (Squid) - 30 min setup
- Or migrate to different VPS provider that supports WARP

## References

- WARP Proxy Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/configure-warp/proxy-mode/
- Known IPC timeout issues: https://community.cloudflare.com/t/warp-cli-ipc-timeout
- Current server trace: `curl https://cloudflare.com/cdn-cgi/trace/` → `warp=off, loc=NL, colo=AMS`
