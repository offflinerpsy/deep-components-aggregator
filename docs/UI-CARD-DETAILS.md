# Product Card v2 — Technical Specification

## Goal

Rebuild product card to:
* Make gallery compact, not width-consuming
* Give specifications and prices more space, readable with both 5 and 25 parameters
* Make **right sidebar** sticky (price/availability/CTA/documentation), not gallery
* Display price breaks compactly with modal "All prices" and "My quantity" filter
* Keep **current visual style** (colors/shadows/radii/fonts unchanged)

## Standards (reference when in doubt)

* CSS Grid: [MDN CSS grid layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
* Sticky positioning: [MDN position](https://developer.mozilla.org/en-US/docs/Web/CSS/position)
* Semantic `<dl>/<dt>/<dd>` for key-value pairs: [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dl)
* Long text wrapping: `overflow-wrap:anywhere`, `hyphens:auto` [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap)
* UX patterns: [Nielsen Norman Group](https://www.nngroup.com/articles/ecommerce-product-pages/)
* Gallery zoom: [Baymard Institute](https://baymard.com/blog/ensure-sufficient-image-resolution-and-zoom)
* Fonts: `font-display: swap` [web.dev](https://web.dev/articles/font-best-practices)

## Implementation Plan

### 1) Grid skeleton + sticky sidebar

* Wrap current markup:
  ```html
  <div class="product-card">
    <aside class="product-gallery">…</aside>
    <main class="product-main">…</main>
    <aside class="product-aside">…</aside>
  </div>
  ```
* Include `styles/card-detail.css`
* Check sticky: **no ancestor of `.product-aside` should have `overflow`**

### 2) Gallery = compact + overlay-zoom

* Main image ≤420px width, thumbnails 48–64px
* Implement overlay-zoom on click (without expanding left column)
* Single photo → fixed-height placeholder (avoid CLS)

### 3) Sidebar (sticky): price/availability/CTA/docs

* Sidebar contains: price/stock → "Order" button → brief price breaks (up to 5 rows) → manufacturer → documentation links
* Mobile: narrow bottom bar with price/CTA (sidebar not sticky)

### 4) Price breaks = compact + filter + modal

* Sidebar shows up to 5 rows (grid layout in `card-detail.css`)
* Add "Your quantity" field + quick chips `1/10/100/1k/10k`; highlight relevant break and show "per unit"
* Full list in modal "All prices" (grid table, sticky header)

### 5) Specifications = DL + Grid

* Replace narrow table with:
  ```html
  <dl class="specs-dl">
    <dt>Package / Case</dt><dd>0603 (1608 Metric)</dd>
    <dt>Tolerance</dt><dd>±1%</dd>
    …
  </dl>
  ```
* Group: "Main" (6–8 top rows), "Electrical", "Package", "Other"
* Long values don't break grid: `overflow-wrap:anywhere; hyphens:auto`

### 6) Typography/wrapping

* H1/MPN with wrapping (`overflow-wrap:anywhere; word-break: break-word`)
* Spec labels: bold 12–13px, reduced contrast; values 13–14px. Vertical step 8px

### 7) Design unification without frameworks

* Include `styles/tokens.css`. All new spacing/radii/shadows/colors from tokens only
* Small utilities (`.text-muted`, `.gap-8`, `.shadow-soft`) strictly in card
* Create `/ui-kit` (local page) with examples of "cartridge", chips, modal, DL-grid

### 8) Fonts

* Single family + weights (e.g., 400/600)
* `@font-face` with `font-display: swap`
* WOFF2 format; include Cyrillic if needed

## Acceptance Criteria

1. **Sticky**: right sidebar sticks on desktop, no overflow ancestors breaking it
2. **Gallery**: compact; overlay-zoom works; CLS ≤ 0.02
3. **Specifications**: DL-Grid readable with 5 and 25 rows; long values wrap correctly
4. **Price breaks**: sidebar shows up to 5 rows, "Your quantity" filter highlights break; modal "All prices" is grid table with sticky header
5. **Documentation**: in sidebar, links clickable
6. **Style**: brand colors/shadows/radii/fonts preserved; new values from `tokens.css`
7. **Responsive**: desktop (≥1280px) — 3 columns; tablet — 2; mobile — 1 + bottom price/CTA bar
8. **Regressions**: other pages visually unchanged

## PR Requirements

* Included **styles/tokens.css** and **styles/card-detail.css**
* Changed card markup with wrappers `.product-card`, `.product-gallery`, `.product-main`, `.product-aside`, `.specs-dl`
* Modal "All prices" and filter "Your quantity"
* Screenshots **before/after** (desktop/tablet/mobile) and short scroll video
* Link to **docs/UI-CARD-DETAILS.md** in PR description
