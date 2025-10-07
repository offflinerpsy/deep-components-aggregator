# Provider Overview

The platform integrates with multiple electronic component suppliers to provide comprehensive search results.

## Supported Providers

| Provider | Auth Method | Coverage | API Version | Status |
|----------|------------|----------|-------------|--------|
| **Digi-Key** | OAuth 2.0 | Global | Product Info v4 | ✅ Active |
| **Mouser** | API Key | US/Global | Search API v1 | ⚠️ Needs Key |
| **Farnell** | API Key | UK/EU | Partner API | ⚠️ Needs Key |
| **TME** | Token/Secret | EU | Developer API | ⚠️ Needs Key |

## Provider Selection Logic

### Primary Source Selection

The system selects a primary data source based on:

1. **Data Completeness**: Provider must have both pricing and stock
2. **Response Speed**: Faster provider preferred
3. **Data Quality**: More complete technical specifications preferred

### Supplementary Data

Non-primary providers contribute:
- Additional technical specifications
- Alternative package information
- Regional availability data
- Cross-reference information

## Configuration

Provider credentials are configured via environment variables:

```bash
# Digi-Key OAuth 2.0
DIGIKEY_CLIENT_ID=your_client_id
DIGIKEY_CLIENT_SECRET=your_client_secret

# Mouser API Key
MOUSER_API_KEY=your_api_key

# Farnell API
FARNELL_API_KEY=your_api_key
FARNELL_REGION=uk.farnell.com

# TME API
TME_TOKEN=your_token
TME_SECRET=your_secret
```

## Health Monitoring

Provider status is available via `/api/health`:

```json
{
  "sources": {
    "digikey": { "status": "configured", "note": "OAuth credentials present" },
    "mouser": { "status": "disabled" },
    "farnell": { "status": "disabled" },
    "tme": { "status": "disabled" }
  }
}
```

Status values:
- `configured`: API credentials present and valid
- `disabled`: No credentials configured
- `error`: Credentials present but authentication failed

## Rate Limits

Each provider has different rate limiting policies:

- **Digi-Key**: 1000 requests/hour (with OAuth token refresh)
- **Mouser**: 1000 requests/day
- **Farnell**: Varies by partner agreement
- **TME**: 1000 requests/day

## Error Handling

The system implements graceful degradation:

1. **Single Provider Failure**: Continue with available providers
2. **Authentication Errors**: Mark provider as disabled, continue with others
3. **Rate Limit Exceeded**: Temporary backoff, fallback to cache
4. **Network Timeouts**: Configurable timeout (default 10s)
