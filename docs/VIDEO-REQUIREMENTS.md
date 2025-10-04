# Video Requirements
**Source:** vokoscreenNG-2025-10-03_18-39-35.mkv (10:50 duration)  
**Language:** Russian (100% confidence)  
**Generated:** 2025-10-03  
**Transcript:** [`docs/_artifacts/video/transcript.txt`](../_artifacts/video/transcript.txt)

---

## Executive Summary

User walkthrough identified **7 critical feature blocks** requiring implementation:
1. **Russian search normalization** - translate RU queries → EN component names
2. **Product card layout redesign** - sticky sidebar, price display, OEMstrade-style structure
3. **Admin panel expansion** - full CMS-like control, pricing rules, API status monitoring
4. **Footer positioning fix** - consistent layout across all pages
5. **Popular components widget** - scrape from OEMstrade daily
6. **Price conversion & display** - auto RUB conversion with admin-configurable margin
7. **Dark theme refinement** - already working, needs polish

---

## BLOCK 1: Russian Search Normalization
**Priority:** 🔴 CRITICAL  
**Timestamp:** `[37.84s - 136.26s]`

### Problem
- User types "транзистор" (transistor in Russian) → **"Ничего не найдено"** (nothing found)
- English search works perfectly, Russian fails completely
- Users will naturally search in native language

### Requirements
- [ ] **Implement Russian → English translation layer** before search query execution
  - Keywords: транзистор → transistor, резистор → resistor, etc.
  - Options considered: dictionary file, smart normalization module, translation API
  
- [ ] **Query normalization pipeline** (user mentioned "мы его уже писали" - check if exists)
  - Check for existing `normalizer` in codebase
  - Previous work mentioned: "араму/баму делали" - investigate what this refers to
  
- [ ] **Search must find real results for Russian queries** just like English
  - Test case: "транзистор BC547" → should return BC547 transistor results
  - Test case: "резистор 10k" → should return 10k resistor results

### Acceptance Criteria
✅ Russian query "транзистор" returns same results as "transistor"  
✅ No "nothing found" errors for common RU component names  
✅ Works for both autocomplete and full search

---

## BLOCK 2: Product Card Redesign (OEMstrade Style)
**Priority:** 🔴 CRITICAL  
**Timestamp:** `[220.38s - 591.48s]`

### Current Issues
- ❌ Sticky sidebar implementation is **broken** ("вот эта хуйня пристиклена" - sticky element issue)
- ❌ Description truncated/cut off ("дискрепшен какой-то обрезанный")
- ❌ Missing full price table like OEMstrade
- ❌ Layout not matching approved design

### Reference: OEMstrade Product Page Structure
User explicitly requests copying OEMstrade's product card layout:

**Required elements** (in order):
1. **Image gallery** - compact, clean hovers (current version approved: "мне здесь все нравится")
2. **Price table** - FULL price display with:
   - Stock availability ("сток есть, видишь")
   - Quantity breaks
   - Multiple suppliers
   - Auto-conversion to RUB (see Block 6)
3. **Structured description** with columns:
   - Manufacturer
   - MPN (full, not truncated)
   - Datasheet link
   - Description (full text, no truncation)
4. **Right sticky sidebar** - needs complete redesign
   - Current: broken sticky behavior
   - Goal: smooth, professional, like modern component sites

### Tasks
- [ ] **Research best practices for sticky product sidebars**
  - User quote: "ты там гуглил какие-то наработки, как лучше сделать"
  - Find 3-5 examples from major component distributors
  - Document best UX patterns
  
- [ ] **Fix sticky sidebar implementation**
  - Remove current broken version
  - Implement clean sticky scroll with proper boundaries
  - Test on different viewport sizes
  
- [ ] **Full price table (OEMstrade-style)**
  - Show ALL prices, not limited subset
  - Stock indicators
  - Supplier names clearly visible
  
- [ ] **Description formatting**
  - NO truncation ("может быть не полное, это нужно проверить")
  - Structured columns: Manufacturer | MPN | Description
  - Full MPN always visible

### Acceptance Criteria
✅ Sticky sidebar works smoothly without glitches  
✅ Price table shows complete data (stock, qty breaks, suppliers)  
✅ Description never truncated  
✅ Visual layout matches OEMstrade reference  
✅ Playwright visual regression tests pass

---

## BLOCK 3: Admin Panel - Full Site Management
**Priority:** 🟡 HIGH  
**Timestamp:** `[303.90s - 511.14s]`

### Current State
- ❌ Black header bar inconsistent with main site design ("откуда взялась вот эта вот черная строка")
- ❌ Only price settings visible, need **full CMS-like control**
- ❌ Missing critical admin features

### Required Admin Sections

#### 3.1 Pricing Rules Engine
- [ ] **Dynamic price margin control**
  - Admin sets percentage markup (e.g., "+20% above supplier price")
  - Applies to RUB conversion automatically
  - Per-supplier overrides (optional)
  
- [ ] **Price display configuration**
  - Toggle which price columns show on product cards
  - Currency conversion rate override

#### 3.2 API Provider Status Dashboard
- [ ] **API keys management**
  - List all configured providers (DigiKey, Mouser, TME, Farnell, etc.)
  - Show connection status: ✅ working / ❌ failing / ⚠️ rate-limited
  - Last successful request timestamp
  - Error logs for failed APIs
  
- [ ] **Real-time health monitoring**
  - User quote: "чтобы и я и администратор всегда был в курсе, что происходит"
  - Which APIs connected/disconnected
  - Response times
  - Daily request quotas used

#### 3.3 Content Management
- [ ] **Page editor**
  - Edit static pages: "Источники" (Sources), "Доставка" (Delivery), "Контакты" (Contacts)
  - Remove "API онлайн" page ("убирай нахуй, оно не нужно")
  - Move API status to admin dashboard instead
  
- [ ] **Footer/Header customization**
  - Manage footer links
  - Header navigation items
  - Contact info

#### 3.4 Privacy Policy Page
- [ ] **Auto-generate from template**
  - User quote: "погуглишь и найдешь правильно заполненную страницу"
  - Use standard e-commerce privacy policy template
  - Customize for component aggregator specifics

#### 3.5 (Optional) Lightweight CMS Integration
- [ ] **Evaluate lightweight CMS options**
  - User open to CMS if needed: "можно даже какую-нибудь легенькую cms поставить"
  - Must be lightweight (not WordPress/Drupal/Joomla)
  - Alternative: custom admin panel with WYSIWYG for key pages

### Design Consistency
- [ ] **Unified admin panel design**
  - Match main site theme (no random black bars)
  - Use same color scheme/typography
  - Professional, clean interface

### Acceptance Criteria
✅ Admin can control price margins from UI  
✅ API status dashboard shows real-time provider health  
✅ All static pages editable from admin  
✅ Privacy policy page generated and linked in footer  
✅ Design consistent with main site theme

---

## BLOCK 4: Footer Positioning Bug
**Priority:** 🟠 MEDIUM  
**Timestamp:** `[427.43s - 445.42s]`

### Problem
- Footer displays correctly on homepage
- **Footer missing/misplaced on search results page**
- User quote: "куда делся футр, вот он почему-то где, а что он здесь делает, почему он не внизу"

### Tasks
- [ ] **Audit footer positioning across all pages**
  - Homepage ✅
  - Search results page ❌ (footer not at bottom)
  - Product card page (?)
  - Static pages (?)
  
- [ ] **Fix CSS sticky footer implementation**
  - Ensure footer stays at bottom on ALL pages
  - Works with variable content heights
  - No overlapping with main content

### Acceptance Criteria
✅ Footer at bottom of viewport on all pages  
✅ Consistent position regardless of content length  
✅ No layout shifts when navigating between pages

---

## BLOCK 5: Popular Components Widget (OEMstrade Scraper)
**Priority:** 🟢 NICE-TO-HAVE  
**Timestamp:** `[190.58s - 220.38s]`

### Feature
Add "Popular Electronic Components" section to homepage, mirroring OEMstrade

### Implementation Options
**Option A: Manual list**
- Copy current popular components from OEMstrade
- Hardcode in config/database
- Update manually as needed

**Option B: Automated scraper** (user preference)
- User quote: "можно прямо сделать какой-нибудь скрипк, который будет отсюда, автоматом тянуть"
- Daily cron job scrapes OEMstrade popular components
- Auto-updates homepage widget
- Frequency: once per day

### Tasks
- [ ] **Create OEMstrade scraper script**
  - Extract "Популярные электронные компоненты" list
  - Store in database table `popular_components`
  - Schedule via cron: `0 3 * * *` (3 AM daily)
  
- [ ] **Homepage widget component**
  - Display grid of popular components
  - Link to product pages
  - Match OEMstrade visual style

### Acceptance Criteria
✅ Homepage shows "Popular Components" widget  
✅ List updates automatically (if scraper implemented)  
✅ Visual design matches OEMstrade reference

---

## BLOCK 6: Price Display & RUB Conversion
**Priority:** 🔴 CRITICAL  
**Timestamp:** `[171.78s - 294.46s]`

### Requirements

#### Missing Price Data
- User complaint: "у нас цены нет, пейкетж нет, пейкетж нет"
- **Investigate why prices not showing** on search results
  - API connection issues?
  - Not all providers returning prices?
  - Frontend not rendering price data?

#### Auto RUB Conversion
- [ ] **Implement automatic currency conversion**
  - All prices display in RUB by default
  - Show original currency in tooltip/small text (optional)
  - User quote: "я просил, чтобы у нас сразу шла конвертация в рублей"
  
- [ ] **Admin-configurable margin**
  - Conversion formula: `RUB_price = (USD_price * exchange_rate) * (1 + admin_margin)`
  - Example: if admin sets +20%, and DigiKey price is $1.00, display = (1.00 * 90) * 1.20 = 108 RUB
  - Set in admin panel (see Block 3)

#### Price Formation Transparency
- [ ] **Document price formation logic**
  - User wants to know: "как она будет у нас формироваться"
  - Show breakdown in admin: supplier price + margin + conversion = final price
  - Optional: show to users in tooltip/info modal

### Acceptance Criteria
✅ All product cards show prices (no "нет цены")  
✅ Prices auto-convert to RUB  
✅ Admin can configure margin percentage  
✅ Price formation logic documented

---

## BLOCK 7: Theme & Polish
**Priority:** 🟢 LOW (already working well)  
**Timestamp:** `[591.52s - 599.76s]`

### Status
- ✅ Dark theme toggle working ("темная тема, заебись, хорошее переключение")
- ✅ User prefers dark theme ("мне темная тема нравится больше")

### Minor Improvements
- [ ] **Dark theme as default** (optional)
  - Set dark mode as initial state
  - Remember user preference in localStorage
  
- [ ] **Theme consistency check**
  - Ensure dark theme works on ALL pages
  - No white flashes on navigation
  - Smooth transitions

### Acceptance Criteria
✅ Dark theme works consistently across all pages  
✅ User preference persists across sessions  
✅ No visual glitches when switching themes

---

## Implementation Order (JOBCHAIN)

Based on user priorities and technical dependencies:

### Phase 1: Critical Search & Display (Blocks 1, 6)
1. **Russian search normalization** - blocks user adoption
2. **Price display fix** - core value proposition
3. **RUB conversion** - required for Russian market

### Phase 2: Product Experience (Blocks 2, 4)
4. **Product card redesign** - major UX improvement
5. **Footer positioning** - polish, affects all pages

### Phase 3: Admin & Content (Block 3)
6. **Admin panel expansion** - enables site management
7. **Privacy policy** - legal requirement

### Phase 4: Enhancements (Blocks 5, 7)
8. **Popular components widget** - nice-to-have feature
9. **Theme polish** - already working, minor tweaks

---

## Technical Constraints (from user)

### Code Quality Rules
- ❌ **No `try/catch` blocks** - use Promise-based error handling + central middleware
- ❌ **Don't touch header/search/brand styles** unless explicitly required
- ✅ **Verification after each block** - smoke tests, snapshots, e2e
- ✅ **Fix immediately if tests fail** - no proceeding with red tests
- ✅ **Atomic commits** - one block = one commit with prefix ([VIDEO], [SEARCH], [CARD], [ADMIN], etc.)

### Git Workflow
- Branch: `stabilize/video-warp-auth-admin-card`
- Commit format: `[BLOCK_PREFIX] description`
- Each block requires: code + tests + report (docs/REPORT-2025-10-03-BLOCK-X.md)

---

## Open Questions

1. **Existing normalizer** - user mentioned "мы его уже писали, мы какую-то араму, а баму какую-то делали"
   - Search codebase for existing Russian search normalization
   - Check if `normalizer`, `transliteration`, or translation module exists

2. **Provider coverage** - "я так понимаю из-за того, что у нас не вся пипотоключена"
   - Which APIs are NOT yet integrated?
   - Priority order for adding missing providers?

3. **OEMstrade scraper legality**
   - Confirm scraping popular components is acceptable
   - Check robots.txt, terms of service
   - Alternative: manual curation

4. **CMS preference**
   - Does user want lightweight CMS, or custom admin?
   - If CMS: which one? (Strapi, Directus, Payload, KeystoneJS?)

---

## Files to Review

Based on transcript references:
- [ ] Search query handling (`src/routes/search.mjs`?)
- [ ] Product card component (`src/components/ProductCard.jsx`?)
- [ ] Admin panel (`src/routes/admin.mjs`?)
- [ ] Footer component (`src/components/Footer.jsx`?)
- [ ] Price formatting utils (`src/utils/price.mjs`?)
- [ ] Existing normalizer (if exists)

---

## Success Metrics

### User Satisfaction Indicators
- ✅ Russian searches return results
- ✅ Product card looks "professional" ("грамотно, аккуратно, скампановано")
- ✅ Admin panel provides full control
- ✅ Prices always visible and accurate
- ✅ Dark theme preferred and working

### Technical Completion
- ✅ All 7 blocks implemented
- ✅ Playwright visual regression tests passing
- ✅ No console errors
- ✅ Admin can manage site without code changes
- ✅ Comprehensive reports for each block

---

## Next Steps

1. **Review this requirements doc** - confirm understanding with user
2. **Ask clarifying questions** (see Open Questions section)
3. **Begin Phase 1** - Russian search + price display
4. **Iterate with verification** - test after each block, fix before proceeding

---

**Video Transcript Location:** `docs/_artifacts/video/transcript.txt` (80 segments, 10:50 duration)  
**Audio File:** `docs/_artifacts/video/audio.wav` (16kHz mono WAV, extracted from MKV)
