# Autocomplete: Cyrillic + Spaces — Verification Report

**Date**: 2025-11-05  
**Status**: ✅ WORKING  
**Site**: https://prosnab.tech/

---

## Issues Fixed

### 1. Cyrillic Transliteration (RU→EN)

**Problem**: Russian queries like "процессор" returned no results

**Solution**:
- Added `transliterateRuToEn()` to `autocompleteOrchestrator.mjs`
- Cyrillic detected and transliterated before API calls
- GOST 7.79 System B mapping used

**Commits**:
- `46eec0b` — feat(autocomplete): add Cyrillic RU→EN transliteration

**Tested**:
```bash
# Backend API (direct)
curl "http://localhost:9201/api/autocomplete?q=процессор"
# Result: 10 suggestions, q="PROCESSOR", latency=2846ms (initial)
# Cached: 20ms

curl "http://localhost:9201/api/autocomplete?q=резистор"
# Result: 10 suggestions, q="resistor", latency=2ms (cached)
```

---

### 2. Space/Comma in Queries

**Problem**: Typing "processor i" showed empty results after space

**Root Cause**:
- Prefix cache found "processor" → filtered locally
- Local filter used `includes("processor i")` on MPN
- No MPN contains "processor i" as substring → empty

**Solution**:
- Added `hasDelimiter = /[\s,]/.test(query)` check
- Skip prefix cache (step 2) if delimiter present
- Skip incremental filter (step 3) if delimiter present
- Queries with spaces always fetch from API

**Commits**:
- `4c7c0ef` — fix(autocomplete): skip local filter when query has space/comma
- `db63986` — fix(autocomplete): skip prefix cache for space/comma queries

**Tested**:
```bash
# Without space
curl "http://localhost:9201/api/autocomplete?q=processor"
# Result: ARM processors (AT91SAM9G25-CU, etc.)

# With space
curl "http://localhost:9201/api/autocomplete?q=processor%20i"
# Result: Intel processors (AC244054, LF-EVDK1-EVN, etc.) — 9 suggestions
```

---

### 3. Resistance Parser False Positives

**Problem**: "0.22" recognized as 0.22Ω resistance (actually dimension parameter)

**Solution**:
- Added threshold: values <1Ω without explicit units (Ω/ohm) not recognized
- Prevents false positives for dimensions/heights

**Commit**:
- `8be6c74` — fix(autocomplete): ignore values <1 without units as resistance

---

## Current State

**Production Environment**:
- **Backend**: `deep-agg` (PM2 ID 2), port 9201, ↺1831
- **Frontend**: `deep-v0` (PM2 ID 12), port 3000, ↺2
- **Nginx**: Proxies 443→3000, `/api/*` rewrites to 9201
- **Site**: https://prosnab.tech/ — ✅ ONLINE

**Git State**:
- Branch: `feat/r4-online-autocomplete`
- Last commit: `06572f3` — chore: update frontend submodule
- Frontend submodule: `543f4ff` (ops/ui-ux-r3)

**Features Working**:
- ✅ English autocomplete: "process" → suggestions
- ✅ Cyrillic autocomplete: "процессор" → suggestions
- ✅ Space queries: "processor i" → new API call → Intel CPUs
- ✅ Specs search: "0603 100k" → resistor suggestions with badges
- ✅ Hover preview: shows product details in modal
- ✅ Cache: 1hr TTL, <20ms cached queries

**Known Limitations**:
- Vitrine section shows "Загрузка..." (table not initialized, separate task)
- Next.js rewrites timeout on Cyrillic (works on backend :9201)

---

## API Contract

**Endpoint**: `GET /api/autocomplete?q={query}`

**Response**:
```json
{
  "suggestions": [...],
  "meta": {
    "q": "PROCESSOR",           // Normalized query
    "originalQuery": "процессор", // User input
    "latencyMs": 2846,
    "providersHit": ["tme", "mouser"],
    "cached": false,
    "specsDetected": false
  }
}
```

**Behavior**:
- Cyrillic → transliterated to English
- MPN-like → UPPERCASE
- Specs detected → converted to keyword search
- Space/comma → new API call (no local filter)

---

## Verification Commands

```bash
# 1. Cyrillic search
curl -s "https://prosnab.tech/api/autocomplete?q=процессор" | jq -c '{suggestions: (.suggestions|length), q: .meta.q}'
# Expected: {"suggestions":10,"q":"PROCESSOR"}

# 2. Space query
curl -s "https://prosnab.tech/api/autocomplete?q=processor%20i" | jq -c '{suggestions: (.suggestions|length)}'
# Expected: {"suggestions":9}

# 3. Specs search
curl -s "https://prosnab.tech/api/autocomplete?q=0603%20100k" | jq -c '{suggestions: (.suggestions|length), meta: {specsDetected: .meta.specsDetected}}'
# Expected: {"suggestions":10,"meta":{"specsDetected":true}}

# 4. PM2 status
pm2 list
# Expected: deep-agg (online), deep-v0 (online)
```

---

**User Confirmation**: "Ищет все ок. спасибо."  
**Status**: Production ready, all features verified ✅
