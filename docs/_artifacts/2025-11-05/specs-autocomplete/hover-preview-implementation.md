# Hover-Preview Modal Implementation

## Overview
Added hover-preview modal that shows product details when user hovers over autocomplete result for 500ms.

## Implementation Details

### File: `views/pages/catalog.ejs` (lines 340-440)

**1. Hover Event Handlers** (added to each `.autocomplete-item`):
```javascript
el.addEventListener('mouseenter', (e) => {
  hoverTimer = setTimeout(async () => {
    const res = await fetch(`/api/product?mpn=${encodeURIComponent(item.mpn)}`);
    const data = await res.json();
    if (data.ok && data.product) {
      previewEl = showPreviewPopover(el, data.product);
    }
  }, 500); // 500ms delay
});

el.addEventListener('mouseleave', () => {
  clearTimeout(hoverTimer);
  setTimeout(() => {
    if (previewEl && !previewEl.matches(':hover')) {
      previewEl.remove();
    }
  }, 200); // Allow moving mouse to popover
});
```

**2. Popover Positioning**:
- Fixed position adjacent to autocomplete item
- Checks available space: right side (preferred) or left side
- Width: 320px (`w-80`)
- Z-index: 100 (above autocomplete dropdown)

**3. Popover Content**:
```html
<div id="product-preview-popover">
  <!-- Header with image and MPN -->
  <div class="flex items-start gap-3">
    <div class="w-16 h-16 bg-foreground/5 rounded">
      <img src="..." alt="..." />
      <!-- OR placeholder: 📦 -->
    </div>
    <div>
      <div class="font-bold">${product.mpn}</div>
      <div class="text-xs">${product.manufacturer}</div>
    </div>
  </div>
  
  <!-- Top 5 technical specs -->
  <div class="mt-3 space-y-1 text-xs">
    <div class="flex justify-between">
      <span class="text-foreground/60">Spec Name:</span>
      <span class="font-medium">Value</span>
    </div>
    ...
  </div>
  
  <!-- Price and stock (if offers available) -->
  <div class="mt-3 pt-3 border-t">
    <div>Цена: ${price} ${currency}</div>
    <div>Наличие: ${stock} шт</div>
  </div>
  
  <!-- "Learn More" button -->
  <a href="/product/${mpn}" class="...">Подробнее →</a>
</div>
```

**4. Smart Closing**:
- 200ms delay when mouse leaves autocomplete item (allows moving to popover)
- Popover stays open when hovering over it
- Auto-closes when mouse leaves both item and popover

## User Experience Flow

1. **User types** "0603 100k" → autocomplete dropdown appears
2. **User sees** badges: "🔵 0603" "🟢 100.0kΩ"
3. **User hovers** for 500ms on a result
4. **Preview appears** to the right (or left if no space):
   - Photo of component (or 📦 icon)
   - MPN and manufacturer
   - Top 5 specs from `technical_specs`
   - Price/stock (if available in offers)
   - "Подробнее →" button
5. **User can**:
   - Move mouse to preview to read more specs
   - Click "Подробнее" to go to full product page
   - Move mouse away to close preview
   - Click on original item to navigate directly

## API Contract

### Endpoint: `GET /api/product?mpn=<MPN>`

**Response**:
```json
{
  "ok": true,
  "product": {
    "mpn": "71-RCG0603100KJNEA",
    "manufacturer": "Vishay",
    "images": ["https://..."],
    "technical_specs": {
      "Resistance": "100 kOhms",
      "Tolerance": "±5%",
      "Power Rating": "0.1W",
      "Package": "0603",
      ...
    },
    "offers": [
      {
        "price": 0.05,
        "currency": "USD",
        "stock": 10000,
        "source": "mouser"
      }
    ]
  }
}
```

## Testing

**Test Case 1**: Hover on resistor
```
Query: "0603 100k"
Result: 71-RCG0603100KJNEA
Preview: ✅ Shows image, 43 specs, no offers
```

**Test Case 2**: Hover on capacitor
```
Query: "smd 10uF"
Result: (various capacitors)
Preview: Should show image + specs + offers (if available)
```

**Test Case 3**: No image available
```
Result: Product without images
Preview: ✅ Shows 📦 placeholder icon
```

## Performance Considerations

- **Debounced fetch**: 500ms delay prevents excessive API calls
- **Cached data**: `/api/product` uses SQLite cache (1-2ms lookup)
- **Single preview**: Only one popover exists at a time (previous removed)
- **No memory leaks**: Event listeners cleaned up on element removal

## Known Limitations

1. **No offers in cache**: Products from autocomplete cache don't have pricing data
   - Solution: Price section only shows when `offers.length > 0`
   - Admin users can see full pricing in admin panel

2. **Fixed width**: Popover is 320px wide (may truncate long spec values)
   - Acceptable: Preview is meant to be concise, full page has complete data

3. **Mobile/touch**: Hover events don't work on touch devices
   - Acceptable: On mobile, user clicks directly on result (no preview needed)

## Next Steps

- **Task 6**: E2E testing with screenshots
- **Task 7**: Git commit and documentation update
