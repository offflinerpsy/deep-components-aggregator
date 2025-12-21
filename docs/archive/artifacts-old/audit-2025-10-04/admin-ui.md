# Admin UI Audit

## Status: SERVER NOT RUNNING
**Note**: Full testing requires running server and admin access.

---

## 1. Settings Page (Markup Configuration)

### Expected Location
- **Path**: `/admin/settings` or `/api/admin/settings`
- **Auth**: Admin role required

### Expected Features
1. **Markup Configuration**
   - Type selector: Percent (%) or Absolute (+₽)
   - Value input field
   - Save button with validation
   - Preview: "10 USD × 88.5 RUB/USD × (1 + 20%) = 1,062₽"

2. **Currency Refresh**
   - Display current CBR rate date
   - Manual refresh button
   - Auto-refresh schedule setting (cron config?)

3. **API Keys Management**
   - List of configured providers
   - Status indicators (✅ working / ❌ failed)
   - Last request timestamp
   - Add/Edit/Delete key functionality

### Current Implementation Status
Based on source code review (`docs/ARCHITECTURE-AUDIT-2025-10-03.md`):

- ❌ **Markup UI**: Not implemented in admin panel
- ✅ **CBR Currency**: Implemented in `src/currency/cbr.mjs`
- ⚠️ **API Keys**: Stored in env vars, no admin UI for management

### Screenshots Required
- `admin-settings-before.png` - Initial state
- `admin-settings-after.png` - After changing markup to 20%
- `admin-settings-validation.png` - Validation error (invalid markup value)

---

## 2. Static Pages Editor

### Expected Pages
1. **Privacy Policy** (`/privacy` or `/policy`)
2. **Delivery/Shipping** (`/delivery`)
3. **Contacts** (`/contacts`)
4. **About** (`/about`) (optional)

### Expected Features
- WYSIWYG editor or Markdown input
- Save/Publish buttons
- Preview mode
- Revision history (optional)

### Current Implementation Status
Based on footer links and source review:

- ⚠️ **Static Pages**: Likely hardcoded HTML files in `public/`
- ❌ **Editor**: No CMS detected in codebase
- ⚠️ **Footer Links**: Footer component exists, links may be static

### Expected Footer Structure
```html
<footer>
  <div class="footer-links">
    <a href="/privacy">Privacy Policy</a>
    <a href="/delivery">Delivery</a>
    <a href="/contacts">Contacts</a>
    <a href="/about">About</a>
  </div>
  <div class="footer-status">
    <span>API: Online</span>
  </div>
</footer>
```

### Screenshots Required
- `admin-pages-list.png` - List of editable pages
- `admin-pages-editor.png` - Editor interface with Privacy Policy
- `footer-links.png` - Footer showing all links correctly

---

## 3. Orders Management

### Expected Features
1. **Orders List**
   - Table with: Order ID, Customer, Status, Total, Date
   - Filters: Status (pending/processing/done), Date range
   - Search by customer name or email
   - Pagination

2. **Order Details**
   - Customer info (name, email, phone)
   - Items list (MPN, quantity, price)
   - Total with breakdown
   - **Dealer Links** (Block 4 - NOT IMPLEMENTED YET)
   - Status change dropdown
   - Order notes/comments

3. **Status Management**
   - Dropdown: pending → processing → shipped → completed
   - Email notification on status change (optional)
   - Timestamp for each status change

### Current Implementation
Based on `AUDIT-ORDERS-BACKEND-ONEFILE.md`:

- ✅ **Database Schema**: Orders + order_items tables exist
- ✅ **API Endpoints**: `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`
- ❌ **Dealer Links**: Not implemented (hardcoded Russian distributors removed in rollback)
- ⚠️ **UI**: Needs verification with running server

---

## 4. Design Consistency

### Issues Mentioned in VIDEO-REQUIREMENTS.md
From Block 3:
> "❌ Black header bar inconsistent with main site design"

### Expected Design
- Use same color scheme as main site (`public/styles/v0-theme.css`)
- Dark theme compatible
- Consistent typography and spacing
- No random "black bars"

### Current Status
- ⚠️ **Consistency**: Needs visual check with running server
- ✅ **Theme CSS**: `v0-theme.css` exists for main site
- ❌ **Admin Theme**: Unknown if admin uses separate CSS

---

## 5. Dealer Links (Block 4 Audit)

### Expected Implementation (from VIDEO-REQUIREMENTS)
**NOT** hardcoded list of Russian distributors (OEMstrade, ChipDip, LCSC).

**SHOULD BE**:
- Admin panel CRUD for dealer links
- Links visible in order details view
- Optional parsing with `OEMSTRADE_PARSE=1` env flag

### Current Status
From `docs/ARCHITECTURE-AUDIT-2025-10-03.md`:
> "⚠️ BLOCK 4: OEMstrade Dealer Links - ❌ MISSING in schema"

**Order Items Schema** (expected):
```sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  mpn TEXT,
  quantity INTEGER,
  dealer_url TEXT,        -- ← MISSING
  dealer_price REAL       -- ← MISSING
);
```

### Recommendations
1. Add `dealer_url` column to `order_items` table
2. Create admin UI route: `POST /api/admin/orders/:orderId/items/:itemId/dealer-link`
3. Display links in order details view
4. Implement optional scraping with `OEMSTRADE_PARSE=1` flag

---

## 6. Screenshots Checklist

### Settings Page
- [ ] `admin-settings-before.png` (1440px desktop)
- [ ] `admin-settings-after.png` (after markup change)

### Pages Editor
- [ ] `admin-pages-list.png` (list of editable pages)
- [ ] `admin-pages-editor.png` (editor UI)

### Orders
- [ ] `admin-orders-list.png` (orders table)
- [ ] `admin-order-details.png` (single order view)

### Footer/Menu
- [ ] `footer-links.png` (footer with Privacy/Delivery/Contacts)
- [ ] `menu-navigation.png` (if applicable)

---

## 7. Findings Summary

### ✅ Working
- Database schema for orders (verified in AUDIT-ORDERS-BACKEND-ONEFILE.md)
- API endpoints for CRUD operations
- Currency conversion logic (CBR API)

### ⚠️ Partial / Needs Verification
- Static pages (likely hardcoded HTML)
- Footer links (need to check if dynamic)
- Admin UI design consistency

### ❌ Missing / Broken
- **Markup configuration UI** (not in admin panel)
- **Dealer links** (Block 4 completely missing)
- **Pages editor** (no CMS found in codebase)
- **API keys management UI** (only env vars)

---

## 8. Recommendations

1. **Priority 1**: Implement markup configuration UI
   - Add settings page `/admin/settings`
   - Form with type (%, +₽) and value
   - Apply markup in product pricing logic

2. **Priority 2**: Implement dealer links (Block 4 correctly)
   - Add `dealer_url` to `order_items` schema
   - CRUD UI in order details
   - Optional scraping feature

3. **Priority 3**: Static pages editor
   - Option A: Simple Markdown files + admin UI
   - Option B: Lightweight CMS (Strapi, Payload, KeystoneJS)
   - Option C: Hardcoded pages with git-based updates

4. **Priority 4**: Design audit
   - Ensure admin panel uses same theme as main site
   - Remove inconsistent elements (black bars)
   - Test dark theme in admin

---

**Last Updated**: 2025-10-04  
**Server Status**: NOT RUNNING  
**Manual Testing**: REQUIRED
