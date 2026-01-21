# Sidebar: flyout not hidden under footer

## Symptom
When selecting a category near the bottom, the flyout could be positioned too low and end up visually hidden under the sidebar footer.

## Fix
- Clamp `viewportTop` to the browser viewport (`window.innerHeight`) so the flyout stays fully visible even when the trigger is near the bottom.
- Add `ResizeObserver` on `NavigationMenu.Viewport` to reposition when flyout height changes (e.g., after subcategories load).
- Add `z-50` to the flyout wrapper so it stacks above the footer.

## Manual verify
1) Open sidebar.
2) Scroll categories near the bottom.
3) Hover a category with many subcategories.
4) Expected: flyout remains visible and not covered by the footer.

## Files
- `components/CatalogSidebar.tsx`
