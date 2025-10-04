# Audit: Pricing Management and Correctness (2025-10-03)

This document reviews how pricing is computed and managed across the system, highlights gaps, and proposes concrete, low-risk improvements.

## Scope
- Order creation flow and pricing calculation
- Storage and retrieval of global pricing policy
- Admin visibility and control over pricing
- Validation, error handling, and security around pricing

## Findings

1) Source of truth
- The global pricing policy is stored in `settings` table under key `pricing_policy`.
- Seeded by migration `db/migrations/2025-10-02_orders.sql` with default value:
  `{ "markup_percent": 0.30, "markup_fixed_rub": 500 }`.
- Backend reads it via `SELECT value FROM settings WHERE key = 'pricing_policy'` in `api/order.js`.

2) Computation path
- If request does not include `pricing_snapshot`, backend computes it using `calculatePricing(basePrice, policy)`.
- Formula: `ceil(basePrice * (1 + markup_percent) + markup_fixed_rub)`.
- The computed snapshot includes: `base_price_rub`, `markup_percent`, `markup_fixed_rub`, `final_price_rub`.
- Current base price fallback is a placeholder `1000` (should come from product data).

3) Validation and persistence
- Request validated with AJV against `schemas/order.request.schema.json`.
- `pricing_snapshot` is optional in request (server will compute if absent).
- On insert, `pricing_snapshot` is stored as JSON text in `orders.pricing_snapshot`.

4) Admin UI/controls
- There is an Admin Orders UI (`ui/admin-orders.html`) to list, view, and update order status.
- No dedicated admin page or API to view/edit global `pricing_policy`.
- Admin UI shows price using `order.pricing_snapshot` but cannot adjust pricing policy.

5) Errors and observability
- If `pricing_policy` is missing, server returns 500 `configuration_error` from `api/order.js`.
- Metrics: order counters and durations updated; no metric specifically tracking pricing-policy loads or edits.

## Risks
- Hidden configuration: Admins cannot see or change `pricing_policy` from UI.
- Placeholder base price: Using `1000` when base price is unknown risks incorrect final prices.
- No audit trail of pricing changes: Modifications to `settings` (when done manually) are not tracked.
- Lack of input caps: `markup_percent` > 1 or negative values could be set if someone edits DB directly.

## Recommendations (MVP-level)

1) Read-only settings endpoint and admin page
- GET /api/admin/settings/pricing — return current `pricing_policy` (requireAdmin)
- UI: Minimal settings view showing the two fields and example calculation.

2) Safe update endpoint with validation
- PATCH /api/admin/settings/pricing with schema:
  - markup_percent: number, 0 <= x <= 1
  - markup_fixed_rub: number, 0 <= x <= 1_000_000
- Store into `settings.value` as JSON string and update `updated_at`.
- Log who changed it (`req.user.id`, email) and old -> new values; rate-limit this endpoint.

3) Replace placeholder base price
- Server should accept `item.base_price_rub` from client when available and validate it's >= 0.
- If still absent, either reject with 400 or try to estimate from cached product data.

4) Guardrails and telemetry
- Add metric counter for pricing policy reads and updates.
- Add sanity checks: refuse obviously wrong policy (e.g., markup_percent > 2).
- Add a settings history table to track changes (id, key, old_value, new_value, user_id, ts) — optional nice-to-have.

## Acceptance Criteria
- As an admin, I can open an Admin Settings page and see the current markup percent and fixed RUB.
- As an admin, I can safely update these values, and changes take effect for newly created orders.
- Server validates inputs and rejects out-of-range values with a clear error.
- No more hardcoded base price; pricing is computed from actual base price coming with the order request.
- A simple log entry is recorded including who changed settings and when; rate limit is applied.

## Implementation Notes (proposed)
- Backend:
  - New file: `api/admin.settings.js` with two endpoints (GET, PATCH), behind `requireAdmin`.
  - Input validation via AJV; reuse existing logger and DB.
  - Wire routes in `server.js` under `/api/admin`.
- Frontend:
  - `ui/admin-settings.html` — minimal form with two inputs and Save button.
- DB:
  - Reuse existing `settings` table; optional `settings_history` table for audit trail.

## Quick Test Plan
- GET /api/admin/settings/pricing returns seeded default.
- PATCH valid values (e.g., 0.35 and 500) → 200, GET reflects change, new order uses updated values.
- PATCH invalid (e.g., -0.1 or 2) → 400 with validation details.
- Create order with explicit pricing_snapshot → server stores provided snapshot unchanged.
- Create order without pricing_snapshot but with item.base_price_rub → uses that value.
