# Sidebar fix proof (2026-01-21)

## Context
Global catalog sidebar is implemented in `v0-components-aggregator-page/components/CatalogSidebar.tsx`.

## What was changed
- Sidebar now has a single `closeSidebar()` path that:
  - closes the overlay
  - resets the active `NavigationMenu` item (prevents stale open flyouts on next open)
- The sidebar panel is now a proper flex column container.
- Footer is now in normal flex flow (`mt-auto`) instead of `position: absolute`, so it no longer overlaps the scrollable category list.

## How to verify manually (desktop)
1. Open `http://localhost:3000/catalog`.
2. Click the left floating tab `Каталог`.
3. Scroll the category list to the bottom:
   - expected: last items remain clickable; footer does not cover them.
4. Open any category flyout, then close the sidebar (ESC or click backdrop) and open again:
   - expected: flyout is reset (no stale open subpanel).

## Basic route health
See `http-status.txt` in this folder.
