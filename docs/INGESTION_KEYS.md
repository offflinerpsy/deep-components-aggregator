# Ingestion API Keys (local/prod only)

Do NOT commit real keys. Put them under `secrets/apis/`:

- `secrets/apis/scraperapi.txt`
  - One key per line
  - Docs: https://docs.scraperapi.com/documentation-overview
- `secrets/apis/scrapingbee.txt`
  - One key per line
  - Docs: https://www.scrapingbee.com/documentation/
- `secrets/apis/scrapingbot.txt`
  - One key per line
  - Docs: https://www.scraping-bot.io/web-scraping-documentation

Example templates (do not commit real values):

```
secrets/apis/scraperapi.txt
secrets/apis/scrapingbee.txt
secrets/apis/scrapingbot.txt
```

Keys are read by the rotator at runtime; rotate on 429/402/5xx/timeout.
