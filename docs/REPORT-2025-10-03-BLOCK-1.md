# Block 1 Report: WARP Proxy-Mode Setup

**Date:** October 3, 2025  
**Branch:** `stabilize/video-warp-auth-admin-card`  
**Status:** ✅ Implementation Complete (Server setup pending)

---

## Objective

Route all backend HTTP(S) traffic through Cloudflare WARP proxy (port 40000) to:
- Bypass provider IP blocks (DigiKey 403 → 200/401/404)
- Consistent egress IP for rate limiting
- Respect 10s timeout limit in proxy mode

---

## Implementation

### 1. Proxy Bootstrap (Already Complete)

**File:** `src/bootstrap/proxy.mjs`

```javascript
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const disabled = ['NO_PROXY', 'DIRECT_CONNECTIONS', 'WARP_DISABLE'].some(
  (k) => String(process.env[k] || '') === '1'
);

const proxyUrl = process.env.WARP_PROXY_URL || 'http://127.0.0.1:40000';

try {
  if (disabled) {
    console.log('📡 Direct connections enforced');
  } else {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    console.log(`🔒 Global HTTP proxy enabled: ${proxyUrl}`);
  }
} catch (e) {
  console.warn(`⚠️ Proxy bootstrap failed: ${e.message}`);
}
```

**Integration:** `server.js` imports this module **before** any HTTP clients:
```javascript
import 'dotenv/config';
import './src/bootstrap/proxy.mjs'; // ← First import
```

**Control:**
- Default: WARP proxy enabled (`http://127.0.0.1:40000`)
- Override: `WARP_PROXY_URL=http://custom:port`
- Disable: `NO_PROXY=1` or `DIRECT_CONNECTIONS=1` or `WARP_DISABLE=1`

---

### 2. WARP Installation Script

**File:** `scripts/setup-warp.sh`

**Purpose:** Automated WARP installation and configuration on Debian/Ubuntu servers.

**Steps:**
1. Install `cloudflare-warp` from official Cloudflare APT repository
2. Stop service for reconfiguration
3. Register client (accept ToS)
4. Set proxy mode: `warp-cli set-mode proxy`
5. Set port: `warp-cli set-proxy-port 40000`
6. Enable and start `warp-svc` service
7. Connect: `warp-cli connect`
8. Verify: `curl --socks5 127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace/`

**Usage:**
```bash
bash scripts/setup-warp.sh
```

**Expected output:**
```
✅ Proxy verification successful!
   WARP: on
   IP:   104.28.x.x (Cloudflare IP)
```

---

### 3. Provider Smoke Check Enhancement

**File:** `scripts/check-providers.mjs`

**Improvements:**
- ✅ Detailed console output with progress indicators
- ✅ HTTP status codes and timing in report
- ✅ DigiKey as proxy health indicator (403 without proxy → 200+ with proxy)
- ✅ JSON artifact with full metadata: proxy config, timing, errors
- ✅ Exit code: 0 if all providers respond, 1 if any fail

**Usage:**
```bash
# With proxy (default)
npm run providers:check

# Without proxy (for comparison)
NO_PROXY=1 npm run providers:check
```

**Artifact:** `docs/_artifacts/providers-<timestamp>.json`

**Example output:**
```
=== Results Summary ===
  mouser    : ✅ OK (99ms) — HTTP 200, 12 results
  tme       : ✅ OK (384ms) — HTTP 200, 5 results
  farnell   : ✅ OK (1267ms) — HTTP 200, 3 results
  digikey   : ✅ OK (2145ms) — HTTP 200, 8 results

✅ DigiKey accessible → Proxy is working
```

---

## Testing

### Local Testing (Development Machine)

**Without WARP (expected: DigiKey 403):**
```bash
NO_PROXY=1 node scripts/check-providers.mjs
```

**Result:** DigiKey returns 403 Blocked (IP not whitelisted).

**With proxy configured but WARP not running:**
```bash
node scripts/check-providers.mjs
```

**Result:** Mouser/Farnell OK (0 results for test query), TME/DigiKey FAIL (fetch failed — proxy not listening on port 40000).

### Server Testing (Production)

**After running `setup-warp.sh`:**

1. **Verify WARP status:**
   ```bash
   warp-cli status
   # Expected: Status update: Connected
   ```

2. **Verify trace:**
   ```bash
   curl --socks5 127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace/
   # Expected: warp=on, ip=<Cloudflare IP>
   ```

3. **Run provider check:**
   ```bash
   npm run providers:check
   ```

4. **Expected result:**
   - Mouser: ✅ (200)
   - TME: ✅ (200)
   - Farnell: ✅ (200)
   - **DigiKey: ✅ (200/401/404 — NOT 403)**

---

## Acceptance Criteria

- [x] **Proxy bootstrap:** `src/bootstrap/proxy.mjs` sets Undici global dispatcher
- [x] **Server integration:** Imported first in `server.js`
- [x] **Installation script:** `setup-warp.sh` automates WARP setup
- [ ] **WARP active:** `warp-cli status` → Connected (server-side pending)
- [ ] **Trace verification:** `cdn-cgi/trace` → `warp=on` (server-side pending)
- [x] **Provider check:** Enhanced with detailed diagnostics and exit codes
- [ ] **DigiKey test:** Responds with non-403 status when proxy active (server-side pending)

---

## Files Changed

### Created
- `scripts/setup-warp.sh` — Automated WARP installation and configuration

### Modified
- `scripts/check-providers.mjs` — Enhanced diagnostics, DigiKey proxy indicator, better output

### Previously Created (from feat branch)
- `src/bootstrap/proxy.mjs` — Undici ProxyAgent bootstrap
- `server.js` — Early import of proxy bootstrap

---

## Next Steps

1. **Server deployment:**
   ```bash
   ssh user@server
   cd /path/to/app
   bash scripts/setup-warp.sh
   ```

2. **Verify WARP:**
   ```bash
   warp-cli status
   curl --socks5 127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace/
   ```

3. **Run provider check on server:**
   ```bash
   npm run providers:check
   ```

4. **Commit artifacts:**
   ```bash
   git add docs/_artifacts/providers-*.json
   git commit -m "[WARP] server setup complete + provider check artifacts"
   ```

---

## References

- [Cloudflare WARP Documentation](https://developers.cloudflare.com/warp-client/)
- [Undici ProxyAgent](https://undici.nodejs.org/#/docs/api/ProxyAgent)
- [Cloudflare Trace Endpoint](https://www.cloudflare.com/cdn-cgi/trace/)

---

**Status:** Code complete, awaiting server deployment for final verification.  
**Next Block:** Block 2 — Sessions behind proxy/HTTPS
