# Sidebar Verification Report

## Date: 2025-12-24

## Problem
Кнопки категорий в sidebar выходили за пределы sidebar (417px при ширине sidebar 380px).
Причина: Radix ScrollArea создаёт wrapper с `display: table` который расширяется по содержимому.

## Solution
Добавлен CSS selector `[&>div>div]:!block` на ScrollArea для переопределения display.

## Verification (via Playwright evaluate)

### Before Fix:
```json
{
  "sidebarWidth": 380,
  "buttonWidth": 417.9375,
  "buttonGapToSidebarRight": -49.9375  // NEGATIVE = overflow!
}
```

### After Fix:
```json
{
  "sidebarWidth": 380,
  "tableWrapperDisplay": "block",
  "tableWrapperWidth": 379,
  "button": {
    "width": 355,
    "leftOffset": 12,
    "rightGap": 13
  }
}
```

### Hover State:
```json
{
  "backgroundColor": "oklab(0.999994 ... / 0.15)",
  "borderRadius": "11px",
  "width": 355,
  "leftOffset": 12,
  "rightGap": 13
}
```

## Commit
`c4fe57e` - fix(sidebar): correct button width overflow in ScrollArea

## Status
✅ VERIFIED - Buttons properly sized with visible margins on both sides
