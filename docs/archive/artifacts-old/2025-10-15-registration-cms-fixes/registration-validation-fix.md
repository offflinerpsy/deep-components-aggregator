# Registration Validation Fix — 2025-10-15

Scope: Align frontend POST /auth/register payload with backend AJV schema; improve client-side validation and error rendering.

What was failing
- UI sent `username` in body for `/auth/register`.
- Backend schema `schemas/auth.register.schema.json` has `additionalProperties: false` and no `username` field → AJV returned `validation_error`.

Changes
- Frontend (`v0-components-aggregator-page/components/OrderModal.tsx`):
  - Removed `username` from registration request body.
  - Password min length validation updated from 6 → 8 to match schema.
  - Kept username UI optional for future use; not sent to API.
  - Error parsing improved: renders AJV `errors[]` details if present.

Verification
- Expect: POST /auth/register with body `{ email, password, confirmPassword, name }` returns `202 Accepted` and sends verification email.
- Negative: invalid email → 400 with `validation_error` and details.

Artifacts
- See console logs in UI when registration completes: "Регистрация успешна, письмо для подтверждения отправлено".
- Server logs: `[REGISTER] Handler called` and `User registered successfully (verification required)`.

Notes
- Email verification flow is enabled on backend: `GET /auth/verify?token=...`.
- Frontend currently shows success stripe after order; can add a banner to prompt email verification if needed.