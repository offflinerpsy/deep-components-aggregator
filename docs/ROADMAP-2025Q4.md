# Deep Aggregator Roadmap — Q4 2025

## Overview
This roadmap tracks major features and improvements planned for Q4 2025 (October-December).

---

## October 2025

### ✅ Orders Backend MVP (Week 1: Oct 2-8)
**Status:** DONE  
**Owner:** Backend Team  
**Epic:** Orders System

#### Completed Tasks:
- [x] JSON Schema validation (AJV) - `schemas/order.request.schema.json`, `schemas/order.update.schema.json`
- [x] SQLite migrations - `db/migrations/2025-10-02_orders.sql`
- [x] POST /api/order endpoint with validation, pricing calculation, dealer links
- [x] Admin endpoints (GET /api/admin/orders, GET /api/admin/orders/:id, PATCH /api/admin/orders/:id)
- [x] Rate limiting (express-rate-limit) - 10 orders/min per IP
- [x] Prometheus metrics (prom-client) - orders_total, orders_by_status, order_create_duration_seconds
- [x] Nginx Basic Auth documentation for admin endpoints
- [x] API documentation (`docs/API.md`)
- [x] Operations guide (`docs/OPERATIONS.md`)
- [x] Test specification (`tests/orders.spec.md`)

**Acceptance Criteria:**
- ✅ Valid order POST → 201 with orderId
- ✅ Invalid order POST → 400 with AJV errors
- ✅ Rate limit test: 50 requests → some 429
- ✅ Admin endpoints protected by Nginx Basic Auth
- ✅ Metrics visible at /api/metrics

---

### 🔄 Orders Frontend (Week 2: Oct 9-15)
**Status:** IN PROGRESS  
**Owner:** Frontend Team  
**Epic:** Orders System

#### Tasks:
- [ ] Order modal component (`public/components/order-modal.js`)
- [ ] Open modal from product page
- [ ] Form validation (client-side + server errors display)
- [ ] Success/error toast notifications
- [ ] Loading states and animations
- [ ] Mobile responsive design

**Dependencies:**
- Backend orders API (DONE ✅)

**Acceptance Criteria:**
- User can click "Заказать" button on product page
- Modal opens with pre-filled product data (MPN, manufacturer, qty=1)
- Form validates contact info (at least one method required)
- On submit → POST /api/order → display orderId or errors
- Rate limit errors handled gracefully (show retry countdown)

---

### Admin Dashboard (Week 3-4: Oct 16-31)
**Status:** PLANNED  
**Owner:** Frontend Team  
**Epic:** Orders System

#### Tasks:
- [ ] Admin login page (`/admin/login.html`)
- [ ] Orders list page (`/admin/orders.html`)
  - [ ] Filters (status, date range, search)
  - [ ] Pagination
  - [ ] Status badges (color-coded)
- [ ] Order detail page (`/admin/orders/:id.html`)
  - [ ] Full customer info
  - [ ] Dealer links (quick open)
  - [ ] Status change dropdown
  - [ ] Order history timeline
- [ ] Export orders to CSV/JSON

**Dependencies:**
- Admin API endpoints (DONE ✅)
- Nginx Basic Auth (DONE ✅)

**Acceptance Criteria:**
- Admin can log in with credentials
- Admin can view all orders with filtering
- Admin can change order status (new → in_progress → done/cancelled)
- Status changes update instantly (WebSocket or polling)
- Export includes all order fields

---

## November 2025

### Email/Telegram Notifications
**Status:** PLANNED  
**Owner:** Backend Team  
**Epic:** Notifications

#### Tasks:
- [ ] Email service integration (Nodemailer or SendGrid)
- [ ] Telegram Bot API integration
- [ ] Order confirmation email (to customer)
- [ ] Order notification to admin (Telegram)
- [ ] Status change notifications (email + Telegram)
- [ ] Template system (Handlebars or EJS)

**Acceptance Criteria:**
- Customer receives order confirmation within 10 seconds
- Admin receives Telegram message with order details
- Status changes trigger customer notifications

---

### Payment Integration (Phase 1)
**Status:** PLANNED  
**Owner:** Backend Team  
**Epic:** Payments

#### Tasks:
- [ ] Research payment providers (Stripe, YooKassa, Robokassa)
- [ ] Add payment_status field to orders table
- [ ] Payment link generation
- [ ] Webhook handling (payment confirmation)
- [ ] Refund API

**Out of Scope (Phase 2):**
- Payment splitting
- Subscription payments
- International currencies

---

### Advanced Search & Filters
**Status:** PLANNED  
**Owner:** Backend + Frontend Teams  
**Epic:** Search Improvements

#### Tasks:
- [ ] Full-text search (SQLite FTS5 or Elasticsearch)
- [ ] Category filters
- [ ] Price range filters
- [ ] Manufacturer facets
- [ ] In-stock only filter
- [ ] Sort by price/availability/date

---

## December 2025

### Performance Optimization
**Status:** PLANNED  
**Owner:** Backend Team  
**Epic:** Performance

#### Tasks:
- [ ] DigiKey OAuth token caching (reduce latency by 50%)
- [ ] Redis caching layer (optional, if SQLite insufficient)
- [ ] API response compression (gzip)
- [ ] Image CDN integration (Cloudflare)
- [ ] Database indexing optimization
- [ ] Load testing (k6 or Apache Bench)

**Acceptance Criteria:**
- P95 latency < 500ms for /api/product
- P99 latency < 1s for /api/search
- Cache hit rate > 80% for product requests

---

### Monitoring & Alerting
**Status:** PLANNED  
**Owner:** DevOps Team  
**Epic:** Observability

#### Tasks:
- [ ] Grafana dashboards for Prometheus metrics
- [ ] Alerting rules (high error rate, slow responses, disk space)
- [ ] Structured logging with Pino
- [ ] Log aggregation (Loki or ELK)
- [ ] Uptime monitoring (UptimeRobot or Pingdom)

**Dashboards:**
1. **Orders Dashboard:**
   - Orders per day (time series)
   - Orders by status (pie chart)
   - Average order value
   - Top 10 products ordered

2. **API Performance Dashboard:**
   - Request rate (requests/sec)
   - Latency percentiles (P50, P95, P99)
   - Error rate by endpoint
   - Cache hit/miss ratio

3. **Infrastructure Dashboard:**
   - CPU/Memory usage
   - Disk space
   - Network throughput
   - Database size

---

### Security Hardening
**Status:** PLANNED  
**Owner:** DevOps Team  
**Epic:** Security

#### Tasks:
- [ ] HTTPS/TLS setup (Let's Encrypt)
- [ ] Rate limiting per user (not just IP)
- [ ] Input sanitization audit
- [ ] SQL injection prevention review
- [ ] CORS policy refinement
- [ ] Security headers (Helmet.js)
- [ ] Penetration testing

**Compliance:**
- [ ] GDPR compliance review (data retention, right to delete)
- [ ] PCI DSS (if payment integration)

---

## Future Considerations (2026+)

### Phase 2 Features
- Multi-language support (i18n)
- User accounts and order history
- Wishlist/favorites
- Product comparison
- Price tracking and alerts
- Bulk order CSV upload
- API for partners (OAuth2)
- Mobile app (React Native or Flutter)

### Technical Debt
- Migrate from nohup to systemd/PM2
- Implement CI/CD pipeline (GitHub Actions)
- Add end-to-end tests (Playwright)
- API versioning strategy (/v1/, /v2/)
- Microservices architecture (if scale requires)

---

## Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Orders Backend MVP | Oct 8, 2025 | ✅ DONE |
| Orders Frontend | Oct 15, 2025 | 🔄 IN PROGRESS |
| Admin Dashboard | Oct 31, 2025 | 📅 PLANNED |
| Notifications | Nov 15, 2025 | 📅 PLANNED |
| Payment Integration | Nov 30, 2025 | 📅 PLANNED |
| Performance Optimization | Dec 15, 2025 | 📅 PLANNED |
| Monitoring & Alerting | Dec 31, 2025 | 📅 PLANNED |

---

**Legend:**
- ✅ **DONE** — Feature completed and deployed
- 🔄 **IN PROGRESS** — Currently being worked on
- 📅 **PLANNED** — Scheduled but not started
- ⏸️ **ON HOLD** — Paused pending dependencies
- ❌ **CANCELLED** — Dropped from roadmap

**Last Updated:** 2025-10-02  
**Maintained By:** Product Team
