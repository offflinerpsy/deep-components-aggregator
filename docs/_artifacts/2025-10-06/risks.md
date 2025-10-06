# Production Risks — 2025-10-06

## Critical Issues

### 1. **No /metrics endpoint (404)**
- **Risk**: No observability via Prometheus
- **Impact**: Cannot monitor SLOs, latency, error rates
- **Fix**: Implement Prometheus metrics with prom-client (already in dependencies)

### 2. **Empty pricing data**
- **Symptom**: `pricing: []` in all DigiKey results
- **Impact**: Users cannot see prices in ₽ or source currency
- **Fix**: Debug DigiKey normalization pipeline (normDigiKey function)

### 3. **Critical fields null**
- **Symptom**: `mpn: null`, `title: null`, `description: null`
- **Impact**: UI shows incomplete product data
- **Fix**: Verify DigiKey API response mapping in normalization layer

### 4. **Only DigiKey active**
- **Status**: Mouser/TME/Farnell disabled (missing API keys)
- **Impact**: Limited product coverage, single source dependency
- **Fix**: Configure missing provider credentials

### 5. **No systemd service**
- **Status**: Server runs manually in background (PID 21327)
- **Impact**: No auto-restart, no proper logging, manual management
- **Fix**: Create proper systemd unit file

### 6. **Not a git repository**
- **Status**: `/opt/deep-agg` is NOT a git repo
- **Impact**: Cannot verify deployment version, no rollback capability
- **Fix**: Initialize git or deploy from git-managed source

## Medium Priority

### 7. **PATH environment broken**
- **Symptom**: Basic commands (ls, node, date) require absolute paths
- **Impact**: Shell usability, automation scripts may fail
- **Fix**: Fix /root/.bashrc or shell initialization

### 8. **No visual regression tests**
- **Status**: No Playwright screenshots or Checkly monitoring
- **Impact**: UI regressions undetected
- **Fix**: Implement visual baselines

## Low Priority

### 9. **OAuth warnings**
- Google/Yandex/VK OAuth not configured
- **Impact**: Users cannot log in via social providers
- **Fix**: Configure OAuth or remove providers

---

**Next Steps**: Fix critical issues 1-6 before production traffic.
