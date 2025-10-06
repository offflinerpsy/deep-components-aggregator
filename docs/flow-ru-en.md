# RU→EN Query Translation Pipeline
## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    User Query (Mixed RU/EN)                      │
│              "конденсатор 1000мкФ 25В ATmega328P"                │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: Language Detection                                     │
│  ────────────────────────────────────────────────────────────────│
│  • Check if query contains Cyrillic characters                   │
│  • If only Latin → skip translation, pass through                │
│  • If mixed/Cyrillic → proceed to Stage 2                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: MPN Extraction                                         │
│  ────────────────────────────────────────────────────────────────│
│  • Pattern matching: alphanumeric sequences (e.g. ATmega328P)    │
│  • Extract manufacturer part numbers from query                  │
│  • Store extracted MPNs separately                               │
│  • Remove MPNs from translation target                           │
│  Output: {mpns: ["ATmega328P"], textToTranslate: "конденсатор   │
│          1000мкФ 25В"}                                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: Units Normalization                                    │
│  ────────────────────────────────────────────────────────────────│
│  • Load: units-normalization.csv (RU → SI/EN mappings)           │
│  • Replace: мкФ → uF, кОм → kΩ, В → V, мА → mA, etc.            │
│  • Case-insensitive matching                                     │
│  Output: "конденсатор 1000uF 25V"                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: Term Translation (Cascading Providers)                 │
│  ────────────────────────────────────────────────────────────────│
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 4.1: Local Glossary Lookup (glossary.csv)                 │  │
│  │ ─────────────────────────────────────────────────────────  │  │
│  │ • Load 170+ RU→EN electronics term pairs                   │  │
│  │ • Match exact words (whole-word boundary)                  │  │
│  │ • If all terms found → skip provider calls (fast path)     │  │
│  │ Example: "конденсатор" → "capacitor"                       │  │
│  └───────────────────┬───────────────────────────────────────┘  │
│                      │ (if partial match or miss)                │
│                      ▼                                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 4.2: Azure AI Translator (F0 Tier)                         │  │
│  │ ─────────────────────────────────────────────────────────  │  │
│  │ • Endpoint: https://api.cognitive.microsofttranslator.com  │  │
│  │ • Quota: 2M characters/month FREE                          │  │
│  │ • Timeout: 9.5s                                            │  │
│  │ • API: /translate?api-version=3.0&from=ru&to=en            │  │
│  │ • Header: Ocp-Apim-Subscription-Key                        │  │
│  │ • If success → cache result, return translation            │  │
│  │ • If quota exceeded (429) or timeout → fallback to 4.3     │  │
│  └───────────────────┬───────────────────────────────────────┘  │
│                      │ (on error/unavailable)                    │
│                      ▼                                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 4.3: DeepL API (with Glossaries)                           │  │
│  │ ─────────────────────────────────────────────────────────  │  │
│  │ • Endpoint: https://api.deepl.com/v2/translate             │  │
│  │ • Glossary: Pre-uploaded glossary ID (from glossary.csv)   │  │
│  │ • API: POST /translate (source_lang=RU, target_lang=EN)    │  │
│  │ • Header: Authorization: DeepL-Auth-Key                    │  │
│  │ • Glossary enforcement: glossary_id parameter              │  │
│  │ • If success → cache result, return translation            │  │
│  │ • If unavailable → fallback to 4.4                         │  │
│  └───────────────────┬───────────────────────────────────────┘  │
│                      │ (last resort)                             │
│                      ▼                                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 4.4: LRU Cache + Warning                                   │  │
│  │ ─────────────────────────────────────────────────────────  │  │
│  │ • Check LRU cache (TTL=30 days)                            │  │
│  │ • If cached translation exists → return cached             │  │
│  │ • If no cache → return original query + warning flag       │  │
│  │ • Log: "Translation providers unavailable"                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: Assembly                                               │
│  ────────────────────────────────────────────────────────────────│
│  • Combine: [Translated Terms] + [MPNs] + [Normalized Units]    │
│  • Order preservation: maintain original query structure         │
│  • Output: "capacitor 1000uF 25V ATmega328P"                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Final EN Query → Search API                     │
│                 (Mouser/DigiKey/Farnell/TME)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Provider Quotas & Limits

### Azure AI Translator (F0 - Free Tier)
- **Characters/Month:** 2,000,000 (FREE)
- **Requests/Minute:** No official limit (reasonable use)
- **Authentication:** Subscription Key (Ocp-Apim-Subscription-Key header)
- **Endpoint:** `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0`
- **Documentation:** https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator/

### DeepL API (Free Tier)
- **Characters/Month:** 500,000 (FREE)
- **Requests:** No official limit
- **Glossaries:** Up to 1,000 entries per glossary
- **Authentication:** DeepL-Auth-Key header
- **Endpoint:** `https://api.deepl.com/v2/translate`
- **Documentation:** https://developers.deepl.com/api-reference/multilingual-glossaries

### Google Programmable Search (JSON API)
- **Searches/Day:** 100 (FREE)
- **Paid Tier:** $5 per 1,000 queries (up to 10,000/day max)
- **Use Case:** Admin link search for MPN references
- **Endpoint:** `https://www.googleapis.com/customsearch/v1`
- **Documentation:** https://developers.google.com/custom-search/v1/overview

## Caching Strategy

### LRU Cache Configuration
- **Max Size:** 10,000 entries
- **TTL:** 30 days (2,592,000 seconds)
- **Eviction:** Least Recently Used when cache full
- **Persistence:** In-memory (Redis optional for production)

### Cache Key Format
```
cache:ru-en:${hashQuery(originalQuery)}
```

### Cache Entry Structure
```json
{
  "original": "конденсатор 1000мкФ 25В",
  "translated": "capacitor 1000uF 25V",
  "provider": "glossary|azure|deepl|cache",
  "timestamp": 1696521600000,
  "ttl": 2592000
}
```

## Quota Monitoring & Alerts

### Tracking
- Count characters sent to Azure/DeepL per request
- Accumulate daily/monthly totals
- Store in metrics database

### Alert Thresholds
- **80% quota consumed:** Warning log
- **90% quota consumed:** Email notification (if configured)
- **100% quota consumed:** Fallback to next provider + error log

### Metrics Collection
```javascript
{
  "azure": {
    "chars_used_today": 45000,
    "chars_used_month": 1250000,
    "quota_pct": 62.5,
    "requests_today": 823
  },
  "deepl": {
    "chars_used_month": 120000,
    "quota_pct": 24.0
  }
}
```

## Error Handling

### Provider Timeout (9.5s)
- Abort request via AbortController
- Log: "Azure translation timeout for query: ..."
- Fallback to next provider immediately

### 429 Too Many Requests
- Log: "Azure quota exceeded"
- Fallback to DeepL
- Set quota alert flag

### Network Error
- Retry once (with 500ms delay)
- If retry fails → fallback to next provider

### All Providers Failed
- Return original query (untranslated)
- Set warning flag: `{ translated: false, reason: "all_providers_unavailable" }`
- User sees original query results + warning banner

## Performance Targets

- **Glossary Lookup:** <1ms (in-memory hash map)
- **Azure Translation:** <500ms typical, 9.5s max
- **DeepL Translation:** <800ms typical, 9.5s max
- **Total Pipeline:** <2s end-to-end (glossary fast path)

## Integration Points

### Search API Middleware
```javascript
// Before search execution
if (queryContainsCyrillic(query)) {
  const { translated, warning } = await translateRuToEn(query);
  query = translated;
  if (warning) {
    response.meta.translationWarning = warning;
  }
}
```

### Admin Panel
- View daily/monthly quota usage
- Upload/update glossary.csv
- Clear translation cache
- Test query translation (debug tool)

## References

1. Azure Translator F0: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator/
2. DeepL Glossaries: https://developers.deepl.com/api-reference/multilingual-glossaries
3. Google Custom Search: https://developers.google.com/custom-search/v1/overview
4. Cloudflare WARP Timeout: https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/configure-warp/warp-modes/
