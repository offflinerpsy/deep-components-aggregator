# 🎨 Дизайн текущей карточки товара (не v2)

**Файлы**: 
- HTML: `public/product.html`
- CSS: `public/styles/product.css`
- JS: `public/product.js`
- Тема: `public/styles/v0-theme.css`

**Production URL**: http://5.129.228.88:9201/product.html?mpn=LM317

---

## 📐 Структура Layout

### Grid Layout (Desktop):
```
┌─────────────────────────────────────────────────────┐
│              Header (Sticky)                        │
│   ДИПОНИКА    [Search]    [Источники] [О нас] [🌙] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Breadcrumbs: Главная → Результаты поиска → MPN    │
│                                                     │
│  <h1> Product Title </h1>                          │
│  <p> Subtitle: Loading... </p>                     │
│                                                     │
│  ┌───────────────────┬─────────────────────────┐   │
│  │                   │                         │   │
│  │  GALLERY          │  META (Right Column)    │   │
│  │  (Sticky)         │                         │   │
│  │                   │  ┌───────────────────┐  │   │
│  │  ┌─────────────┐  │  │ Price Panel       │  │   │
│  │  │             │  │  │ Manufacturer      │  │   │
│  │  │ Main Image  │  │  │ Price            │  │   │
│  │  │             │  │  │ Stock            │  │   │
│  │  │             │  │  │ Package Info     │  │   │
│  │  └─────────────┘  │  └───────────────────┘  │   │
│  │                   │                         │   │
│  │  [Thumbs Grid]    │  ┌───────────────────┐  │   │
│  │  ▢ ▢ ▢ ▢         │  │ Pricing Table     │  │   │
│  │                   │  │ Qty | Price       │  │   │
│  │                   │  └───────────────────┘  │   │
│  │                   │                         │   │
│  │                   │  ┌───────────────────┐  │   │
│  │                   │  │ Datasheets        │  │   │
│  │                   │  │ 📄 Links          │  │   │
│  │                   │  └───────────────────┘  │   │
│  │                   │                         │   │
│  │                   │  ┌───────────────────┐  │   │
│  │                   │  │ Specs Grid        │  │   │
│  │                   │  │ Key: Value        │  │   │
│  │                   │  └───────────────────┘  │   │
│  │                   │                         │   │
│  └───────────────────┴─────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Grid Template:
```css
.product-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr; /* 55% / 45% split */
  gap: 24px;
  align-items: start;
}
```

### Sticky Gallery:
```css
.gallery {
  position: sticky;
  top: 88px; /* Below header */
}
```

---

## 🎨 Design Tokens

### Colors:
```css
/* From v0-theme.css */
:root {
  /* Light Theme (default) */
  --background: #fafafa;
  --foreground: #111827;
  --surface: #ffffff;
  --border: #e5e7eb;
  --muted-foreground: #6b7280;
  --primary: #667eea;
  --primary-foreground: #ffffff;
  --accent: #764ba2;
}

/* Dark Theme */
[data-theme="dark"] {
  --background: #0f172a;
  --foreground: #f1f5f9;
  --surface: #1e293b;
  --border: #334155;
  --muted-foreground: #94a3b8;
  --primary: #818cf8;
  --accent: #a78bfa;
}
```

### Gradients:
```css
/* Purple gradient (primary) */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Image placeholder gradient */
background: linear-gradient(135deg, #e2e8f0, #f8fafc);
```

### Shadows:
```css
--shadow-1: 0 1px 2px rgba(0,0,0,.06), 0 1px 1px rgba(0,0,0,.04);
--shadow-2: 0 4px 16px rgba(0,0,0,.08);

/* Applied to panels */
box-shadow: var(--shadow-2);
```

### Border Radius:
```css
--radius-lg: 16px;

/* Panel corners */
border-radius: var(--radius-lg); /* 16px */

/* Main image */
border-radius: 12px;

/* Thumbnails */
border-radius: 8px;
```

---

## 🖼️ Gallery Component

### Main Image:
```css
.main-image {
  width: 100%;
  min-height: 400px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #e2e8f0, #f8fafc);
  border: 1px solid var(--border);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.main-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: crisp-edges;
}
```

### Thumbnail Grid:
```css
.thumbnail-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.thumbnail {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.thumbnail:hover {
  border-color: #667eea;
  transform: scale(1.05);
}

.thumbnail.active {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}
```

### Image Placeholder (No Image):
```html
<div class="image-placeholder">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
</div>
```

---

## 📊 Meta Panels (Right Column)

### 1. Price & Stock Panel:
```css
.price-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
}

.price-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.manufacturer {
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground);
  margin-top: 4px;
}

.price {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stock {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: inline-block;
}

.stock.in-stock {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.stock.out-of-stock {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
```

### 2. Pricing Table:
```css
.pricing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.pricing-table th,
.pricing-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.pricing-table th {
  font-weight: 600;
  color: var(--muted-foreground);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pricing-table tr:hover {
  background: rgba(102, 126, 234, 0.05);
}

.pricing-table .qty {
  font-weight: 600;
  color: var(--foreground);
}

.pricing-table .price-cell {
  font-weight: 500;
  color: #667eea;
}
```

### 3. Datasheets Panel:
```css
.datasheet-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--foreground);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;
}

.datasheet-link:hover {
  background: #eef2ff;
  border-color: #667eea;
  transform: translateY(-1px);
}

.datasheet-link svg {
  width: 16px;
  height: 16px;
  color: #667eea;
}
```

### 4. Specs Grid:
```css
.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 12px;
  font-size: 14px;
}

.specs-grid .spec-label {
  color: var(--muted-foreground);
  font-weight: 500;
}

.specs-grid .spec-value {
  color: var(--foreground);
  font-weight: 400;
}
```

---

## 🎯 Header (Sticky)

```css
.header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(250, 250, 250, 0.85);
  backdrop-filter: saturate(1.2) blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 16px 0;
  transition: all 0.3s ease;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--foreground);
}

.logo-chip {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
```

### Search Box (Animated):
```css
.search-box {
  position: relative;
  width: 400px;
}

.search-box input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--foreground);
  font-size: 14px;
  transition: all 0.3s ease;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-box button[type="reset"] {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.search-box input:not(:placeholder-shown) + button {
  opacity: 1;
}
```

### Theme Toggle:
```css
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background: #eef2ff;
  border-color: #667eea;
}

.theme-toggle svg {
  width: 20px;
  height: 20px;
  color: var(--foreground);
}

/* Show/hide icons based on theme */
[data-theme="light"] .moon-icon,
[data-theme="dark"] .sun-icon {
  display: none;
}
```

---

## 📱 Responsive Breakpoints

### Mobile (≤1024px):
```css
@media (max-width: 1024px) {
  .product-grid {
    grid-template-columns: 1fr; /* Single column */
  }
  
  .gallery {
    position: static; /* No sticky on mobile */
  }
  
  .product-title {
    font-size: 28px;
  }
  
  .price {
    font-size: 24px;
  }
}

@media (max-width: 768px) {
  .search-box {
    width: 100%;
    max-width: 300px;
  }
  
  .nav-wrapper {
    flex-wrap: wrap;
  }
}
```

---

## 🎨 Typography

```css
/* Font Stack */
font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Weights */
font-weight: 100; /* Thin */
font-weight: 300; /* Light */
font-weight: 400; /* Regular */
font-weight: 500; /* Medium */
font-weight: 700; /* Bold */

/* Sizes */
.product-title: 36px;
.price: 32px;
.manufacturer: 16px;
.panel-title: 14px;
.pricing-table: 14px;
.breadcrumbs: 14px;
```

---

## ✨ Animations

### Fade-in on Load:
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}

/* Stagger delays */
.breadcrumbs { animation-delay: 0s; }
.product-header { animation-delay: 0.1s; }
.product-grid { animation-delay: 0.2s; }
```

### Hover Effects:
```css
/* Thumbnails */
.thumbnail:hover {
  transform: scale(1.05);
  border-color: #667eea;
}

/* Datasheet links */
.datasheet-link:hover {
  transform: translateY(-1px);
  border-color: #667eea;
}

/* Panel hover (subtle) */
.panel:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
}
```

---

## 🎯 Key Design Patterns

### 1. **Air Design Influence**:
- Large whitespace (24px gaps)
- Soft shadows (`0 4px 16px rgba(0,0,0,.08)`)
- Smooth transitions (0.2s - 0.3s ease)
- Rounded corners (8px - 16px)

### 2. **ДИПОНИКА Branding**:
- Purple gradient (`#667eea → #764ba2`)
- Logo chip with gradient + shadow
- Cyrillic name display

### 3. **Material Design Elements**:
- Elevation with shadows
- Ripple-like hover effects
- Card-based panels
- Sticky positioning

### 4. **Accessibility**:
- `:focus-visible` styles
- `aria-label` on theme toggle
- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- Color contrast (WCAG AA compliant)

---

## 📦 Component Inventory

### Reusable Components:
1. **Panel** - Generic card container
2. **Thumbnail** - Gallery thumbnail with active state
3. **Datasheet Link** - External document link
4. **Pricing Row** - Table row with qty/price
5. **Spec Row** - Key-value pair display
6. **Stock Badge** - In-stock/out-of-stock indicator

### Interactive Elements:
1. **Search Box** - With clear button
2. **Theme Toggle** - Light/dark mode switch
3. **Thumbnail Click** - Change main image
4. **Breadcrumb Links** - Navigation
5. **External Links** - Datasheets, supplier pages

---

## 🎨 Color Palette Summary

### Light Theme:
- **Background**: `#fafafa` (Very light gray)
- **Surface**: `#ffffff` (White panels)
- **Border**: `#e5e7eb` (Light gray borders)
- **Text**: `#111827` (Near black)
- **Muted**: `#6b7280` (Mid gray)
- **Primary**: `#667eea` (Purple blue)
- **Accent**: `#764ba2` (Deep purple)

### Dark Theme:
- **Background**: `#0f172a` (Deep blue-black)
- **Surface**: `#1e293b` (Dark blue-gray)
- **Border**: `#334155` (Dark gray)
- **Text**: `#f1f5f9` (Off-white)
- **Muted**: `#94a3b8` (Light gray)
- **Primary**: `#818cf8` (Lighter purple)
- **Accent**: `#a78bfa` (Lighter purple-pink)

---

## 📸 Screenshots Reference

### Desktop Layout:
- **Width**: 1200px container
- **Gallery**: 55% width, sticky at top: 88px
- **Meta**: 45% width, scrollable
- **Gap**: 24px between columns

### Mobile Layout:
- **Stack**: Single column
- **Gallery**: Full width, no sticky
- **Panels**: Full width, stacked

---

## 🔗 Production Links

**Current Product Card**:
- http://5.129.228.88:9201/product.html?mpn=LM317

**Main Page**:
- http://5.129.228.88:9201/

**Search**:
- http://5.129.228.88:9201/search.html?q=lm317

---

## 📝 Notes for Designer

### What Works Well:
- ✅ Clean, modern aesthetic
- ✅ Good use of whitespace
- ✅ Responsive grid layout
- ✅ Smooth animations
- ✅ Dark mode support

### Areas for Improvement:
- ❌ Gallery could have zoom functionality
- ❌ Pricing table could be more visual (charts/graphs)
- ❌ No "Add to Cart" or "Order" CTA button
- ❌ Specs grid could use icons
- ❌ No comparison feature
- ❌ No reviews/ratings section
- ❌ Breadcrumbs could show category hierarchy

### Suggested Enhancements:
1. **Gallery**: Add lightbox zoom, image carousel
2. **Pricing**: Add price chart visualization
3. **CTA**: Prominent "Order Now" button
4. **Specs**: Group by category, add icons
5. **Social**: Share buttons
6. **Related**: "Similar products" section
7. **Trust**: Certifications, badges
8. **Stock**: Real-time availability indicator

---

## 🎨 Design Figma Export Checklist

If exporting this design to Figma:
1. ✅ Extract color palette (CSS variables)
2. ✅ Document typography scale
3. ✅ Export spacing system (4px, 8px, 12px, 16px, 24px)
4. ✅ Create component library (Panel, Thumbnail, etc.)
5. ✅ Define breakpoints (1024px, 768px)
6. ✅ Export gradients
7. ✅ Document shadows
8. ✅ Create dark mode variants
9. ✅ Export icons/SVGs
10. ✅ Document animations (timing, easing)
