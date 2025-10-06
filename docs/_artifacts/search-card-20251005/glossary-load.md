# DeepL Glossary Upload Instructions
## Date: 2025-10-05

## Prerequisites
- DeepL API Auth Key (Free or Pro tier)
- glossary.csv file (170+ RU→EN electronics terms)

## Upload Process

### 1. API Endpoint
```
POST https://api.deepl.com/v2/glossaries
```

### 2. Request Headers
```http
Authorization: DeepL-Auth-Key YOUR_KEY_HERE
Content-Type: application/json
```

### 3. Request Body
```json
{
  "name": "Electronics RU-EN v1.0",
  "source_lang": "ru",
  "target_lang": "en",
  "entries_format": "csv",
  "entries": "русский,english\nтранзистор,transistor\n..."
}
```

### 4. Expected Response
```json
{
  "glossary_id": "abc12345-6789-def0-1234-567890abcdef",
  "name": "Electronics RU-EN v1.0",
  "ready": true,
  "source_lang": "ru",
  "target_lang": "en",
  "creation_time": "2025-10-05T16:30:00.000Z",
  "entry_count": 170
}
```

### 5. Save Glossary ID
**IMPORTANT:** Store the `glossary_id` from response. This ID is required for translation API calls.

Example:
```javascript
const DEEPL_GLOSSARY_ID = "abc12345-6789-def0-1234-567890abcdef";
```

## Using Glossary in Translation

### API Call Example
```http
POST https://api.deepl.com/v2/translate
Authorization: DeepL-Auth-Key YOUR_KEY_HERE
Content-Type: application/json

{
  "text": ["конденсатор 1000мкФ 25В"],
  "source_lang": "RU",
  "target_lang": "EN",
  "glossary_id": "abc12345-6789-def0-1234-567890abcdef"
}
```

### Response
```json
{
  "translations": [
    {
      "detected_source_language": "RU",
      "text": "capacitor 1000uF 25V"
    }
  ]
}
```

## Verification

### Test Query
```bash
curl -X POST "https://api.deepl.com/v2/translate" \
  -H "Authorization: DeepL-Auth-Key YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "text": ["транзистор 2N3904"],
    "source_lang": "RU",
    "target_lang": "EN",
    "glossary_id": "YOUR_GLOSSARY_ID"
  }'
```

Expected: `{"translations":[{"detected_source_language":"RU","text":"transistor 2N3904"}]}`

## Glossary Management

### List All Glossaries
```bash
curl -X GET "https://api.deepl.com/v2/glossaries" \
  -H "Authorization: DeepL-Auth-Key YOUR_KEY_HERE"
```

### Get Glossary Info
```bash
curl -X GET "https://api.deepl.com/v2/glossaries/YOUR_GLOSSARY_ID" \
  -H "Authorization: DeepL-Auth-Key YOUR_KEY_HERE"
```

### Delete Glossary
```bash
curl -X DELETE "https://api.deepl.com/v2/glossaries/YOUR_GLOSSARY_ID" \
  -H "Authorization: DeepL-Auth-Key YOUR_KEY_HERE"
```

## Limitations (DeepL Free Tier)

- **Characters/Month:** 500,000 (across all translation requests)
- **Glossary Entries:** Up to 1,000 terms per glossary
- **Max Glossaries:** Multiple glossaries supported (no official limit)
- **Rate Limits:** No documented hard limits (reasonable use policy)

## Glossary ID (To Be Filled After Upload)

```
GLOSSARY_ID: [PENDING - Upload glossary.csv to DeepL and paste ID here]
```

**Status:** ⏸️ PENDING - Requires manual upload or automated script

**Next Steps:**
1. Obtain DeepL API key (free tier: https://www.deepl.com/pro-api)
2. Run upload script: `node scripts/upload-glossary-to-deepl.mjs`
3. Record glossary_id in this file
4. Update RU→EN pipeline code with glossary_id constant

## References

- DeepL Glossaries API: https://developers.deepl.com/api-reference/multilingual-glossaries
- Create Glossary Endpoint: https://developers.deepl.com/api-reference/multilingual-glossaries/create-a-glossary
- Authentication: https://developers.deepl.com/docs/authentication
