## What
- Leaf category pages prefetch and render only 10 cached items.
- Adds a "Show more" assistant (bottom sheet) with query examples and optional extra cache-only load.
- Adds a soft anti-spam prompt after rapid consecutive searches.
- Updates `/catalog` copy to reflect cache-first browsing.

## How to verify
- Build: `npm run -s build`
- Navigate: `/catalog` → open a leaf category without `q`; confirm 10 cached items.
- Click "Show more"; confirm assistant opens and can fetch 10 more from cache.

## Tracking
Related to deep-components-aggregator issues:
- #36
- #37
