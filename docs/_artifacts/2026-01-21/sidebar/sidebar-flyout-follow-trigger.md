# Sidebar: flyout follows trigger (scroll-safe)

## Problem
When the categories list is scrolled, a hovered item can be near the bottom, but the flyout (`NavigationMenu.Viewport`) was pinned to `top: 0` outside the scroll area.
This makes the subcategory panel appear near the top, so the user can’t reach it with the mouse before the hover state closes.

## Fix
- Compute `viewportTop` from the active trigger’s `getBoundingClientRect()` relative to the `NavigationMenu.Root` rect.
- Position the `Viewport` container with `style={{ top: viewportTop }}` so the flyout appears next to the active category.
- Recompute on:
  - `activeCategory` change
  - scroll of the categories list viewport (`data-radix-scroll-area-viewport`)

## Manual verify
1) Open sidebar, scroll to bottom.
2) Hover a category near bottom.
3) Expected: flyout appears vertically aligned near the hovered category, and it’s reachable with a short mouse movement.

## Files
- `components/CatalogSidebar.tsx`
