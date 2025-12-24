# Flyout Menu Implementation — CatalogSidebar

**Date**: 2025-12-24  
**Component**: `/v0-components-aggregator-page/components/CatalogSidebar.tsx`  
**Status**: ✅ COMPLETED

---

## 🎯 User Requirements

> **User**: "должен быть ховер при наведении на корневую категорию"  
> **User**: "Слишком много высоты в категориях, сделай покомпактнее"  
> **User**: "открытие как бы подкатерии в аккуратном окошке...правее категории...как в windows в контекстном меню...или как в маке в меню приложений"

---

## 📋 Implementation Plan

### 1. **State Management** ✅
- Removed: `expandedCategory` (accordion pattern)
- Added:
  - `hoveredCategory`: tracks current hovered root category
  - `flyoutPosition`: stores { top, left } coordinates for flyout
  - `categoryRefs`: ref map for each category button (for getBoundingClientRect)
  - `flyoutTimeoutRef`: timeout for smooth hover transitions (150ms)

### 2. **Hover Handlers** ✅
- `handleCategoryHover(categoryId)`:
  - Calculates flyout position using `getBoundingClientRect()`
  - Sets position at `rect.right + 8` (8px gap from parent)
  - Fetches subcategories if not loaded
  - Clears any pending timeout

- `handleCategoryLeave()`:
  - Sets 150ms timeout before hiding flyout
  - Allows mouse to move to flyout without closing

- `handleFlyoutEnter()` / `handleFlyoutLeave()`:
  - Controls flyout visibility when mouse enters/leaves submenu panel

### 3. **UI Updates** ✅
- **Compact Height**: Changed from `py-3` to `py-2.5`
- **Hover Effects**:
  - `hover:scale-[1.02]` — subtle scale on hover
  - `hover:bg-primary/15` — macOS Tahoe style highlight
  - `hover:shadow-lg` — depth effect
- **Removed**: Nested `AnimatePresence` accordion expansion

### 4. **Flyout Panel** ✅
- Fixed position at calculated coordinates
- macOS Tahoe styling: `glass-card`, `rounded-xl`, `shadow-2xl`
- Framer Motion animations:
  - Initial: `opacity: 0, x: -10, scale: 0.95`
  - Animate: `opacity: 1, x: 0, scale: 1`
  - Exit: smooth fade out
- **Features**:
  - "Все в категории" link (shows all items in root category)
  - Scrollable submenu list (max-height: 70vh)
  - Hover effects on subcategory links
  - Responsive to mouse enter/leave events

---

## 🔑 Key Code Patterns

### Flyout Position Calculation
```typescript
const rect = categoryRefs.current.get(categoryId)?.getBoundingClientRect();
if (rect) {
  setFlyoutPosition({
    top: rect.top,
    left: rect.right + 8, // 8px gap
  });
}
```

### Timeout Pattern (Smooth Transitions)
```typescript
const handleCategoryLeave = useCallback(() => {
  flyoutTimeoutRef.current = setTimeout(() => {
    setHoveredCategory(null);
    setFlyoutPosition(null);
  }, 150); // 150ms allows mouse to reach flyout
}, []);
```

### Flyout Panel Structure
```tsx
<motion.div
  style={{
    position: 'fixed',
    top: flyoutPosition.top,
    left: flyoutPosition.left,
  }}
  onMouseEnter={handleFlyoutEnter}
  onMouseLeave={handleFlyoutLeave}
  className="glass-card shadow-2xl"
>
  <ScrollArea className="max-h-[70vh]">
    {/* "Все" link + subcategories */}
  </ScrollArea>
</motion.div>
```

---

## 🎨 Visual Design

### Before
- Accordion expansion with `ml-4` indent
- `py-3` padding (too much height)
- No hover effects on closed categories

### After
- **Flyout menu** to the right (like macOS/Windows)
- `py-2.5` compact height
- Hover: scale + background + shadow
- macOS Tahoe glass effect on flyout panel

---

## ✅ Verification Checklist

- [x] Hover on root category triggers flyout
- [x] Flyout appears at correct position (right side, aligned with category)
- [x] 150ms timeout allows smooth mouse movement
- [x] Subcategories load correctly
- [x] "Все в категории" link works
- [x] Flyout closes when mouse leaves both category and flyout
- [x] Compact category height (py-2.5)
- [x] Hover effects on categories
- [x] No TypeScript/ESLint errors
- [x] Build successful
- [x] PM2 restart successful

---

## 📦 Files Changed

- **Modified**: `/v0-components-aggregator-page/components/CatalogSidebar.tsx`
  - Lines changed: ~80 lines
  - Added: FlyoutPosition interface, hover handlers, flyout panel JSX
  - Removed: accordion expansion logic

---

## 🚀 Deployment

```bash
# Build
cd /opt/deep-agg/v0-components-aggregator-page
npm run build

# Restart
pm2 restart deep-agg
```

**Build Status**: ✅ Success  
**PM2 Status**: ✅ Online (PID 1594280)

---

## 🔮 Future Enhancements

1. **Mobile Fallback**: Flyout doesn't work well on mobile — consider click-to-expand for touch devices
2. **Nested Flyouts**: If subcategories have children, implement recursive flyout (third level)
3. **Keyboard Navigation**: Add arrow key support for accessibility
4. **Animation Timing**: Fine-tune 150ms timeout based on user feedback

---

## 📚 References

- **Pattern**: macOS Menu Bar / Windows Context Menu
- **Library**: Framer Motion (AnimatePresence)
- **Styling**: macOS Tahoe glass effect (from globals.css)
