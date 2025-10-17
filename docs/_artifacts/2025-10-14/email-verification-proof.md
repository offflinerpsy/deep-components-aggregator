# Email Verification Proof — 2025-10-14

- Endpoint: POST /auth/register → 202 Accepted, sends email with link /auth/verify?token=...
- Endpoint: GET /auth/verify?token=... → 200 OK, HTML "Email подтверждён".

## Captures

- Request: { email: "user@example.com", password: "********", confirmPassword: "********" }
- Response (register): { ok: true, userId: "...", message: "Verification email sent. Please check your inbox." }
- Response (verify): 200 OK, HTML page

## Notes

- Tokens expire in 24h; single-use enforced.
- users.email_verified set to 1 upon success.
- SMTP settings taken from ENV; supports self-signed if SMTP_TLS_REJECT_UNAUTH=0.
