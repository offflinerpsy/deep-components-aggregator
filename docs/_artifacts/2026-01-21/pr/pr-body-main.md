## What
- Catalog leaf pages show 10 cached items (cache-only) and avoid provider calls by default.
- "Show more" opens an on-page assistant with query examples and optional extra cache-only fetch.
- Adds a soft anti-spam guard for rapid consecutive searches.
- Ignores SQLite `*.sqlite-wal`/`*.sqlite-shm` to keep git clean.

## Why
Reduce expensive provider traffic and improve UX when browsing categories without a specific MPN/query.

## How to verify
- Open `/catalog` and a leaf category; confirm it shows 10 cached items without triggering live search.
- Click "Show more" and confirm the assistant appears with examples.
- Trigger >10 searches in ~60s and confirm the assistant suggests narrowing (with "Search anyway").

## Tracking
- Fixes #36
- Fixes #37

## Notes
This PR complements the frontend PR in the v0 repo (`v0-components-aggregator-page`) on the same branch name.
